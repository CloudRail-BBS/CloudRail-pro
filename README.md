# CloudRail-pro

> CloudRail-pro 是基于 uni-app + Vue 3 的移动端社区前端，支持 App / 小程序 / H5 多端编译。

> 📖 详细的搭建 / 配置 / 运行说明请看 [开发文档.md](./开发文档.md)。

---

## 项目介绍

CloudRail-pro 提供社区、内容、交易和工具等前端页面，仓库也包含管理后台前端页面。本仓库只包含 uni-app + Vue 3 前端源码，不包含 API 服务、管理后台服务端、数据库或 WebSocket 服务。使用完整功能时，需要自行部署并配置兼容的后端服务。

界面采用统一的 Quiet Cards 视觉体系：浅色以浅灰画布和白色表面承托内容，深色以黑色画布和分层深灰表面建立层级。主题默认跟随系统，也可以在“我的 → 设置 → 外观”中固定为浅色或深色；偏好只保存在本机。游戏牌桌、VIP/商品、抽奖奖级、头像、封面、应用图标和视频画面保留各自的内容色。
### 核心功能

| 模块 | 说明 |
|------|------|
| 社区帖子 | 发帖 / 图文 / 分类 / 搜索 / 点赞 / 评论 / 置顶 / 审核 |
| 动态广场 | 图文动态 / 点赞 / 评论 / 打赏 / 话题 |
| 圈子 | 创建圈子 / 分类管理 / 圈子详情 / 成员管理 |
| 即时通讯 | 私聊 / 群聊 / 图片 / 红包 / 转账 / 实时消息 |
| 闲置市场 | 发布闲置 / 商品分类 / 订单管理 / 物流 |
| 软件库 | 软件分类 / 发布 / 下载 / 版本管理 |
| 钱包系统 | 余额 / 流水 / 打赏 / 红包 / 转账 / 提现 |
| 积分签到 | 每日签到 / 连续签到加成 / 积分商城 |
| 视频中心 | 视频解析 / 播放 / 历史记录 |
| 网盘 | 文件上传 / 下载 / 管理 |
| 扫码交友 | 个人二维码 / 扫一扫添加好友 |
| 通知中心 | 点赞 / 评论 / 关注 / 打赏 / 红包通知 |
| VIP 体系 | 会员卡 / 靓号 / 头像框 / 认证 |
| 管理后台前端 | 用户管理 / 帖子审核 / 圈子管理 / 市场管理 / 系统设置页面 |
| 外观主题 | 跟随系统 / 浅色 / 深色，本机保存，覆盖 104 条路由与播放器覆盖层 |

### 技术栈

- **前端**：uni-app + Vue3 + SCSS
- **服务端依赖**：需另行部署兼容的 API、数据库及 WebSocket 服务；其代码不在本仓库中
- **工具链**：HBuilderX
- **多端支持**：Android / iOS / 微信小程序 / H5
- **主题能力**：App / H5 / 微信小程序原生外观同步；支付宝、百度、抖音在启动和回到前台时刷新
- **自动化验证**：Node.js 内置 `node:test`，运行 `node --test tests/*.test.mjs`

---

## 目录结构

```
CloudRail-pro/
├── App.vue               # 全局样式与生命周期
├── main.js               # 应用入口
├── manifest.json         # 应用配置（appid、权限等）
├── pages.json            # 页面路由与 TabBar 配置
├── theme.json            # 平台原生浅色/深色导航与页面背景
├── uni.scss              # 全局 SCSS 变量与 Quiet Cards 尺寸
├── common/               # 公共模块
│   ├── config.js         #   ★ 外部 API / WebSocket 地址配置
│   ├── api.js            #   请求/上传封装
│   ├── request.js        #   HTTP 请求层
│   ├── api-map.js        #   接口路由映射
│   ├── ws.js             #   WebSocket 连接
│   ├── auth.js           #   认证逻辑
│   ├── util.js           #   工具函数
│   └── ...
├── components/           # 通用组件
│   ├── CustomTabBar.vue  #   自定义底部导航
│   ├── PublishModal.vue  #   发布菜单弹窗
│   ├── DynamicFeed.vue   #   动态信息流
│   └── ...
├── pages/                # 页面
│   ├── index/            #   首页（信息流）
│   ├── circle/           #   圈子（列表/详情）
│   ├── message/          #   消息（私聊/群聊）
│   ├── mine/             #   我的（个人中心）
│   ├── publish/          #   发布帖子
│   ├── dynamic/          #   动态（广场/发布/详情）
│   ├── market/           #   闲置市场
│   ├── software/         #   软件库
│   ├── login/            #   登录
│   ├── register/         #   注册
│   ├── admin/            #   管理后台前端页面
│   └── ...
├── static/              # 静态资源
└── license.md           # MIT 开源协议
```

---

## 快速开始

### 环境要求

- [HBuilderX](https://www.dcloud.io/hbuilderx.html)（推荐最新正式版）

### 1. 克隆项目

```bash
git clone https://github.com/CloudRail-BBS/CloudRail-pro.git
```

### 2. 配置兼容的服务端

本仓库包含管理后台前端页面，但不包含服务端代码。请先准备与前端接口约定兼容的 API 和（如需实时聊天）WebSocket 服务，再配置地址：

编辑 `common/config.js`，将 API 地址改为你的后端：

```js
export const API_BASE = 'https://你的域名/api/index.php/'
export const ADMIN_BASE = 'https://你的域名'
export const WEB_BASE = 'https://你的域名/'
```

生产环境请使用 HTTPS（WebSocket 使用 WSS）；HTTP 仅用于本机开发。

### 3. 运行项目

1. 用 HBuilderX 打开项目目录
2. **H5 预览**：运行 → 运行到浏览器
3. **APP 预览**：运行 → 运行到手机或模拟器
4. **小程序预览**：运行 → 运行到小程序模拟器（需先在 `manifest.json` 配置小程序 appid）

---

## 开源协议

本项目基于 [MIT License](./license.md) 开源。

你可以自由使用、修改、分发本项目的代码，但请在副本中保留原始版权声明和许可声明。

---

## 致谢

感谢所有为本项目贡献代码和建议的开发者。

如果你觉得这个项目有帮助，欢迎 Star ⭐ 支持！
