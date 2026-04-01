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
                :title="
                  cardSelectionMode === 'download'
                    ? 'Usar cards selecionados no download'
                    : 'Escolher deck de destino'
                "
                @click="$emit('finish-export-cards')"
              >
                <fa :icon="['fas', 'check']" class="mr-1" />
                {{
                  cardSelectionMode === 'download'
                    ? 'Usar selecao'
                    : 'Pronto'
                }}
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
        <div class="deck-stats-summary mb-3">
          <div
            v-if="deckExportMode"
            class="deck-selection-summary text-light small w-100"
          >
            {{
              cardSelectionMode === 'download'
                ? `Selecionados para imprimir/baixar: ${selectedExportCardIds.length}`
                : `Selecionados para exportar: ${selectedExportCardIds.length}`
            }}
          </div>
          <div class="deck-stat-pill deck-stat-pill-monster">
            {{ mainDeckMonsterCount }}
          </div>
          <div class="deck-stat-pill deck-stat-pill-spell">
            {{ mainDeckSpellCount }}
          </div>
          <div class="deck-stat-pill deck-stat-pill-trap">
            {{ mainDeckTrapCount }}
          </div>
          <div class="deck-stat-pill deck-stat-pill-extra">
            {{ extraDeckCards.length }}
          </div>
        </div>
        <div
          v-if="selectedDeckCards.length > 0"
          class="deck-sections-scroll overflow-y-auto flex-grow-1 min-h-0"
        >
          <div class="deck-section mb-3">
            <div class="deck-section-label">
              Main Deck ({{ mainDeckCards.length }})
              <span v-if="mainDeckPages > 0" class="deck-section-meta">
                {{ mainDeckPages }} pagina(s)
                <span v-if="mainDeckRemainingSlots > 0">
                  • faltam {{ mainDeckRemainingSlots }} para completar a ultima
                </span>
              </span>
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
    mainDeckMonsterCount: { type: Number, required: true },
    mainDeckSpellCount: { type: Number, required: true },
    mainDeckTrapCount: { type: Number, required: true },
    mainDeckPages: { type: Number, required: true },
    mainDeckRemainingSlots: { type: Number, required: true },
    editingDeckCardId: { type: [String, Number], default: null },
    deckDirtyYgo: { type: Boolean, required: true },
    downloading: { type: Boolean, required: true },
    isCurrentCardInDeck: { type: Boolean, default: false },
    deckExportMode: { type: Boolean, default: false },
    cardSelectionMode: { type: String, default: null },
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
.deck-stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.deck-selection-summary {
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.deck-stat-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  min-width: 42px;
  text-align: center;
}
.deck-stat-pill-monster {
  background: #ba842b;
  border-color: #ba842b;
}
.deck-stat-pill-spell {
  background: #028d80;
  border-color: #028d80;
}
.deck-stat-pill-trap {
  background: #d95aa2;
  border-color: #d95aa2;
}
.deck-stat-pill-extra {
  background: #783b89;
  border-color: #783b89;
}
.deck-section-meta {
  display: inline-block;
  margin-left: 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
}
.deck-thumb-export-selected {
  outline: 3px solid #dc3545;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
  overflow: hidden;
}

.deck-thumb-export-selected::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 4px;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.78) 0%,
    rgba(255, 255, 255, 0.46) 28%,
    rgba(255, 255, 255, 0.18) 58%,
    rgba(255, 255, 255, 0) 100%
  );
  mix-blend-mode: screen;
  opacity: 0.38;
  animation: deck-thumb-selection-light 1s ease-in-out infinite;
}

@keyframes deck-thumb-selection-light {
  0% {
    opacity: 0.28;
  }

  50% {
    opacity: 0.95;
  }

  100% {
    opacity: 0.28;
  }
}
</style>
