const SILICONFLOW_API_KEY = 'sk-dzqfcrfmtoxiiktmdgvaxlvjfgahlcmdfeinomdlczliowuo'
const MODEL_NAME = 'Qwen/Qwen3-8B'
const MIN_RESPONSE_TIME = 1500

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const chatWithDoubao = async (message, history = []) => {
  const startTime = Date.now()
  
  if (!SILICONFLOW_API_KEY) {
    await sleep(MIN_RESPONSE_TIME)
    return generateMockResponse(message)
  }

  try {
    const messages = [
      {
        role: 'system',
        content: '你是一个友好的AI助手，请用中文回答问题，保持对话自然流畅。'
      },
      ...history.map(h => ({
        role: h.role,
        content: h.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    return new Promise((resolve) => {
      uni.request({
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
        },
        data: {
          model: MODEL_NAME,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: false
        },
        timeout: 30000,
        success: async (res) => {
          const elapsed = Date.now() - startTime
          if (elapsed < MIN_RESPONSE_TIME) {
            await sleep(MIN_RESPONSE_TIME - elapsed)
          }

          if (res.data && res.data.choices && res.data.choices.length > 0) {
            resolve(res.data.choices[0].message.content)
          } else if (res.data && res.data.error) {
            resolve(`抱歉，服务暂时不可用。(${res.data.error.message})`)
          } else if (res.data && res.data.message) {
            resolve(`抱歉，API调用失败：${res.data.message}`)
          } else {
            resolve('抱歉，无法获取AI响应，请检查API配置。')
          }
        },
        fail: async () => {
          const elapsed = Date.now() - startTime
          if (elapsed < MIN_RESPONSE_TIME) {
            await sleep(MIN_RESPONSE_TIME - elapsed)
          }
          resolve(generateMockResponse(message))
        }
      })
    })
  } catch (error) {
    await sleep(MIN_RESPONSE_TIME)
    return generateMockResponse(message)
  }
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