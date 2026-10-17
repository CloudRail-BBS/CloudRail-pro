import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import { themeState, themeClass, themeTokens } from './common/theme.js'
export function createApp() {
  const app = createSSRApp(App)
  app.mixin({
    computed: {
      themeState() { return themeState },
      themeClass() { return themeClass.value },
      themeTokens() { return themeTokens.value }
    }
  })
  return {
    app
  }
}
// #endif
