const DEFAULT_TITLE = 'CloudRail-pro';

const PAGE_TITLE_MAP = {
  'pages/index/index': 'CloudRail-pro',
  'pages/circle/circle': '发现圈子',
  'pages/circle/detail': '圈子详情',
  'pages/message/message': '消息',
  'pages/message/chat': '私信',
  'pages/message/details': '消息详情',
  'pages/message/system-notices': '系统通知',
  'pages/message/group-create': '创建群聊',
  'pages/message/group-search': '群号加群',
  'pages/message/group-chat': '群聊',
  'pages/message/group-info': '群资料',
  'pages/mine/mine': '我的',
  'pages/login/login': '登录',
  'pages/register/register': '注册账号',
  'pages/forget-pwd/forget-pwd': '找回密码',
  'pages/user/setting': '设置',
  'pages/user/report': '举报',
  'pages/user/follows': '关注',
  'pages/user/fans': '粉丝',
  'pages/user/fried': '好友',
  'pages/user/profile': '用户主页',
  'pages/user/wallet': '我的资产',
  'pages/user/withdraw': '申请提现',
  'pages/user/withdraw-records': '提现记录',
  'pages/user/zhuanye': '权益认证',
  'pages/user/bubble': '气泡管理',
  'pages/user/qrcode': '我的二维码',
  'pages/user/email': '绑定邮箱',
  'pages/user/phone': '绑定手机',
  'pages/user/pay-password': '支付密码',
  'pages/market/shop': '商城',
  'pages/market/detail': '商品详情',
  'pages/market/orders': '我的订单',
  'pages/market/my_pub': '我的发布',
  'pages/market/publish': '发布商品',
  'pages/fancy/shop': '靓号商城',
  'pages/myTopic/myTopic': '我的话题',
  'pages/search/search': '搜索',
  'pages/publish/publish': '发布',
  'pages/post-detail/post-detail': '帖子详情',
  'pages/webview/webview': '页面详情',
  'pages/app-detail/app-detail': '应用详情',
  'pages/mission/mission': '任务中心'
};

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, '%20'));
  } catch (e) {
    return String(value || '');
  }
}

function parseQuery(queryString) {
  const query = {};
  String(queryString || '').replace(/^\?/, '').split('&').forEach((part) => {
    if (!part) return;
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    const val = eq >= 0 ? part.slice(eq + 1) : '';
    if (key) query[safeDecode(key)] = safeDecode(val);
  });
  return query;
}

function normalizeRoute(route) {
  let r = String(route || '').trim();
  if (!r && typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    if (hash) r = hash.replace(/^#\/?/, '');
    else r = (window.location.pathname || '').replace(/^\/+/, '');
  }
  r = r.replace(/^#\/?/, '').replace(/^\/+/, '');
  return r.split('?')[0].split('#')[0];
}

function getCurrentRouteInfo() {
  let route = '';
  let query = {};

  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const current = pages && pages.length ? pages[pages.length - 1] : null;
    if (current && current.route) {
      route = current.route;
      query = current.options || {};
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const qs = hash.indexOf('?') >= 0 ? hash.slice(hash.indexOf('?') + 1) : window.location.search;
    route = route || normalizeRoute(hash);
    query = { ...parseQuery(qs), ...query };
  }

  return { route: normalizeRoute(route), query };
}

function buildTitle(route, query) {
  let title = PAGE_TITLE_MAP[route] || DEFAULT_TITLE;

  if (route === 'pages/message/chat' && query.name) {
    title = safeDecode(query.name);
  } else if (route === 'pages/message/group-chat' && query.name) {
    title = safeDecode(query.name);
  } else if (route === 'pages/circle/detail' && query.name) {
    title = safeDecode(query.name);
  } else if (route === 'pages/webview/webview' && query.title) {
    title = safeDecode(query.title);
  }

  return title || DEFAULT_TITLE;
}

export function applyH5DocumentTitle(route = '', query = null) {
  if (typeof document === 'undefined') return;
  const info = query ? { route: normalizeRoute(route), query } : getCurrentRouteInfo();
  document.title = buildTitle(info.route, info.query || {});
}

export function setupH5TitleSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__TCY_H5_TITLE_SYNC__) {
    applyH5DocumentTitle();
    return;
  }
  window.__TCY_H5_TITLE_SYNC__ = true;

  const sync = () => {
    setTimeout(() => applyH5DocumentTitle(), 0);
    setTimeout(() => applyH5DocumentTitle(), 80);
    setTimeout(() => applyH5DocumentTitle(), 250);
  };
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);

  ['pushState', 'replaceState'].forEach((name) => {
    const raw = window.history && window.history[name];
    if (typeof raw !== 'function') return;
    window.history[name] = function() {
      const ret = raw.apply(this, arguments);
      sync();
      return ret;
    };
  });

  sync();
}
