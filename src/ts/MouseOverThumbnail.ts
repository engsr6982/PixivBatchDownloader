// 查找（图像）作品的缩略图，当鼠标进入、移出时触发回调
// 回调函数会接收到两个参数：
// el 作品缩略图的元素
// ev 鼠标进入或者移出 el 时的 event
class MouseOverThumbnail {
  constructor() {
    // 立即对作品缩略图绑定事件
    this.handleThumbnail(document.body)
    // 使用监视器，让未来出现的作品缩略图也绑定上事件
    this.createObserver(document.body)
  }

  // 作品缩略图的选择器
  // 注意不是选择整个作品区域，而是只选择缩略图区域
  private readonly selectors = [
    'div[width="136"]',
    'div[width="288"]',
    'div[width="184"]',
    'div[width="112"]',
    'div[width="104"]',
    'div[width="90"]',
    'div[width="118"]',
    '._work',
    'figure > div',
  ]

  private enterCallback: Function[] = []
  private leaveCallback: Function[] = []

  // 判断元素是否含有作品缩略图，如果找到了缩略图则为其绑定事件
  private handleThumbnail(parent: HTMLElement) {
    if (!parent.querySelectorAll) {
      return
    }
    // 遍历所有的选择器，为找到的元素绑定事件
    // 注意：有时候一个节点里会含有多种尺寸的缩略图，为了全部查找到它们，必须遍历所有的选择器。
    // 如果在查找到某个选择器之后，不再查找剩余的选择器，就会遗漏一部分缩略图。
    for (const selector of this.selectors) {
      const elements = parent.querySelectorAll(selector)
      for (const el of elements) {
        el.addEventListener('mouseenter', (ev) => {
          for (const cb of this.enterCallback) {
            cb(el, ev)
          }
        })

        el.addEventListener('mouseleave', (ev) => {
          for (const cb of this.leaveCallback) {
            cb(el, ev)
          }
        })
      }
    }
  }

  private createObserver(target: HTMLElement) {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.addedNodes.length > 0) {
          // 遍历被添加的元素
          for (const newEl of record.addedNodes) {
            this.handleThumbnail(newEl as HTMLElement)
          }
        }
      }
    })
    observer.observe(target, {
      childList: true,
      subtree: true,
    })
  }

  public onEnter(fn: Function) {
    this.enterCallback.push(fn)
  }

  public onLeave(fn: Function) {
    this.leaveCallback.push(fn)
  }
}

const mouseOverThumbnail = new MouseOverThumbnail()
export { mouseOverThumbnail }