import Vue from 'vue'
import Vuex from 'vuex'
import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import './plugins/font-awesome'
import './plugins/ygo-db'

import storeConfig from './store/index'
import App from './App.vue'

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)
Vue.use(Vuex)

Vue.config.productionTip = false

const store = new Vuex.Store({
  state: storeConfig.state(),
  getters: storeConfig.getters,
  mutations: storeConfig.mutations,
  actions: storeConfig.actions,
})

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app')
