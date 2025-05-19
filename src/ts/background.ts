import { DonwloadListData, SendToBackEndData } from './download/DownloadType.d'
import './ManageFollowing'

// 当点击扩展图标时，显示/隐藏下载面板
chrome.action.onClicked.addListener(function (tab) {
  // 在本程序没有权限的页面上点击扩展图标时，url 始终是 undefined，此时不发送消息
  if (!tab.url) {
    return
  }

  chrome.tabs.sendMessage(tab.id!, {
    msg: 'click_icon',
  })
})

// 当扩展被安装、被更新、或者浏览器升级时，初始化数据
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ batchNo: {}, idList: {} })
})

// 存储每个下载任务的数据，这是因为下载完成的顺序和前台发送的顺序可能不一致，所以需要把数据保存起来以供使用
const dlData: DonwloadListData = {}
// 当浏览器开始下载一个由前台传递的文件时，会把一些数据保存到 dlData 里
// 当浏览器把这个文件下载完毕之后，从 dlData 里取出保存的数据
// 注意：虽然 Service worker 被回收时，变量也会被清空，但是这对于 dlData 的使用没有影响
// 只要在 Service worker 被回收之前，浏览器把传递给它的下载任务全部下载完了，dlData 里保存的数据也就不再需要使用了，所以即使此时被清空了也无所谓。
// 如果浏览器还没有把传递给它的下载任务全部下载完成，Service worker 就已经被回收，那么会有影响（文件下载完成之后找不到之前保存的数据了）。但是理论上，浏览器正在执行下载任务时这个 Service worker 不会被回收，所以不会发生下载完成前就被回收的情况。

type batchNoType = { [key: string]: number }
type idListType = { [key: string]: string[] }

// 使用每个页面的 tabId 作为索引，储存此页面里当前下载任务的编号。用来判断不同批次的下载
let batchNo: batchNoType = {}

// 使用每个页面的 tabId 作为索引，储存此页面里所发送的下载请求的作品 id 列表，用来判断重复的任务
let idList: idListType = {}

// batchNo 和 idList 需要持久化存储（但是当浏览器关闭并重新启动时可以清空，因为此时前台的下载任务必然和浏览器关闭之前的不是同一批了，所以旧的数据已经没用了）
// 如果不进行持久化存储，如果前台任务处于下载途中，后台 SW 被回收了，那么变量也会被清除。之后前台传递过来的可能还是同一批下载里的任务，但是后台却丢失了记录。这可能会导致下载出现重复文件等异常。
// 实际上，下载时后台 SW 会持续存在很长时间，不会轻易被回收的。持久化存储只是为了以防万一

// 封装 chrome.storage.local.set。不需要等待回调
async function setData(data: { [key: string]: any }) {
  return chrome.storage.local.set(data)
}

chrome.runtime.onMessage.addListener(async function (
  msg: SendToBackEndData,
  sender
) {
  // save_work_file 下载作品的文件
  if (msg.msg === 'save_work_file') {
    // 当处于初始状态时，或者变量被回收了，就从存储中读取数据储存在变量中
    // 之后每当要使用这两个数据时，从变量读取，而不是从存储中获得。这样就解决了数据不同步的问题，而且性能更高
    if (Object.keys(batchNo).length === 0) {
      const data = await chrome.storage.local.get(['batchNo', 'idList'])
      batchNo = data.batchNo
      idList = data.idList
    }

    const tabId = sender.tab!.id!

    // 如果开始了新一批的下载，重设批次编号，并清空下载索引
    if (batchNo[tabId] !== msg.taskBatch) {
      batchNo[tabId] = msg.taskBatch
      idList[tabId] = []
      setData({ batchNo, idList })
      // 这里存储数据时不需要使用 await，因为后面使用的是全局变量，所以不需要关心存储数据的同步问题
    }

    // 检查任务是否重复，不重复则下载
    if (!idList[tabId].includes(msg.id)) {
      // 储存该任务的索引
      idList[tabId].push(msg.id)
      setData({ idList })

      // 开始下载
      chrome.downloads.download(
        {
          url: msg.fileUrl,
          filename: msg.fileName,
          conflictAction: 'overwrite',
          saveAs: false,
        },
        (id) => {
          // id 是 Chrome 新建立的下载任务的 id
          // 使用下载任务的 id 作为 key 保存数据
          const data = {
            url: msg.fileUrl,
            id: msg.id,
            tabId: tabId,
            uuid: false,
          }
          dlData[id] = data
        }
      )
    }
  }

  // save_description_file 下载作品的元数据/简介 TXT 文件，不需要返回下载状态
  // save_novel_cover_file 下载小说的封面图片
  if (
    msg.msg === 'save_description_file' ||
    msg.msg === 'save_novel_cover_file' ||
    msg.msg === 'save_novel_embedded_image'
  ) {
    chrome.downloads.download({
      url: msg.fileUrl,
      filename: msg.fileName,
      conflictAction: 'overwrite',
      saveAs: false,
    })
  }

  if (msg.msg === 'clearDownloadsTempData') {
    if (sender.tab?.id) {
      const tabId = sender.tab.id
      delete idList[tabId]
      delete batchNo[tabId]

      setData({ batchNo, idList })
    }
  }
})

// 判断文件名是否变成了 UUID 格式。因为文件名处于整个绝对路径的中间，所以没加首尾标记 ^ $
const UUIDRegexp =
  /[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/

// 监听下载变化事件
// 每个下载会触发两次 onChanged 事件
chrome.downloads.onChanged.addListener(async function (detail) {
  // 根据 detail.id 取出保存的数据
  const data = dlData[detail.id]
  if (data) {
    let msg = ''
    let err = ''

    // 判断当前文件名是否正常。下载时必定会有一次 detail.filename.current 有值
    if (detail.filename && detail.filename.current) {
      const changedName = detail.filename.current
      if (changedName.match(UUIDRegexp) !== null) {
        // 文件名是 UUID
        data.uuid = true
      }
    }

    if (detail.state && detail.state.current === 'complete') {
      msg = 'downloaded'
    }

    if (detail.error && detail.error.current) {
      msg = 'download_err'
      err = detail.error.current
      // 当保存一个文件出错时，从任务记录列表里删除它，以便前台重试下载
      const idIndex = idList[data.tabId].findIndex((val) => val === data.id)
      idList[data.tabId][idIndex] = ''
      setData({ idList })
    }

    // 返回信息
    if (msg) {
      chrome.tabs.sendMessage(data.tabId, { msg, data, err })
      // 清除这个任务的数据
      dlData[detail.id] = null
    }
  }
})

// 清除不需要的数据，避免数据体积越来越大
async function clearData() {
  for (const key of Object.keys(idList)) {
    const tabId = parseInt(key)
    try {
      await chrome.tabs.get(tabId)
    } catch (error) {
      // 如果建立下载任务的标签页已经不存在，则会触发错误，如：
      // Unchecked runtime.lastError: No tab with id: 1943988409.
      // 此时删除对应的数据
      delete idList[tabId]
      delete batchNo[tabId]
    }
  }

  setData({ batchNo, idList })
}

setInterval(() => {
  clearData()
}, 3600000)
