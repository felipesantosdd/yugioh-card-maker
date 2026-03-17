<template>
  <b-modal
    :visible="value"
    title="Importar Deck Yu-Gi-Oh"
    ok-title=""
    cancel-title=""
    hide-footer
    centered
    size="lg"
    @change="$emit('input', $event)"
  >
    <b-form @submit.prevent="$emit('submit')">
      <b-form-group label="Nome do deck">
        <b-form-input
          :value="deckName"
          class="deck-name-input"
          placeholder="Ex: P.U.N.K. Gold Pride"
          required
          @input="$emit('update:deckName', $event)"
        />
      </b-form-group>

      <b-form-group label="Lista do deck">
        <b-form-textarea
          :value="deckText"
          rows="14"
          max-rows="20"
          placeholder="Cole aqui a lista com quantidade + nome do card"
          required
          @input="$emit('update:deckText', $event)"
        />
      </b-form-group>

      <div v-if="preview" class="import-preview panel-bg p-3 rounded mb-3">
        <div class="d-flex flex-wrap align-items-center" style="gap: 10px">
          <span class="badge badge-light">Linhas: {{ preview.parsedCount }}</span>
          <span class="badge badge-success">Encontrados: {{ preview.resolvedCount }}</span>
          <span class="badge badge-warning text-dark">Faltantes: {{ preview.missingCount }}</span>
          <span class="badge badge-info">Cards: {{ preview.totalCards }}</span>
        </div>
        <div v-if="preview.missingNames.length" class="small text-warning mt-2">
          Nao encontrados: {{ preview.missingNames.slice(0, 10).join(', ') }}<span v-if="preview.missingNames.length > 10">...</span>
        </div>
      </div>

      <p v-if="feedback" class="small text-muted mb-3">
        {{ feedback }}
      </p>

      <div class="text-right mt-3">
        <b-button
          variant="secondary"
          class="mr-2"
          :disabled="loading"
          @click="$emit('input', false)"
        >
          {{ ui[uiLang].cancel || 'Cancelar' }}
        </b-button>
        <b-button
          type="submit"
          variant="primary"
          :disabled="loading || !deckName.trim() || !deckText.trim() || !preview || preview.resolvedCount === 0"
        >
          {{ loading ? 'Importando...' : 'Importar deck' }}
        </b-button>
      </div>
    </b-form>
  </b-modal>
</template>

<script>
export default {
  name: 'YgoImportDeckModal',
  props: {
    value: { type: Boolean, default: false },
    deckName: { type: String, default: '' },
    deckText: { type: String, default: '' },
    feedback: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    preview: { type: Object, default: null },
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
  },
}
</script>
