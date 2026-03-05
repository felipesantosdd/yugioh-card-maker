<template>
  <div>
    <!-- Modal de carregamento -->
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
          <div class="dialog-content mt-3 mb-1">Aguarde...<br><small>(o carregamento inicial das fontes pode demorar)</small></div>
        </b-col>
      </b-row>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
export default {
  computed: {
    ...mapGetters(['loadingDialogShow']),
    show: {
      get() {
        return this.loadingDialogShow
      },
      set(_) {
        this.closeLoadingDialog()
      },
    },
  },
  methods: {
    ...mapMutations(['closeLoadingDialog']),
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
  font-weight: 500;
}
</style>