/**
 * 全局配置示例（换服务器只改这里）
 * -------------------------------------------------
 * 使用方法：将本文件复制为 config.js 并修改为你的后端地址
 */

// PHP 后端 API 根地址（必填！）
// 后端入口格式:  <host>/api/index.php/<模块>/<动作>
// 例如部署在 https://你的域名/ 下，则填写:
//   'https://你的域名/api/index.php/'
export const API_BASE = 'https://your-domain.com/api/index.php/'

// 管理后台地址（Web 端管理面板，浏览器访问）
export const ADMIN_BASE = 'https://your-domain.com'

// Web 资源域名（用于生成 H5 分享链接）
export const WEB_BASE = 'https://your-domain.com/'

// WS 开关
export const WS_ENABLED = false
export const WS_URL = 'wss://your-domain.com/ws'

export const SITE_NAME = '栖屿社区'
export const CURRENCY_NAME = '余额'