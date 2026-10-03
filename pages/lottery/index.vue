<template>
  <view class="lottery-page">
    <!-- 顶部导航 -->
    <view class="page-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-left" @click="showRankingModal = true">
        <view class="rank-icon-svg">
          <image src="/static/icon/trophy-white.svg" class="rank-icon-img" mode="aspectFit"></image>
        </view>
        <text class="rank-text">排行榜</text>
      </view>
      <view class="header-title">娱乐玩法</view>
      <view class="header-right">
        <view class="score-badge">
          <view class="score-icon-svg">
            <image src="/static/icon/star-fill-white.svg" class="score-icon-img" mode="aspectFit"></image>
          </view>
          <text class="score-num">{{ userScore }}</text>
        </view>
      </view>
    </view>

    <!-- 主内容区 -->
    <scroll-view class="main-content" scroll-y :style="{ paddingTop: (statusBarHeight + 50) + 'px' }">
      <!-- 固定游戏入口 -->
      <view class="fixed-games" v-if="rpsShow || duelShow">
        <view class="fixed-game-card duel-card" v-if="duelShow" @click="goDuelGame">
          <view class="card-bg-decoration duel-bg"></view>
          <view class="card-stars">
            <view class="star-svg star-1"><image src="/static/icon/sparkle-4-white.svg" class="star-img" mode="aspectFit"></image></view>
            <view class="star-svg star-2"><image src="/static/icon/lightning-white.svg" class="star-img" mode="aspectFit"></image></view>
            <view class="star-svg star-3"><image src="/static/icon/sparkle-4-white.svg" class="star-img" mode="aspectFit"></image></view>
          </view>

          <view class="card-header-row">
            <view class="game-title duel-title">
              <view class="title-svg">
                <image src="/static/icon/swords-white.svg" class="title-img" mode="aspectFit"></image>
              </view>
              <text>巅峰对决</text>
            </view>
            <view class="game-status duel-status">挑战中</view>
          </view>

          <view class="game-content">
            <view class="game-emoji-group">
              <view class="emoji-box">
                <view class="emoji-svg ic-red">
                  <image src="/static/icon/gamepad-red.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">发起挑战</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-orange">
                  <image src="/static/icon/hand-wait-orange.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">等待应战</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-gold">
                  <image src="/static/icon/trophy-gold.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">胜者为王</text>
              </view>
            </view>

            <view class="game-meta">
              <view class="meta-item">
                <view class="meta-icon-svg ic-red">
                  <image src="/static/icon/swords-white.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">擂台PK</text>
              </view>
              <view class="meta-item">
                <view class="meta-icon-svg ic-gold">
                  <image src="/static/icon/coin-gold.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">100积分起</text>
              </view>
            </view>
          </view>

          <view class="card-footer">
            <text class="game-desc">消耗积分发起挑战，系统随机判定胜负</text>
            <view class="enter-btn">
              <text>立即挑战</text>
              <view class="enter-arrow-svg">
                <image src="/static/icon/chevron-right-white.svg" class="enter-arrow-img" mode="aspectFit"></image>
              </view>
            </view>
          </view>
        </view>

        <!-- 斗地主（网页版玩法，WebView 打开，走积分） -->
        <view class="fixed-game-card" v-if="ddzShow" @click="goDdz()">
          <view class="card-bg-decoration"></view>
          <view class="card-header-row">
            <view class="game-title">
              <view class="title-svg"><image src="/static/icon/gamepad-red.svg" class="title-img" mode="aspectFit"></image></view>
              <text>斗地主</text>
            </view>
            <view class="game-status duel-status">经典玩法</view>
          </view>
          <view class="game-content">
            <view class="game-emoji-group">
              <view class="emoji-box">
                <view class="emoji-svg ic-red"><image src="/static/icon/gamepad-red.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">三人一桌</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-gold"><image src="/static/icon/coin-gold.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">积分入场</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-orange"><image src="/static/icon/trophy-gold.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">赢取积分</text>
              </view>
            </view>
          </view>
          <view class="card-footer">
            <text class="game-desc">经典斗地主，三人一桌，积分结算</text>
            <view class="enter-btn">
              <text>马上开玩</text>
              <view class="enter-arrow-svg"><image src="/static/icon/chevron-right-white.svg" class="enter-arrow-img" mode="aspectFit"></image></view>
            </view>
          </view>
        </view>

        <!-- 炸金花（网页版玩法，WebView 打开，走积分） -->
        <view class="fixed-game-card" v-if="zjhShow" @click="goZjh()">
          <view class="card-bg-decoration"></view>
          <view class="card-header-row">
            <view class="game-title">
              <view class="title-svg"><image src="/static/icon/sparkle-4-white.svg" class="title-img" mode="aspectFit"></image></view>
              <text>炸金花</text>
            </view>
            <view class="game-status duel-status">多人对战</view>
          </view>
          <view class="game-content">
            <view class="game-emoji-group">
              <view class="emoji-box">
                <view class="emoji-svg ic-red"><image src="/static/icon/sparkle-4-white.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">比牌定输赢</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-gold"><image src="/static/icon/coin-gold.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">积分入场</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-orange"><image src="/static/icon/trophy-gold.svg" class="emoji-img" mode="aspectFit"></image></view>
                <text class="emoji-label">赢取积分</text>
              </view>
            </view>
          </view>
          <view class="card-footer">
            <text class="game-desc">炸金花，多人比牌，积分结算</text>
            <view class="enter-btn">
              <text>马上开玩</text>
              <view class="enter-arrow-svg"><image src="/static/icon/chevron-right-white.svg" class="enter-arrow-img" mode="aspectFit"></image></view>
            </view>
          </view>
        </view>
        <view class="fixed-game-card" v-if="rpsShow" @click="goRpsGame">
          <!-- 装饰背景 -->
          <view class="card-bg-decoration"></view>
          <view class="card-stars">
            <view class="star-svg star-1"><image src="/static/icon/star-5-white.svg" class="star-img" mode="aspectFit"></image></view>
            <view class="star-svg star-2"><image src="/static/icon/star-4-white.svg" class="star-img" mode="aspectFit"></image></view>
            <view class="star-svg star-3"><image src="/static/icon/star-5-white.svg" class="star-img" mode="aspectFit"></image></view>
          </view>

          <!-- 头部区域：标题 + 状态 -->
          <view class="card-header-row">
            <view class="game-title">
              <view class="title-svg rps-icons">
                <image src="/static/icon/fist-white.svg" class="title-img" mode="aspectFit"></image>
              </view>
              <text>石头 剪刀 布</text>
            </view>
            <view class="game-status" :class="{ 'game-status-closed': rpsStatus !== 1 }">
              {{ rpsStatus === 1 ? '进行中' : '已暂停' }}
            </view>
          </view>

          <!-- 游戏内容区 -->
          <view class="game-content">
            <view class="game-emoji-group">
              <view class="emoji-box">
                <view class="emoji-svg ic-cyan">
                  <image src="/static/icon/hand-rock-cyan.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">石头</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-purple">
                  <image src="/static/icon/hand-scissors-purple.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">剪刀</text>
              </view>
              <view class="emoji-box">
                <view class="emoji-svg ic-pink">
                  <image src="/static/icon/hand-paper-pink.svg" class="emoji-img" mode="aspectFit"></image>
                </view>
                <text class="emoji-label">布</text>
              </view>
            </view>

            <!-- 图标下方的标签 -->
            <view class="game-meta">
              <view class="meta-item">
                <view class="meta-icon-svg ic-cyan">
                  <image src="/static/icon/refresh-cyan.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">买定离手</text>
              </view>
              <view class="meta-item">
                <view class="meta-icon-svg ic-gold">
                  <image src="/static/icon/coin-gold.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">100积分/次</text>
              </view>
            </view>
          </view>

          <!-- 描述和进入按钮 -->
          <view class="card-footer">
            <text class="game-desc">3选1押积分，猜对赢大奖</text>
            <view class="enter-btn">
              <text>立即参与</text>
              <view class="enter-arrow-svg">
                <image src="/static/icon/chevron-right-white.svg" class="enter-arrow-img" mode="aspectFit"></image>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 游戏活动列表 -->
      <view class="activity-list">
        <view 
          v-for="(activity, index) in activities" 
          :key="index" 
          class="activity-card"
          @click="enterActivity(activity)"
        >
          <!-- 活动封面 -->
          <view class="activity-cover">
            <image :src="activity.cover" class="cover-img" mode="aspectFill"></image>
            <view class="activity-badge" :class="activity.type">
              <text>{{ activity.typeLabel }}</text>
            </view>
            <view class="activity-status" v-if="activity.status === 'running'">
              <text>进行中</text>
            </view>
          </view>

          <!-- 活动信息 -->
          <view class="activity-info">
            <text class="activity-title">{{ activity.title }}</text>
            <text class="activity-desc">{{ activity.desc }}</text>
            
            <view class="activity-meta">
              <view class="meta-item">
                <view class="meta-icon-svg small ic-blue">
                  <image src="/static/icon/calendar-gray.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">{{ activity.time }}</text>
              </view>
              <view class="meta-item">
                <view class="meta-icon-svg small ic-pink">
                  <image src="/static/icon/gift-gray.svg" class="meta-icon-img" mode="aspectFit"></image>
                </view>
                <text class="meta-text">{{ activity.prizeCount }}个奖品</text>
              </view>
            </view>

            <view class="activity-footer">
              <view class="participate-info">
                <view class="free-count" v-if="activity.freeCount > 0">
                  <text>每日{{ activity.freeCount }}次免费</text>
                </view>
                <view class="cost-info">
                  <view class="cost-icon-svg">
                    <image src="/static/icon/coin-red.svg" class="cost-icon-img" mode="aspectFit"></image>
                  </view>
                  <text>{{ activity.cost }}金币/次</text>
                </view>
              </view>
              <view class="enter-btn">
                <text>立即参与</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 免责声明 -->
      <view class="disclaimer">
        <text class="disclaimer-text">免责声明：本页面所有积分娱乐活动仅供用户休闲娱乐使用，不涉及任何形式的赌博或现金交易。积分不可兑换现金、仅限平台内使用。请理性参与，切勿沉迷。</text>
      </view>
    </scroll-view>

    <!-- 排行榜弹窗 -->
    <view class="modal-mask" v-if="showRankingModal" @click="showRankingModal = false">
      <view class="modal-content" @click.stop>
        <!-- 弹窗头部 -->
        <view class="modal-header">
          <view class="modal-title-wrap">
            <view class="modal-title-svg">
              <image src="/static/icon/trophy-red.svg" class="modal-title-img" mode="aspectFit"></image>
            </view>
            <text class="modal-title">积分排行榜</text>
          </view>
          <view class="modal-close" @click="showRankingModal = false">
            <view class="modal-close-svg">
              <image src="/static/icon/x-gray.svg" class="modal-close-img" mode="aspectFit"></image>
            </view>
          </view>
        </view>

        <!-- 弹窗内容 -->
        <scroll-view class="modal-body" scroll-y>
          <!-- 前三名展示 -->
          <view class="top-three">
            <view class="top-item second" v-if="ranking.length > 1">
              <view class="top-avatar-wrap">
                <image :src="ranking[1].avatar || '/static/user/default.png'" class="top-avatar" mode="aspectFill"></image>
                <view class="medal medal-2">2</view>
              </view>
              <text class="top-name">{{ ranking[1].nickname }}</text>
              <text class="top-score">{{ ranking[1].score }}积分</text>
            </view>

            <view class="top-item first" v-if="ranking.length > 0">
              <view class="top-avatar-wrap">
                <image :src="ranking[0].avatar || '/static/user/default.png'" class="top-avatar king" mode="aspectFill"></image>
                <view class="medal medal-1">
                  <image src="/static/icon/crown-white.svg" class="medal-img" mode="aspectFit"></image>
                </view>
              </view>
              <text class="top-name">{{ ranking[0].nickname }}</text>
              <text class="top-score">{{ ranking[0].score }}积分</text>
            </view>

            <view class="top-item third" v-if="ranking.length > 2">
              <view class="top-avatar-wrap">
                <image :src="ranking[2].avatar || '/static/user/default.png'" class="top-avatar" mode="aspectFill"></image>
                <view class="medal medal-3">3</view>
              </view>
              <text class="top-name">{{ ranking[2].nickname }}</text>
              <text class="top-score">{{ ranking[2].score }}积分</text>
            </view>
          </view>

          <!-- 我的排名 -->
          <view class="my-ranking" v-if="myRanking">
            <view class="my-rank-left">
              <text class="my-rank-num">#{{ myRanking.rank }}</text>
              <image :src="myRanking.avatar || '/static/user/default.png'" class="my-avatar" mode="aspectFill"></image>
              <text class="my-name">{{ myRanking.nickname }}</text>
            </view>
            <text class="my-score">{{ myRanking.score }}积分</text>
          </view>

          <!-- 其他排名（第4-10名） -->
          <view class="ranking-list">
            <view
              v-for="(item, index) in ranking.slice(3, 20)"
              :key="index"
              class="ranking-item"
            >
              <text class="rank-num">{{ index + 4 }}</text>
              <image :src="item.avatar || '/static/user/default.png'" class="rank-avatar" mode="aspectFill"></image>
              <text class="rank-name">{{ item.nickname }}</text>
              <text class="rank-score">{{ item.score }}积分</text>
            </view>
          </view>

          <!-- 空状态 -->
          <view class="ranking-empty" v-if="ranking.length === 0">
            <text class="empty-text">暂无排行榜数据</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../common/request.js'
import { GAME_CENTER_URL } from '../../common/config.js'

export default {
  name: 'LotteryPage',
  data() {
    return {
      userScore: 0,
      activities: [],
      rpsShow: false,
      rpsStatus: 0,
      duelShow: true, // 巅峰对决暂无独立配置，默认显示
      ddzShow: true, // 斗地主（网页版玩法，走积分）
      zjhShow: true, // 炸金花（网页版玩法，走积分）
      statusBarHeight: 0,
      ranking: [],
      myRanking: null,
      rankingTimer: null,
      showRankingModal: false
    }
  },
  onLoad() {
    // 获取状态栏高度
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 0
    this.loadData()
    this.loadRanking()
    this.loadUserScore()
    
    // 排行榜每小时自动刷新一次（低频，影响小）
    this.rankingTimer = setInterval(() => {
      this.loadRanking()
    }, 3600000) // 3600000毫秒 = 1小时
  },
  onUnload() {
    // 页面卸载时清除定时器
    if (this.rankingTimer) {
      clearInterval(this.rankingTimer)
    }
  },
  onHide() {
    // 页面隐藏时暂停排行榜定时器
    if (this.rankingTimer) {
      clearInterval(this.rankingTimer)
      this.rankingTimer = null
    }
  },
  onShow() {
    // 页面重新显示时刷新游戏配置（用户可能在后台改了显示状态）
    this.loadGameList()
    // 每次打开页面刷新一次积分（玩家从子游戏返回时积分已变化，这里即时同步）
    // 不再轮询，避免持续网络请求造成卡顿
    this.loadUserScore()
    // 恢复排行榜定时器
    if (!this.rankingTimer) {
      this.rankingTimer = setInterval(() => {
        this.loadRanking()
      }, 3600000)
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadUserScore() {
      try {
        const userInfo = uni.getStorageSync('userInfo') || {}
        let fetched = null
        /* 必须是「真实积分余额」(users.points)。
           以前读的是 games/rps_score —— 那是「猜拳胜场数×10」的游戏分，
           不是账户余额，所以会显示 0，而且对战赢了不加、输了也不扣（看着像没生效）。 */
        try {
          const prof = await request('user.php', { action: 'profile', userId: userInfo.id }, 'GET')
          if (prof && prof.code === 0 && prof.data) {
            const d = prof.data
            const v = (typeof d.points !== 'undefined') ? d.points : ((typeof d.jifen !== 'undefined') ? d.jifen : d.score)
            fetched = Number(v) || 0
          }
        } catch (e) {}
        if (fetched === null) {
          const lv = (typeof userInfo.points !== 'undefined') ? userInfo.points : ((typeof userInfo.jifen !== 'undefined') ? userInfo.jifen : userInfo.score)
          fetched = Number(lv) || 0
        }
        this.userScore = fetched
        const latest = uni.getStorageSync('userInfo') || {}
        latest.score = fetched
        latest.jifen = fetched
        latest.points = fetched
        uni.setStorageSync('userInfo', latest)
        this.userInfo = latest
      } catch (e) {}
    },
    async loadData() {
      try {
        // 获取用户积分
        const userInfo = uni.getStorageSync('userInfo') || {}
        this.userScore = userInfo.score || 0

        // 获取游戏列表，根据后端配置控制显示
        await this.loadGameList()

        // 模拟获取游戏活动列表（后续改为调用后端接口）
        this.activities = await this.getActivities()
      } catch (e) {
      }
    },
    async loadGameList() {
      try {
        // 映射：games.php -> user/games/list (GET)
        const res = await request('games.php', { action: 'list' }, 'GET')
        if (res.code === 0 && Array.isArray(res.data)) {
          // 查找 RPS 游戏配置
          const rpsGame = res.data.find(g => g.id === 'rps')
          if (rpsGame) {
            // show_in_frontend=1 才显示入口；status 控制是否可玩
            this.rpsShow = Number(rpsGame.show_in_frontend) === 1
            this.rpsStatus = Number(rpsGame.status) === 1 ? 1 : 0
          } else {
            this.rpsShow = false
            this.rpsStatus = 0
          }
        }
      } catch (e) {
        // 接口异常时不显示游戏入口，避免后台已隐藏仍展示
        this.rpsShow = false
        this.rpsStatus = 0
      }
    },
    async getActivities() {
      // 等待后端添加游戏后，改为调用后端接口
      // const res = await request('lottery/activities.php', {}, 'GET')
      // return res.data || []
      return []
    },
    enterActivity(activity) {
      uni.showToast({
        title: `即将进入${activity.title}`,
        icon: 'none'
      })
    },
    goRpsGame() {
      uni.navigateTo({
        url: '/pages/rps-game/index'
      })
    },
    /* 网页版小游戏：带 token 打开 WebView，由游戏平台侧 sso_bridge.php 完成登录态桥接 */
    /* 网页版小游戏：带 token 打开 WebView，由游戏平台侧 sso_bridge.php 完成登录态桥接 */
    /* 炸金花：原生游戏页（逻辑全在前端，后端只记账） */
    /* 斗地主：原生游戏页（逻辑全在前端，后端只记账） */
    goDdz() {
      uni.navigateTo({ url: '/pages/game/hall?type=doudizhu' })
    },

    goZjh() {
      uni.navigateTo({ url: '/pages/game/hall?type=zhajinhua' })
    },

    /* 原生游戏大厅：炸金花 / 斗地主（游戏逻辑在前端，后端只做开局记账与房间管理） */
    goGameHall(kind) {
      uni.navigateTo({ url: "/pages/game/hall?type=" + encodeURIComponent(kind) })
    },

    goDuelGame() {
      uni.navigateTo({
        url: '/pages/duel-game/index'
      })
    },
    async loadRanking() {
      try {
        const res = await request('rps_game.php', { action: 'score_ranking' }, 'GET')
        /* 后端返回的是 { list: [...] }，以前这里读 res.data.ranking，
           取不到就变成空数组 —— 排行榜永远显示"暂无数据" */
        let list = []
        if (res && res.code === 0) {
          if (Array.isArray(res.data)) list = res.data
          else if (res.data && Array.isArray(res.data.ranking)) list = res.data.ranking
          else if (res.data && Array.isArray(res.data.list)) list = res.data.list
        }
        this.ranking = list
        /* 我的排名：从榜单里找自己（后端没单独给 my_ranking） */
        const myId = String((this.userInfo && this.userInfo.id) || 
''
)
        this.myRanking = myId ? (list.find(it => String(it.uid || it.id || '') === myId) || null) : null
      } catch (e) {
        this.ranking = []
        this.myRanking = null
      }
    },
    loadMockRanking() {
      // 模拟排行榜数据
      const userInfo = uni.getStorageSync('userInfo') || {}
      this.ranking = [
        { user_id: 1, nickname: '游戏达人', avatar: '/static/user/default.png', score: 5000 },
        { user_id: 2, nickname: '幸运玩家', avatar: '/static/user/default.png', score: 3500 },
        { user_id: 3, nickname: '积分之王', avatar: '/static/user/default.png', score: 2800 },
        { user_id: 4, nickname: '抽奖高手', avatar: '/static/user/default.png', score: 2200 },
        { user_id: 5, nickname: '欧皇本皇', avatar: '/static/user/default.png', score: 1800 },
      ]
      
      // 计算当前用户排名
      const userScore = userInfo.score || 0
      let rank = this.ranking.filter(item => item.score > userScore).length + 1
      this.myRanking = {
        user_id: userInfo.id,
        nickname: userInfo.nickname || '我',
        avatar: userInfo.avatar,
        score: userScore,
        rank: rank
      }
    }
  }
}
</script>

<style>
.lottery-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
}

.header-left {
  width: 120rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 28rpx;
  padding: 0 16rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.header-left:active {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.95);
}

.rank-icon-svg {
  width: 32rpx;
  height: 32rpx;
  color: #fff;
  display: flex;  align-items: center;
  justify-content: center;
}
.rank-icon-img { width: 100%; height: 100%; }

.rank-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
  writing-mode: horizontal-tb;
}

.score-icon-svg {
  width: 28rpx;
  height: 28rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.score-icon-img { width: 100%; height: 100%; }

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  text-align: center;
  flex: 1;
}

.header-right {
  width: 120rpx;
  display: flex;
  justify-content: flex-end;
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.25);
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
}

.score-num {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.main-content {
  padding-bottom: 40rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

.activity-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.fixed-games {
  padding: 24rpx 24rpx 0;
}

.fixed-game-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 28rpx;
  padding: 32rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 8rpx 32rpx rgba(102, 126, 234, 0.4),
    0 4rpx 16rpx rgba(118, 75, 162, 0.3);
  margin-bottom: 24rpx;
}

.fixed-game-card.duel-card {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
  box-shadow: 
    0 8rpx 32rpx rgba(220, 38, 38, 0.4),
    0 4rpx 16rpx rgba(185, 28, 28, 0.3);
}

.card-bg-decoration.duel-bg {
  background: radial-gradient(circle, rgba(255, 200, 200, 0.2) 0%, transparent 70%);
}

.card-bg-decoration {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  border-radius: 50%;
}

.card-stars {
  position: absolute;
  top: 16rpx;
  right: 24rpx;
  display: flex;
  gap: 8rpx;
}

.star-svg {
  width: 28rpx;
  height: 28rpx;
  color: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: twinkle 2s ease-in-out infinite;
}
.star-img { width: 100%; height: 100%; }

.star-1 { animation-delay: 0s; }
.star-2 { animation-delay: 0.5s; }
.star-3 { animation-delay: 1s; }

@keyframes twinkle {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* 标题前缀 SVG */
.title-svg {
  width: 36rpx;
  height: 36rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;
}
.title-img { width: 100%; height: 100%; }

/* 游戏内容里的 SVG */
.emoji-svg {
  width: 56rpx;
  height: 56rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-img { width: 100%; height: 100%; }

/* 彩色图标方案 */
.ic-red    { color: #ff5a5f; }                          /* 红 */
.ic-orange { color: #ff8a3d; }                          /* 橙 */
.ic-gold   { color: #ffc043; }                          /* 金黄 */
.ic-cyan   { color: #4ecdc4; }                          /* 青绿 */
.ic-purple { color: #a78bfa; }                          /* 紫 */
.ic-pink   { color: #f472b6; }                          /* 粉 */
.ic-blue   { color: #60a5fa; }                          /* 蓝 */

/* meta 图标 SVG */
.meta-icon-svg {
  width: 28rpx;
  height: 28rpx;
  color: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.meta-icon-svg.small {
  width: 24rpx;
  height: 24rpx;
  color: #999;
}
.meta-icon-img { width: 100%; height: 100%; }

/* 活动金币图标 */
.cost-icon-svg {
  width: 22rpx;
  height: 22rpx;
  color: #FF6B6B;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cost-icon-img { width: 100%; height: 100%; }

/* 进入按钮箭头 */
.enter-arrow-svg {
  width: 24rpx;
  height: 24rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.enter-arrow-svg .enter-arrow-img { width: 100%; height: 100%; }

/* 游戏标题改造（图标 + 文字横排） */
.game-title {
  display: flex;
  align-items: center;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.game-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #fff;
  letter-spacing: 1rpx;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2);
}

.game-status {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-size: 24rpx;
  padding: 10rpx 24rpx;
  border-radius: 24rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.4);
}

.game-status-closed {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  box-shadow: 0 4rpx 12rpx rgba(156, 163, 175, 0.4);
}

.game-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.game-emoji-group {
  display: flex;
  gap: 20rpx;
}

.emoji-box {
  width: 96rpx;
  height: 96rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255,255,255,0.2);
}

.emoji-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.95);
  margin-top: 6rpx;
  font-weight: 500;
}

.game-meta {
  display: flex;
  gap: 16rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255,255,255,0.15);
  padding: 10rpx 20rpx;
  border-radius: 24rpx;
}

.meta-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255,255,255,0.2);
}

.game-desc {
  font-size: 26rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.enter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255,255,255,0.2);
  padding: 14rpx 28rpx;
  border-radius: 28rpx;
  border: 2rpx solid rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.enter-btn text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.enter-arrow {
  font-size: 32rpx;
  font-weight: 300;
  display: none; /* 已被 .enter-arrow-svg 替代 */
}

.activity-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.activity-cover {
  position: relative;
  height: 320rpx;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.activity-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #8B5CF6, #6D28D9);
}

.activity-badge.jiugongge {
  background: linear-gradient(135deg, #8B5CF6, #6D28D9);
}

.activity-badge.blindbox {
  background: linear-gradient(135deg, #F59E0B, #D97706);
}

.activity-badge.turntable {
  background: linear-gradient(135deg, #10B981, #059669);
}

.activity-badge text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.activity-status {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #FF6B6B, #FF2442);
  border-radius: 20rpx;
}

.activity-status text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.activity-info {
  padding: 24rpx;
}

.activity-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 8rpx;
}

.activity-desc {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.activity-meta {
  display: flex;
  gap: 32rpx;
  margin-bottom: 20rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  font-size: 24rpx;
}

.activity-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.participate-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.free-count {
  background: linear-gradient(135deg, #10B981, #059669);
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}

.free-count text {
  font-size: 22rpx;
  color: #fff;
}

.cost-info {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.cost-icon {
  font-size: 22rpx;
}

.cost-info text:last-child {
  font-size: 24rpx;
  color: #FF6B6B;
  font-weight: 600;
}

.enter-btn {
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
}

.enter-btn text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
}

/* 排行榜样式 */
.ranking-section {
  margin: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.ranking-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.ranking-section .section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.refresh-btn {
  font-size: 26rpx;
  color: #FF6B6B;
  padding: 8rpx 16rpx;
  background: #FFF5F5;
  border-radius: 16rpx;
}

/* 前三名样式 */
.top-three {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #FFF8F0, #FFF5E6);
  border-radius: 20rpx;
}

.top-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  min-width: 140rpx;
}

.top-item.first {
  order: 2;
  min-width: 160rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #FFF9E6, #FFF3C4);
  border: 2rpx solid #FFD700;
}

.top-item.second {
  order: 1;
}

.top-item.third {
  order: 3;
}

.top-avatar-wrap {
  position: relative;
  margin-bottom: 12rpx;
}

.top-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #FFD700;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.top-avatar.king {
  width: 120rpx;
  height: 120rpx;
  border-color: #FFD700;
  box-shadow: 0 6rpx 20rpx rgba(255, 215, 0, 0.4);
}

.medal {
  position: absolute;
  bottom: -10rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2);
}
.medal-img { width: 60%; height: 60%; }

.medal-1 { background: linear-gradient(135deg, #FFD700, #FFA500); }
.medal-2 { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); }
.medal-3 { background: linear-gradient(135deg, #CD7F32, #B87333); }

.top-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 6rpx;
  max-width: 120rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-score {
  font-size: 24rpx;
  color: #FF6B6B;
  font-weight: 700;
}

/* 我的排名 */
.my-ranking {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #FFF5F5, #FFF0F0);
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #FFD7D7;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 107, 0.15);
  transition: all 0.2s ease;
}

.my-ranking:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(255, 107, 107, 0.1);
}

.my-rank-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.my-rank-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #FF6B6B;
  min-width: 60rpx;
}

.my-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid #FFD7D7;
}

.my-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.my-score {
  font-size: 28rpx;
  color: #FF6B6B;
  font-weight: 700;
}

/* 排名列表 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid #f5f5f5;
  transition: all 0.2s ease;
}

.ranking-item:active {
  transform: scale(0.98);
  background: #F8F9FA;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
}

.rank-num {
  font-size: 26rpx;
  font-weight: 700;
  color: #999;
  min-width: 50rpx;
}

.rank-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.rank-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-score {
  font-size: 26rpx;
  color: #FF6B6B;
  font-weight: 600;
}

.ranking-empty {
  text-align: center;
  padding: 40rpx 0;
}

.ranking-empty .empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40rpx;
  box-sizing: border-box;
}

.modal-content {
  width: 100%;
  max-width: 680rpx;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
}

.modal-title-svg {
  width: 40rpx;
  height: 40rpx;
  color: #FF6B6B;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-title-img { width: 100%; height: 100%; }

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
}

.modal-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
}

.modal-close-svg {
  width: 28rpx;
  height: 28rpx;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close-img { width: 100%; height: 100%; }

.modal-body {
  flex: 1;
  max-height: calc(85vh - 100rpx);
  padding: 24rpx;
  overflow-y: auto;
  box-sizing: border-box;
}

/* 免责声明 */
.disclaimer {
  padding: 40rpx 30rpx 60rpx;
  text-align: center;
}

.disclaimer-text {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  display: block;
}
</style>
