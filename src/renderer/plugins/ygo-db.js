import Vue from 'vue'

Object.defineProperty(Vue.prototype, '$ygoDb', {
  configurable: true,
  get() {
    return window.ygoDb || null
  },
})
