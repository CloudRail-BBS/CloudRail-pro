const LEVEL_CONFIG_KEY = 'app_level_config'
const DEFAULT_EXP_PER_LEVEL = 1000
const DEFAULT_MAX_LEVEL = 20
const MAX_LEVEL_LIMIT = 999

function clampInt(value, fallback, min, max) {
  let next = parseInt(value, 10)
  if (!Number.isFinite(next)) next = fallback
  if (next < min) next = min
  if (next > max) next = max
  return next
}

export function normalizeLevelConfig(raw = {}) {
  return {
    exp_per_level: clampInt(raw.exp_per_level ?? raw.expPerLevel, DEFAULT_EXP_PER_LEVEL, 1, 99999999),
    max_level: clampInt(raw.max_level ?? raw.maxLevel, DEFAULT_MAX_LEVEL, 1, MAX_LEVEL_LIMIT)
  }
}

export function getLevelConfig() {
  try {
    const cached = uni.getStorageSync(LEVEL_CONFIG_KEY)
    if (cached && typeof cached === 'object') {
      return normalizeLevelConfig(cached)
    }
  } catch (e) {}
  return normalizeLevelConfig()
}

export function saveLevelConfig(raw = {}) {
  const next = normalizeLevelConfig(raw)
  try {
    uni.setStorageSync(LEVEL_CONFIG_KEY, next)
  } catch (e) {}
  return next
}

export function getLevelDisplay(lv, config = getLevelConfig()) {
  const safeLv = Math.max(0, parseInt(lv || 0, 10) || 0)
  // 直接使用 lv 作为等级显示（后端设置多少就是 Lv 多少）
  return Math.min(safeLv, config.max_level)
}

export function isMaxLevel(lv, config = getLevelConfig()) {
  const safeLv = Math.max(0, parseInt(lv || 0, 10) || 0)
  return safeLv >= config.max_level
}

export function getLevelProgressPercent(expVal, config = getLevelConfig()) {
  if (!expVal) return 0
  const safeExp = Math.max(0, parseInt(expVal || 0, 10) || 0)
  return Math.min((safeExp / config.exp_per_level) * 100, 100)
}

export function getLevelNeedExp(expVal, config = getLevelConfig()) {
  if (!expVal && expVal !== 0) return config.exp_per_level
  const safeExp = Math.max(0, parseInt(expVal || 0, 10) || 0)
  return Math.max(0, config.exp_per_level - safeExp)
}
