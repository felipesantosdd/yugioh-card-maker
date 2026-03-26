const state = () => ({
  _loadingDialogShow: false,
  _loadingDialogMessage: 'Aguarde...',
  _loadingDialogDetail: 'Preparando a aplicacao...',
  _loadingDialogProgress: null,
  _loadingDialogIndeterminate: true,
  _loadingDialogStartedAt: 0,
})

const getters = {
  loadingDialogShow: (state) => state._loadingDialogShow,
  loadingDialogState: (state) => ({
    show: state._loadingDialogShow,
    message: state._loadingDialogMessage,
    detail: state._loadingDialogDetail,
    progress: state._loadingDialogProgress,
    indeterminate: state._loadingDialogIndeterminate,
    startedAt: state._loadingDialogStartedAt,
  }),
}

const actions = {}

const mutations = {
  fireLoadingDialog(state, payload = {}) {
    const hasPayload = Object.keys(payload).length > 0
    const preserveCurrentState = state._loadingDialogShow && !hasPayload
    state._loadingDialogShow = true
    if (preserveCurrentState) return
    state._loadingDialogMessage = payload.message || 'Aguarde...'
    state._loadingDialogDetail =
      payload.detail ||
      'O carregamento inicial pode levar um tempo na primeira abertura.'
    state._loadingDialogProgress =
      typeof payload.progress === 'number' ? payload.progress : null
    state._loadingDialogIndeterminate =
      typeof payload.indeterminate === 'boolean'
        ? payload.indeterminate
        : state._loadingDialogProgress == null
    state._loadingDialogStartedAt = Date.now()
  },
  updateLoadingDialog(state, payload = {}) {
    state._loadingDialogShow = true
    if (typeof payload.message === 'string') {
      state._loadingDialogMessage = payload.message
    }
    if (typeof payload.detail === 'string') {
      state._loadingDialogDetail = payload.detail
    }
    if ('progress' in payload) {
      state._loadingDialogProgress =
        typeof payload.progress === 'number' ? payload.progress : null
    }
    if (typeof payload.indeterminate === 'boolean') {
      state._loadingDialogIndeterminate = payload.indeterminate
    } else if ('progress' in payload) {
      state._loadingDialogIndeterminate = state._loadingDialogProgress == null
    }
    if (payload.resetTimer) {
      state._loadingDialogStartedAt = Date.now()
    }
  },
  closeLoadingDialog(state) {
    state._loadingDialogShow = false
    state._loadingDialogMessage = 'Aguarde...'
    state._loadingDialogDetail = 'Preparando a aplicacao...'
    state._loadingDialogProgress = null
    state._loadingDialogIndeterminate = true
    state._loadingDialogStartedAt = 0
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
