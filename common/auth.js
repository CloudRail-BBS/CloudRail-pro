/**
 * 认证工具 - 六十三
 */

const ACCOUNTS_KEY = 'multi_accounts';

export const isLoggedIn = () => {
    const token = uni.getStorageSync('token');
    const userInfo = uni.getStorageSync('userInfo');
    return !!(token && userInfo);
}

export const setAuth = (userInfo, token) => {
    if (token) {
        uni.setStorageSync('token', token);
    }
    if (userInfo) {
        uni.setStorageSync('userInfo', userInfo);
        // 登录成功后自动留存账号，用于多账号切换
        saveAccount(userInfo, token);
    }
    uni.removeStorageSync('guest_mode');
}

export const getAuth = () => {
    return {
        token: uni.getStorageSync('token') || '',
        userInfo: uni.getStorageSync('userInfo') || null
    }
}

export const clearAuth = () => {
    uni.removeStorageSync('token');
    uni.removeStorageSync('userInfo');
    uni.removeStorageSync('guest_mode');
}

export const getUserInfo = () => {
    return uni.getStorageSync('userInfo') || null;
}

export const getToken = () => {
    return uni.getStorageSync('token') || '';
}

/* ── 多账号切换 ── */
export const getAccounts = () => {
    try {
        const list = uni.getStorageSync(ACCOUNTS_KEY);
        return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
}

const _writeAccounts = (list) => {
    try { uni.setStorageSync(ACCOUNTS_KEY, list); } catch (e) {}
}

export const saveAccount = (userInfo, token) => {
    if (!userInfo || !userInfo.id || !token) return;
    const id = String(userInfo.id);
    const list = getAccounts();
    const idx = list.findIndex(a => String(a.uid) === id);
    const acc = {
        uid: id,
        name: userInfo.nickname || userInfo.name || userInfo.username || userInfo.account || ('账号' + id),
        avatar: userInfo.avatar || userInfo.avatarUrl || '',
        token: token
    };
    if (idx >= 0) { list[idx] = acc; } else { list.unshift(acc); }
    _writeAccounts(list.slice(0, 10));
}

export const switchAccount = (uid) => {
    const list = getAccounts();
    const acc = list.find(a => String(a.uid) === String(uid));
    if (!acc || !acc.token) return null;
    const info = {
        id: acc.uid,
        uid: acc.uid,
        nickname: acc.name,
        name: acc.name,
        username: acc.name,
        avatar: acc.avatar
    };
    uni.setStorageSync('token', acc.token);
    uni.setStorageSync('userInfo', info);
    uni.removeStorageSync('guest_mode');
    return info;
}

export const removeAccount = (uid) => {
    const list = getAccounts().filter(a => String(a.uid) !== String(uid));
    _writeAccounts(list);
    return list;
}