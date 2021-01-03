// settings 保存了下载器的所有设置项
// 每当修改了 settings 的值，都要触发 EVT.list.settingChange 事件，让其他模块可以监听到变化
// 如果修改的是整个 settings，settingChange 事件没有参数
// 如果修改的是某一个属性的值，settingChange 事件参数应该传递这个属性的数据 {name:string, value:any}

// 如果打开了多个标签页，每个页面的 settings 数据是互相独立的。但是 localStorage 里的数据只有一份：最后一个设置变更是在哪个页面发生的，就把哪个页面的 settings 保存到 localStorage 里。所以恢复设置时，恢复的也是这个页面的设置。

import { EVT } from '../EVT'
import { DOM } from '../DOM'
import { Tools } from '../Tools'
import { convertOldSettings } from './ConvertOldSettings'

interface XzSetting {
  setWantPage: number
  wantPageArr: number[]
  firstFewImagesSwitch: boolean
  firstFewImages: number
  downType0: boolean
  downType1: boolean
  downType2: boolean
  downType3: boolean
  downSingleImg: boolean
  downMultiImg: boolean
  downColorImg: boolean
  downBlackWhiteImg: boolean
  downNotBookmarked: boolean
  downBookmarked: boolean
  ugoiraSaveAs: 'webm' | 'gif' | 'zip' | 'png'
  convertUgoiraThread: number
  needTagSwitch: boolean
  notNeedTagSwitch: boolean
  needTag: string[]
  notNeedTag: string[]
  quietDownload: boolean
  downloadThread: number
  userSetName: string
  namingRuleList: string[]
  tagNameToFileName: boolean
  alwaysFolder: boolean
  workDir: boolean
  workDirFileNumber: number
  workDirName: 'id' | 'rule'
  showOptions: boolean
  postDate: boolean
  postDateStart: number
  postDateEnd: number
  previewResult: boolean
  BMKNumSwitch: boolean
  BMKNumMin: number
  BMKNumMax: number
  BMKNumAverageSwitch: boolean
  BMKNumAverage: number
  setWHSwitch: boolean
  widthHeightLimit: '>=' | '=' | '<='
  setWidthAndOr: '&' | '|'
  setWidth: number
  setHeight: number
  ratioSwitch: boolean
  ratio: 'square' | 'horizontal' | 'vertical' | 'userSet'
  userRatio: number
  idRangeSwitch: boolean
  idRangeInput: number
  idRange: '>' | '<'
  noSerialNo: boolean
  filterBlackWhite: boolean
  sizeSwitch: boolean
  sizeMin: number
  sizeMax: number
  novelSaveAs: 'txt' | 'epub'
  saveNovelMeta: boolean
  deduplication: boolean
  dupliStrategy: 'strict' | 'loose'
  fileNameLengthLimitSwitch: boolean
  fileNameLengthLimit: number
  imageSize: 'original' | 'regular' | 'small'
  dateFormat: string
  userSetLang: 'zh-cn' | 'zh-tw' | 'ja' | 'en' | 'auto'
  bmkAfterDL: boolean
  widthTag: 'yes' | 'no'
  restrict: 'yes' | 'no'
  userBlockList: boolean
  blockList: string[]
  needTagMode: 'all' | 'one'
  theme: 'auto' | 'white' | 'dark'
}

class Settings {
  constructor() {
    // 第一时间恢复用户设置
    this.restoreSettings()

    this.bindEvents()
  }

  private storeName = 'xzSetting'

  // 默认设置
  private readonly defaultSettings: XzSetting = {
    setWantPage: -1,
    wantPageArr: [
      -1,
      -1,
      -1,
      -1,
      -1,
      1000,
      -1,
      500,
      -1,
      1000,
      100,
      -1,
      100,
      -1,
      -1,
      1000,
      100,
      100,
      100,
      100,
      -1,
    ],
    firstFewImagesSwitch: false,
    firstFewImages: 1,
    downType0: true,
    downType1: true,
    downType2: true,
    downType3: true,
    downSingleImg: true,
    downMultiImg: true,
    downColorImg: true,
    downBlackWhiteImg: true,
    downNotBookmarked: true,
    downBookmarked: true,
    ugoiraSaveAs: 'webm',
    convertUgoiraThread: 1,
    needTag: [],
    notNeedTag: [],
    quietDownload: true,
    downloadThread: 5,
    userSetName: '{id}',
    namingRuleList: [],
    tagNameToFileName: false,
    alwaysFolder: false,
    workDir: false,
    workDirFileNumber: 1,
    workDirName: 'id',
    showOptions: true,
    postDate: false,
    postDateStart: 946684800000,
    postDateEnd: 4102444800000,
    previewResult: true,
    BMKNumSwitch: false,
    BMKNumMin: 0,
    BMKNumMax: 999999,
    BMKNumAverageSwitch: false,
    BMKNumAverage: 600,
    setWHSwitch: false,
    widthHeightLimit: '>=',
    setWidthAndOr: '&',
    setWidth: 0,
    setHeight: 0,
    ratioSwitch: false,
    ratio: 'horizontal',
    userRatio: 1.4,
    idRangeSwitch: false,
    idRangeInput: 0,
    idRange: '>',
    needTagSwitch: false,
    notNeedTagSwitch: false,
    noSerialNo: false,
    filterBlackWhite: false,
    sizeSwitch: false,
    sizeMin: 0,
    sizeMax: 100,
    novelSaveAs: 'txt',
    saveNovelMeta: false,
    deduplication: false,
    dupliStrategy: 'loose',
    fileNameLengthLimitSwitch: false,
    fileNameLengthLimit: 200,
    imageSize: 'original',
    dateFormat: 'YYYY-MM-DD',
    userSetLang: 'auto',
    bmkAfterDL: false,
    widthTag: 'yes',
    restrict: 'no',
    userBlockList: false,
    blockList: [],
    theme: 'auto',
    needTagMode: 'all',
  }

  private allSettingKeys = Object.keys(this.defaultSettings)

  private floatNumberKey = ['userRatio', 'sizeMin', 'sizeMax']
  private numberArrayKey = ['wantPageArr']
  private stringArrayKey = [
    'namingRuleList',
    'blockList',
    'needTag',
    'notNeedTag',
  ]

  // 以默认设置作为初始设置
  public settings: XzSetting = Tools.deepCopy(this.defaultSettings)

  private bindEvents() {
    // 当设置发生变化时进行本地存储
    window.addEventListener(EVT.list.settingChange, () => {
      localStorage.setItem(this.storeName, JSON.stringify(this.settings))
    })

    window.addEventListener(EVT.list.resetSettings, () => {
      this.reset()
    })

    window.addEventListener(EVT.list.exportSettings, () => {
      this.exportSettings()
    })

    window.addEventListener(EVT.list.importSettings, () => {
      this.importSettings()
    })
  }

  // 读取保存的设置，合并到当前设置上
  private restoreSettings() {
    const savedSettings = localStorage.getItem(this.storeName)
    if (savedSettings) {
      this.assignSettings(JSON.parse(savedSettings))
    }
  }

  // 接收整个设置项，通过循环将其更新到 settings 上
  // 循环设置而不是整个替换的原因：
  // 1. 进行类型转换，如某些设置项是 number ，但是数据来源里是 string，setSetting 可以把它们转换到正确的类型
  // 2. 某些选项在旧版本里没有，所以不能用旧的设置整个覆盖
  private assignSettings(data: XzSetting) {
    const origin = Tools.deepCopy(data)
    for (const [key, value] of Object.entries(origin)) {
      this.setSetting(key as keyof XzSetting, value, false)
    }
    // 触发设置改变事件
    EVT.fire(EVT.list.settingChange)
  }

  private exportSettings() {
    const str = JSON.stringify(settings, null, 2)
    const blob = new Blob([str], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    DOM.downloadFile(url, `pixiv_batch_downloader-settings.json`)
  }

  private async importSettings() {
    const loadedJSON = (await DOM.loadJSONFile().catch((err) => {
      return EVT.sendMsg({
        type: 'error',
        msg: err,
      })
    })) as XzSetting
    if (!loadedJSON) {
      return
    }
    // 检查是否存在设置里的属性
    if (loadedJSON.downloadThread === undefined) {
      return EVT.sendMsg({
        type: 'error',
        msg: 'Format error!',
      })
    }
    // 开始恢复导入的设置
    this.reset(loadedJSON)
  }

  // 重设选项
  // 可选参数：传递整个设置的数据，用于从配置文件导入，恢复设置
  private reset(data?: XzSetting) {
    if (data) {
      this.assignSettings(data)
    } else {
      // 将选项恢复为默认值
      this.assignSettings(this.defaultSettings)
    }
    EVT.fire(EVT.list.resetSettingsEnd)
  }

  private tipError(key: string) {
    EVT.sendMsg({
      msg: `${key}: Invalid value`,
      type: 'error',
    })
  }

  // 更改设置项
  // 其他模块应该通过这个方法更改设置
  // 这里面有一些类型转换的代码，主要目的：
  // 1. 兼容旧版本的设置。读取旧版本的设置时，将其转换成新版本的设置。例如某个设置在旧版本里是 string 类型，值为 'a,b,c'。新版本里是 string[] 类型，这里会自动将其转换成 ['a','b','c']
  // 2. 减少额外操作。例如某个设置的类型为 string[]，其他模块可以传递 string 类型的值如 'a,b,c'，而不必先把它转换成 string[]
  public setSetting(
    key: keyof XzSetting,
    value: string | number | boolean | string[] | number[],
    fireEvt = true,
  ) {
    if (!this.allSettingKeys.includes(key)) {
      return
    }

    const keyType = typeof this.defaultSettings[key]
    const valueType = typeof value

    // 把旧的设置值转换为新的设置值。需要转换的值都是 string 类型
    if (valueType === 'string') {
      value = convertOldSettings.convert(key, value as string)
    }

    // 将传入的值转换成选项对应的类型
    if (keyType === 'string' && valueType !== 'string') {
      value = value.toString()
    }

    if (keyType === 'number' && valueType !== 'number') {
      // 时间是需要特殊处理的 number 类型
      if (key === 'postDateStart' || key == 'postDateEnd') {
        if (valueType === 'string') {
          if (value === '') {
            return this.tipError(key)
          }
          const date = new Date(value as string)
          value = date.getTime()
        }
      } else {
        // 处理普通的 number 类型
        if (this.floatNumberKey.includes(key)) {
          value = Number.parseFloat(value as any)
        } else {
          value = Number.parseInt(value as any)
        }
      }

      if (isNaN(value as number)) {
        return this.tipError(key)
      }
    }

    if (keyType === 'boolean' && valueType !== 'boolean') {
      value = !!value
    }

    if (Array.isArray(this.defaultSettings[key])) {
      if (this.stringArrayKey.includes(key)) {
        // 字符串转换成 string[]
        if (valueType === 'string') {
          value = Tools.string2array(value as string)
        }
      }

      if (this.numberArrayKey.includes(key)) {
        // 把数组转换成 number[]
        if (Array.isArray(value)) {
          value = (value as any[]).map((val: string | number) => {
            if (typeof val !== 'number') {
              return Number(val)
            } else {
              return val
            }
          })
        } else {
          return
        }
      }
    }

    // 更改设置
    ;(this.settings[key] as any) = value

    // 触发设置变化的事件
    // 在进行批量操作（如恢复设置、导入设置、重置设置）的时候，可以将 fireEvt 设为 false，等操作执行之后自行触发这个事件
    if (fireEvt) {
      EVT.fire(EVT.list.settingChange, { name: key, value: value })
    }
  }
}

const self = new Settings()
const settings = self.settings
const setSetting = self.setSetting.bind(self)

export { settings, setSetting }
