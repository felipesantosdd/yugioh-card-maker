<template>
  <div class="d-flex flex-column flex-grow-1 min-h-0">
    <div class="search-panel-col mb-3 flex-shrink-0">
      <label class="d-block mb-2">{{ ui[uiLang].search_cards }}</label>
      <b-form-input
        :value="searchQuery"
        :placeholder="ui[uiLang].search_placeholder_name"
        class="mb-3"
        autocomplete="off"
        @input="$emit('update:searchQuery', $event)"
      />
    </div>
    <div
      v-if="cards.length > 0"
      class="d-flex flex-wrap overflow-y-auto flex-grow-1 min-h-0"
      style="gap: 6px"
    >
      <div
        v-for="card in cards"
        :key="card.id"
        v-b-tooltip.hover.top="
          card.name || (card.snapshot && card.snapshot.mhTitle) || 'Card'
        "
        class="mh-search-thumb-wrap position-relative"
        @click="$emit('select-card', card)"
      >
        <div
          class="mh-deck-thumb rounded position-relative"
          :style="{
            backgroundImage: `url('images/pic/mh/layout/${
              (card.snapshot && card.snapshot.mhCardType) || 'time-01'
            }.png')`,
          }"
        >
          <div class="mh-deck-thumb-title">
            {{ card.name || (card.snapshot && card.snapshot.mhTitle) || 'Card' }}
          </div>
          <div
            class="mh-deck-thumb-desc"
            :title="(card.snapshot && card.snapshot.mhDesc1) || ''"
          >
            {{
              card.snapshot && card.snapshot.mhDesc1
                ? (card.snapshot.mhDesc1 + '').slice(0, 28) + '…'
                : ''
            }}
          </div>
          <div class="mh-deck-thumb-icon-wrap">
            <img
              :src="
                'images/pic/mh/icons/' +
                ((card.snapshot && card.snapshot.mhIconColor) || 'time-01') +
                '.png'
              "
              alt=""
              class="mh-deck-thumb-icon"
              @error="$event.target.style.display = 'none'"
            />
          </div>
        </div>
        <div
          class="text-light text-center mt-1"
          style="
            font-size: 9px;
            line-height: 1.1;
            max-width: 72px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          "
        >
          {{ card.name || (card.snapshot && card.snapshot.mhTitle) || 'Card' }}
        </div>
      </div>
    </div>
    <p
      v-else-if="searchQuery.trim()"
      class="text-muted small mb-0 flex-shrink-0"
    >
      {{ ui[uiLang].search_no_results }}
    </p>
    <p v-else class="text-muted small mb-0 flex-shrink-0">
      {{
        ui[uiLang].mh_my_decks ||
        'Digite para buscar por nome nos cards criados.'
      }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'MhSearchTab',
  props: {
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
    searchQuery: { type: String, required: true },
    cards: { type: Array, required: true },
  },
}
</script>
