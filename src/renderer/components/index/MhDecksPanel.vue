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
    <template v-if="mhCenterColumnView === 'decks'">
      <div
        class="
          d-flex
          align-items-center
          justify-content-between
          mb-3
          flex-shrink-0
        "
      >
        <label class="mb-0">{{ ui[uiLang].mh_my_decks || 'Meus Decks (MH)' }}</label>
        <b-button
          size="sm"
          variant="outline-success"
          @click="$emit('new-deck')"
        >
          <fa :icon="['fas', 'plus']" />
          {{ ui[uiLang].new_deck || 'Novo Deck' }}
        </b-button>
      </div>
      <div
        v-if="mhUserDecks.length > 0"
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
          v-for="deck in mhUserDecks"
          :key="deck.id"
          class="deck-card-item rounded text-center position-relative"
          style="cursor: pointer; width: 120px; flex-shrink: 0"
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
            <div
              class="
                deck-card-thumb deck-card-thumb-placeholder
                d-flex
                align-items-center
                justify-content-center
                text-white
                small
              "
            >
              <fa :icon="['fas', 'layer-group']" />
            </div>
          </div>
          <div class="text-white small text-truncate px-1" :title="deck.name">
            {{ deck.name }}
          </div>
        </div>
      </div>
      <p v-else class="text-muted small mb-0 flex-shrink-0">
        {{ ui[uiLang].no_decks || 'Nenhum deck criado.' }}
      </p>
    </template>

    <template v-else-if="mhCenterColumnView === 'deck-cards' && mhSelectedDeck">
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
              {{ mhSelectedDeck.name }} ({{ mhSelectedDeckCards.length }})
            </span>
            <div
              class="d-flex align-items-center flex-shrink-0 flex-wrap"
              style="gap: 4px; justify-content: flex-end"
            >
              <b-button
                size="sm"
                variant="outline-secondary"
                title="Editar nome"
                @click="$emit('edit-deck', mhSelectedDeck)"
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
                :disabled="!mhSelectedDeckId || (editingMhDeckCardId && !hasUnsavedMHChanges)"
                :title="
                  editingMhDeckCardId
                    ? 'Salvar alterações do card'
                    : 'Adicionar card atual ao deck'
                "
                @click="$emit('save-or-add-card')"
              >
                <fa :icon="['fas', 'plus']" class="mr-1" />
                {{ ui[uiLang].add_to_deck || 'Adicionar ao deck' }}
              </b-button>
              <b-button
                size="sm"
                variant="outline-success"
                :disabled="!deckDirtyMh"
                title="Salvar alterações do deck (adicionados/removidos)"
                @click="$emit('save-deck-state')"
              >
                <fa :icon="['fas', 'save']" class="mr-1" />
                Salvar
              </b-button>
              <b-button
                v-if="deckDirtyMh"
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
                :disabled="mhDeckDownloading === mhSelectedDeck.id"
                :title="ui[uiLang].download || 'Baixar deck'"
                @click="$emit('download-deck', mhSelectedDeck)"
              >
                <fa
                  :icon="['fas', 'file-archive']"
                  :class="{ 'fa-spin': mhDeckDownloading === mhSelectedDeck.id }"
                />
                Baixar
              </b-button>
              <b-button
                size="sm"
                variant="outline-danger"
                title="Excluir deck"
                @click="$emit('delete-deck', mhSelectedDeck.id)"
              >
                <fa :icon="['fas', 'trash']" />
              </b-button>
            </div>
          </div>
        </div>
        <div
          v-if="mhSelectedDeckCards.length > 0"
          class="deck-grid deck-cards-scroll overflow-y-auto flex-grow-1"
        >
          <div
            v-for="item in sortedMhSelectedDeckCards"
            :key="item.id"
            v-b-tooltip.hover.top="item.name || 'Card'"
            class="deck-thumb-wrap position-relative mh-deck-thumb-wrap"
            :class="editingMhDeckCardId === item.id ? 'deck-thumb-active' : ''"
            @click="$emit('edit-deck-card', item)"
          >
            <div
              class="mh-deck-thumb rounded position-relative"
              :style="{
                backgroundImage: `url('images/pic/mh/layout/${
                  (item.snapshot && item.snapshot.mhCardType) || 'time-01'
                }.png')`,
              }"
            >
              <div class="mh-deck-thumb-title">
                {{ item.name || (item.snapshot && item.snapshot.mhTitle) || 'Card' }}
              </div>
              <div
                class="mh-deck-thumb-desc"
                :title="(item.snapshot && item.snapshot.mhDesc1) || ''"
              >
                {{
                  item.snapshot && item.snapshot.mhDesc1
                    ? (item.snapshot.mhDesc1 + '').slice(0, 28) + '…'
                    : ''
                }}
              </div>
              <div class="mh-deck-thumb-icon-wrap">
                <img
                  :src="
                    'images/pic/mh/icons/' +
                    ((item.snapshot && item.snapshot.mhIconColor) || 'time-01') +
                    '.png'
                  "
                  alt=""
                  class="mh-deck-thumb-icon"
                  @error="$event.target.style.display = 'none'"
                />
              </div>
            </div>
            <button
              type="button"
              class="deck-thumb-remove"
              :title="ui[uiLang].remove || 'Remover'"
              @click.stop="$emit('remove-deck-card', item.id)"
            >
              ×
            </button>
          </div>
        </div>
        <p v-else class="text-muted small mb-0 flex-shrink-0">
          {{ ui[uiLang].deck_empty || 'Deck vazio. Busque um card e adicione.' }}
        </p>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'MhDecksPanel',
  props: {
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
    mhCenterColumnView: { type: String, required: true },
    mhUserDecks: { type: Array, required: true },
    mhSelectedDeck: { type: Object, default: null },
    mhSelectedDeckId: { type: [String, Number], default: null },
    mhSelectedDeckCards: { type: Array, required: true },
    sortedMhSelectedDeckCards: { type: Array, required: true },
    editingMhDeckCardId: { type: [String, Number], default: null },
    hasUnsavedMHChanges: { type: Boolean, required: true },
    deckDirtyMh: { type: Boolean, required: true },
    mhDeckDownloading: { type: [String, Number, null], default: null },
  },
}
</script>
