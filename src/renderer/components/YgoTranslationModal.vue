<template>
  <b-modal
    :visible="value"
    :title="ui[uiLang].translate_title || 'Traduzir Card para PT-BR'"
    ok-title=""
    cancel-title=""
    hide-footer
    centered
    size="lg"
    body-class="ygo-translation-modal-body"
    @change="$emit('input', $event)"
  >
    <b-form class="ygo-translation-form" @submit.prevent="$emit('submit')">
      <b-form-group :label="ui[uiLang].card_name_pt || 'Nome em Portugues'">
        <b-form-input
          :value="translationName"
          :placeholder="ui[uiLang].card_name_pt_placeholder || 'Nome traduzido'"
          @input="$emit('update:translationName', $event)"
        />
      </b-form-group>
      <b-form-group
        v-if="isPendulum"
        :label="ui[uiLang].pendulum_effect_pt || 'Efeito de Pêndulo (PT)'"
      >
        <b-form-textarea
          :value="translationPendulumDesc"
          rows="4"
          :placeholder="ui[uiLang].card_desc_pt_placeholder || 'Efeito de pêndulo traduzido'"
          @input="$emit('update:translationPendulumDesc', $event)"
        />
      </b-form-group>
      <b-form-group
        :label="
          isPendulum
            ? (ui[uiLang].monster_effect_pt || 'Efeito de Monstro (PT)')
            : (ui[uiLang].card_desc_pt || 'Descricao em Portugues')
        "
      >
        <b-form-textarea
          :value="translationDesc"
          :rows="isPendulum ? 4 : 6"
          :placeholder="ui[uiLang].card_desc_pt_placeholder || 'Efeito/descricao traduzida'"
          @input="$emit('update:translationDesc', $event)"
        />
      </b-form-group>
      <div class="text-muted small mb-3">
        {{
          ui[uiLang].translate_note ||
          'Esta traducao sera salva no banco local. Quando uma traducao oficial for disponibilizada pela API, ela substituira a sua.'
        }}
      </div>
      <div class="text-right">
        <b-button variant="secondary" class="mr-2" @click="$emit('input', false)">
          {{ ui[uiLang].cancel || 'Cancelar' }}
        </b-button>
        <b-button type="submit" variant="success">
          {{ ui[uiLang].save || 'Salvar' }}
        </b-button>
      </div>
    </b-form>
  </b-modal>
</template>

<script>
export default {
  name: 'YgoTranslationModal',
  props: {
    value: { type: Boolean, default: false },
    translationName: { type: String, default: '' },
    translationDesc: { type: String, default: '' },
    translationPendulumDesc: { type: String, default: '' },
    isPendulum: { type: Boolean, default: false },
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
  },
}
</script>

<style scoped>
.ygo-translation-form,
.ygo-translation-form label,
.ygo-translation-form .form-control,
.ygo-translation-form .form-control::placeholder {
  color: #000 !important;
}
.ygo-translation-form .form-control {
  background-color: #fff !important;
  border-color: #ced4da;
}
</style>
<style>
/* Fundo claro no corpo do modal para texto preto ficar legível */
.ygo-translation-modal-body {
  background-color: #f8f9fa !important;
  color: #000 !important;
}
</style>
