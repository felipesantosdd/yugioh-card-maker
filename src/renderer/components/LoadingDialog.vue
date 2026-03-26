<template>
  <div>
    <b-modal
      v-model="show"
      hide-header
      hide-footer
      centered
      :no-close-on-backdrop="true"
    >
      <b-row>
        <b-col class="text-center py-3">
          <div class="text-center mt-3 mb-1">
            <b-spinner small type="grow" label="Carregando"></b-spinner>&nbsp;
            <b-spinner small variant="primary" type="grow" label="Carregando"></b-spinner>&nbsp;
            <b-spinner small variant="success" type="grow" label="Carregando"></b-spinner>&nbsp;
            <b-spinner small variant="danger" type="grow" label="Carregando"></b-spinner>&nbsp;
            <b-spinner small variant="warning" type="grow" label="Carregando"></b-spinner>
          </div>
          <div class="dialog-content mt-3 mb-2">{{ loadingMessage }}</div>
          <div class="dialog-detail mb-3">{{ loadingDetail }}</div>
          <b-progress
            v-if="hasProgress"
            :max="100"
            height="10px"
            class="loading-progress mx-auto mb-3"
          >
            <b-progress-bar
              :value="normalizedProgress"
              :label="`${normalizedProgress}%`"
            />
          </b-progress>
          <div class="dialog-meta">
            <small>Tempo decorrido: {{ elapsedLabel }}</small>
          </div>
        </b-col>
      </b-row>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
export default {
  data() {
    return {
      nowTs: Date.now(),
      timerId: null,
    }
  },
  computed: {
    ...mapGetters(['loadingDialogShow', 'loadingDialogState']),
    show: {
      get() {
        return this.loadingDialogShow
      },
      set(_) {
        this.closeLoadingDialog()
      },
    },
    loadingMessage() {
      return this.loadingDialogState?.message || 'Aguarde...'
    },
    loadingDetail() {
      return (
        this.loadingDialogState?.detail ||
        'O carregamento inicial pode levar um tempo na primeira abertura.'
      )
    },
    hasProgress() {
      return typeof this.loadingDialogState?.progress === 'number'
    },
    normalizedProgress() {
      const value = Number(this.loadingDialogState?.progress)
      if (!Number.isFinite(value)) return 0
      return Math.max(0, Math.min(100, Math.round(value)))
    },
    elapsedLabel() {
      const startedAt = Number(this.loadingDialogState?.startedAt || 0)
      if (!startedAt) return '00:00'
      const elapsedSeconds = Math.max(
        0,
        Math.floor((this.nowTs - startedAt) / 1000)
      )
      const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
      const seconds = String(elapsedSeconds % 60).padStart(2, '0')
      return `${minutes}:${seconds}`
    },
  },
  watch: {
    show: {
      immediate: true,
      handler(value) {
        if (value) {
          this.startTimer()
        } else {
          this.stopTimer()
        }
      },
    },
  },
  methods: {
    ...mapMutations(['closeLoadingDialog']),
    startTimer() {
      if (this.timerId) return
      this.nowTs = Date.now()
      this.timerId = setInterval(() => {
        this.nowTs = Date.now()
      }, 1000)
    },
    stopTimer() {
      if (!this.timerId) return
      clearInterval(this.timerId)
      this.timerId = null
    },
  },
  beforeDestroy() {
    this.stopTimer()
  },
}
</script>

<style scoped>
>>> .modal-content, >>> .modal-body {
  background: #333333 !important;
  border-radius: 1rem;
  border: none;
  box-shadow: 1px 1px 20px #222222A6;
  -webkit-box-shadow: 1px 1px 20px #222222A6;
	-moz-box-shadow: 1px 1px 20px #222222A6;
}
.dialog-content {
  color: #CCC;
  font-size: 18px;
  font-weight: 600;
}
.dialog-detail {
  color: #b7c0ca;
  font-size: 13px;
  line-height: 1.45;
}
.dialog-meta {
  color: #8f9aa6;
  font-size: 12px;
}
.loading-progress {
  max-width: 340px;
}
</style>
