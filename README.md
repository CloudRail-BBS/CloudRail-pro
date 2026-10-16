# 栖屿社区 · Qixi Community

> 基于 uni-app + Vue3 的移动端社区平台，支持 APP / 小程序 / H5 多端编译。

> 📖 详细的搭建 / 配置 / 运行说明请看 [开发文档.md](./开发文档.md)。

---

## 项目介绍

栖屿社区是一个功能完整的移动端社区应用，涵盖社交、内容、交易、工具等核心模块。项目前端使用 uni-app + Vue3 开发，后端基于 PHP + MySQL，支持 WebSocket 实时通信。

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
| 管理后台 | 用户管理 / 帖子审核 / 圈子管理 / 市场管理 / 系统设置 |

### 技术栈

- **前端**：uni-app + Vue3 + SCSS
- **后端**：PHP + MySQL + WebSocket
- **工具链**：HBuilderX
- **多端支持**：Android / iOS / 微信小程序 / H5

---

## 目录结构

```
社区项目/
├── App.vue               # 全局样式与生命周期
├── main.js               # 应用入口
├── manifest.json         # 应用配置（appid、权限等）
├── pages.json            # 页面路由与 TabBar 配置
├── uni.scss              # 全局 SCSS 变量
├── common/               # 公共模块
│   ├── config.js         #   ★ 后端域名配置（部署必改）
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
│   ├── admin/            #   管理后台
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
git clone https://gitee.com/bgkj520/baige.git
```

### 2. 修改后端配置

编辑 `common/config.js`，将 API 地址改为你的后端：

```js
export const API_BASE = 'https://你的域名/api/index.php/'
export const ADMIN_BASE = 'https://你的域名'
export const WEB_BASE = 'https://你的域名/'
```

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