<template>
  <div class="search-tab-content debug-search-column">
    <div class="search-panel-col flex-shrink-0 debug-search-controls">
      <b-row class="align-items-end">
        <b-col cols="12" md="auto" class="mb-2 mb-md-0">
          <label class="d-block mb-2">
            {{ ui[uiLang].search_cards }}
          </label>
          <b-form-radio-group
            :value="searchMode"
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
              @focus="$emit('update:showArchetypeDropdown', true)"
              @keyup.enter="
                filteredArchetypes.length
                  ? selectArchetype(filteredArchetypes[0])
                  : searchCards()
              "
              @input="
                (val) => {
                  $emit('update:searchByArchetype', val)
                  $emit('update:showArchetypeDropdown', true)
                }
              "
              @blur="closeArchetypeDropdown"
            />
            <ul
              v-if="showArchetypeDropdown && searchByArchetype.length >= 1"
              class="
                list-group
                position-absolute
                shadow
                mt-1
                w-100
                archetype-dropdown
              "
              style="max-height: 220px; overflow-y: auto"
            >
              <li
                v-for="(opt, idx) in filteredArchetypes.slice(0, 15)"
                :key="idx"
                class="list-group-item list-group-item-action py-2"
                @click="selectArchetype(opt)"
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
              @focus="$emit('update:showNameDropdown', true)"
              @keyup.enter="
                filteredCardsByName.length
                  ? selectCardFromName(filteredCardsByName[0])
                  : null
              "
              @input="
                (val) => {
                  $emit('update:searchByName', val)
                  $emit('update:showNameDropdown', true)
                }
              "
              @blur="closeNameDropdown"
            />
            <ul
              v-if="showNameDropdown && searchByName.length >= 1"
              class="
                list-group
                position-absolute
                shadow
                mt-1
                w-100
                archetype-dropdown
              "
              style="max-height: 220px; overflow-y: auto"
            >
              <li
                v-for="card in filteredCardsByName.slice(0, 15)"
                :key="card.id"
                class="list-group-item list-group-item-action py-2"
                @click="selectCardFromName(card)"
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
        class="panel-bg shadow p-3 search-results-panel d-flex flex-column"
      >
        <!-- Seção 1: principais (arquétipo) – não renderiza se vazio -->
        <div
          v-if="searchResultsByArchetype.length > 0"
          class="mb-3 flex-shrink-0"
        >
          <b-card no-body class="border-0 bg-transparent">
            <b-card-header
              header-tag="header"
              class="p-0 border-0 bg-transparent"
              role="tab"
            >
              <b-button
                v-b-toggle.collapse-search-main
                variant="link"
                class="search-collapse-title text-left p-0 font-weight-bold text-info"
                style="text-decoration: none"
              >
                {{ getSearchSectionLabel('archetype') }}
                ({{ searchResultsByArchetype.length }})
              </b-button>
            </b-card-header>
            <b-collapse id="collapse-search-main" visible>
              <b-card-body class="p-0 pt-2">
                <div class="search-results-grid mb-2">
                  <img
                    v-for="card in searchResultsByArchetype"
                    :key="'arch-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
              </b-card-body>
            </b-collapse>
          </b-card>
        </div>

        <!-- Seção 2: nome / descrição / relacionados (do meio) – não renderiza se vazio -->
        <div
          v-if="middleSectionCount > 0"
          class="mb-3 flex-shrink-0"
        >
          <b-card no-body class="border-0 bg-transparent">
            <b-card-header
              header-tag="header"
              class="p-0 border-0 bg-transparent"
              role="tab"
            >
              <b-button
                v-b-toggle.collapse-search-name-desc
                variant="link"
                class="search-collapse-title text-left p-0 font-weight-bold text-info"
                style="text-decoration: none"
              >
                {{ getSearchSectionLabel('name') }} /
                {{ getSearchSectionLabel('desc') }}
                ({{ middleSectionCount }})
              </b-button>
            </b-card-header>
            <b-collapse id="collapse-search-name-desc" visible>
              <b-card-body class="p-0 pt-2">
                <!-- Por nome: nome + descrição -->
                <div
                  v-if="searchMode === 'name' && searchResultsByName.length > 0"
                  class="search-results-grid mb-2"
                >
                  <img
                    v-for="card in searchResultsByName"
                    :key="'name-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
                <div
                  v-if="searchMode === 'name' && searchResultsByDesc.length > 0"
                  class="search-results-grid"
                >
                  <img
                    v-for="card in searchResultsByDesc"
                    :key="'desc-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
                <!-- Por arquétipo: cards relacionados (2º bloco do meio) -->
                <div
                  v-if="
                    searchMode === 'archetype' && searchResultsRelated.length > 0
                  "
                  class="search-results-grid"
                >
                  <img
                    v-for="card in searchResultsRelated"
                    :key="'rel-mid-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
              </b-card-body>
            </b-collapse>
          </b-card>
        </div>

        <!-- Seção 3: citados / relacionados (2º grau) – não renderiza se vazio -->
        <div
          v-if="searchResultsCitedRelated.length > 0"
          class="flex-shrink-0"
        >
          <b-card no-body class="border-0 bg-transparent">
            <b-card-header
              header-tag="header"
              class="p-0 border-0 bg-transparent"
              role="tab"
            >
              <b-button
                v-b-toggle.collapse-search-related
                variant="link"
                class="search-collapse-title text-left p-0 font-weight-bold text-info"
                style="text-decoration: none"
              >
                {{
                  ui[uiLang].search_section_cited ||
                  'Cards citados e relacionados'
                }}
                ({{ searchResultsCitedRelated.length }})
              </b-button>
            </b-card-header>
            <b-collapse id="collapse-search-related" visible>
              <b-card-body class="p-0 pt-2">
                <div class="search-results-grid">
                  <img
                    v-for="card in searchResultsCitedRelated"
                    :key="'cited-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
              </b-card-body>
            </b-collapse>
          </b-card>
        </div>
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
  name: 'YgoSearchDataPanel',
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
    selectArchetypeFn: { type: Function, required: true },
    searchCardsFn: { type: Function, required: true },
    closeArchetypeDropdownFn: { type: Function, required: true },
    closeNameDropdownFn: { type: Function, required: true },
    selectCardFromNameFn: { type: Function, required: true },
    applyCardFromSearchFn: { type: Function, required: true },
    onSearchResultImgErrorFn: { type: Function, required: true },
  },
  computed: {
    middleSectionCount() {
      if (this.searchMode === 'name')
        return this.searchResultsByName.length + this.searchResultsByDesc.length
      return this.searchResultsRelated.length
    },
  },
  methods: {
    selectArchetype(opt) {
      this.selectArchetypeFn(opt)
    },
    searchCards() {
      this.searchCardsFn()
    },
    closeArchetypeDropdown() {
      this.closeArchetypeDropdownFn()
    },
    closeNameDropdown() {
      this.closeNameDropdownFn()
    },
    selectCardFromName(card) {
      this.selectCardFromNameFn(card)
    },
    applyCardFromSearch(card) {
      this.applyCardFromSearchFn(card)
    },
    onSearchResultImgError(card, evt) {
      this.onSearchResultImgErrorFn(card, evt)
    },
  },
}
</script>
