/**
 * 全局配置（换服务器只改这里）
 * -------------------------------------------------
 * 前端所有接口请求都通过本文件集中配置，修改后无需重新打包逻辑，
 * 只需保存后在 HBuilderX 里重新编译即可生效。
 */

// ══════════════════════════════════════════════
// PHP 后端 API 根地址（必填！）
// 后端入口格式:  <host>/api/index.php/<模块>/<动作>
// 例如部署在 http://你的域名/ 下，则填写:
//   'http://你的域名/api/index.php/'
// 本地测试可用 XAMPP/phpStudy 启动后填写:
//   'http://localhost/社区项目后端/api/index.php/'
// ══════════════════════════════════════════════
export const API_BASE = 'https://your-domain.com/api/index.php'

// ══════════════════════════════════════════════
// 管理后台地址（Web 端管理面板，浏览器访问）
// 部署在 <host>/admin/ 下
// ══════════════════════════════════════════════
export const ADMIN_BASE = 'https://your-domain.com'
// ══════════════════════════════════════════════
// Web 资源域名（用于生成 H5 分享链接：用户主页二维码、帖子分享、软件分享等）
// 一般与后端同域，留空则由后端 fullUrl() 自动拼接
// ══════════════════════════════════════════════
export const WEB_BASE = 'https://your-domain.com'

// ══════════════════════════════════════════════
// 站点名称 / 货币名称 等公共配置默认值
// （后端 system/settings 有配置时以后端为准）
// ══════════════════════════════════════════════
// WS 开关
export const WS_ENABLED = false
export const WS_URL = 'ws://your-domain.com/api/index.php/ws'

export const SITE_NAME = '栖屿社区'
export const CURRENCY_NAME = '余额'
