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
const HEARTBEAT_INTERVAL = 25000

class WebSocketManager {
  constructor() {
    this.socketTask = null
    this.connected = false
    this.reconnectTimer = null
    this.reconnectDelay = BASE_RECONNECT_DELAY
    this.reconnectCount = 0
    this.heartbeatTimer = null
    this.listeners = {}        // type -> [callback, ...]
    this.manualClose = false   // 是否手动关闭（不重连）
    this.pendingGroups = []    // 待订阅的群聊ID列表
  }

  /**
   * 建立连接
   */
  connect() {
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
    this.reconnectDelay = BASE_RECONNECT_DELAY

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`
    console.log('[WS] 正在连接...')

    this.socketTask = uni.connectSocket({
      url,
      success: () => {},
      fail: (err) => {
        console.error('[WS] 连接失败:', err)
        this._scheduleReconnect()
      }
    })

    this.socketTask.onOpen(() => {
      console.log('[WS] 连接成功')
      this.connected = true
      this.reconnectDelay = BASE_RECONNECT_DELAY
      this.reconnectCount = 0
      this._startHeartbeat()
      this._emit('open', {})
      // 重新订阅之前记录的群聊
      if (this.pendingGroups.length > 0) {
        this.send({ type: 'join_groups', data: { group_ids: this.pendingGroups } })
      }
    })

    this.socketTask.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data)
        if (msg.type === 'pong') return  // 心跳回复，静默
        this._emit(msg.type, msg.data || {}, msg)
      } catch (e) {
        console.warn('[WS] 消息解析失败:', res.data)
      }
    })

    this.socketTask.onClose((res) => {
      console.log('[WS] 连接关闭', res)
      this._cleanup()
      if (!this.manualClose) {
        this._scheduleReconnect()
      }
    })

    this.socketTask.onError((err) => {
      console.error('[WS] 连接错误:', err)
      this._emit('error', err)
    })
  }

  /**
   * 断开连接（手动，不自动重连）
   */
  disconnect() {
    this.manualClose = true
    this._cleanup()
    if (this.socketTask) {
      this.socketTask.close({})
      this.socketTask = null
    }
    this.connected = false
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

  /**
   * 注册消息监听
   * @param {string} type - 消息类型（chat/group_msg/notification/unread_update/system_notice/open/close/error）
   * @param {function} callback - 回调函数
   * @returns {function} 取消监听的函数
   */
  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
    // 返回取消监听函数
    return () => {
      const idx = this.listeners[type]?.indexOf(callback)
      if (idx >= 0) {
        this.listeners[type].splice(idx, 1)
      }
    }
  }

  /**
   * 取消消息监听
   */
  off(type, callback) {
    if (!this.listeners[type]) return
    if (callback) {
      const idx = this.listeners[type].indexOf(callback)
      if (idx >= 0) this.listeners[type].splice(idx, 1)
    } else {
      delete this.listeners[type]
    }
  }

  /**
   * 订阅群聊房间（进入群聊页面时调用）
   */
  joinGroup(groupID) {
    if (!this.pendingGroups.includes(groupID)) {
      this.pendingGroups.push(groupID)
    }
    if (this.connected) {
      this.send({ type: 'join_groups', data: { group_ids: [groupID] } })
    }
  }

  /**
   * 取消订阅群聊房间（离开群聊页面时调用）
   */
  leaveGroup(groupID) {
    const idx = this.pendingGroups.indexOf(groupID)
    if (idx >= 0) {
      this.pendingGroups.splice(idx, 1)
    }
    if (this.connected) {
      this.send({ type: 'leave_groups', data: { group_ids: [groupID] } })
    }
  }

  /**
   * 确保已连接（页面onShow时调用）
   */
  ensureConnected() {
    const token = getToken()
    if (!token) return
    if (!this.connected) {
      this.connect()
    }
  }

  /**
   * 是否已连接
   */
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

  _cleanup() {
    this.connected = false
    this._stopHeartbeat()
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    if (this.manualClose) return

    this.reconnectCount++
    if (this.reconnectCount > 5) {
      console.log('[WS] 重连次数过多，停止重连')
      return
    }

    console.log(`[WS] ${this.reconnectDelay / 1000}s 后重连...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClose && !this.connected) {
        this.connect()
      }
    }, this.reconnectDelay)

    // 指数退避
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY)
  }
}

// 单例导出
const wsManager = new WebSocketManager()
export default wsManager
