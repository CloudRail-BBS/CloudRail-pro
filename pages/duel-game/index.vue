<template>
  <view class="duel-page">
    <view class="page-header" :style="{ paddingTop: statusBarHeight + 'px', top: 0 }">
      <view class="header-left" @click="showHistoryModal = true">
        <image src="/static/icon/file-text-white.svg" class="history-icon" mode="aspectFit"></image>
        <text class="history-text">对局记录</text>
      </view>
      <view class="header-title">
        <image src="/static/icon/swords-white.svg" class="header-title-icon" mode="aspectFit"></image>
        <text>巅峰对决</text>
      </view>
      <view class="header-right">
        <view class="score-badge">
          <image src="/static/icon/star-fill-white.svg" class="score-icon" mode="aspectFit"></image>
          <text class="score-num">{{ userScore }}</text>
        </view>
      </view>
    </view>

    <scroll-view class="main-content" scroll-y :style="{ paddingTop: (statusBarHeight + 50) + 'px' }">
      <view class="game-status-area" v-if="gameStatus === 'idle'">
        <view class="status-card">
          <view class="arena-area">
            <view class="avatar-circle left">
              <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" mode="aspectFill"></image>
              <view v-else class="avatar-placeholder">
                <image src="/static/icon/user-circle-white.svg" class="placeholder-icon" mode="aspectFit"></image>
              </view>
            </view>
            <view class="arena-center">
              <image src="/static/icon/swords-white.svg" class="arena-icon" mode="aspectFit"></image>
              <text class="arena-title">巅峰对决</text>
              <text class="arena-desc">消耗积分发起挑战，等待其他玩家应战</text>
            </view>
            <view class="avatar-circle right">
              <view class="avatar-placeholder">
                <image src="/static/icon/help-circle-white.svg" class="placeholder-icon" mode="aspectFit"></image>
              </view>
            </view>
          </view>
        </view>

        <view class="bet-section">
          <text class="section-title">选择挑战积分</text>
          <view class="bet-options">
            <view v-for="amount in betAmounts" :key="amount" class="bet-option" :class="{ active: selectedAmount === amount }" @click="selectedAmount = amount">
              <text class="bet-value">{{ amount }}</text>
              <text class="bet-label">积分</text>
            </view>
          </view>

          <view class="custom-bet">
            <text class="custom-label">自定义积分</text>
            <input type="number" v-model="customAmount" placeholder="输入积分（最低100）" class="custom-input" @blur="onCustomInput" />
          </view>

          <view class="start-btn" @click="startDuel">
            <image src="/static/icon/flame-white.svg" class="start-btn-icon" mode="aspectFit"></image>
            <text>发起挑战</text>
          </view>
        </view>
      </view>

      <view class="waiting-area" v-if="gameStatus === 'waiting'">
        <view class="waiting-card">
          <view class="arena-area">
            <view class="avatar-circle left">
              <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" mode="aspectFill"></image>
              <view v-else class="avatar-placeholder">
                <image src="/static/icon/user-circle-white.svg" class="placeholder-icon" mode="aspectFit"></image>
              </view>
              <text class="player-label">我（发起者）</text>
            </view>
            <view class="arena-center">
              <image src="/static/icon/clock-white.svg" class="waiting-icon" mode="aspectFit"></image>
              <text class="arena-title">等待应战</text>
              <text class="arena-desc">已投入 {{ currentDuel?.bet_amount }} 积分</text>
            </view>
            <view class="avatar-circle right">
              <view class="avatar-placeholder waiting">
                <image src="/static/icon/help-circle-white.svg" class="placeholder-icon" mode="aspectFit"></image>
              </view>
              <text class="player-label">应战者</text>
            </view>
          </view>
          <view class="waiting-actions">
            <view v-if="fromList" class="back-btn" @click="backToList">
              <text>返回列表</text>
            </view>
            <view class="cancel-btn" @click="confirmCancel">
              <text>取消挑战</text>
            </view>
          </view>
        </view>
      </view>

      <view class="battle-area" v-if="gameStatus === 'battle'">
        <view class="battle-card">
          <view class="arena-area">
            <view class="avatar-circle left">
              <image :src="currentDuel?.challenger_avatar || '/static/user/default.png'" class="avatar-img" mode="aspectFill"></image>
              <text class="player-name">{{ currentDuel?.challenger_name }}</text>
              <text class="role-tag">挑战者</text>
              <!-- 血条 -->
              <view class="hp-bar">
                <view class="hp-fill challenger-hp"></view>
                <text class="hp-text">HP</text>
              </view>
            </view>
            <view class="arena-center">
              <image src="/static/icon/swords-white.svg" class="arena-icon" mode="aspectFit"></image>
              <view class="countdown-display">
                <text class="countdown-num">{{ countdown }}</text>
                <text class="countdown-unit">秒</text>
              </view>
              <text class="pool-info">积分池: {{ currentDuel?.bet_amount * 2 }} 积分</text>
            </view>
            <view class="avatar-circle right">
              <image :src="currentDuel?.defender_avatar || '/static/user/default.png'" class="avatar-img" mode="aspectFill"></image>
              <text class="player-name">{{ currentDuel?.defender_name }}</text>
              <text class="role-tag">应战者</text>
              <!-- 血条 -->
              <view class="hp-bar">
                <view class="hp-fill defender-hp"></view>
                <text class="hp-text">HP</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 模拟战斗文字 -->
        <view class="battle-log" v-if="gameStatus === 'battle' && battleLogs.length > 0">
          <view v-for="(log, index) in battleLogs" :key="index" class="battle-log-item" :class="{ newest: index === battleLogs.length - 1 }">
            <text class="log-text">{{ log }}</text>
          </view>
        </view>
      </view>

      <view class="result-area" v-if="gameStatus === 'result'">
        <view class="result-card" :class="isWinner ? 'win' : 'lose'">
          <image v-if="isWinner" src="/static/icon/trophy-white.svg" class="result-icon" mode="aspectFit"></image>
          <image v-else src="/static/icon/heart-broken-white.svg" class="result-icon" mode="aspectFit"></image>
          <text class="result-title">{{ isWinner ? '胜利！' : '失败' }}</text>
          <text class="result-desc">{{ isWinner ? '恭喜你获得双倍积分！' : '再接再厉，下次一定赢！' }}</text>
          <view class="result-stats">
            <view class="stat-item">
              <text class="stat-label">投入</text>
              <text class="stat-value">-{{ currentDuel?.bet_amount }}</text>
            </view>
            <view class="stat-item" :class="{ highlight: isWinner }">
              <text class="stat-label">{{ isWinner ? '获得' : '损失' }}</text>
              <text class="stat-value">{{ isWinner ? '+' + (currentDuel?.bet_amount * 2) : '-' + currentDuel?.bet_amount }}</text>
            </view>
          </view>
          <view class="result-btn" @click="backToIdle">
            <image src="/static/icon/refresh-cyan.svg" class="result-btn-icon" mode="aspectFit"></image>
            <text>再来一局</text>
          </view>
        </view>
      </view>

      <view class="challenge-list" v-if="gameStatus === 'idle' && challenges.length > 0">
        <view class="section-title-row">
          <image src="/static/icon/flame-white.svg" class="section-title-icon" mode="aspectFit"></image>
          <text class="section-title">正在进行的挑战</text>
        </view>
        <view class="challenge-cards">
          <view v-for="(challenge, ci) in challenges" :key="(challenge && challenge.id) || ci" class="challenge-card">
            <view class="challenge-header" @click="handleChallengeClick(challenge)">
              <image :src="challenge?.challenger_avatar || '/static/user/default.png'" class="challenge-avatar" mode="aspectFill"></image>
              <view class="challenge-info">
                <text class="challenge-name">{{ challenge?.challenger_name }}</text>
                <text class="challenge-desc">发起了 {{ challenge?.bet_amount }} 积分挑战</text>
              </view>
            </view>
            <view class="action-btn" :class="challenge?.challenger_id === userInfo.id ? 'cancel' : 'accept'" @click="handleChallengeClick(challenge)">
              <text>{{ challenge?.challenger_id === userInfo.id ? '取消' : '应战' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="gameStatus === 'idle' && challenges.length === 0">
        <image src="/static/icon/gamepad-white.svg" class="empty-icon" mode="aspectFit"></image>
        <text class="empty-title">暂无挑战</text>
        <text class="empty-desc">成为第一个发起挑战的勇士吧！</text>
      </view>

      
    </scroll-view>

  <!-- 对局记录弹窗 -->
  <view class="modal-mask" v-if="showHistoryModal" @click="showHistoryModal = false">
    <view class="modal-content" @click.stop>
      <!-- 弹窗头部 -->
      <view class="modal-header">
        <view class="modal-title-row">
          <image src="/static/icon/file-text-white.svg" class="modal-title-icon" mode="aspectFit"></image>
          <text class="modal-title">对局记录</text>
        </view>
        <view class="modal-close" @click="showHistoryModal = false">
          <image src="/static/icon/x-white.svg" class="modal-close-icon" mode="aspectFit"></image>
        </view>
      </view>

      <!-- 弹窗内容 -->
      <scroll-view class="modal-body" scroll-y>
        <view v-if="history.length === 0" class="empty-history">
          <image src="/static/icon/inbox-white.svg" class="empty-icon" mode="aspectFit"></image>
          <text class="empty-text">暂无对局记录</text>
        </view>
        <view v-else class="history-list">
          <view v-for="(record, index) in displayHistory" :key="index" class="history-item">
            <view class="history-header">
              <view class="history-player">
                <image :src="record.challenger_avatar || '/static/user/default.png'" class="history-avatar" mode="aspectFill"></image>
                <text class="history-name">{{ record.challenger_name }}</text>
                <text class="history-role">挑战</text>
              </view>
              <view class="history-vs">VS</view>
              <view class="history-player">
                <image :src="record.defender_avatar || '/static/user/default.png'" class="history-avatar" mode="aspectFill"></image>
                <text class="history-name">{{ record.defender_name }}</text>
                <text class="history-role">应战</text>
              </view>
            </view>
            <view class="history-result" :class="(record.result === 1 && String(record.challenger_id) === String(userInfo.id)) || (record.result === 2 && String(record.defender_id) === String(userInfo.id)) ? 'win' : 'lose'">
              <image v-if="(record.result === 1 && String(record.challenger_id) === String(userInfo.id)) || (record.result === 2 && String(record.defender_id) === String(userInfo.id))" src="/static/icon/trophy-white.svg" class="result-icon" mode="aspectFit"></image>
              <image v-else src="/static/icon/heart-broken-white.svg" class="result-icon" mode="aspectFit"></image>
              <text class="result-text">{{ (record.result === 1 && String(record.challenger_id) === String(userInfo.id)) || (record.result === 2 && String(record.defender_id) === String(userInfo.id)) ? '胜利' : '失败' }}</text>
              <text class="result-bet">{{ record.bet_amount * 2 }} 积分</text>
            </view>
            <text class="history-time">{{ record.created_at }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>

  <!-- 胜利弹窗 -->
  <view class="modal-mask win-modal-mask" v-if="showWinModal" @click="hideWinModal">
    <view class="modal-content win-modal" @click.stop>
      <image src="/static/icon/trophy-white.svg" class="win-icon" mode="aspectFit"></image>
      <text class="win-title">胜利！</text>
      <text class="win-desc">恭喜你获得 {{ currentDuel?.bet_amount * 2 }} 积分！</text>
      <view class="win-btn" @click="hideWinModal">
        <text>太棒了！</text>
      </view>
    </view>
  </view>

  <!-- 失败弹窗 -->
  <view class="modal-mask lose-modal-mask" v-if="showLoseModal" @click="hideLoseModal">
    <view class="modal-content lose-modal" @click.stop>
      <image src="/static/icon/heart-broken-white.svg" class="lose-icon" mode="aspectFit"></image>
      <text class="lose-title">失败</text>
      <text class="lose-desc">损失了 {{ currentDuel?.bet_amount }} 积分，再接再厉！</text>
      <view class="lose-btn" @click="hideLoseModal">
        <text>继续努力</text>
      </view>
    </view>
  </view>
</view>
</template>

<script>
import { request } from '../../common/request.js'
import ws from '../../common/ws.js'

export default {
  name: 'DuelGame',
  data() {
    return {
      userScore: 0,
      statusBarHeight: 0,
      gameStatus: 'idle',
      selectedAmount: 100,
      customAmount: '',
      betAmounts: [100, 200, 500, 1000],
      currentDuel: {},
      challenges: [],
      history: [], // 对局记录
      countdown: 60,
      countdownTimer: null,
      isWinner: false,
      userInfo: {},
      fromList: false, // 是否从挑战列表进入
      scoreTimer: null,
      showHistoryModal: false, // 对局记录弹窗显示状态
      battleLogs: [], // 战斗日志
      battleLogTimer: null, // 战斗日志定时器
      challengerHp: 100, // 挑战者血量
      defenderHp: 100, // 应战者血量
      showWinModal: false, // 胜利弹窗显示状态
      showLoseModal: false, // 失败弹窗显示状态
      isLoadingScore: false // 添加标志防止重复请求
    }
  },
  computed: {
    displayHistory() {
      return this.history.slice(0, 3) // 只显示最近3条记录
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 0
    this.userInfo = uni.getStorageSync('userInfo') || {}
    // 统一兜底：后端/前端本地字段名不一致时(score/jifen/points 三种命名都有可能), 保证积分值真实可读取, 不再出现"明明有积分却显示 0"
    const raw = this.userInfo
    this.userScore = Number(raw.score ?? raw.jifen ?? raw.points ?? 0) || 0
    this.loadChallenges()
    this.loadUserScore()
    
    // 优化：将积分刷新间隔从5秒增加到15秒，减少CPU和网络资源消耗
    this.scoreTimer = setInterval(() => {
      this.loadUserScore()
    }, 15000)
    /* 实时：对方应战 / 结算时后端会推 duel_update，这里立刻切界面（不靠轮询） */
    this._duelWsOff = ws.on('duel_update', this._onDuelPush)
    /* 对局记录：以前从来没调用过 loadHistory，所以记录一直是空的 */
    this.loadHistory()
  },
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    if (this.scoreTimer) {
      clearInterval(this.scoreTimer)
    }
    if (this.battleLogTimer) {
      clearInterval(this.battleLogTimer)
    }
  },
  onShow() {
    if (this.gameStatus === 'idle') {
      this.loadChallenges()
    }
  },
  methods: {
    /**
     * 所有对战/挑战接口返回后, 统一把接口返回的积分值同步到 userScore 与本地缓存。
     * 兼容字段: user_score / score / jifen / points (后端返回任何一个都能拿到真实值, 不再出现"有积分却显示0")
     */
    syncScoreFromData(data, primaryKey) {
      if (!data || typeof data !== 'object') return
      const keys = primaryKey ? [primaryKey, 'user_score', 'score', 'jifen', 'points'] : ['user_score', 'score', 'jifen', 'points']
      let val = NaN
      for (const k of keys) {
        if (typeof data[k] !== 'undefined' && data[k] !== null && data[k] !== '') {
          val = Number(data[k]) || 0
          break
        }
      }
      if (!Number.isFinite(val) || Number.isNaN(val)) return
      this.userScore = Math.max(0, val)
      const latest = uni.getStorageSync('userInfo') || {}
      latest.score = this.userScore
      latest.jifen = this.userScore
      latest.points = this.userScore
      uni.setStorageSync('userInfo', latest)
      this.userInfo = latest
    },
    async loadUserScore() {
      // 防止重复请求，避免并发导致的性能问题
      if (this.isLoadingScore) return
      this.isLoadingScore = true

      try {
        const userInfo = uni.getStorageSync('userInfo') || {}
        if (!userInfo.id) return

        let fetched = null

        /* 注意：这里必须读「用户真实积分余额」(users.points)，
           不能读 games/rps_score —— 后者返回的是「胜场数×10」的游戏积分，
           不是账户余额。之前用它当余额判断，导致"有积分但从没赢过对战"的用户
           永远被判积分不足。 */
        try {
          const prof = await request('user.php', { action: 'profile', userId: userInfo.id }, 'GET')
          if (prof && prof.code === 0 && prof.data) {
            const d = prof.data
            const v = (typeof d.points !== 'undefined') ? d.points : ((typeof d.jifen !== 'undefined') ? d.jifen : d.score)
            fetched = Number(v) || 0
          }
        } catch (e) {}

        /* 兜底：拿不到就走本地缓存的积分 */
        if (fetched === null) {
          const lv = (typeof userInfo.points !== 'undefined') ? userInfo.points : ((typeof userInfo.jifen !== 'undefined') ? userInfo.jifen : userInfo.score)
          fetched = Number(lv) || 0
        }

        if (fetched !== null && !Number.isNaN(fetched)) {
          this.userScore = fetched
          // 统一三种字段名, 写回本地缓存后其它页面(商城/签到/对战)都能正常读
          const latest = uni.getStorageSync('userInfo') || {}
          latest.score = this.userScore
          latest.jifen = this.userScore
          latest.points = this.userScore
          uni.setStorageSync('userInfo', latest)
          this.userInfo = latest
        }
      } catch (e) {
      } finally {
        this.isLoadingScore = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    onCustomInput() {
      const val = parseInt(this.customAmount) || 0
      if (val >= 100) {
        this.selectedAmount = val
      } else {
        uni.showToast({ title: '最低100积分', icon: 'none' })
        this.customAmount = ''
      }
    },
    async startDuel() {
      if (this.selectedAmount > this.userScore) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      if (!this.selectedAmount || this.selectedAmount < 100) {
        uni.showToast({ title: '最低 100 积分', icon: 'none' })
        return
      }

      try {
        /* 1) 先从「互关好友」里选一个挑战对象 */
        const fr = await request('user.php', { action: 'mutual' }, 'GET')
        const list = (fr && fr.code === 0 && fr.data && fr.data.list) || []
        if (!list.length) {
          uni.showToast({ title: '还没有互关好友，先去互相关注几个人吧', icon: 'none' })
          return
        }
        const top = list.slice(0, 20)
        const itemList = top.map(u => (u.nickname || u.username || u.uid) + '  (' + String(u.uid || '').slice(-6) + ')')
        const idx = await new Promise((resolve) => {
          uni.showActionSheet({
            itemList,
            success: (ev) => resolve(ev.tapIndex),
            fail: () => resolve(-1)
          })
        })
        if (idx < 0 || !top[idx]) return
        const rivalUid = String(top[idx].uid || '')
        if (!rivalUid) return

        /* 2) 带上 rival_uid + bet_amount 发起挑战（后端已改成扣积分） */
        const res = await request('duel_game.php', {
          action: 'start_duel',
          rival_uid: rivalUid,
          bet_amount: this.selectedAmount
        }, 'POST')

        if (res && res.code === 0) {
          uni.showToast({ title: '挑战已发出', icon: 'success' })
          this.gameStatus = 'waiting'
          this.currentDuel = (res.data && res.data.duel) ? res.data.duel : { id: res.data && res.data.id }
          this.listenForMatch()
        } else {
          uni.showToast({ title: (res && res.msg) || '发起失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '发起失败，请检查网络', icon: 'none' })
      }
    },
    async cancelDuel() {
      try {
        const res = await request('duel_game.php', {
          action: 'cancel_duel',
          duel_id: this.currentDuel?.id,
          user_id: this.userInfo.id
        }, 'POST')

        if (res.code === 0) {
          uni.showToast({ title: '已取消', icon: 'success' })
          this.syncScoreFromData(res.data, 'user_score')
          this.gameStatus = 'idle'
          this.loadChallenges()
        } else {
          uni.showToast({ title: res.msg || '取消失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '取消失败', icon: 'none' })
      }
    },
    async acceptChallenge(challenge) {
      if (challenge?.bet_amount > this.userScore) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }

      try {
        const res = await request('duel_game.php', {
          action: 'accept_duel',
          duel_id: challenge.id,
          user_id: this.userInfo.id
        }, 'POST')

        if (res.code === 0) {
          uni.showToast({ title: '已应战', icon: 'success' })
          this.gameStatus = 'battle'
          this.currentDuel = (res.data && res.data.duel) ? res.data.duel : res.data.duel
          this.syncScoreFromData(res.data, 'user_score')
          this.startCountdown()
        } else {
          uni.showToast({ title: res.msg || '应战失败', icon: 'none' })
          this.loadChallenges()
        }
      } catch (e) {
        uni.showToast({ title: '应战失败', icon: 'none' })
      }
    },
    handleChallengeClick(challenge) {
      // 如果是自己发布的挑战，进入等待页面查看详情（可以取消）
      if (challenge?.challenger_id === this.userInfo.id) {
        this.currentDuel = challenge
        this.fromList = true // 标记是从列表进入
        this.gameStatus = 'waiting'
      } else {
        // 如果是别人发布的挑战，点击应战
        this.acceptChallenge(challenge)
      }
    },
    backToList() {
      this.fromList = false
      this.gameStatus = 'idle'
      this.loadChallenges()
    },
    confirmCancel() {
      uni.showModal({
        title: '确认取消',
        content: `确定要取消挑战吗？取消后将返还您投入的 ${this.currentDuel?.bet_amount} 积分`,
        confirmText: '确定取消',
        cancelText: '继续等待',
        success: (res) => {
          if (res.confirm) {
            this.cancelDuel()
          }
        }
      })
    },
    listenForMatch() {
      // 优化：将匹配检查间隔从3秒增加到5秒，减少CPU和网络资源消耗
      const checkInterval = setInterval(async () => {
        try {
          const res = await request('duel_game.php', {
            action: 'check_duel',
            duel_id: this.currentDuel?.id
          }, 'GET')

          if (res.code === 0 && res.data.status === 'battle') {
            clearInterval(checkInterval)
            this.currentDuel = (res.data && res.data.duel) ? res.data.duel : res.data
            this.gameStatus = 'battle'
            this.startCountdown()
          }
        } catch (e) {
        }
      }, 5000) // 从3秒改为5秒
    },
    async autoCancelDuel() {
      try {
        const res = await request('duel_game.php', {
          action: 'cancel_duel',
          duel_id: this.currentDuel?.id,
          user_id: this.userInfo.id
        }, 'POST')

        if (res.code === 0) {
          this.syncScoreFromData(res.data, 'user_score')
          this.gameStatus = 'idle'
          this.loadChallenges()
        }
      } catch (e) {
      }
    },
    startCountdown() {
      this.countdown = 20
      this.countdownTimer = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          clearInterval(this.countdownTimer)
          this.endDuel()
        }
      }, 1000)
      
      // 启动战斗日志
      this.startBattleLogs()
    },
    startBattleLogs() {
      const battleLogTemplates = [
        { user: 'challenger', action: '发起猛烈攻击！', damage: '造成 50 点伤害', type: 'attack' },
        { user: 'defender', action: '全力防守！', damage: '抵挡了攻击', type: 'defend' },
        { user: 'challenger', action: '发动连击！', damage: '造成 80 点伤害', type: 'attack' },
        { user: 'defender', action: '反击！', damage: '造成 45 点伤害', type: 'counter' },
        { user: 'system', action: '战况激烈！双方势均力敌！', damage: '', type: 'system' },
        { user: 'challenger', action: '蓄力一击！', damage: '造成 100 点伤害！', type: 'attack' },
        { user: 'defender', action: '灵活闪避！', damage: '成功躲避攻击', type: 'dodge' },
        { user: 'system', action: '关键时刻到来！', damage: '', type: 'system' },
        { user: 'challenger', action: '发动必杀技！', damage: '造成 120 点伤害！', type: 'ultimate' },
        { user: 'defender', action: '顽强抵抗！', damage: '承受了伤害', type: 'take_damage' },
        { user: 'system', action: '胜负即将分晓！', damage: '', type: 'system' },
        { user: 'challenger', action: '最后冲刺！', damage: '全力攻击！', type: 'attack' },
        { user: 'defender', action: '背水一战！', damage: '奋力反抗！', type: 'counter' },
        { user: 'system', action: '决战时刻！', damage: '', type: 'system' }
      ]
      
      this.battleLogs = []
      this.challengerHp = 100
      this.defenderHp = 100
      let index = 0
      
      this.battleLogTimer = setInterval(() => {
        const template = battleLogTemplates[index % battleLogTemplates.length]
        let log = ''
        
        // 更新血量 - 倒计时没结束时保留最低10%血量
        if (template.type === 'attack' || template.type === 'counter' || template.type === 'ultimate') {
          const damage = Math.floor(Math.random() * 15) + 10
          // 倒计时没结束时保留最低血量
          if (template.user === 'challenger') {
            this.defenderHp = Math.max(10, this.defenderHp - damage)
            log = `⚔️ ${this.currentDuel?.challenger_name || '挑战者'} ${template.action} ${template.damage} (造成 ${damage} 伤害)`
          } else {
            this.challengerHp = Math.max(10, this.challengerHp - damage)
            log = `🛡️ ${this.currentDuel?.defender_name || '应战者'} ${template.action} ${template.damage} (造成 ${damage} 伤害)`
          }
        } else if (template.type === 'defend' || template.type === 'dodge') {
          this.challengerHp = Math.max(10, this.challengerHp - 5)
          log = `🛡️ ${this.currentDuel?.defender_name || '应战者'} ${template.action} ${template.damage}`
        } else if (template.type === 'take_damage') {
          this.challengerHp = Math.max(10, this.challengerHp - 15)
          log = `⚔️ ${this.currentDuel?.challenger_name || '挑战者'} ${template.action} ${template.damage}`
        } else {
          log = `✨ ${template.action}`
        }
        
        this.battleLogs.push(log)
        
        // 最多保留5条日志
        if (this.battleLogs.length > 5) {
          this.battleLogs.shift()
        }
        
        index++
      }, 1000)
    },
    stopBattleLogs() {
      if (this.battleLogTimer) {
        clearInterval(this.battleLogTimer)
        this.battleLogTimer = null
      }
      this.battleLogs = []
    },
    showWinPopup() {
      this.$nextTick(() => {
        this.showWinModal = true
      })
    },
    hideWinModal() {
      this.showWinModal = false
      this.gameStatus = 'idle'
      this.loadChallenges()
    },
    showLosePopup() {
      this.$nextTick(() => {
        this.showLoseModal = true
      })
    },
    hideLoseModal() {
      this.showLoseModal = false
      this.gameStatus = 'idle'
      this.loadChallenges()
    },
    async endDuel() {
      // 停止战斗日志
      this.stopBattleLogs()
      
      try {
        const res = await request('duel_game.php', {
          action: 'settle_duel',
          duel_id: this.currentDuel?.id
        }, 'POST')

        if (res.code === 0) {
          const _d = (res.data && res.data.duel) || {}
          const _rs = Number((res.data && res.data.result) || 0)
          const _meChallenger = String(_d.challenger_id || '') === String(this.userInfo.id)
          /* 后端用 result 表示胜负：1=挑战方胜 2=应战方胜 0=平局 */
          this.isWinner = (_rs === 1 && _meChallenger) || (_rs === 2 && !_meChallenger)
          
          // 根据当前用户角色更新积分（兼容任一字段名，不再出现展示0）
          /* 后端不返回积分字段，直接重新拉一次真实积分 */
          this.loadUserScore()
          
          // 失败方血条置0
          if (Number((res.data && res.data.result) || 0) === 1) {
            // 挑战者胜利，应战者失败
            this.defenderHp = 0
          } else {
            // 应战者胜利，挑战者失败
            this.challengerHp = 0
          }
          
          if (this.isWinner) {
            this.showWinModal = true
          } else {
            this.showLoseModal = true
          }
        }
      } catch (e) {
        uni.showToast({ title: '结算失败', icon: 'none' })
      }
    },
    backToIdle() {
      this.gameStatus = 'idle'
      this.loadChallenges()
    },
    _onDuelPush(data) {
      const d = data || {}
      const duel = d.duel || null
      if (!duel) return
      const ev = d.event || ''
      this.currentDuel = duel
      if (ev === 'accepted') {
        if (String(duel.challenger_id || '') === String(this.userInfo.id)) {
          this.gameStatus = 'battle'
          this.startCountdown()
        }
      } else if (ev === 'settled') {
        this.gameStatus = 'result'
        /* 必须结合"我是不是挑战方"来判断，否则 result=2 时双方都会判失败 */
        const _rs = Number(d.result || 0)
        const _meChallenger = String(duel.challenger_id || '') === String(this.userInfo.id)
        this.isWinner = (_rs === 1 && _meChallenger) || (_rs === 2 && !_meChallenger)
        this.loadHistory()
        this.loadUserScore()
      }
      this.loadChallenges()
    },

    async loadChallenges() {
      try {
        const res = await request('duel_game.php', { action: 'get_challenges' }, 'GET')
        let arr = []
        if (res && res.code === 0) {
          if (Array.isArray(res.data)) arr = res.data
          else if (res.data && Array.isArray(res.data.list)) arr = res.data.list
        }
        this.challenges = arr.filter((it) => it && typeof it === 'object').map((it) => ({
          ...it,
          challenger_id: it.challenger_id || it.uid || '',
          challenger_name: it.challenger_name || it.nickname || it.username || '未知用户',
          challenger_avatar: it.challenger_avatar || it.avatar || '',
          bet_amount: (it.bet_amount !== undefined && it.bet_amount !== null) ? it.bet_amount : it.amount
        }))
      } catch (e) {
        this.challenges = []
      }
    },
    async loadHistory() {
      try {
        const res = await request('duel_game.php', {
          action: 'get_history',
          user_id: this.userInfo.id
        }, 'POST')

        if (res.code === 0) {
          this.history = Array.isArray(res.data) ? res.data : ((res.data && res.data.list) || [])
        }
      } catch (e) {
        this.history = []
      }
    }
  }
}
</script>

<style>
.duel-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 28rpx;
  padding: 0 20rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
  white-space: nowrap;
  width: auto;
}

.header-left:active {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.95);
}

.history-icon {
  width: 26rpx;
  height: 26rpx;
}

.history-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  display: inline;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.header-title-icon {
  width: 32rpx;
  height: 32rpx;
}
.header-title {
  color: #fff;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
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

.score-icon {
  width: 24rpx;
  height: 24rpx;
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

.game-status-area {
  padding: 24rpx;
}

.status-card {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(185, 28, 28, 0.1));
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(220, 38, 38, 0.3);
}

.status-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.status-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
}

.status-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

.bet-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
}
.section-title-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 16rpx;
}
.section-title-icon {
  width: 28rpx;
  height: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20rpx;
}

.bet-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.bet-option {
  flex: 1;
  min-width: 140rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.bet-option.active {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-color: #ef4444;
}

.bet-value {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.bet-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.custom-bet {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.custom-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  width: 140rpx;
}

.custom-input {
  flex: 1;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  padding: 0 20rpx;
  color: #fff;
  font-size: 28rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.start-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(220, 38, 38, 0.4);
}

.start-btn-icon {
  width: 32rpx;
  height: 32rpx;
}

.start-btn text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.waiting-area {
  padding: 24rpx;
}

.waiting-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 48rpx 24rpx;
  text-align: center;
}

.waiting-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.waiting-icon {
  width: 64rpx;
  height: 64rpx;
}

.waiting-dots {
  display: flex;
  gap: 8rpx;
}

.dot {
  font-size: 32rpx;
  color: #ef4444;
}

.waiting-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
}

.waiting-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32rpx;
}

.cancel-btn {
  background: rgba(239, 68, 68, 0.2);
  border-radius: 16rpx;
  padding: 20rpx 32rpx;
  text-align: center;
  border: 2rpx solid rgba(239, 68, 68, 0.5);
}

.cancel-btn text {
  font-size: 28rpx;
  color: #ef4444;
}

.waiting-actions {
  display: flex;
  gap: 20rpx;
  justify-content: center;
  margin-top: 24rpx;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  padding: 20rpx 32rpx;
  text-align: center;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.back-btn text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.arena-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}

.avatar-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-circle.left {
  align-items: flex-start;
}

.avatar-circle.right {
  align-items: flex-end;
}

.avatar-circle .avatar-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  border: 4rpx dashed rgba(255, 255, 255, 0.3);
}

.avatar-placeholder.waiting {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.placeholder-icon {
  width: 48rpx;
  height: 48rpx;
}

.player-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
  text-align: center;
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-name {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
  margin-top: 12rpx;
  text-align: center;
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hp-bar {
  width: 100%;
  height: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
  margin-top: 8rpx;
  overflow: hidden;
  position: relative;
}

.hp-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.challenger-hp {
  background: linear-gradient(90deg, #22c55e, #16a34a);
  width: v-bind(challengerHp + '%');
}

.defender-hp {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  width: v-bind(defenderHp + '%');
}

.hp-text {
  position: absolute;
  right: 8rpx;
  top: -24rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.role-tag {
  font-size: 20rpx;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-top: 8rpx;
}

.arena-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 0 20rpx;
}

.arena-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 12rpx;
}

.arena-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
}

.arena-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.countdown-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
  margin: 16rpx 0;
}

.countdown-display .countdown-num {
  font-size: 64rpx;
  font-weight: 700;
  color: #ef4444;
}

.countdown-display .countdown-unit {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.pool-info {
  font-size: 24rpx;
  color: #fbbf24;
  margin-top: 8rpx;
}

.battle-area {
    padding: 24rpx;
  }

  .battle-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 24rpx;
    padding: 32rpx;
  }

  .battle-log {
    margin-top: 24rpx;
    padding: 20rpx;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 16rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.1);
  }

  .battle-log-item {
    padding: 10rpx 0;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
    animation: fadeIn 0.3s ease-in;
    word-wrap: break-word;
    word-break: break-all;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  }

  .battle-log-item:last-child {
    border-bottom: none;
  }

  .battle-log-item.newest {
    background: rgba(251, 191, 36, 0.15);
    padding: 10rpx 16rpx;
    border-radius: 8rpx;
    margin: 0 -16rpx 10rpx;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10rpx);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .log-text {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    display: block;
    width: 100%;
    box-sizing: border-box;
    white-space: normal;
    writing-mode: horizontal-tb;
  }

  .battle-log-item.newest .log-text {
    color: #fbbf24;
    font-weight: 600;
  }

.battle-animation {
  text-align: center;
  padding: 32rpx 0;
  animation: shake 0.5s ease-in-out infinite;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5rpx);
  }
  75% {
    transform: translateX(5rpx);
  }
}

.battle-emoji {
  display: block;
  font-size: 80rpx;
  margin-bottom: 16rpx;
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.battle-text {
  display: block;
  font-size: 28rpx;
  color: #fbbf24;
  font-weight: 600;
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 10rpx rgba(251, 191, 36, 0.5);
  }
  50% {
    opacity: 0.7;
    text-shadow: 0 0 20rpx rgba(251, 191, 36, 0.8);
  }
}


.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.player-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #ef4444;
  margin-bottom: 12rpx;
}

.player-info.defender .player-avatar {
  border-color: #3b82f6;
}

.player-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4rpx;
}

.player-role {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

.vs-icon {
  font-size: 40rpx;
  font-weight: 700;
  color: #ef4444;
}

.countdown-area {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.1));
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.countdown-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.countdown-num {
  font-size: 64rpx;
  font-weight: 700;
  color: #ef4444;
}

.countdown-unit {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.pool-area {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
}

.pool-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.pool-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #fbbf24;
}

.pool-unit {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.result-area {
  padding: 24rpx;
}

.result-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 48rpx 24rpx;
  text-align: center;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 胜利弹窗 - 最高层级 */
.win-modal-mask {
  z-index: 9999 !important;
}

/* 失败弹窗 - 最高层级 */
.lose-modal-mask {
  z-index: 9999 !important;
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-height: 80vh;
  background: #1f2937;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
}
.modal-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.modal-title-icon {
  width: 32rpx;
  height: 32rpx;
}
.modal-close-icon {
  width: 28rpx;
  height: 28rpx;
}

.modal-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close text {
  font-size: 32rpx;
  color: #fff;
}

.modal-close:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

/* 胜利弹窗 */
.win-modal {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
  border: 4rpx solid rgba(34, 197, 94, 0.5);
  padding: 60rpx 40rpx;
  text-align: center;
  width: 600rpx;
}

.win-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20rpx);
  }
}

.win-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #22c55e;
  margin-bottom: 16rpx;
}

.win-desc {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40rpx;
}

.win-btn {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-radius: 20rpx;
  padding: 24rpx 48rpx;
  text-align: center;
}

.win-btn text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

/* 失败弹窗 */
.lose-modal {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
  border: 4rpx solid rgba(239, 68, 68, 0.5);
  padding: 60rpx 40rpx;
  text-align: center;
  width: 600rpx;
}

.lose-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
}

.lose-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 16rpx;
}

.lose-desc {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40rpx;
}

.lose-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 20rpx;
  padding: 24rpx 48rpx;
  text-align: center;
}

.lose-btn text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}


.modal-body {
  padding: 24rpx;
  max-height: calc(80vh - 120rpx);
  overflow-y: auto;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.empty-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 16rpx;
  color: rgba(255, 255, 255, 0.5);
}

.empty-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 24rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.history-player {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.history-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  margin-bottom: 8rpx;
}

.history-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4rpx;
}

.history-role {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
}

.history-vs {
  font-size: 28rpx;
  font-weight: 700;
  color: #ef4444;
  margin: 0 16rpx;
}

.history-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16rpx 0;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
}

.history-result.win {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
  border: 2rpx solid rgba(34, 197, 94, 0.3);
}

.history-result.lose {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
  border: 2rpx solid rgba(239, 68, 68, 0.3);
}

.result-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}

.result-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}

.result-bet {
  font-size: 22rpx;
  color: #fbbf24;
}

.history-time {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
}

.result-card.win {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
  border: 2rpx solid rgba(34, 197, 94, 0.3);
}

.result-card.lose {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
  border: 2rpx solid rgba(239, 68, 68, 0.3);
}

.result-icon {
  width: 100rpx;
  height: 100rpx;
  margin-bottom: 24rpx;
}

.result-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
}

.result-desc {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32rpx;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 32rpx;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.stat-item.highlight .stat-value {
  color: #22c55e;
}

.result-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx;
  text-align: center;
}

.result-btn-icon {
  width: 32rpx;
  height: 32rpx;
}

.result-btn text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

.challenge-list {
  padding: 24rpx;
}

.challenge-cards {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.challenge-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2rpx solid rgba(255, 255, 255, 0.1);
}

.challenge-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.challenge-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(239, 68, 68, 0.5);
}

.challenge-info {
  display: flex;
  flex-direction: column;
}

.challenge-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4rpx;
}

.challenge-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.action-btn {
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.action-btn.accept {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.action-btn.cancel {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.action-btn text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* 对局记录样式 */
.history-area {
  padding: 24rpx;
}

.history-cards {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 24rpx;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.history-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.history-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-bottom: 8rpx;
}

.history-name {
  font-size: 24rpx;
  color: #fff;
  margin-bottom: 4rpx;
}

.history-role {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
}

.history-vs {
  font-size: 24rpx;
  font-weight: 700;
  color: #fbbf24;
  padding: 0 16rpx;
}

.history-result {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.history-result.win {
  background: rgba(34, 197, 94, 0.15);
}

.history-result.lose {
  background: rgba(239, 68, 68, 0.15);
}

.result-icon {
  font-size: 32rpx;
}

.result-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.result-bet {
  font-size: 24rpx;
  color: #fbbf24;
}

.history-time {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
}

.empty-history-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-history-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}
</style>
