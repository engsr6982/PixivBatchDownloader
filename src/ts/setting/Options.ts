import { Config } from '../Config'
import { EVT } from '../EVT'
import { lang } from '../Lang'
import { pageType } from '../PageType'
import { settings } from './Settings'

interface WantPageArg {
  text: string
  tip: string
  rangTip: string
  min: number
  max: number
}

interface WantPageEls {
  text: HTMLSpanElement
  rangTip: HTMLSpanElement
  input: HTMLInputElement
  setMin: HTMLButtonElement
  setMax: HTMLButtonElement
}

// 控制每个设置的隐藏、显示
// 设置页数/个数的提示文本
class Options {
  public init(allOption: NodeListOf<HTMLElement>) {
    this.showSetWantPageTipButton = document.querySelector(
      '.settingForm .showSetWantPageTip'
    )! as HTMLButtonElement
    this.allOption = allOption

    // 获取“页数/个数”设置的元素
    const wantPageOption = this.getOption(1)!
    this.wantPageEls = {
      text: wantPageOption.querySelector(
        '.setWantPageTip1'
      )! as HTMLSpanElement,
      rangTip: wantPageOption.querySelector(
        '.setWantPageTip2'
      )! as HTMLSpanElement,
      input: wantPageOption.querySelector('.setWantPage')! as HTMLInputElement,
      setMin: wantPageOption.querySelector('#setMin')! as HTMLButtonElement,
      setMax: wantPageOption.querySelector('#setMax')! as HTMLButtonElement,
    }

    this.handleShowAdvancedSettings()
    this.bindEvents()
  }

  private showSetWantPageTipButton!: HTMLButtonElement
  private hiddenButtonPages = [
    pageType.list.AreaRanking,
    pageType.list.ArtworkRanking,
    pageType.list.Pixivision,
    pageType.list.BookmarkDetail,
    pageType.list.Discover,
    pageType.list.NewArtwork,
    pageType.list.NovelRanking,
    pageType.list.NewNovel,
    pageType.list.Request,
    pageType.list.Unlisted,
  ]

  private allOption!: NodeListOf<HTMLElement>

  private wantPageEls!: WantPageEls

  // 保持显示的选项的 id
  private readonly whiteList: number[] = [
    1, 2, 4, 13, 17, 32, 44, 50, 51, 57, 64,
  ]

  // 某些页面类型需要隐藏某些选项。当调用 hideOption 方法时，把选项 id 保存起来
  // 优先级高于 whiteList
  private hiddenList: number[] = []

  private bindEvents() {
    window.addEventListener(EVT.list.settingChange, (ev: CustomEventInit) => {
      const data = ev.detail.data as any
      if (data.name === 'showAdvancedSettings') {
        this.handleShowAdvancedSettings()
      }
    })

    window.addEventListener(EVT.list.settingInitialized, () => {
      this.alwaysHideSomeOption()
    })

    const list = [
      EVT.list.pageSwitchedTypeNotChange,
      EVT.list.pageSwitchedTypeChange,
    ]
    list.forEach((ev) => {
      window.addEventListener(ev, () => {
        this.hiddenList = []
        window.setTimeout(() => {
          this.handleShowAdvancedSettings()
          this.alwaysHideSomeOption()
        })
      })
    })
  }

  // 总是隐藏某些设置
  private alwaysHideSomeOption() {
    this.hideOption([79, 80])

    // 在移动端某些设置不会生效，所以隐藏它们
    // 主要是和作品缩略图相关的一些设置
    if (Config.mobile) {
      this.hideOption([18, 68, 55, 71, 62, 40])
    }
  }

  private handleShowAdvancedSettings() {
    for (const option of this.allOption) {
      if (option.dataset.no === undefined) {
        continue
      }

      const no = Number.parseInt(option.dataset.no)

      // 如果需要隐藏高级设置
      if (!settings.showAdvancedSettings) {
        // 如果在白名单中，并且当前页面不需要隐藏它，那么它就是显示的
        if (this.whiteList.includes(no) && !this.hiddenList.includes(no)) {
          this.showOption([no])
        }

        // 如果没有在白名单中，或者当前页面需要隐藏它，就隐藏它
        if (!this.whiteList.includes(no) || this.hiddenList.includes(no)) {
          option.style.display = 'none'
        }
      } else {
        // 如果需要显示高级设置，那么只隐藏当前页面需要隐藏的选项
        if (this.hiddenList.includes(no)) {
          option.style.display = 'none'
        } else {
          this.showOption([no])
        }
      }
    }
  }

  // 使用编号获取指定选项的元素
  private getOption(no: number) {
    for (const option of this.allOption) {
      if (option.dataset.no === no.toString()) {
        return option
      }
    }
    throw `Not found this option: ${no}`
  }

  // 显示或隐藏指定的选项
  private setOptionDisplay(no: number[], display: string) {
    for (const number of no) {
      this.getOption(number).style.display = display
    }
  }

  // 显示所有选项
  // 在切换不同页面时使用
  public showAllOption() {
    for (const el of this.allOption) {
      el.style.display = 'block'
    }
  }

  // 隐藏指定的选项。参数是数组，传递设置项的编号。
  // 注意：由于这个方法会修改 hiddenList，所以它是有副作用的
  // 这个方法只应该在其他类里面使用，在这个类里不要直接调用它
  public hideOption(no: number[]) {
    this.hiddenList = no
    this.setOptionDisplay(no, 'none')
  }

  // 显示指定的选项。因为页面无刷新加载，所以一些选项被隐藏后，可能需要再次显示
  public showOption(no: number[]) {
    this.setOptionDisplay(no, 'block')
  }

  // 设置“抓取多少作品/页面” 选项的提示和预设值
  public setWantPageTip(arg: WantPageArg) {
    // 当页面里设置的是作品个数，而非页面数量时，隐藏这个按钮，因为它只在设置页面数量时有用
    if (this.hiddenButtonPages.includes(pageType.type)) {
      this.showSetWantPageTipButton.style.display = 'none'
    } else {
      this.showSetWantPageTipButton.style.display = 'inline-block'
    }

    // 设置这个选项的文字
    lang.updateText(this.wantPageEls.text, arg.text)
    this.wantPageEls.text.dataset.xztip = arg.tip
    this.wantPageEls.text.dataset.tip = lang.transl(arg.tip as any)

    // 设置最小值和最大值
    this.wantPageEls.setMin.textContent = arg.min.toString()
    this.wantPageEls.setMax.textContent = arg.max.toString()
    this.wantPageEls.setMin.onclick = () => {
      this.wantPageEls.input.value = arg.min.toString()
      this.wantPageEls.input.dispatchEvent(new Event('change'))
    }
    this.wantPageEls.setMax.onclick = () => {
      this.wantPageEls.input.value = arg.max.toString()
      this.wantPageEls.input.dispatchEvent(new Event('change'))
    }

    // 设置可以输入的值的范围提示
    // 需要翻译的情况
    if (arg.rangTip.startsWith('_')) {
      lang.updateText(this.wantPageEls.rangTip, arg.rangTip)
    } else {
      // 也可能直接传递了字符串，不需要翻译
      lang.updateText(this.wantPageEls.rangTip, '')
      this.wantPageEls.rangTip.textContent = arg.rangTip
    }
  }
}

const options = new Options()
export { options }
