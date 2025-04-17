import {
  UserImageWorksWithTag,
  BookmarkData,
  UserProfile,
  UserProfileAllData,
  ArtworkData,
  UgoiraMetaData,
  RecommendData,
  RankingData,
  RecommenderData,
  SearchData,
  NewIllustData,
  BookMarkNewData,
  UserNovelsWithTag,
  NovelData,
  NovelSeriesData,
  NovelSearchData,
  NewNovelData,
  FollowingResponse,
  SeriesData,
  muteData,
  NovelSeriesGlossary,
  NovelSeriesGlossaryItem,
  LatestMessageData,
  NovelSeriesContentData,
  NovelInsertIllusts,
} from './crawl/CrawlResult'

import {
  userWorksType,
  RankingOption,
  SearchOption,
  NewIllustOption,
  tagPageFlag,
} from './crawl/CrawlArgument'

import { IDData } from './store/StoreType'

/** 点击 like 按钮的返回数据 */
interface LikeResponse {
  error: boolean
  message: '' | string
  body:
    | []
    | {
        is_liked: boolean
      }
}

class API {
  // 发送 get 请求，返回 json 数据，抛出异常
  static sendGetRequest<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'get',
        credentials: 'same-origin',
      })
        .then((response) => {
          // response.ok 的状态码范围是 200-299
          if (response.ok) {
            return response.json()
          } else {
            // 请求成功但状态码异常
            reject({
              status: response.status,
              statusText: response.statusText,
            })
            switch (response.status) {
              case 400:
                return console.error(
                  'Status Code: 400（Bad Request）。服务器无法理解此请求'
                )
              case 401:
                return console.error(
                  'Status Code: 401（Unauthorized）。您可能需要登录 Pixiv 账号'
                )
              case 403:
                return console.error(
                  'Status Code: 403（Forbidden）。服务器拒绝了这个请求'
                )
              case 404:
                return console.error(
                  'Status Code: 404（Not Found）。服务器找不到请求的资源'
                )
              case 500:
                return console.error(
                  'Status Code: 500（Internal Server Error）。服务器内部错误'
                )
              case 503:
                return console.error(
                  'Status Code: 503（Service Unavailable）。服务器忙或者在维护'
                )
              default:
                return console.error(
                  `请求的状态不正确，状态码：${response.status}`
                )
            }
          }
        })
        .then((data) => {
          resolve(data)
        })
        .catch((error) => {
          // 请求失败
          reject(error)
        })
    })
  }

  // 获取收藏数据
  // 这个 api 返回的作品列表顺序是按收藏顺序由近期到早期排列的
  static async getBookmarkData(
    userID: string,
    type: 'illusts' | 'novels' = 'illusts',
    tag: string,
    offset: number,
    hide: boolean = false
  ): Promise<BookmarkData> {
    const url = `https://www.pixiv.net/ajax/user/${userID}/${type}/bookmarks?tag=${tag}&offset=${offset}&limit=100&rest=${
      hide ? 'hide' : 'show'
    }&rdm=${Math.random()}`

    return this.sendGetRequest(url)
  }

  // 添加收藏
  static async addBookmark(
    id: string,
    type: 'illusts' | 'novels',
    tags: string[],
    hide: boolean,
    token: string
  ) {
    const restrict: 1 | 0 = hide ? 1 : 0

    let body = {}
    if (type === 'illusts') {
      body = {
        comment: '',
        illust_id: id,
        restrict: restrict,
        tags: tags,
      }
    } else {
      body = {
        comment: '',
        novel_id: id,
        restrict: restrict,
        tags: tags,
      }
    }

    return fetch(`https://www.pixiv.net/ajax/${type}/bookmarks/add`, {
      method: 'POST',
      credentials: 'same-origin', // 附带 cookie
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-token': token,
      },
      body: JSON.stringify(body),
    })
  }

  static async deleteBookmark(
    bookmarkID: number | string,
    type: 'illusts' | 'novels',
    token: string
  ) {
    const bodyStr =
      type === 'illusts'
        ? `bookmark_id=${bookmarkID}`
        : `del=1&book_id=${bookmarkID}`

    return fetch(`https://www.pixiv.net/ajax/${type}/bookmarks/delete`, {
      method: 'POST',
      credentials: 'same-origin', // 附带 cookie
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'x-csrf-token': token,
      },
      body: bodyStr,
    })
  }

  // 获取关注的用户列表
  static getFollowingList(
    id: string,
    rest: 'show' | 'hide' = 'show',
    tag = '',
    offset = 0,
    limit = 100,
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/following?offset=${offset}&limit=${limit}&rest=${rest}&tag=${tag}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取好 P 友列表
  static getMyPixivList(
    id: string,
    offset = 0,
    limit = 100,
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/mypixiv?offset=${offset}&limit=${limit}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取粉丝列表
  static getFollowersList(
    id: string,
    offset = 0,
    limit = 100,
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/followers?offset=${offset}&limit=${limit}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取用户信息
  static getUserProfile(id: string): Promise<UserProfile> {
    // full=1 在画师的作品列表页使用，获取详细信息
    // full=0 在作品页内使用，只获取少量信息
    const url = `https://www.pixiv.net/ajax/user/${id}?full=1`
    return this.sendGetRequest(url)
  }

  // 获取用户指定类型的作品列表
  // 返回作品的 id 列表，不包含详细信息
  static async getUserWorksByType(
    id: string,
    type: userWorksType[] = ['illusts', 'manga', 'novels']
  ): Promise<IDData[]> {
    let typeSet = new Set(type)
    let result: IDData[] = []
    const url = `https://www.pixiv.net/ajax/user/${id}/profile/all`

    let data: UserProfileAllData = await this.sendGetRequest(url)
    for (const type of typeSet.values()) {
      const idList = Object.keys(data.body[type])
      for (const id of idList) {
        result.push({
          type,
          id,
        })
      }
    }

    return result
  }

  // 获取用户指定类型、并且指定 tag 的作品列表
  // 返回整个请求的结果，里面包含作品的详细信息
  // 必须带 tag 使用。不带 tag 虽然也能获得数据，但是获得的并不全，很奇怪。
  static getUserWorksByTypeWithTag(
    id: string,
    type: tagPageFlag,
    tag: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<UserImageWorksWithTag | UserNovelsWithTag> {
    // https://www.pixiv.net/ajax/user/2369321/illusts/tag?tag=Fate/GrandOrder&offset=0&limit=100
    const url = `https://www.pixiv.net/ajax/user/${id}/${type}/tag?tag=${tag}&offset=${offset}&limit=${limit}`
    return this.sendGetRequest(url)
  }

  // 获取插画 漫画 动图 的详细信息
  static getArtworkData(id: string, unlisted = false): Promise<ArtworkData> {
    const url = `https://www.pixiv.net/ajax/illust/${
      unlisted ? 'unlisted/' : ''
    }${id}`
    return this.sendGetRequest(url)
  }

  // 获取动图的元数据
  static getUgoiraMeta(id: string): Promise<UgoiraMetaData> {
    const url = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`
    return this.sendGetRequest(url)
  }

  // 获取小说的详细信息
  static getNovelData(id: string, unlisted = false): Promise<NovelData> {
    const url = `https://www.pixiv.net/ajax/novel/${
      unlisted ? 'unlisted/' : ''
    }${id}`
    return this.sendGetRequest(url)
  }

  // 获取相关作品
  static getRelatedData(id: string): Promise<RecommendData> {
    // 最后的 18 是预加载首屏的多少个作品的信息，和下载并没有关系
    const url = `https://www.pixiv.net/ajax/illust/${id}/recommend/init?limit=18`
    return this.sendGetRequest(url)
  }

  // 获取排行榜数据
  // 排行榜数据基本是一批 50 条作品信息
  static getRankingData(option: RankingOption): Promise<RankingData> {
    let url = `https://www.pixiv.net/ranking.php?mode=${option.mode}&p=${option.p}&format=json`

    // 把可选项添加到 url 里
    let temp = new URL(url)

    // 下面两项需要判断有值再添加。不可以让这些字段使用空值
    if (option.worksType) {
      temp.searchParams.set('content', option.worksType)
    }
    if (option.date) {
      temp.searchParams.set('date', option.date)
    }

    url = temp.toString()

    return this.sendGetRequest(url)
  }

  // 获取收藏后的相似作品数据
  // 需要传入作品 id 和要抓取的数量。但是实际获取到的数量会比指定的数量少一些
  static getRecommenderData(
    id: string,
    number: number
  ): Promise<RecommenderData> {
    const url = `/rpc/recommender.php?type=illust&sample_illusts=${id}&num_recommendations=${number}`
    return this.sendGetRequest(url)
  }

  // 获取搜索数据
  static getSearchData(
    word: string,
    type: string = 'artworks',
    p: number = 1,
    option: SearchOption = {}
  ): Promise<SearchData> {
    // 基础的 url
    let url = `https://www.pixiv.net/ajax/search/${type}/${encodeURIComponent(
      word
    )}?word=${encodeURIComponent(word)}&p=${p}`

    // 把可选项添加到 url 里
    let temp = new URL(url)
    for (const [key, value] of Object.entries(option)) {
      if (value) {
        temp.searchParams.set(key, value)
      }
    }
    url = temp.toString()

    return this.sendGetRequest(url)
  }

  static getNovelSearchData(
    word: string,
    p: number = 1,
    option: SearchOption = {}
  ): Promise<NovelSearchData> {
    // 基础的 url
    let url = `https://www.pixiv.net/ajax/search/novels/${encodeURIComponent(
      word
    )}?word=${encodeURIComponent(word)}&p=${p}`

    // 把可选项添加到 url 里
    let temp = new URL(url)
    for (const [key, value] of Object.entries(option)) {
      if (value) {
        temp.searchParams.set(key, value)
      }
    }
    url = temp.toString()

    return this.sendGetRequest(url)
  }

  // 获取大家的新作品的数据
  static getNewIllustData(option: NewIllustOption): Promise<NewIllustData> {
    const url = `https://www.pixiv.net/ajax/illust/new?lastId=${option.lastId}&limit=${option.limit}&type=${option.type}&r18=${option.r18}`
    return this.sendGetRequest(url)
  }

  // 获取大家的新作小说的数据
  static getNewNovleData(option: NewIllustOption): Promise<NewNovelData> {
    const url = `https://www.pixiv.net/ajax/novel/new?lastId=${option.lastId}&limit=${option.limit}&r18=${option.r18}`
    return this.sendGetRequest(url)
  }

  // 获取关注的用户的新作品的数据
  static getBookmarkNewWorkData(
    type: 'illust' | 'novel',
    p: number,
    tag: string = '',
    r18: boolean,
    lang = 'zh'
  ): Promise<BookMarkNewData> {
    const url = `https://www.pixiv.net/ajax/follow_latest/${type}?p=${p}&tag=${tag}&mode=${
      r18 ? 'r18' : 'all'
    }&lang=${lang}`
    return this.sendGetRequest(url)
  }

  /** 获取好P友的最新作品 */
  static getMyPixivNewWorkData(
    type: 'illust' | 'novel',
    p: number,
    lang = 'zh'
  ): Promise<BookMarkNewData> {
    const url = `https://www.pixiv.net/ajax/mypixiv_latest/${type}?p=${p}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  /**获取小说系列的数据，注意只是系列本身的数据，没有系列里每部小说的数据 */
  static getNovelSeriesData(
    series_id: number | string
  ): Promise<NovelSeriesData> {
    const url = `https://www.pixiv.net/ajax/novel/series/${series_id}`
    return this.sendGetRequest(url)
  }

  /**获取小说系列作品里每个作品的详细数据（但是没有小说正文内容） */
  // 这个 api 目前一批最多只能返回 30 个作品的数据，所以可能需要多次获取
  static getNovelSeriesContent(
    series_id: number | string,
    limit: number = 30,
    last_order: number,
    order_by = 'asc'
  ): Promise<NovelSeriesContentData> {
    const url = `https://www.pixiv.net/ajax/novel/series_content/${series_id}?limit=${limit}&last_order=${last_order}&order_by=${order_by}`
    return this.sendGetRequest(url)
  }

  // 获取系列信息
  // 这个接口的数据结构里同时有 illust （包含漫画）和 novel 系列数据
  // 恍惚记得有插画系列来着，但是没找到对应的网址，难道是记错了？
  static getSeriesData(
    series_id: number | string,
    pageNo: number
  ): Promise<SeriesData> {
    const url = `https://www.pixiv.net/ajax/series/${series_id}?p=${pageNo}`
    return this.sendGetRequest(url)
  }

  // 点赞
  static async addLike(
    id: string,
    type: 'illusts' | 'novels',
    token: string
  ): Promise<LikeResponse> {
    let data = {}
    if (type === 'illusts') {
      data = {
        illust_id: id,
      }
    } else {
      data = {
        novel_id: id,
      }
    }
    const r = await fetch(`https://www.pixiv.net/ajax/${type}/like`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-token': token,
      },
      credentials: 'same-origin',
      body: JSON.stringify(data),
    })
    const json = (await r.json()) as LikeResponse
    return json
  }

  static async getMuteSettings(): Promise<muteData> {
    return this.sendGetRequest(
      `https://www.pixiv.net/ajax/mute/items?context=setting`
    )
  }

  /**获取小说里引用的插画的数据，可以一次传递多个插画 id（需要带序号） */
  // illustsIDs 形式例如：[70551567,99760571-1,99760571-130]
  // 如果指定了序号，那么 Pixiv 会返回对应序号的图片 URL
  static async getNovelInsertIllustsData(
    novelID: string | number,
    illustsIDs: string[]
  ): Promise<NovelInsertIllusts> {
    const parameters: string[] = []
    illustsIDs.forEach((id) => parameters.push(`id%5B%5D=${id}`))
    const url =
      `https://www.pixiv.net/ajax/novel/${novelID}/insert_illusts?` +
      parameters.join('&')
    // 组合好的 url 里可能包含多个 id[]=123456789 参数，如：
    // https://www.pixiv.net/ajax/novel/22894530/insert_illusts?id%5B%5D=121979383-1&id%5B%5D=121979454-1&id%5B%5D=121979665-1
    return this.sendGetRequest(url)
  }

  /**获取系列小说的设定资料 */
  static async getNovelSeriesGlossary(
    seriesId: string | number
  ): Promise<NovelSeriesGlossary> {
    return this.sendGetRequest(
      `https://www.pixiv.net/ajax/novel/series/${seriesId}/glossary`
    )
  }

  /**获取系列小说某条设定资料的详细信息 */
  static async getNovelSeriesGlossaryItem(
    seriesId: string | number,
    itemId: string | number
  ): Promise<NovelSeriesGlossaryItem> {
    return this.sendGetRequest(
      `https://www.pixiv.net/ajax/novel/series/${seriesId}/glossary/item/${itemId}`
    )
  }

  /**获取用户最近的几条消息 */
  static async getLatestMessage(number: number): Promise<LatestMessageData> {
    return this.sendGetRequest(
      `https://www.pixiv.net/rpc/index.php?mode=latest_message_threads2&num=${number}&offset=0`
    )
  }

  /**关注一个用户 */
  // recaptcha_enterprise_score_token 对于有些用户是不需要的，不过传递空值是允许的
  static async addFollowingUser(
    userID: string,
    token: string,
    recaptcha_enterprise_score_token?: string
  ): Promise<number> {
    return new Promise(async (resolve) => {
      const response = await fetch(`https://www.pixiv.net/bookmark_add.php`, {
        method: 'POST',
        credentials: 'same-origin', // 附带 cookie
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'x-csrf-token': token,
        },
        body: `mode=add&type=user&user_id=${userID}&tag=&restrict=0&format=json&recaptcha_enterprise_score_token=${recaptcha_enterprise_score_token}`,
      })
      // 如果操作成功，则返回值是 []
      // 如果用户不存在，返回值是该用户主页的网页源码
      // 如果 token 错误，返回值是一个包含错误提示的 JSON 对象
      // 所以这里需要转换为 text
      await response.text()
      return resolve(response.status)
    })
  }
}

export { API }
