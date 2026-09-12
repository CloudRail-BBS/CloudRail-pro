export function getScreenMetrics() {
  let sys = {};
  try {
    sys = uni.getSystemInfoSync ? (uni.getSystemInfoSync() || {}) : {};
  } catch (e) {
    sys = {};
  }

  let statusBarHeight = Number(sys.statusBarHeight || 0);

  const navBarHeight = 44;
  const windowHeight = Number(sys.windowHeight || 0);
  const screenHeight = Number(sys.screenHeight || windowHeight || 0);

  return {
    sys,
    statusBarHeight,
    navBarHeight,
    navTotalHeight: statusBarHeight + navBarHeight,
    windowHeight,
    screenHeight
  };
}

export function applyH5ViewportHeightVar() {
  // #ifdef H5
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const setHeight = () => {
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
      if (h > 0) {
        document.documentElement.style.setProperty('--tcy-vh', `${h}px`);
      }
    };
    setHeight();
    if (!window.__TCY_VIEWPORT_HEIGHT_SYNC__) {
      window.__TCY_VIEWPORT_HEIGHT_SYNC__ = true;
      window.addEventListener('resize', setHeight);
      window.addEventListener('orientationchange', () => setTimeout(setHeight, 120));
    }
  } catch (e) {}
  // #endif
}
