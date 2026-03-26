<template>
  <div
    class="
      panel-bg
      shadow
      p-3
      d-flex
      flex-column flex-grow-1
      min-h-0
      decks-panel-inner
    "
  >
    <template v-if="centerColumnView === 'decks'">
      <div
        class="
          d-flex
          align-items-center
          justify-content-between
          mb-3
          flex-shrink-0
        "
      >
        <label class="mb-0">{{ ui[uiLang].my_decks || 'Meus Decks' }}</label>
        <b-button
          size="sm"
          variant="outline-info"
          class="mr-2"
          @click="$emit('import-deck')"
        >
          <fa :icon="['fas', 'file-import']" />
          Importar
        </b-button>
        <b-button
          size="sm"
          variant="outline-success"
          @click="$emit('new-deck')"
        >
          <fa :icon="['fas', 'plus']" />
          {{ ui[uiLang].new_deck || 'Novo Deck' }}
        </b-button>
      </div>
      <div class="d-flex align-items-end flex-wrap mb-3" style="gap: 8px">
        <div class="flex-grow-1 min-w-0">
          <label class="small text-muted d-block mb-1">Buscar deck</label>
          <b-form-input
            :value="deckSearchQuery"
            size="sm"
            placeholder="Buscar por nome"
            @input="$emit('update:deckSearchQuery', $event)"
          />
        </div>
        <div style="min-width: 180px">
          <label class="small text-muted d-block mb-1">Ordenar por</label>
          <b-form-select
            :value="deckSortBy"
            size="sm"
            :options="deckSortOptions"
            @input="$emit('update:deckSortBy', $event)"
          />
        </div>
      </div>
      <div
        v-if="filteredUserDecks.length > 0"
        class="
          d-flex
          flex-wrap
          deck-cards-scroll
          overflow-y-auto
          flex-grow-1
          align-content-start
        "
        style="gap: 10px; min-height: 0"
      >
        <div
          v-for="deck in filteredUserDecks"
          :key="deck.id"
          class="deck-card-item rounded text-center position-relative"
          style="cursor: pointer"
          @click="$emit('select-deck', deck)"
        >
          <div
            class="
              deck-card-thumb-wrap
              rounded
              overflow-hidden
              bg-secondary
              mb-1
            "
          >
            <img
              v-if="deckFirstCardImages[deck.id]"
              :src="deckFirstCardImages[deck.id]"
              :alt="deck.name"
              class="deck-card-thumb"
            />
            <div
              v-else
              class="
                deck-card-thumb deck-card-thumb-placeholder
                d-flex
                align-items-center
                justify-content-center
                text-white
                small
              "
            >
              <fa :icon="['fas', 'folder']" />
            </div>
          </div>
          <div class="text-white small text-truncate px-1" :title="deck.name">
            {{ deck.name }}
          </div>
        </div>
      </div>
      <p v-else class="text-muted small mb-0 flex-shrink-0">
        {{
          deckSearchQuery.trim()
            ? 'Nenhum deck encontrado para a busca.'
            : ui[uiLang].no_decks || 'Nenhum deck criado.'
        }}
      </p>
    </template>

    <template v-else-if="centerColumnView === 'deck-cards' && selectedDeck">
      <div class="d-flex flex-column flex-grow-1 min-h-0">
        <div class="decks-toolbar flex-shrink-0 mb-2">
          <div
            class="
              d-flex
              align-items-center
              justify-content-between
              flex-nowrap
            "
            style="gap: 8px"
          >
            <span
              class="
                text-light
                font-weight-bold
                text-truncate
                flex-grow-1
                min-w-0
                mr-2
              "
            >
              {{ selectedDeck.name }} ({{ selectedDeckCards.length }})
            </span>
            <div
              class="d-flex align-items-center flex-shrink-0 flex-wrap"
              style="gap: 4px; justify-content: flex-end"
            >
              <b-button
                size="sm"
                variant="outline-secondary"
                title="Editar nome"
                @click="$emit('edit-deck', selectedDeck)"
              >
                <fa :icon="['fas', 'pen']" />
              </b-button>
              <b-button
                size="sm"
                variant="outline-light"
                @click="$emit('back-to-decks')"
              >
                <fa :icon="['fas', 'arrow-left']" class="mr-1" />
                Voltar
              </b-button>
              <b-button
                size="sm"
                variant="outline-warning"
                :disabled="!mainDeckCards.length"
                :title="
                  isCurrentCardInDeck
                    ? 'Card já está no deck'
                    : 'Adicionar card atual ao deck'
                "
                @click="$emit('open-hand-test')"
              >
                <fa :icon="['fas', 'hand-paper']" class="mr-1" />
                {{ ui[uiLang].hand_test || 'Teste de mão' }}
              </b-button>
              <b-button
                v-if="!deckExportMode"
                size="sm"
                variant="outline-primary"
                :disabled="!selectedDeckCards.length"
                title="Selecionar cards para exportar para outro deck"
                @click="$emit('start-export-cards')"
              >
                <fa :icon="['fas', 'file-export']" class="mr-1" />
                Exportar cards
              </b-button>
              <b-button
                v-else
                size="sm"
                variant="outline-danger"
                :disabled="!selectedExportCardIds.length"
                title="Escolher deck de destino"
                @click="$emit('finish-export-cards')"
              >
                <fa :icon="['fas', 'check']" class="mr-1" />
                Pronto
              </b-button>
              <b-button
                v-if="deckExportMode"
                size="sm"
                variant="outline-secondary"
                title="Cancelar seleÃ§Ã£o de cards"
                @click="$emit('cancel-export-cards')"
              >
                Cancelar
              </b-button>
              <b-button
                size="sm"
                variant="outline-success"
                :disabled="!deckDirtyYgo"
                title="Salvar alterações do deck (adicionados/removidos)"
                @click="$emit('save-deck-state')"
              >
                <fa :icon="['fas', 'save']" class="mr-1" />
                Salvar
              </b-button>
              <b-button
                v-if="deckDirtyYgo"
                size="sm"
                variant="outline-secondary"
                title="Descartar alterações do deck"
                @click="$emit('discard-deck-state')"
              >
                Descartar
              </b-button>
              <b-button
                size="sm"
                variant="outline-info"
                :disabled="downloading"
                @click="$emit('open-download-modal')"
              >
                {{
                  downloading
                    ? ui[uiLang].mh_download_generating || 'Gerando...'
                    : ui[uiLang].download || 'Baixar'
                }}
              </b-button>
              <b-button
                size="sm"
                variant="outline-danger"
                title="Excluir deck"
                @click="$emit('delete-deck', selectedDeck.id)"
              >
                <fa :icon="['fas', 'trash']" />
              </b-button>
            </div>
          </div>
        </div>
        <div
          v-if="selectedDeckCards.length > 0"
          class="deck-sections-scroll overflow-y-auto flex-grow-1 min-h-0"
        >
          <div class="deck-section mb-3">
            <div class="deck-section-label">
              Main Deck ({{ mainDeckCards.length }})
            </div>
            <div class="deck-grid deck-cards-scroll">
              <div
                v-for="item in mainDeckCards"
                :key="item.id"
                v-b-tooltip.hover.top="item.name"
                class="deck-thumb-wrap position-relative"
                :class="{
                  'deck-thumb-active': editingDeckCardId === item.id,
                  'deck-thumb-export-selected': isExportSelected(item.id),
                }"
                @click="handleDeckCardClick(item)"
              >
                <img
                  v-if="getDeckCardImageSrc(item)"
                  :src="getDeckCardImageSrc(item)"
                  :alt="item.name"
                  class="deck-thumb rounded"
                />
                <div
                  v-else
                  class="
                    deck-thumb
                    rounded
                    bg-secondary
                    d-flex
                    align-items-center
                    justify-content-center
                    text-white
                    small
                  "
                >
                  ?
                </div>
                <button
                  v-if="!deckExportMode"
                  class="deck-thumb-remove"
                  title="Remover"
                  @click.stop="$emit('remove-deck-card', item.id)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
          <div v-if="extraDeckCards.length > 0" class="deck-section">
            <div class="deck-section-label deck-section-label-extra">
              Extra Deck ({{ extraDeckCards.length }})
            </div>
            <div class="deck-grid deck-cards-scroll deck-grid-extra">
              <div
                v-for="item in extraDeckCards"
                :key="item.id"
                v-b-tooltip.hover.top="item.name"
                class="deck-thumb-wrap position-relative"
                :class="{
                  'deck-thumb-active': editingDeckCardId === item.id,
                  'deck-thumb-export-selected': isExportSelected(item.id),
                }"
                @click="handleDeckCardClick(item)"
              >
                <img
                  v-if="getDeckCardImageSrc(item)"
                  :src="getDeckCardImageSrc(item)"
                  :alt="item.name"
                  class="deck-thumb rounded"
                />
                <div
                  v-else
                  class="
                    deck-thumb
                    rounded
                    bg-secondary
                    d-flex
                    align-items-center
                    justify-content-center
                    text-white
                    small
                  "
                >
                  ?
                </div>
                <button
                  v-if="!deckExportMode"
                  class="deck-thumb-remove"
                  title="Remover"
                  @click.stop="$emit('remove-deck-card', item.id)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-muted small mb-0 flex-shrink-0">
          {{
            ui[uiLang].deck_empty || 'Deck vazio. Busque um card e adicione.'
          }}
        </p>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'YgoDecksPanel',
  props: {
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
    centerColumnView: { type: String, required: true },
    filteredUserDecks: { type: Array, required: true },
    deckFirstCardImages: { type: Object, required: true },
    deckSearchQuery: { type: String, required: true },
    deckSortBy: { type: String, required: true },
    deckSortOptions: { type: Array, required: true },
    selectedDeck: { type: Object, default: null },
    selectedDeckCards: { type: Array, required: true },
    mainDeckCards: { type: Array, required: true },
    extraDeckCards: { type: Array, required: true },
    editingDeckCardId: { type: [String, Number], default: null },
    deckDirtyYgo: { type: Boolean, required: true },
    downloading: { type: Boolean, required: true },
    isCurrentCardInDeck: { type: Boolean, default: false },
    deckExportMode: { type: Boolean, default: false },
    selectedExportCardIds: { type: Array, default: () => [] },
    getDeckCardImageSrc: { type: Function, required: true },
  },
  methods: {
    isExportSelected(id) {
      return this.selectedExportCardIds.includes(id)
    },
    handleDeckCardClick(item) {
      if (this.deckExportMode) {
        this.$emit('toggle-export-card', item)
        return
      }
      this.$emit('edit-deck-card', item)
    },
  },
}
</script>

<style scoped>
.decks-toolbar .btn-outline-success {
  display: none !important;
}
.deck-thumb-export-selected {
  outline: 3px solid #dc3545;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}
</style>
