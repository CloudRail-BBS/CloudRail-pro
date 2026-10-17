const MIN_RESPONSE_TIME = 1500

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Provider credentials cannot be kept secret in a client bundle. Until an
// authenticated server-side AI proxy is configured, use local help responses.
export const chatWithDoubao = async (message, history = []) => {
  await sleep(MIN_RESPONSE_TIME)
  return generateMockResponse(String(message || ''))
}

const generateMockResponse = (question) => {
  const q = question.toLowerCase()
  
  if (q.includes('发布') || q.includes('帖子')) {
    return '发布帖子很简单！点击首页右下角的 ➕ 按钮，选择"发布帖子"，然后填写内容、添加图片或视频，最后点击发布即可。'
  }
  
  if (q.includes('vip') || q.includes('会员')) {
    return '成为VIP会员可以享受更多特权！你可以进入"我的"->"设置"->"会员中心"查看VIP权益详情。'
  }
  
  if (q.includes('个人信息') || q.includes('修改')) {
    return '修改个人信息：点击右下角"我的"进入个人中心，点击头像或"编辑资料"按钮，就可以修改头像、昵称、简介等信息了。'
  }
  
  if (q.includes('功能') || q.includes('社区')) {
    return '星域社区是一个综合性的社交平台，主要功能包括：发布图文视频、评论互动、私信聊天、关注好友、商城购物、软件库、游戏中心等。'
  }
  
  const defaultResponses = [
    '这是一个很好的问题！让我想想...根据我的理解，这个问题可以从多个角度来看。',
    '我理解你的问题了。在星域社区，我们致力于为用户提供最好的体验。',
    '感谢你的提问！作为AI助手，我很乐意帮助你。',
    '你好！很高兴为你服务，请问有什么可以帮助你的吗？',
    '这个问题很有意思，让我来为你解答。'
  ]
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}
