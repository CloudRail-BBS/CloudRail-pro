/**
 * 短视频通用播放工具（抖音 / 快手 / 西瓜）
 * 供帖子列表页（首页/瀑布流/圈子/个人主页）复用：
 * 将一个帖子对象（含 douyin_url 等字段）组装成 DouyinPlayer 所需的 videoList。
 * 若 douyin_url 是原始分享链接，则先调用第三方解析 API 获取真实播放地址。
 */

// 第三方解析接口
// 抖音/西瓜：原接口（如你项目里已有可保留）
var PARSE_API_DOUYIN =
  'https://api.your-domain.com/short_videos/api/kuaishou/ksjx.php?url='

// 快手：使用同一个 ksjx 接口（你给的返回结构就是它的）
var PARSE_API_KUAISHOU =
  'https://api.your-domain.com/short_videos/api/kuaishou/ksjx.php?url='

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url === '0' || url === 'null' || url === 'undefined') return false
  var urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/
  return urlPattern.test(url)
}

export function extractUrlFromText(text) {
  if (!text || typeof text !== 'string') return null
  // 从文本中提取抖音/西瓜/快手链接
  var urlPattern =
    /https?:\/\/(?:v\.)?(douyin|ixigua|kuaishou|v\.kuaishou|chenzhongtech)\.com\/[^\s]+/gi
  var matches = text.match(urlPattern)
  if (matches && matches.length > 0) {
    return matches[0].trim()
  }
  return null
}

export function isOriginalDouyinUrl(url) {
  return (
    url.indexOf('douyin.com') !== -1 ||
    url.indexOf('v.douyin.com') !== -1 ||
    url.indexOf('ixigua.com') !== -1
  )
}

export function isKuaishouUrl(url) {
  return (
    url.indexOf('kuaishou.com') !== -1 ||
    url.indexOf('v.kuaishou.com') !== -1 ||
    url.indexOf('chenzhongtech.com') !== -1
  )
}

/**
 * 通用解析函数：调用第三方接口解析原始分享链接
 * 兼容抖音/西瓜/快手返回结构
 * @param {string} shareUrl 原始分享链接
 * @param {string} apiUrl 使用的解析接口
 * @returns {Promise<{url:string, cover:string, title:string, author:string, avatar:string}>}
 */
export function parseShareUrl(shareUrl, apiUrl) {
  return new Promise(function (resolve, reject) {
    uni.request({
      url: apiUrl + encodeURIComponent(shareUrl),
      method: 'GET',
      timeout: 30000,
      success: function (res) {
        if (res.statusCode !== 200) {
          reject({ msg: '解析请求失败' })
          return
        }
        var data = res.data
        var isSuccess =
          !data.code ||
          data.code === 0 ||
          data.code === '0' ||
          data.code === 200 ||
          data.success === true ||
          data.success === 'true'
        if (!data || !isSuccess) {
          reject({ msg: (data && (data.msg || data.message)) || '解析失败' })
          return
        }

        var resultData = data.data || data

        // ---- 播放地址 ----
        var playUrl = ''
        if (resultData.url) playUrl = resultData.url
        else if (resultData.video_url) playUrl = resultData.video_url
        else if (resultData.video) playUrl = resultData.video
        else if (resultData.play) playUrl = resultData.play
        else if (resultData.playUrl) playUrl = resultData.playUrl
        else if (resultData.download_url) playUrl = resultData.download_url

        // ---- 封面 ----
        var cover = ''
        if (resultData.cover) cover = resultData.cover
        else if (resultData.cover_url) cover = resultData.cover_url
        else if (resultData.img) cover = resultData.img
        else if (resultData.thumbnail) cover = resultData.thumbnail

        // ---- 标题 / 作者 / 头像 ----
        var title = resultData.title || ''
        var author =
          resultData.author || resultData.nickname || resultData.name || ''
        var avatar = resultData.avatar || ''

        if (!playUrl) {
          reject({ msg: '解析失败，未能获取视频链接' })
          return
        }

        resolve({
          url: playUrl,
          cover: cover,
          title: title,
          author: author,
          avatar: avatar
        })
      },
      fail: function () {
        reject({ msg: '解析请求失败' })
      }
    })
  })
}

/**
 * 兼容旧调用：抖音解析
 */
export function parseDouyinUrl(douyinUrl) {
  return parseShareUrl(douyinUrl, PARSE_API_DOUYIN)
}

/**
 * 快手解析
 */
export function parseKuaishouUrl(kuaishouUrl) {
  return parseShareUrl(kuaishouUrl, PARSE_API_KUAISHOU)
}

/**
 * 核心方法：根据帖子对象组装 DouyinPlayer 的 videoList
 * @param {object} post 帖子对象
 * @returns {Promise<Array>} videoList
 */
export async function buildDouyinVideoList(post) {
  if (!post || !post.douyin_url) {
    uni.showToast({ title: '视频链接为空', icon: 'none' })
    return []
  }

  var douyinUrl = post.douyin_url
  var extractedUrl = extractUrlFromText(douyinUrl)
  if (extractedUrl) douyinUrl = extractedUrl

  if (!isValidUrl(douyinUrl)) {
    uni.showToast({ title: '视频链接无效', icon: 'none' })
    return []
  }

  var playUrl = douyinUrl
  var cover = post.douyin_cover || ''
  var title = post.douyin_title || ''
  var author = post.douyin_author || ''
  var avatar = post.avatar || ''

  // 原始分享链接：按平台走解析
  if (isOriginalDouyinUrl(douyinUrl) || isKuaishouUrl(douyinUrl)) {
    try {
      var parsed
      if (isKuaishouUrl(douyinUrl)) {
        parsed = await parseKuaishouUrl(douyinUrl)
      } else {
        parsed = await parseDouyinUrl(douyinUrl)
      }
      playUrl = parsed.url
      cover = parsed.cover || cover
      title = parsed.title || title
      author = parsed.author || author
      avatar = parsed.avatar || avatar
    } catch (e) {
      uni.showToast({ title: (e && e.msg) || '解析失败', icon: 'none' })
      return []
    }
  }

  return [
    {
      id: post.id,
      url: playUrl,
      cover: cover || '/static/logo.png',
      title: title || '视频',
      author: author || post.name || post.username || '匿名',
      authorId: post.user_id,
      authorAvatar: avatar || post.avatar || '/static/logo.png',
      likeCount: post.like_count || 0,
      commentCount: post.comment_count || 0,
      rewardCount: post.reward_count || 0,
      isLiked: !!post.is_liked,
      isFollowed: !!post.is_followed,
      comments: []
    }
  ]
}