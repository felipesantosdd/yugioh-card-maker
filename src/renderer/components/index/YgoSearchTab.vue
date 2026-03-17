<template>
  <div class="d-flex flex-column flex-grow-1 min-h-0 search-tab-layout">
    <div class="search-panel-col flex-shrink-0">
      <b-row class="align-items-end">
        <b-col cols="12" md="auto" class="mb-2 mb-md-0">
          <label class="d-block mb-2">{{ ui[uiLang].search_cards }}</label>
          <b-form-radio-group
            :checked="searchMode"
            buttons
            button-variant="outline-secondary"
            size="sm"
            @input="$emit('update:searchMode', $event)"
          >
            <b-form-radio value="archetype">
              {{ ui[uiLang].search_by_archetype }}
            </b-form-radio>
            <b-form-radio value="name">
              {{ ui[uiLang].search_by_name }}
            </b-form-radio>
          </b-form-radio-group>
        </b-col>
        <b-col
          cols="12"
          md
          class="mb-2 mb-md-0 d-flex justify-content-end flex-wrap"
        >
          <div
            v-if="searchMode === 'archetype'"
            class="position-relative mr-1 flex-grow-1 flex-md-grow-0"
            style="min-width: 180px; max-width: 320px"
          >
            <b-form-input
              :value="searchByArchetype"
              :placeholder="ui[uiLang].search_placeholder_archetype"
              autocomplete="off"
              @focus="$emit('show-archetype-dropdown', true)"
              @keyup.enter="$emit('archetype-enter')"
              @input="onArchetypeInput"
              @blur="$emit('close-archetype-dropdown')"
            />
            <ul
              v-if="showArchetypeDropdown && searchByArchetype.length >= 1"
              class="list-group position-absolute shadow mt-1 w-100 archetype-dropdown"
              style="max-height: 220px; overflow-y: auto"
            >
              <li
                v-for="(opt, idx) in filteredArchetypes.slice(0, 15)"
                :key="idx"
                class="list-group-item list-group-item-action py-2"
                @click="$emit('select-archetype', opt)"
              >
                {{ opt.archetype_name }}
              </li>
            </ul>
          </div>
          <div
            v-else
            class="position-relative mr-1 flex-grow-1 flex-md-grow-0"
            style="min-width: 180px; max-width: 320px"
          >
            <b-form-input
              :value="searchByName"
              :placeholder="ui[uiLang].search_placeholder_name"
              autocomplete="off"
              @focus="$emit('show-name-dropdown', true)"
              @keyup.enter="$emit('name-enter')"
              @input="onNameInput"
              @blur="$emit('close-name-dropdown')"
            />
            <ul
              v-if="showNameDropdown && searchByName.length >= 1"
              class="list-group position-absolute shadow mt-1 w-100 archetype-dropdown"
              style="max-height: 220px; overflow-y: auto"
            >
              <li
                v-for="card in filteredCardsByName.slice(0, 15)"
                :key="card.id"
                class="list-group-item list-group-item-action py-2"
                @click="$emit('select-card-from-name', card)"
              >
                {{ getFilteredCardDisplayName(card) }}
              </li>
            </ul>
          </div>
        </b-col>
      </b-row>
    </div>

    <div class="data-panel-search-scroll">
      <div
        v-if="searchResults.length > 0"
        class="panel-bg shadow p-3 search-results-panel"
      >
        <label class="d-block mb-2">{{ ui[uiLang].search_results }}</label>
        <template v-if="searchResultsByArchetype.length > 0">
          <div class="small text-muted mb-1 mt-2">
            {{ getSearchSectionLabel('archetype') }}
          </div>
          <div class="search-results-grid mb-3">
            <img
              v-for="card in searchResultsByArchetype"
              :key="'arch-' + card.id"
              v-b-tooltip.hover.top="getDisplayName(card)"
              :src="getSearchResultImageSrc(card)"
              :alt="getDisplayName(card)"
              class="search-thumb rounded"
              loading="lazy"
              @click="$emit('apply-card', card)"
              @error="$emit('search-result-img-error', card, $event)"
            />
          </div>
        </template>
        <template v-if="searchMode === 'name' && searchResultsByName.length > 0">
          <div class="small text-muted mb-1 mt-2">
            {{ getSearchSectionLabel('name') }}
          </div>
          <div class="search-results-grid mb-3">
            <img
              v-for="card in searchResultsByName"
              :key="'name-' + card.id"
              v-b-tooltip.hover.top="getDisplayName(card)"
              :src="getSearchResultImageSrc(card)"
              :alt="getDisplayName(card)"
              class="search-thumb rounded"
              loading="lazy"
              @click="$emit('apply-card', card)"
              @error="$emit('search-result-img-error', card, $event)"
            />
          </div>
        </template>
        <template v-if="searchMode === 'name' && searchResultsByDesc.length > 0">
          <div class="small text-muted mb-1 mt-2">
            {{ getSearchSectionLabel('desc') }}
          </div>
          <div class="search-results-grid">
            <img
              v-for="card in searchResultsByDesc"
              :key="'desc-' + card.id"
              v-b-tooltip.hover.top="getDisplayName(card)"
              :src="getSearchResultImageSrc(card)"
              :alt="getDisplayName(card)"
              class="search-thumb rounded"
              loading="lazy"
              @click="$emit('apply-card', card)"
              @error="$emit('search-result-img-error', card, $event)"
            />
          </div>
        </template>
        <template v-if="searchResultsCitedRelated.length > 0">
          <div class="small text-muted mb-1 mt-2">
            {{
              ui[uiLang].search_section_cited || 'Cards citados e relacionados'
            }}
          </div>
          <div class="search-results-grid">
            <img
              v-for="card in searchResultsCitedRelated"
              :key="'cited-' + card.id"
              v-b-tooltip.hover.top="getDisplayName(card)"
              :src="getSearchResultImageSrc(card)"
              :alt="getDisplayName(card)"
              class="search-thumb rounded"
              loading="lazy"
              @click="$emit('apply-card', card)"
              @error="$emit('search-result-img-error', card, $event)"
            />
          </div>
        </template>
        <template
          v-if="searchMode === 'archetype' && searchResultsRelated.length > 0"
        >
          <div class="small text-muted mb-1 mt-2">
            {{ getSearchSectionLabel('related') }}
          </div>
          <div class="search-results-grid">
            <img
              v-for="card in searchResultsRelated"
              :key="'rel-' + card.id"
              v-b-tooltip.hover.top="getDisplayName(card)"
              :src="getSearchResultImageSrc(card)"
              :alt="getDisplayName(card)"
              class="search-thumb rounded"
              loading="lazy"
              @click="$emit('apply-card', card)"
              @error="$emit('search-result-img-error', card, $event)"
            />
          </div>
        </template>
      </div>
      <div
        v-else-if="searchTried && !searchLoading"
        class="panel-bg shadow p-3 text-muted text-center search-results-panel"
      >
        {{ ui[uiLang].search_no_results }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'YgoSearchTab',
  props: {
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
    searchMode: { type: String, required: true },
    searchByArchetype: { type: String, required: true },
    searchByName: { type: String, required: true },
    showArchetypeDropdown: { type: Boolean, required: true },
    showNameDropdown: { type: Boolean, required: true },
    filteredArchetypes: { type: Array, required: true },
    filteredCardsByName: { type: Array, required: true },
    searchResults: { type: Array, required: true },
    searchResultsByArchetype: { type: Array, required: true },
    searchResultsByName: { type: Array, required: true },
    searchResultsByDesc: { type: Array, required: true },
    searchResultsCitedRelated: { type: Array, required: true },
    searchResultsRelated: { type: Array, required: true },
    searchTried: { type: Boolean, required: true },
    searchLoading: { type: Boolean, required: true },
    getDisplayName: { type: Function, required: true },
    getFilteredCardDisplayName: { type: Function, required: true },
    getSearchResultImageSrc: { type: Function, required: true },
    getSearchSectionLabel: { type: Function, required: true },
  },
  methods: {
    onArchetypeInput(value) {
      this.$emit('update:searchByArchetype', value)
      this.$emit('show-archetype-dropdown', true)
    },
    onNameInput(value) {
      this.$emit('update:searchByName', value)
      this.$emit('show-name-dropdown', true)
    },
  },
}
</script>
