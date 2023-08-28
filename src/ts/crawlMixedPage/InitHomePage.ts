// 初始化首页
import { InitPageBase } from '../crawl/InitPageBase'
import { Colors } from '../Colors'
import { lang } from '../Lang'
import { options } from '../setting/Options'
import { Tools } from '../Tools'
import { EVT } from '../EVT'
import { IDData } from '../store/StoreType'
import { Config } from '../Config'
import { toast } from '../Toast'
import { theme } from '../Theme'
import { Utils } from '../utils/Utils'
import { msgBox } from '../MsgBox'
import { store } from '../store/Store'
import { log } from '../Log'
import { states } from '../store/States'
import { settings } from '../setting/Settings'
import { Input } from '../Input'

class InitHomePage extends InitPageBase {
  constructor() {
    super()
    this.init()
    this.idRangeTip = this.createidRangeTip()

    this.importIDListButton.addEventListener('click', () => {
      this.importIDList()
    })
  }

  private downIdButton: HTMLButtonElement = document.createElement('button')
  private importIDListButton: HTMLButtonElement =
    document.createElement('button')
  private downIdInput: HTMLTextAreaElement = document.createElement('textarea')
  private ready = false

  private idRangeTip: HTMLDivElement

  protected addCrawlBtns() {
    this.downIdButton = Tools.addBtn(
      'crawlBtns',
      Colors.bgBlue,
      '_输入id进行抓取'
    )
    this.downIdButton.id = 'down_id_button'

    const crawlIdRange = Tools.addBtn('crawlBtns', Colors.bgBlue, '_抓取id区间')
    crawlIdRange.addEventListener('click', () => {
      this.crawlIdRange()
    })

    this.importIDListButton = Tools.addBtn(
      'crawlBtns',
      Colors.bgGreen,
      '_导入ID列表'
    )
    this.importIDListButton.id = 'down_id_button'
  }

  protected addAnyElement() {
    // 用于输入id的输入框
    this.downIdInput.id = 'down_id_input'
    this.downIdInput.style.display = 'none'
    this.downIdInput.setAttribute(
      'data-xzplaceholder',
      '_输入id进行抓取的提示文字'
    )
    document.body.insertAdjacentElement('beforebegin', this.downIdInput)

    lang.register(this.downIdInput)

    Tools.addBtn(
      'otherBtns',
      Colors.bgGreen,
      '_清空已保存的抓取结果'
    ).addEventListener('click', () => {
      EVT.fire('clearSavedCrawl')
    })
  }

  protected setFormOption() {
    options.hideOption([1])
  }

  protected initAny() {
    this.downIdButton.addEventListener(
      'click',
      () => {
        if (!this.ready) {
          // 还没准备好
          EVT.fire('closeCenterPanel')
          this.downIdInput.style.display = 'block'
          this.downIdInput.focus()
          document.documentElement.scrollTop = 0
        } else {
          this.checkIdList()
        }
      },
      false
    )

    // 当输入框内容改变时检测，非空值时显示下载区域
    this.downIdInput.addEventListener('change', () => {
      if (this.downIdInput.value !== '') {
        this.ready = true
        window.setTimeout(() => {
          EVT.fire('openCenterPanel')
        }, 300)
        lang.updateText(this.downIdButton, '_开始抓取')
      } else {
        this.ready = false
        EVT.fire('closeCenterPanel')
        lang.updateText(this.downIdButton, '_输入id进行抓取')
      }
    })
  }

  // 单独添加一个用于提示 id 范围的元素，因为上面的日志显示在日志区域的顶端，不便于查看
  private createidRangeTip(): HTMLDivElement {
    const div = document.createElement('div')
    div.classList.add('id_range_tip', 'beautify_scrollbar', 'logWrap')
    theme.register(div)
    return document.body.insertAdjacentElement(
      'beforebegin',
      div
    )! as HTMLDivElement
  }

  // 把合法的 id 添加到数组里
  private checkIdList() {
    // 不必去重，因为 store 存储抓取结果时会去重
    const array = this.downIdInput.value.split('\n')
    const result: string[] = []
    for (const str of array) {
      const id = parseInt(str)
      if (isNaN(id) || id < 22 || id > Config.worksNumberLimit) {
        console.log(lang.transl('_id不合法') + ': ' + str)
      } else {
        result.push(id.toString())
      }
    }

    this.addIdList(result)
  }

  private async crawlIdRange() {
    EVT.fire('closeCenterPanel')

    let start = 0
    let end = 0

    // 接收起点
    const startInput = new Input({
      width: 400,
      instruction:
        lang.transl('_抓取id区间说明') +
        '<br><br>' +
        lang.transl('_抓取id区间起点'),
      placeholder: '100',
    })

    const startValue = await startInput.complete()
    if (startValue) {
      const num = Number.parseInt(startValue)
      if (!isNaN(num) && num >= 0) {
        start = num
      } else {
        return toast.error(lang.transl('_参数不合法本次操作已取消'))
      }
    } else {
      return toast.warning(lang.transl('_本次操作已取消'))
    }

    // 接收终点
    const endInput = new Input({
      width: 400,
      instruction: lang.transl('_抓取id区间终点'),
      placeholder: '200',
    })

    const endValue = await endInput.complete()
    if (endValue) {
      const num = Number.parseInt(endValue)
      if (!isNaN(num) && num >= start) {
        end = num
      } else {
        return toast.error(lang.transl('_参数不合法本次操作已取消'))
      }
    } else {
      return toast.warning(lang.transl('_本次操作已取消'))
    }

    // 提示抓取范围，便于用户分批次抓取的时候查看
    const tip = lang.transl('_抓取id区间') + `: ${start} - ${end}`
    this.idRangeTip.textContent = tip
    this.idRangeTip.style.display = 'block'
    // 不要在这里使用 log.log ，因为之后开始抓取时，日志区域会被清空，所以用户在日志区域里看不到这个提示

    // 生成 id 列表
    const ids: string[] = []
    while (start <= end) {
      ids.push(start.toString())
      start++
    }

    this.addIdList(ids)
  }

  // 把 id 列表添加到 store 里，然后开始抓取
  private addIdList(ids: string[]) {
    // 检查页面类型，设置输入的 id 的作品类型
    const type = window.location.pathname === '/novel/' ? 'novels' : 'unknown'

    const idList: IDData[] = []
    for (const id of ids) {
      idList.push({
        type: type,
        id: id,
      })
    }

    EVT.fire('crawlIdList', idList)
  }

  private async importIDList() {
    const loadedJSON = (await Utils.loadJSONFile().catch((err) => {
      return msgBox.error(err)
    })) as IDData[]
    if (!loadedJSON) {
      return
    }

    // 要求是数组并且要有内容
    if (!Array.isArray(loadedJSON) || !loadedJSON.length || !loadedJSON[0]) {
      return toast.error(lang.transl('_格式错误'))
    }

    // 检查是否含有必须的字段（只检查了一部分）
    const keys = Object.keys(loadedJSON[0])
    const need = ['id', 'type']
    for (const field of need) {
      if (!keys.includes(field)) {
        return toast.error(lang.transl('_格式错误'))
      }
    }

    log.success('✓ ' + lang.transl('_导入ID列表'))

    store.reset()

    store.idList = loadedJSON

    this.crawlImportIDList()
  }

  protected crawlImportIDList() {
    log.log(lang.transl('_当前作品个数', store.idList.length.toString()))
    log.log(lang.transl('_开始获取作品信息'))

    if (Tools.checkUserLogin() === false) {
      // 如果未登录账号，则全速抓取
      states.slowCrawlMode = false

      if (store.idList.length <= this.ajaxThreadsDefault) {
        this.ajaxThread = store.idList.length
      } else {
        this.ajaxThread = this.ajaxThreadsDefault
      }
    } else {
      // 登录账号后，可以使用慢速抓取
      if (
        settings.slowCrawl &&
        store.idList.length > settings.slowCrawlOnWorksNumber
      ) {
        log.warning(lang.transl('_慢速抓取'))
        states.slowCrawlMode = true
        this.ajaxThread = 1
      }
    }

    for (let i = 0; i < this.ajaxThread; i++) {
      this.getWorksData()
    }
  }

  protected destroy() {
    Tools.clearSlot('crawlBtns')
    Tools.clearSlot('otherBtns')
    this.downIdInput.remove()
  }
}

export { InitHomePage }
