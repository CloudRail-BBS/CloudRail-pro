/**
 * WebSocket 实时通信服务
 * 单例模式，自动连接/重连/心跳
 */

import { getToken } from '@/common/auth.js'
import { WS_ENABLED, WS_URL } from '@/common/config.js'

// 重连配置
const MAX_RECONNECT_DELAY = 30000
const BASE_RECONNECT_DELAY = 1000

// 心跳间隔（ms）
// 必须明显小于服务端的 CONN_IDLE_SEC(20 秒)，否则 App 被划掉/断网时
// 服务端要等很久才能判定"离线"，在线状态就会时灵时不灵
const HEARTBEAT_INTERVAL = 8000

// 连接保活超时（ms）
// 心跳 8 秒一次，连续 3 次收不到服务端任何数据就认为这条连接已经"假死"。
// 拔网线/切 WiFi 和蜂窝/手机锁屏时 TCP 不会发 FIN，客户端 onClose 不会触发，
// 看上去 connected 还是 true，其实早就断了 —— 在线状态就会一直是错的，
// 而且永远不会自己重连。靠这个超时把它揪出来强制重连。
const LIVENESS_TIMEOUT = 25000

class WebSocketManager {
  constructor() {
    this.socketTask = null
    this.connected = false
    this.connecting = false        // ★ 新增：正在连接中
    this.reconnectTimer = null
    this.reconnectDelay = BASE_RECONNECT_DELAY
    this.reconnectCount = 0
    this.heartbeatTimer = null
    this.watchdogTimer = null
    this.lastRecv = 0              // ★ 最近一次收到服务端数据的时间
    this.listeners = {}
    this.manualClose = false
    this.pendingGroups = []
  }

  /**
   * 建立连接（防重复建连）
   */
  connect() {
    // ★ 关键：正在连接 或 已连接 → 直接返回
    if (this.connecting) return
    if (this.socketTask && this.connected) return

    const token = getToken()
    if (!token) {
      console.log('[WS] 未登录，跳过连接')
      return
    }
    if (!WS_ENABLED) {
      console.log('[WS] WebSocket 服务未启用，跳过连接')
      return
    }

    this.manualClose = false
    this.connecting = true   // ★ 上锁

    // ★ 关键：先把旧连接彻底关掉，避免叠连（先置空引用，旧的回调就会被忽略）
    const oldTask = this.socketTask
    this.socketTask = null
    if (oldTask) {
      try { oldTask.close({}) } catch (e) {}
    }

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`
    console.log('[WS] 正在连接...')

    let task = null
    task = uni.connectSocket({
      url,
      success: () => {},
      fail: (err) => {
        console.error('[WS] 连接失败:', err)
        if (!task || this.socketTask !== task) return
        this.socketTask = null
        this.connecting = false   // ★ 解锁
        this._scheduleReconnect()
      }
    })
    this.socketTask = task

    /* ★ 下面每个回调都先判断 "this.socketTask !== task"：
       旧连接被替换掉之后，它的回调还会继续跑。如果不拦住，
       旧连接的 onClose 会把刚建立的新连接状态改成"已断开"——
       于是心跳停发、25 秒保活超时、服务端判定离线、又重连……
       表现就是"一会儿在线一会儿不在线"。 */

    task.onOpen(() => {
      if (this.socketTask !== task) return
      console.log('[WS] 连接成功')
      this.connected = true
      this.connecting = false     // ★ 解锁
      this.lastRecv = Date.now()  // ★ 开始计保活
      this.reconnectDelay = BASE_RECONNECT_DELAY
      this.reconnectCount = 0
      this._startHeartbeat()
      this._startWatchdog()
      this._emit('open', {})
      if (this.pendingGroups.length > 0) {
        this.send({ type: 'join_groups', data: { group_ids: this.pendingGroups } })
      }
    })

    task.onMessage((res) => {
      if (this.socketTask !== task) return
      /* 收到任何数据都算连接活着（哪怕内容解析失败） */
      this.lastRecv = Date.now()
      try {
        const msg = JSON.parse(res.data)
        if (msg.type === 'pong') return

        // 在线状态广播
        if (msg.type === 'presence') {
          this._emit('presence', msg.data || {}, msg)
          uni.$emit('ws:presence', msg.data || {})
          return
        }

        this._emit(msg.type, msg.data || {}, msg)
      } catch (e) {
        console.warn('[WS] 消息解析失败:', res.data)
      }
    })

    task.onClose((res) => {
      if (this.socketTask !== task) return   // 旧连接的关闭事件，忽略
      console.log('[WS] 连接关闭', res)
      this.socketTask = null
      this.connecting = false     // ★ 解锁
      this._cleanup()
      if (!this.manualClose) {
        this._scheduleReconnect()
      }
    })

    task.onError((err) => {
      if (this.socketTask !== task) return   // 旧连接的错误事件，忽略
      console.error('[WS] 连接错误:', err)
      this.socketTask = null
      this.connected = false
      this.connecting = false     // ★ 解锁
      this._cleanup()
      this._emit('error', err)
      try { task.close({}) } catch (e) {}
      /* 关键：onError 之后不一定会跟着触发 onClose。
         如果这里不安排重连，连接已经断了但 connected 还停在 true，
         ensureConnected() 会认为"已连接"什么都不做，结果就是
         一直显示离线、再也不重连。 */
      this._scheduleReconnect()
    })
  }

  /**
   * 断开连接（手动，不自动重连）
   */
  disconnect() {
    this.manualClose = true
    this._cleanup()
    /* 先把引用置空再关：这样它的 onClose 回调会因为
       "this.socketTask !== task" 直接返回，不会又安排一次重连 */
    const task = this.socketTask
    this.socketTask = null
    if (task) {
      try { task.close({}) } catch (e) {}
    }
    this.connected = false
    this.connecting = false
    this.lastRecv = 0
  }

  /**
   * 发送消息
   */
  send(data) {
    if (!this.connected || !this.socketTask) {
      console.warn('[WS] 未连接，消息发送失败')
      return false
    }
    this.socketTask.send({
      data: JSON.stringify(data),
      fail: (err) => {
        console.error('[WS] 发送失败:', err)
      }
    })
    return true
  }

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
    return () => {
      const idx = this.listeners[type]?.indexOf(callback)
      if (idx >= 0) {
        this.listeners[type].splice(idx, 1)
      }
    }
  }

  off(type, callback) {
    if (!this.listeners[type]) return
    if (callback) {
      const idx = this.listeners[type].indexOf(callback)
      if (idx >= 0) this.listeners[type].splice(idx, 1)
    } else {
      delete this.listeners[type]
    }
  }

  joinGroup(groupID) {
    if (!this.pendingGroups.includes(groupID)) {
      this.pendingGroups.push(groupID)
    }
    if (this.connected) {
      this.send({ type: 'join_groups', data: { group_ids: [groupID] } })
    }
  }

  leaveGroup(groupID) {
    const idx = this.pendingGroups.indexOf(groupID)
    if (idx >= 0) {
      this.pendingGroups.splice(idx, 1)
    }
    if (this.connected) {
      this.send({ type: 'leave_groups', data: { group_ids: [groupID] } })
    }
  }

  ensureConnected() {
    const token = getToken()
    if (!token) return
    /* 回到前台时先看这条连接是不是已经假死（切后台期间定时器被节流，
       心跳发不出去，服务端早就把它断了，但客户端还以为是连着的）。
       这种情况直接强制重连，不用干等保活超时。 */
    if (this.connected && this.lastRecv && Date.now() - this.lastRecv > LIVENESS_TIMEOUT) {
      console.log('[WS] 连接已假死，强制重连')
      this._forceReconnect()
      return
    }
    if (!this.connected && !this.connecting) {
      this.connect()
    }
  }

  isConnected() {
    return this.connected
  }

  // ========== 内部方法 ==========

  _emit(type, data, rawMsg) {
    const cbs = this.listeners[type]
    if (cbs) {
      cbs.forEach(cb => {
        try { cb(data, rawMsg) } catch (e) { console.error('[WS] 回调执行出错:', e) }
      })
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping' })
      }
    }, HEARTBEAT_INTERVAL)
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /* 保活看门狗：心跳照发，但一直收不到服务端任何数据 → 判定假死，强制重连 */
  _startWatchdog() {
    this._stopWatchdog()
    this.watchdogTimer = setInterval(() => {
      if (this.manualClose || !this.connected) return
      if (this.lastRecv && Date.now() - this.lastRecv > LIVENESS_TIMEOUT) {
        console.warn('[WS] 连接假死，强制重连')
        this._forceReconnect()
      }
    }, HEARTBEAT_INTERVAL)
  }

  _stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  /* 主动断开当前（可能已经死掉的）连接并安排重连 */
  _forceReconnect() {
    this.connected = false
    this.connecting = false
    this._cleanup()
    const task = this.socketTask
    this.socketTask = null
    if (task) {
      try { task.close({}) } catch (e) {}
    }
    if (this.manualClose) return
    this._scheduleReconnect()
  }

  _cleanup() {
    this.connected = false
    this._stopHeartbeat()
    this._stopWatchdog()
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    if (this.manualClose) return

    this.reconnectCount++
    console.log(`[WS] 第 ${this.reconnectCount} 次重连，${this.reconnectDelay / 1000}s 后...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClose && !this.connected) {
        this.connect()
      }
    }, this.reconnectDelay)

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY)
  }
}

const wsManager = new WebSocketManager()
export default wsManager