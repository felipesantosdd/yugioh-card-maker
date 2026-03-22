<template>
  <div id="app">
    <!-- Área do título -->

    <!-- Área de conteúdo principal -->
    <main class="container-fluid mb-3 py-3 py-md-5 px-0 main-fullheight">
      <b-tabs
        v-model="activeTab"
        content-class=" tab-content-fullheight"
        class="px-2 tabs-fullheight main-game-tabs"
      >
        <b-tab :title="ui[uiLang].tab_yugioh">
          <!-- Barra de progresso ao atualizar banco local -->
          <div v-if="syncLoading" class="panel-bg shadow p-3 mb-3">
            <label class="d-block mb-2">{{ ui[uiLang].db_sync_title }}</label>
            <b-progress
              :value="syncProgress"
              :max="100"
              show-value
              animated
            ></b-progress>
            <small class="text-muted d-block mt-1">
              {{ syncProgressText }}
            </small>
          </div>
          <div
            v-else-if="syncError"
            class="alert alert-warning py-2 mb-3 small"
          >
            {{ syncError }}
          </div>
          <div v-else class="text-right mb-1">
            <button
              class="btn btn-link btn-sm text-muted p-0"
              style="font-size: 0.7rem"
              @click="forceResync"
            >
              ↻ Forçar atualização do banco
            </button>
          </div>
          <b-row class="row-three-cols align-items-stretch">
            <!-- Coluna esquerda: canvas do cartão -->
            <b-col
              id="card-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
              <div
                class="col-panel-inner d-flex flex-column flex-grow-1"
                :class="{
                  'padding-transition': true,
                  'pt-5': pageScrolling > 10,
                }"
              >
                <div
                  class="d-flex flex-column flex-grow-1 min-h-0"
                  :class="{
                    'padding-transition': true,
                    'pt-5': pageScrolling > 10,
                  }"
                >
                  <div
                    class="
                      panel-bg
                      shadow
                      p-3
                      d-flex
                      flex-column flex-grow-1
                      min-h-0
                    "
                  >
                    <div
                      id="yugiohcard-wrap"
                      ref="yugiohcard-wrap"
                      class="
                        card-body
                        position-relative
                        flex-grow-1
                        min-h-0
                        overflow-hidden
                      "
                      @mousemove="move"
                      @mouseleave="leave"
                    >
                      <canvas
                        id="yugiohcard"
                        ref="yugiohcard"
                        class="cardbg img-fluid"
                      ></canvas>
                      <div
                        v-if="cardPhotoLoading"
                        class="
                          position-absolute
                          top-0
                          start-0
                          w-100
                          h-100
                          d-flex
                          align-items-center
                          justify-content-center
                          rounded
                        "
                        style="
                          background: rgba(0, 0, 0, 0.6);
                          pointer-events: none;
                        "
                      >
                        <div class="text-center text-white">
                          <b-spinner small type="grow"></b-spinner>
                          <div class="small mt-2">Carregando imagem...</div>
                        </div>
                      </div>
                    </div>
                    <!-- Barra: -1 | Editar | Estrela (capa) | Novo | +1 -->
                    <div
                      class="
                        card-deck-actions
                        mt-3
                        pt-3
                        border-top border-secondary
                      "
                    >
                      <div
                        class="
                          d-flex
                          align-items-center
                          justify-content-between
                        "
                      >
                        <b-button
                          size="md"
                          variant="outline-light"
                          :disabled="
                            !selectedDeckId || currentCardQuantityInDeck === 0
                          "
                          title="Remover uma cópia do deck"
                          @click="removeOneFromDeck"
                        >
                          <fa :icon="['fas', 'minus']" />
                        </b-button>
                        <b-button
                          size="md"
                          variant="outline-warning"
                          :disabled="
                            !selectedDeckId || currentCardQuantityInDeck === 0
                          "
                          :title="
                            deckEditLock
                              ? 'Habilitar edição deste card'
                              : 'Editando'
                          "
                          @click="unlockDeckEdit"
                        >
                          {{
                            deckEditLock
                              ? ui[uiLang].edit || 'Editar'
                              : 'Editando'
                          }}
                        </b-button>
                        <b-button
                          v-if="
                            selectedDeckId &&
                            isCurrentCardInDeck &&
                            currentDeckCardIdForCover
                          "
                          size="md"
                          type="button"
                          class="deck-cover-star-btn"
                          :class="{
                            'deck-cover-star-active': isCurrentCardDeckCover,
                          }"
                          variant="outline-secondary"
                          :title="
                            isCurrentCardDeckCover
                              ? 'Capa do deck (clique para desmarcar)'
                              : 'Definir como capa do deck'
                          "
                          @click="toggleDeckCover"
                        >
                          <fa
                            :icon="
                              isCurrentCardDeckCover
                                ? ['fas', 'star']
                                : ['far', 'star']
                            "
                          />
                        </b-button>
                        <b-button
                          size="md"
                          variant="outline-info"
                          title="Novo card (zerar canvas)"
                          @click="load_default_data"
                        >
                          Novo
                        </b-button>
                        <b-button
                          size="md"
                          variant="outline-light"
                          :disabled="!selectedDeckId || !cardKey"
                          :title="
                            editingDeckCardId || isCurrentCardInDeck
                              ? 'Adicionar uma cópia ao deck'
                              : 'Adicionar card ao deck'
                          "
                          @click="
                            editingDeckCardId
                              ? addCopyToDeck()
                              : addToDeckCurrent()
                          "
                        >
                          <fa :icon="['fas', 'plus']" />
                        </b-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </b-col>
            <!-- Coluna central: Meus Decks e cards do deck -->
            <b-col
              id="decks-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
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
                <YgoDecksPanel
                  v-if="
                    centerColumnView === 'decks' ||
                    (centerColumnView === 'deck-cards' && selectedDeck)
                  "
                  :ui="ui"
                  :ui-lang="uiLang"
                  :center-column-view="centerColumnView"
                  :filtered-user-decks="filteredUserDecks"
                  :deck-first-card-images="deckFirstCardImages"
                  :deck-search-query="deckSearchQuery"
                  :deck-sort-by="deckSortBy"
                  :deck-sort-options="[
                    { value: 'updated_at', text: 'Ultima edicao' },
                    { value: 'created_at', text: 'Data de criacao' },
                    { value: 'name', text: 'Nome' },
                  ]"
                  :selected-deck="selectedDeck"
                  :selected-deck-cards="selectedDeckCards"
                  :main-deck-cards="mainDeckCards"
                  :extra-deck-cards="extraDeckCards"
                  :editing-deck-card-id="editingDeckCardId"
                  :deck-dirty-ygo="deckDirtyYgo"
                  :downloading="ygoDeckDownloading"
                  :get-deck-card-image-src="getDeckCardImageSrc"
                  @import-deck="openImportDeckModal"
                  @new-deck="
                    newDeckGame = 'yugioh'
                    showNewDeckModal = true
                  "
                  @update:deckSearchQuery="(v) => (deckSearchQuery = v)"
                  @update:deckSortBy="(v) => (deckSortBy = v)"
                  @select-deck="selectDeck"
                  @edit-deck="openEditDeckModal"
                  @back-to-decks="goBackToDeckList"
                  @open-hand-test="openYgoHandTestModal"
                  @save-deck-state="saveDeckStateYgo"
                  @discard-deck-state="discardDeckStateYgo"
                  @open-download-modal="openYgoDownloadModal"
                  @delete-deck="deleteDeck"
                  @edit-deck-card="loadDeckCardForEdit"
                  @remove-deck-card="removeDeckCard"
                />
                <!-- Vista: lista de decks como cards -->
                <template v-if="false && centerColumnView === 'decks'">
                  <div
                    class="
                      d-flex
                      align-items-center
                      justify-content-between
                      mb-3
                      flex-shrink-0
                    "
                  >
                    <label class="mb-0">{{
                      ui[uiLang].my_decks || 'Meus Decks'
                    }}</label>
                    <b-button
                      size="sm"
                      variant="outline-info"
                      class="mr-2"
                      @click="openImportDeckModal"
                    >
                      <fa :icon="['fas', 'file-import']" />
                      Importar
                    </b-button>
                    <b-button
                      size="sm"
                      variant="outline-success"
                      @click="
                        newDeckGame = 'yugioh'
                        showNewDeckModal = true
                      "
                    >
                      <fa :icon="['fas', 'plus']" />
                      {{ ui[uiLang].new_deck || 'Novo Deck' }}
                    </b-button>
                  </div>
                  <div
                    class="d-flex align-items-end flex-wrap mb-3"
                    style="gap: 8px"
                  >
                    <div class="flex-grow-1 min-w-0">
                      <label class="small text-muted d-block mb-1"
                        >Buscar deck</label
                      >
                      <b-form-input
                        v-model="deckSearchQuery"
                        size="sm"
                        placeholder="Buscar por nome"
                      />
                    </div>
                    <div style="min-width: 180px">
                      <label class="small text-muted d-block mb-1"
                        >Ordenar por</label
                      >
                      <b-form-select
                        v-model="deckSortBy"
                        size="sm"
                        :options="[
                          { value: 'updated_at', text: 'Ultima edicao' },
                          { value: 'created_at', text: 'Data de criacao' },
                          { value: 'name', text: 'Nome' },
                        ]"
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
                      class="
                        deck-card-item
                        rounded
                        text-center
                        position-relative
                      "
                      style="cursor: pointer"
                      @click="selectDeck(deck)"
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
                      <div
                        class="text-white small text-truncate px-1"
                        :title="deck.name"
                      >
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

                <!-- Vista: cards do deck selecionado + toolbar -->
                <template
                  v-else-if="
                    false && centerColumnView === 'deck-cards' && selectedDeck
                  "
                >
                  <div class="d-flex flex-column flex-grow-1 min-h-0">
                    <!-- Toolbar: nome à esquerda, botões à direita -->
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
                          {{ selectedDeck.name }} ({{
                            selectedDeckCards.length
                          }})
                        </span>
                        <div
                          class="
                            d-flex
                            align-items-center
                            flex-shrink-0 flex-wrap
                          "
                          style="gap: 4px; justify-content: flex-end"
                        >
                          <b-button
                            size="sm"
                            variant="outline-secondary"
                            title="Editar nome"
                            @click="openEditDeckModal(selectedDeck)"
                          >
                            <fa :icon="['fas', 'pen']" />
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-light"
                            @click="goBackToDeckList"
                          >
                            <fa :icon="['fas', 'arrow-left']" class="mr-1" />
                            Voltar
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-info"
                            :disabled="
                              ygoDeckDownloading || !selectedDeckCards.length
                            "
                            :title="ui[uiLang].download || 'Baixar deck'"
                            @click="openYgoDownloadModal"
                          >
                            <fa
                              :icon="['fas', 'file-archive']"
                              :class="{ 'fa-spin': ygoDeckDownloading }"
                            />
                            Baixar
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-danger"
                            title="Excluir deck"
                            @click="deleteDeck(selectedDeck.id)"
                          >
                            <fa :icon="['fas', 'trash']" />
                          </b-button>
                        </div>
                      </div>
                    </div>
                    <!-- Lista de cards do deck (scroll quando não couber tudo) -->
                    <div
                      v-if="selectedDeckCards.length > 0"
                      class="
                        deck-sections-scroll
                        overflow-y-auto
                        flex-grow-1
                        min-h-0
                      "
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
                            :class="
                              editingDeckCardId === item.id
                                ? 'deck-thumb-active'
                                : ''
                            "
                            @click="loadDeckCardForEdit(item)"
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
                              class="deck-thumb-remove"
                              title="Remover"
                              @click.stop="removeDeckCard(item.id)"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="extraDeckCards.length > 0"
                        class="deck-section"
                      >
                        <div
                          class="deck-section-label deck-section-label-extra"
                        >
                          Extra Deck ({{ extraDeckCards.length }})
                        </div>
                        <div
                          class="deck-grid deck-cards-scroll deck-grid-extra"
                        >
                          <div
                            v-for="item in extraDeckCards"
                            :key="item.id"
                            v-b-tooltip.hover.top="item.name"
                            class="deck-thumb-wrap position-relative"
                            :class="
                              editingDeckCardId === item.id
                                ? 'deck-thumb-active'
                                : ''
                            "
                            @click="loadDeckCardForEdit(item)"
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
                              class="deck-thumb-remove"
                              title="Remover"
                              @click.stop="removeDeckCard(item.id)"
                            >
                              Ã—
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p v-else class="text-muted small mb-0 flex-shrink-0">
                      {{
                        ui[uiLang].deck_empty ||
                        'Deck vazio. Busque um card e adicione.'
                      }}
                    </p>
                  </div>
                </template>
              </div>
            </b-col>
            <!-- Coluna direita: formulário do cartão -->
            <b-col
              id="data-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
              <div
                class="
                  panel-bg
                  shadow
                  p-3
                  d-flex
                  flex-column flex-grow-1
                  min-h-0
                  overflow-hidden
                "
              >
                <b-tabs
                  v-model="dataPanelTabYgo"
                  content-class="mt-2 flex-grow-1 min-h-0 d-flex flex-column"
                  class="d-flex flex-column min-h-0 data-panel-tabs"
                >
                  <b-tab
                    :title="ui[uiLang].tab_create_edit || 'Criar/Editar'"
                    class="d-flex flex-column min-h-0"
                    lazy
                  >
                    <YgoCreateEditPanel
                      :ui="ui"
                      :uiLang="uiLang"
                      :currentBaseCard="currentBaseCard"
                      :isFieldsLocked="isFieldsLocked"
                      :deckEditLock="deckEditLock"
                      :holo="holo"
                      @update:holo="(v) => (holo = v)"
                      :cardRare="cardRare"
                      :cardRareOpts="cardRareOpts"
                      @update:cardRare="(v) => (cardRare = v)"
                      :titleColor="titleColor"
                      @update:titleColor="(v) => (titleColor = v)"
                      :cardLoadYgoProEnabled="cardLoadYgoProEnabled"
                      @update:cardLoadYgoProEnabled="
                        (v) => (cardLoadYgoProEnabled = v)
                      "
                      :cardKey="cardKey"
                      @update:cardKey="(v) => (cardKey = v)"
                      :apiCardLoading="apiCardLoading"
                      :apiCardError="apiCardError"
                      :cardTitle="cardTitle"
                      @update:cardTitle="(v) => (cardTitle = v)"
                      :cardImg="cardImg"
                      @update:cardImg="(v) => (cardImg = v)"
                      :fullart="fullart"
                      @update:fullart="(v) => (fullart = v)"
                      :hasCardFullArt="hasCardFullArtCache"
                      @upload-fullart="onUploadFullArt"
                      @refresh-fullart-check="refreshHasCardFullArt"
                      :cardType="cardType"
                      :cardTypeOpts="cardTypeOpts"
                      @update:cardType="(v) => (cardType = v)"
                      :cardSubtype="cardSubtype"
                      :cardSubtypeOpts="cardSubtypeOpts"
                      @update:cardSubtype="(v) => (cardSubtype = v)"
                      :cardEff1="cardEff1"
                      :cardEff1Opts="cardEff1Opts"
                      @update:cardEff1="(v) => (cardEff1 = v)"
                      :cardEff2="cardEff2"
                      :cardEff2Opts="cardEff2Opts"
                      @update:cardEff2="(v) => (cardEff2 = v)"
                      :cardAttr="cardAttr"
                      :cardAttrOpts="cardAttrOpts"
                      @update:cardAttr="(v) => (cardAttr = v)"
                      :cardCustomRaceEnabled="cardCustomRaceEnabled"
                      @update:cardCustomRaceEnabled="
                        (v) => (cardCustomRaceEnabled = v)
                      "
                      :cardCustomRace="cardCustomRace"
                      @update:cardCustomRace="(v) => (cardCustomRace = v)"
                      :cardRace="cardRace"
                      :cardRaceOpts="cardRaceOpts"
                      @update:cardRace="(v) => (cardRace = v)"
                      :canPendulumEnabled="canPendulumEnabled"
                      :Pendulum="Pendulum"
                      @update:Pendulum="(v) => (Pendulum = v)"
                      :cardLevel="cardLevel"
                      :cardLevelOpts="cardLevelOpts"
                      @update:cardLevel="(v) => (cardLevel = v)"
                      :cardBLUE="cardBLUE"
                      :cardRED="cardRED"
                      :pendulumSize="pendulumSize"
                      :cardPendulumInfo="cardPendulumInfo"
                      @update:cardBLUE="(v) => (cardBLUE = v)"
                      @update:cardRED="(v) => (cardRED = v)"
                      @update:pendulumSize="(v) => (pendulumSize = v)"
                      @update:cardPendulumInfo="(v) => (cardPendulumInfo = v)"
                      :cardATK="cardATK"
                      :cardDEF="cardDEF"
                      :isLinkMonster="isLinkMonster"
                      :links="links"
                      @update:link="
                        ({ index, value }) => {
                          links[index].val = value
                        }
                      "
                      :infoSize="infoSize"
                      :infoPosition="infoPosition"
                      :cardInfo="cardInfo"
                      @update:cardATK="(v) => (cardATK = v)"
                      @update:cardDEF="(v) => (cardDEF = v)"
                      @update:infoSize="(v) => (infoSize = v)"
                      @update:infoPosition="(v) => (infoPosition = v)"
                      @update:cardInfo="(v) => (cardInfo = v)"
                      :hasUnsavedLayoutChanges="hasUnsavedLayoutChanges"
                      @unlock-edit="unlockCurrentEdit"
                      @download-img="download_img"
                      @save-deck-card-changes="saveCurrentCardChanges"
                      @load-default-data="load_default_data"
                    />
                  </b-tab>
                  <b-tab
                    :title="ui[uiLang].tab_search || 'Busca'"
                    class="d-flex flex-column min-h-0 search-tab-layout"
                    lazy
                  >
                    <YgoSearchDataPanel
                      :ui="ui"
                      :uiLang="uiLang"
                      :searchMode="searchMode"
                      :searchByArchetype="searchByArchetype"
                      :searchByName="searchByName"
                      :showArchetypeDropdown="showArchetypeDropdown"
                      :showNameDropdown="showNameDropdown"
                      :filteredArchetypes="filteredArchetypes"
                      :filteredCardsByName="filteredCardsByName"
                      :searchResults="searchResults"
                      :searchResultsByArchetype="searchResultsByArchetype"
                      :searchResultsByName="searchResultsByName"
                      :searchResultsByDesc="searchResultsByDesc"
                      :searchResultsCitedRelated="searchResultsCitedRelated"
                      :searchResultsRelated="searchResultsRelated"
                      :searchTried="searchTried"
                      :searchLoading="searchLoading"
                      :getDisplayName="getDisplayName"
                      :getFilteredCardDisplayName="getFilteredCardDisplayName"
                      :getSearchResultImageSrc="getSearchResultImageSrc"
                      :getSearchSectionLabel="getSearchSectionLabel"
                      :selectArchetypeFn="selectArchetype"
                      :searchCardsFn="searchCards"
                      :closeArchetypeDropdownFn="closeArchetypeDropdown"
                      :closeNameDropdownFn="closeNameDropdown"
                      :selectCardFromNameFn="selectCardFromName"
                      :applyCardFromSearchFn="applyCardFromSearch"
                      :onSearchResultImgErrorFn="onSearchResultImgError"
                      @update:searchMode="(v) => (searchMode = v)"
                      @update:searchByArchetype="(v) => (searchByArchetype = v)"
                      @update:searchByName="(v) => (searchByName = v)"
                      @update:showArchetypeDropdown="
                        (v) => (showArchetypeDropdown = v)
                      "
                      @update:showNameDropdown="(v) => (showNameDropdown = v)"
                    />
                  </b-tab>
                </b-tabs>
              </div>
            </b-col>
          </b-row>

          <!-- Footer removido temporariamente -->
        </b-tab>
        <b-tab :title="ui[uiLang].tab_monster_hunter">
          <b-row class="row-three-cols align-items-stretch">
            <!-- Coluna esquerda: canvas MH -->
            <b-col
              id="mh-card-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
              <div class="col-panel-inner d-flex flex-column flex-grow-1">
                <div
                  class="
                    panel-bg
                    shadow
                    p-3
                    d-flex
                    flex-column flex-grow-1
                    min-h-0
                  "
                  style="padding: 20px"
                >
                  <!-- Wrapper com mesmo conceito do canvas YGO: 1000×1450, escala para caber no painel -->
                  <div
                    ref="mhPreviewWrap"
                    class="mh-card-preview-wrap mx-auto"
                    :style="{
                      width: '100%',
                      maxWidth: '1000px',
                      height: 1450 * mhPreviewScale + 'px',
                    }"
                  >
                    <div
                      class="mh-card-preview position-relative"
                      :style="mhCardPreviewStyle"
                    >
                      <!-- Título: top 60, left 100, 800x150, fontSize 74, com bg -->
                      <div
                        class="
                          position-absolute
                          mh-text-box
                          text-center text-black
                          overflow-hidden
                          font-weight-bold
                        "
                        :style="{
                          top: (mhTitleTop ?? 60) + 'px',
                          left: (mhTitleLeft ?? 100) + 'px',
                          width: (mhTitleWidth ?? 800) + 'px',
                          height: (mhTitleHeight ?? 150) + 'px',
                          fontSize: (mhTitleFontSize ?? 74) + 'px',
                          fontWeight: 'bold',
                          backgroundColor: 'transparent',
                        }"
                      >
                        <span
                          class="mh-text-inner"
                          v-html="mhTextWithEmojis(mhTitle)"
                        ></span>
                      </div>
                      <!-- Descrição 1: top 240, left 100, 800x420, fontSize 46, com bg -->
                      <div
                        class="
                          position-absolute
                          mh-text-box
                          text-center text-black
                          overflow-hidden
                        "
                        :style="{
                          top: (mhBox1Top ?? 240) + 'px',
                          left: (mhBox1Left ?? 100) + 'px',
                          width: (mhBox1Width ?? 800) + 'px',
                          height: (mhBox1Height ?? 420) + 'px',
                          fontSize: (mhBox1FontSize ?? 46) + 'px',
                          backgroundColor: 'transparent',
                        }"
                      >
                        <span
                          class="mh-text-inner"
                          v-html="mhTextWithEmojis(mhDesc1)"
                        ></span>
                      </div>
                      <!-- Descrição 2: top 730, left 100, 800x500, fontSize 46, com bg -->
                      <div
                        class="
                          position-absolute
                          mh-text-box
                          text-center text-black
                          overflow-hidden
                        "
                        :style="{
                          top: (mhBox2Top ?? 730) + 'px',
                          left: (mhBox2Left ?? 100) + 'px',
                          width: (mhBox2Width ?? 800) + 'px',
                          height: (mhBox2Height ?? 500) + 'px',
                          fontSize: (mhBox2FontSize ?? 46) + 'px',
                          backgroundColor: 'transparent',
                        }"
                      >
                        <span
                          class="mh-text-inner"
                          v-html="mhTextWithEmojis(mhDesc2)"
                        ></span>
                      </div>
                      <!-- Número (só no layout time-02) -->
                      <div
                        v-if="mhCardType === 'time-02'"
                        class="position-absolute mh-text-box mh-number-box"
                        :style="{
                          top: (mhNumberTop ?? 1220) + 'px',
                          left: (mhNumberLeft ?? 49) + 'px',
                          width: (mhNumberWidth ?? 170) + 'px',
                          height: (mhNumberHeight ?? 170) + 'px',
                          fontSize: (mhNumberFontSize ?? 120) + 'px',
                          color: '#fff',
                          WebkitTextStroke: '1px #000',
                          backgroundColor: mhNumberBg
                            ? 'rgba(255,255,255,0.9)'
                            : 'transparent',
                          padding: '4px',
                        }"
                      >
                        <span class="mh-text-inner">{{
                          mhNumberValue != null &&
                          mhNumberValue !== '' &&
                          Number(mhNumberValue) >= 1
                            ? mhNumberValue
                            : 1
                        }}</span>
                      </div>
                      <img
                        :src="'images/pic/mh/icons/' + mhIconColor + '.png'"
                        alt=""
                        class="position-absolute"
                        :style="mhIconStyle"
                        @error="$event.target.style.display = 'none'"
                      />
                    </div>
                  </div>
                  <!-- Barra MH: -1 | quantidade | Editar | +1 | Novo -->
                  <div
                    class="
                      card-deck-actions
                      mt-3
                      pt-3
                      border-top border-secondary
                    "
                  >
                    <div
                      class="
                        d-flex
                        align-items-center
                        justify-content-center
                        flex-wrap
                      "
                    >
                      <span class="text-light small"
                        >{{ mhCurrentCardQuantityInDeck }} no deck</span
                      >
                      <b-button
                        size="md"
                        variant="outline-light"
                        :disabled="
                          !mhSelectedDeckId || mhCurrentCardQuantityInDeck === 0
                        "
                        title="Remover uma cópia do deck"
                        @click="removeOneFromMhDeck"
                      >
                        <fa :icon="['fas', 'minus']" />
                      </b-button>
                      <b-button
                        size="md"
                        variant="outline-warning"
                        :disabled="
                          !mhSelectedDeckId || mhCurrentCardQuantityInDeck === 0
                        "
                        :title="
                          mhDeckEditLock
                            ? 'Habilitar edição deste card'
                            : 'Editando'
                        "
                        @click="unlockMhDeckEdit"
                      >
                        {{
                          mhDeckEditLock
                            ? ui[uiLang].edit || 'Editar'
                            : 'Editando'
                        }}
                      </b-button>
                      <b-button
                        size="md"
                        variant="outline-light"
                        :disabled="!mhSelectedDeckId || !editingMhDeckCardId"
                        title="Adicionar uma cópia ao deck"
                        @click="addCopyToMhDeck"
                      >
                        <fa :icon="['fas', 'plus']" />
                      </b-button>
                      <b-button
                        size="md"
                        variant="outline-info"
                        title="Novo card (zerar canvas)"
                        @click="loadNewMHCard"
                      >
                        {{ ui[uiLang].mh_new_card || 'Novo' }}
                      </b-button>
                    </div>
                  </div>
                </div>
              </div>
            </b-col>
            <!-- Coluna central: Meus Decks MH e cards do deck -->
            <b-col
              id="mh-decks-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
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
                    <label class="mb-0">{{
                      ui[uiLang].mh_my_decks || 'Meus Decks (MH)'
                    }}</label>
                    <b-button
                      size="sm"
                      variant="outline-success"
                      @click="
                        newDeckGame = 'monsterhunter'
                        showNewDeckModal = true
                      "
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
                      class="
                        deck-card-item
                        rounded
                        text-center
                        position-relative
                      "
                      style="cursor: pointer; width: 120px; flex-shrink: 0"
                      @click="selectMhDeck(deck)"
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
                      <div
                        class="text-white small text-truncate px-1"
                        :title="deck.name"
                      >
                        {{ deck.name }}
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-muted small mb-0 flex-shrink-0">
                    {{ ui[uiLang].no_decks || 'Nenhum deck criado.' }}
                  </p>
                </template>
                <template
                  v-else-if="
                    mhCenterColumnView === 'deck-cards' && mhSelectedDeck
                  "
                >
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
                          {{ mhSelectedDeck.name }} ({{
                            mhSelectedDeckCards.length
                          }})
                        </span>
                        <div
                          class="
                            d-flex
                            align-items-center
                            flex-shrink-0 flex-wrap
                          "
                          style="gap: 4px; justify-content: flex-end"
                        >
                          <b-button
                            size="sm"
                            variant="outline-secondary"
                            title="Editar nome"
                            @click="openEditMhDeckModal(mhSelectedDeck)"
                          >
                            <fa :icon="['fas', 'pen']" />
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-light"
                            @click="goBackToMhDeckList"
                          >
                            <fa :icon="['fas', 'arrow-left']" class="mr-1" />
                            Voltar
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-warning"
                            :disabled="
                              !mhSelectedDeckId ||
                              (editingMhDeckCardId && !hasUnsavedMHChanges)
                            "
                            :title="
                              editingMhDeckCardId
                                ? 'Salvar alterações do card'
                                : 'Adicionar card atual ao deck'
                            "
                            @click="saveOrAddMhCard"
                          >
                            <fa :icon="['fas', 'plus']" class="mr-1" />
                            {{ ui[uiLang].add_to_deck || 'Adicionar ao deck' }}
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-success"
                            :disabled="!deckDirtyMh"
                            title="Salvar alterações do deck (adicionados/removidos)"
                            @click="saveDeckStateMh"
                          >
                            <fa :icon="['fas', 'save']" class="mr-1" />
                            Salvar
                          </b-button>
                          <b-button
                            v-if="deckDirtyMh"
                            size="sm"
                            variant="outline-secondary"
                            title="Descartar alterações do deck"
                            @click="discardDeckStateMh"
                          >
                            Descartar
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-info"
                            :disabled="mhDeckDownloading === mhSelectedDeck.id"
                            :title="ui[uiLang].download || 'Baixar deck'"
                            @click="openMhDownloadModal(mhSelectedDeck)"
                          >
                            <fa
                              :icon="['fas', 'file-archive']"
                              :class="{
                                'fa-spin':
                                  mhDeckDownloading === mhSelectedDeck.id,
                              }"
                            />
                            Baixar
                          </b-button>
                          <b-button
                            size="sm"
                            variant="outline-danger"
                            title="Excluir deck"
                            @click="deleteMhDeck(mhSelectedDeck.id)"
                          >
                            <fa :icon="['fas', 'trash']" />
                          </b-button>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="mhSelectedDeckCards.length > 0"
                      class="
                        deck-grid deck-cards-scroll
                        overflow-y-auto
                        flex-grow-1
                      "
                    >
                      <div
                        v-for="item in sortedMhSelectedDeckCards"
                        :key="item.id"
                        v-b-tooltip.hover.top="item.name || 'Card'"
                        class="
                          deck-thumb-wrap
                          position-relative
                          mh-deck-thumb-wrap
                        "
                        :class="
                          editingMhDeckCardId === item.id
                            ? 'deck-thumb-active'
                            : ''
                        "
                        @click="loadMhDeckCardForEdit(item)"
                      >
                        <div
                          class="mh-deck-thumb rounded position-relative"
                          :style="{
                            backgroundImage: `url('images/pic/mh/layout/${
                              (item.snapshot && item.snapshot.mhCardType) ||
                              'time-01'
                            }.png')`,
                          }"
                        >
                          <div class="mh-deck-thumb-title">
                            {{
                              item.name ||
                              (item.snapshot && item.snapshot.mhTitle) ||
                              'Card'
                            }}
                          </div>
                          <div
                            class="mh-deck-thumb-desc"
                            :title="
                              (item.snapshot && item.snapshot.mhDesc1) || ''
                            "
                          >
                            {{
                              item.snapshot && item.snapshot.mhDesc1
                                ? (item.snapshot.mhDesc1 + '').slice(0, 28) +
                                  '…'
                                : ''
                            }}
                          </div>
                          <div class="mh-deck-thumb-icon-wrap">
                            <img
                              :src="
                                'images/pic/mh/icons/' +
                                ((item.snapshot && item.snapshot.mhIconColor) ||
                                  'time-01') +
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
                          @click.stop="removeMhDeckCard(item.id)"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p v-else class="text-muted small mb-0 flex-shrink-0">
                      {{
                        ui[uiLang].deck_empty ||
                        'Deck vazio. Busque um card e adicione.'
                      }}
                    </p>
                  </div>
                </template>
              </div>
            </b-col>
            <!-- Coluna direita: formulário MH + busca -->
            <b-col
              id="mh-data-panel"
              cols="12"
              md="4"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0 col-panel d-flex flex-column"
            >
              <div
                class="
                  panel-bg
                  shadow
                  p-3
                  d-flex
                  flex-column flex-grow-1
                  min-h-0
                  overflow-y-auto
                "
              >
                <b-tabs
                  v-model="dataPanelTabMh"
                  content-class="mt-2 flex-grow-1 min-h-0 d-flex flex-column"
                  class="d-flex flex-column min-h-0 data-panel-tabs"
                >
                  <b-tab
                    :title="ui[uiLang].tab_create_edit || 'Criar/Editar'"
                    class="d-flex flex-column min-h-0"
                  >
                    <div
                      class="
                        data-panel-editor-scroll
                        d-flex
                        flex-column flex-grow-1
                        min-h-0
                      "
                    >
                      <fieldset
                        :disabled="mhDeckEditLock"
                        class="data-panel-fieldset"
                      >
                        <div
                          class="card-form-scroll"
                          :class="{ 'form-faded': mhDeckEditLock }"
                        >
                          <b-form-group :label="ui[uiLang].mh_title">
                            <b-form-input
                              v-model="mhTitle"
                              :placeholder="ui[uiLang].mh_title"
                            />
                          </b-form-group>
                          <b-form-group :label="ui[uiLang].mh_card_type">
                            <b-form-select
                              v-model="mhCardType"
                              :options="mhCardTypeOpts"
                            />
                          </b-form-group>
                          <b-form-group
                            :label="ui[uiLang].mh_desc1"
                            label-size="sm"
                          >
                            <b-form-textarea
                              v-model="mhDesc1"
                              rows="4"
                              class="small"
                            />
                          </b-form-group>
                          <b-form-group
                            :label="ui[uiLang].mh_desc2"
                            label-size="sm"
                          >
                            <b-form-textarea
                              v-model="mhDesc2"
                              rows="4"
                              class="small"
                            />
                          </b-form-group>
                          <template v-if="mhCardType === 'time-02'">
                            <b-form-group
                              :label="ui[uiLang].mh_number_value"
                              label-size="sm"
                            >
                              <b-form-input
                                v-model.number="mhNumberValue"
                                type="number"
                                min="1"
                                placeholder="1"
                                class="small"
                                style="max-width: 120px"
                              />
                            </b-form-group>
                          </template>
                          <b-form-group :label="ui[uiLang].mh_icon_color">
                            <b-form-select
                              v-model="mhIconColor"
                              size="sm"
                              style="max-width: 120px"
                            >
                              <option value="time-01">
                                {{ ui[uiLang].mh_icon_blue }}
                              </option>
                              <option value="time-02">
                                {{ ui[uiLang].mh_icon_red }}
                              </option>
                            </b-form-select>
                          </b-form-group>
                          <div class="d-flex flex-wrap align-items-center mb-2">
                            <b-button
                              variant="primary"
                              size="sm"
                              :disabled="
                                !mhSelectedDeckId ||
                                (editingMhDeckCardId && !hasUnsavedMHChanges)
                              "
                              :title="
                                !mhSelectedDeckId
                                  ? ui[uiLang].mh_my_decks ||
                                    'Selecione um deck abaixo'
                                  : editingMhDeckCardId && !hasUnsavedMHChanges
                                  ? ui[uiLang].no_changes || 'Nenhuma alteração'
                                  : ''
                              "
                              @click="saveOrAddMhCard"
                            >
                              <fa :icon="['fas', 'save']" class="mr-1" />
                              {{ ui[uiLang].save_changes || 'Salvar' }}
                            </b-button>
                          </div>
                        </div>
                      </fieldset>
                    </div>
                  </b-tab>
                  <b-tab
                    :title="ui[uiLang].tab_search || 'Busca'"
                    class="d-flex flex-column min-h-0"
                  >
                    <div class="search-panel-col mb-3 flex-shrink-0">
                      <label class="d-block mb-2">{{
                        ui[uiLang].search_cards
                      }}</label>
                      <b-form-input
                        v-model="mhSearchQuery"
                        :placeholder="ui[uiLang].search_placeholder_name"
                        class="mb-3"
                        autocomplete="off"
                      />
                    </div>
                    <div
                      v-if="mhSearchFilteredCards.length > 0"
                      class="
                        d-flex
                        flex-wrap
                        overflow-y-auto
                        flex-grow-1
                        min-h-0
                      "
                      style="gap: 6px"
                    >
                      <div
                        v-for="card in mhSearchFilteredCards"
                        :key="card.id"
                        v-b-tooltip.hover.top="
                          card.name ||
                          (card.snapshot && card.snapshot.mhTitle) ||
                          'Card'
                        "
                        class="mh-search-thumb-wrap position-relative"
                        @click="selectMhCardFromSearch(card)"
                      >
                        <div
                          class="mh-deck-thumb rounded position-relative"
                          :style="{
                            backgroundImage: `url('images/pic/mh/layout/${
                              (card.snapshot && card.snapshot.mhCardType) ||
                              'time-01'
                            }.png')`,
                          }"
                        >
                          <div class="mh-deck-thumb-title">
                            {{
                              card.name ||
                              (card.snapshot && card.snapshot.mhTitle) ||
                              'Card'
                            }}
                          </div>
                          <div
                            class="mh-deck-thumb-desc"
                            :title="
                              (card.snapshot && card.snapshot.mhDesc1) || ''
                            "
                          >
                            {{
                              card.snapshot && card.snapshot.mhDesc1
                                ? (card.snapshot.mhDesc1 + '').slice(0, 28) +
                                  '…'
                                : ''
                            }}
                          </div>
                          <div class="mh-deck-thumb-icon-wrap">
                            <img
                              :src="
                                'images/pic/mh/icons/' +
                                ((card.snapshot && card.snapshot.mhIconColor) ||
                                  'time-01') +
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
                          {{
                            card.name ||
                            (card.snapshot && card.snapshot.mhTitle) ||
                            'Card'
                          }}
                        </div>
                      </div>
                    </div>
                    <p
                      v-else-if="mhSearchQuery.trim()"
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
                  </b-tab>
                </b-tabs>
              </div>
            </b-col>
          </b-row>
        </b-tab>
        <b-tab :title="ui[uiLang].tab_other_games">
          <div class="panel-bg shadow p-3 text-center text-muted py-5">
            Em breve: outros jogos.
          </div>
        </b-tab>
      </b-tabs>
    </main>

    <b-modal
      ref="unsavedChangesModal"
      :title="ui[uiLang].unsaved_changes_title"
      ok-title=""
      cancel-title=""
      hide-header-close
      @hide="pendingLeaveAction = null"
    >
      <p class="mb-0">{{ ui[uiLang].unsaved_changes_message }}</p>
      <template #modal-footer>
        <b-button variant="success" @click="onUnsavedModalSave">
          {{ ui[uiLang].unsaved_save }}
        </b-button>
        <b-button variant="outline-danger" @click="onUnsavedModalDiscard">
          {{ ui[uiLang].unsaved_discard }}
        </b-button>
        <b-button variant="secondary" @click="onUnsavedModalCancel">
          {{ ui[uiLang].unsaved_cancel }}
        </b-button>
      </template>
    </b-modal>

    <!-- Modal: Aplicar arte só nesta cópia ou em todas? (YGO) -->
    <b-modal
      v-model="showArtApplyModal"
      title="Imagem do card alterada"
      ok-title=""
      cancel-title=""
      hide-footer
      centered
    >
      <p class="mb-3">
        Aplicar esta arte só nesta cópia ou em todas as cópias deste card no
        deck?
      </p>
      <div class="d-flex justify-content-end" style="gap: 8px">
        <b-button variant="secondary" @click="showArtApplyModal = false"
          >Cancelar</b-button
        >
        <b-button variant="outline-primary" @click="onArtApplyThis"
          >Só esta cópia</b-button
        >
        <b-button variant="primary" @click="onArtApplyAll"
          >Todas as cópias</b-button
        >
      </div>
    </b-modal>

    <ygo-import-deck-modal
      v-model="showImportDeckModal"
      :deck-name="importDeckName"
      :deck-text="importDeckText"
      :feedback="importDeckFeedback"
      :loading="importDeckLoading"
      :preview="importDeckPreview"
      :ui="ui"
      :ui-lang="uiLang"
      @update:deckName="importDeckName = $event"
      @update:deckText="importDeckText = $event"
      @submit="importYgoDeck"
    />

    <!-- Modal: Novo Deck -->
    <b-modal
      v-model="showNewDeckModal"
      :title="ui[uiLang].new_deck_title || 'Novo Deck'"
      ok-title=""
      cancel-title=""
      hide-footer
      centered
    >
      <b-form @submit.prevent="createDeck">
        <b-form-group :label="ui[uiLang].deck_name || 'Nome do deck'">
          <b-form-input
            v-model="newDeckName"
            class="deck-name-input"
            :placeholder="
              ui[uiLang].deck_name_placeholder || 'Ex: Dragões Azuis'
            "
            required
          />
        </b-form-group>
        <div class="text-right mt-3">
          <b-button
            variant="secondary"
            class="mr-2"
            @click="showNewDeckModal = false"
            >{{ ui[uiLang].cancel || 'Cancelar' }}</b-button
          >
          <b-button
            type="submit"
            variant="primary"
            :disabled="!newDeckName.trim()"
            >{{ ui[uiLang].create || 'Criar' }}</b-button
          >
        </div>
      </b-form>
    </b-modal>

    <!-- Modal: Editar Nome do Deck -->
    <b-modal
      v-model="showEditDeckModal"
      :title="ui[uiLang].edit_deck_title || 'Editar nome do deck'"
      ok-title=""
      cancel-title=""
      hide-footer
      centered
    >
      <b-form @submit.prevent="saveEditDeck">
        <b-form-group :label="ui[uiLang].deck_name || 'Nome do deck'">
          <b-form-input
            v-model="editingDeckName"
            class="deck-name-input"
            :placeholder="
              ui[uiLang].deck_name_placeholder || 'Ex: Dragões Azuis'
            "
            required
          />
        </b-form-group>
        <div class="text-right mt-3">
          <b-button
            variant="secondary"
            class="mr-2"
            @click="showEditDeckModal = false"
            >{{ ui[uiLang].cancel || 'Cancelar' }}</b-button
          >
          <b-button
            type="submit"
            variant="primary"
            :disabled="!editingDeckName.trim()"
            >{{ ui[uiLang].save || 'Salvar' }}</b-button
          >
        </div>
      </b-form>
    </b-modal>

    <!-- Modal: Download deck YGO — formato PNG (lote) ou Silhuete -->
    <b-modal
      v-model="showYgoDownloadModal"
      :title="
        selectedDeck
          ? (selectedDeck.name || 'Deck') + ' — Formato de download'
          : 'Baixar deck'
      "
      ok-title=""
      cancel-title=""
      hide-footer
      centered
      @show="loadSilhouetteCardSizeOptions"
    >
      <b-form-group
        :label="
          ui[uiLang].mh_download_format || 'Em que formato deseja os cards?'
        "
      >
        <b-form-radio-group
          v-model="ygoDownloadFormat"
          name="ygo-download-format"
        >
          <b-form-radio value="png">{{
            ui[uiLang].mh_download_png || 'PNG — imagens dos cards (ZIP)'
          }}</b-form-radio>
          <b-form-radio v-if="hasSilhouetteSupport" value="silhouette">{{
            ui[uiLang].mh_download_silhouette ||
            'Silhuete — PDF para impressão + arquivo de corte (ZIP)'
          }}</b-form-radio>
        </b-form-radio-group>
      </b-form-group>
      <template
        v-if="ygoDownloadFormat === 'silhouette' && hasSilhouetteSupport"
      >
        <b-form-group
          :label="ui[uiLang].mh_download_card_size || 'Tamanho do card'"
          class="mt-3"
        >
          <b-form-select
            v-model="silhouetteCardSize"
            :options="silhouetteCardSizeOptions"
            value-field="key"
            text-field="label"
            size="sm"
          />
        </b-form-group>
        <b-form-group
          :label="ui[uiLang].silhouette_paper_size || 'Tamanho da folha'"
        >
          <b-form-radio-group
            v-model="silhouettePaperSize"
            name="ygo-silhouette-paper"
          >
            <b-form-radio value="letter">{{
              ui[uiLang].silhouette_letter || 'Letter (EUA)'
            }}</b-form-radio>
            <b-form-radio value="a4">{{
              ui[uiLang].silhouette_a4 || 'A4'
            }}</b-form-radio>
          </b-form-radio-group>
        </b-form-group>
        <b-form-group>
          <b-form-checkbox v-model="silhouetteCardsTouch">
            {{
              ui[uiLang].silhouette_cards_touch ||
              'Cards se tocam (reduz falha de impressão)'
            }}
          </b-form-checkbox>
        </b-form-group>
        <b-form-group>
          <b-form-checkbox v-model="silhouetteIncludeImages">
            {{
              ui[uiLang].silhouette_include_images || 'PDF com imagem dos cards'
            }}
          </b-form-checkbox>
        </b-form-group>
      </template>
      <div class="text-right mt-3">
        <b-button
          variant="secondary"
          class="mr-2"
          @click="showYgoDownloadModal = false"
        >
          {{ ui[uiLang].cancel || 'Cancelar' }}
        </b-button>
        <b-button
          variant="success"
          :disabled="ygoDeckDownloading"
          @click="confirmYgoDownload"
        >
          <fa v-if="ygoDeckDownloading" icon="spinner" spin class="mr-1" />
          {{
            ygoDeckDownloading
              ? ui[uiLang].mh_download_generating || 'Gerando…'
              : ui[uiLang].mh_download_zip_btn || 'Baixar ZIP'
          }}
        </b-button>
      </div>
    </b-modal>

    <b-modal
      v-model="showYgoHandTestModal"
      :title="ui[uiLang].hand_test || 'Teste de mão'"
      ok-title=""
      cancel-title=""
      hide-footer
      centered
      size="xl"
      content-class="hand-test-modal-content"
    >
      <p class="text-muted small mb-3">
        {{
          ui[uiLang].hand_test_hint ||
          '5 cards aleatorio do Main Deck para simular a mão inicial.'
        }}
      </p>
      <div
        v-if="ygoHandTestCards.length > 0"
        class="hand-test-grid"
      >
        <div
          v-for="(item, index) in ygoHandTestCards"
          :key="`${item.id || item.name || 'card'}-${index}`"
          class="hand-test-card text-center"
          :class="{ 'hand-test-draw-card': index === 5 }"
          style="cursor: pointer"
          @click="openYgoHandTestCard(item)"
        >
          <div
            class="
              hand-test-card-thumb
              rounded
              overflow-hidden
              bg-secondary
              mb-2
            "
          >
            <img
              v-if="getDeckCardImageSrc(item)"
              :src="getDeckCardImageSrc(item)"
              :alt="item.name"
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
              ?
            </div>
          </div>
          <div
            v-if="index === 5"
            class="hand-test-draw-label text-uppercase small mb-1"
          >
            {{ ui[uiLang].draw_card || 'Compra do turno' }}
          </div>
          <div class="small text-white text-truncate" :title="item.name">
            {{ item.name }}
          </div>
        </div>
      </div>
      <p v-else class="text-muted mb-0">
        {{
          ui[uiLang].deck_empty ||
          'Deck vazio. Adicione cartas ao Main Deck para testar a mão.'
        }}
      </p>
      <div class="text-right mt-3">
        <b-button
          variant="secondary"
          class="mr-2"
          @click="showYgoHandTestModal = false"
        >
          {{ ui[uiLang].close || 'Fechar' }}
        </b-button>
        <b-button
          variant="outline-info"
          class="mr-2"
          :disabled="!ygoHandTestCards.length"
          @click="copyYgoHandTestNames"
        >
          <fa :icon="['fas', 'copy']" class="mr-1" />
          {{ ui[uiLang].copy || 'Copiar' }}
        </b-button>
        <b-button
          variant="warning"
          :disabled="!mainDeckCards.length"
          @click="drawYgoTestHand"
        >
          <fa :icon="['fas', 'sync-alt']" class="mr-1" />
          {{ ui[uiLang].redraw_hand || 'Sortear novamente' }}
        </b-button>
      </div>
    </b-modal>

    <!-- Modal: Baixar para Silhuete (legado; aberto apenas por fluxos que ainda usam) -->
    <b-modal
      v-model="showSilhouetteModal"
      :title="
        ui[uiLang].silhouette_modal_title || 'Folha para impressão e corte'
      "
      ok-title=""
      cancel-title=""
      hide-footer
      centered
      @show="loadSilhouetteCardSizeOptions"
    >
      <p class="text-muted small mb-3">
        Gera um PDF com as cartas na folha e o arquivo .studio3 para abrir na
        Silhouette Studio e fazer o corte.
      </p>
      <b-form-group
        :label="ui[uiLang].mh_download_card_size || 'Tamanho do card'"
      >
        <b-form-select
          v-model="silhouetteCardSize"
          :options="silhouetteCardSizeOptions"
          value-field="key"
          text-field="label"
          size="sm"
        />
      </b-form-group>
      <b-form-group
        :label="ui[uiLang].silhouette_paper_size || 'Tamanho da folha'"
      >
        <b-form-radio-group
          v-model="silhouettePaperSize"
          name="silhouette-paper"
        >
          <b-form-radio value="letter">{{
            ui[uiLang].silhouette_letter || 'Letter (EUA)'
          }}</b-form-radio>
          <b-form-radio value="a4">{{
            ui[uiLang].silhouette_a4 || 'A4'
          }}</b-form-radio>
        </b-form-radio-group>
      </b-form-group>
      <b-form-group>
        <b-form-checkbox v-model="silhouetteCardsTouch">
          {{
            ui[uiLang].silhouette_cards_touch ||
            'Cards se tocam (reduz falha de impressão)'
          }}
        </b-form-checkbox>
        <small class="text-muted d-block mt-1"
          >Desenha os cards invadindo o espaço entre eles; se a impressão
          entortar, a sobra não vira margem branca.</small
        >
      </b-form-group>
      <b-form-group>
        <b-form-checkbox v-model="silhouetteIncludeImages">
          {{
            ui[uiLang].silhouette_include_images || 'PDF com imagem dos cards'
          }}
        </b-form-checkbox>
        <small class="text-muted d-block mt-1"
          >Desmarque para gerar apenas o gabarito (retângulos) sem a arte dos
          cards.</small
        >
      </b-form-group>
      <div class="text-right">
        <b-button
          variant="secondary"
          class="mr-2"
          @click="showSilhouetteModal = false"
        >
          {{ ui[uiLang].cancel || 'Cancelar' }}
        </b-button>
        <b-button
          variant="success"
          :disabled="silhouetteDownloading"
          @click="downloadSilhouetteDeck"
        >
          {{
            silhouetteDownloading
              ? ui[uiLang].silhouette_downloading || 'Gerando PDF…'
              : ui[uiLang].silhouette_generate || 'Gerar PDF e arquivo de corte'
          }}
        </b-button>
      </div>
    </b-modal>

    <!-- Modal: Download deck MH — formato PNG ou Silhuete -->
    <b-modal
      v-model="showMhDownloadModal"
      :title="
        mhDownloadDeck
          ? mhDownloadDeck.name + ' — Formato de download'
          : 'Baixar deck'
      "
      ok-title=""
      cancel-title=""
      hide-footer
      centered
      @hidden="mhDownloadDeck = null"
    >
      <template v-if="mhDownloadDeck">
        <b-form-group
          :label="
            ui[uiLang].mh_download_format || 'Em que formato deseja os cards?'
          "
        >
          <b-form-radio-group
            v-model="mhDownloadFormat"
            name="mh-download-format"
          >
            <b-form-radio value="png">{{
              ui[uiLang].mh_download_png ||
              'PNG — imagens dos cards + deck.json (ZIP)'
            }}</b-form-radio>
            <b-form-radio value="silhouette">{{
              ui[uiLang].mh_download_silhouette ||
              'Silhuete — PDF para impressão + arquivo de corte (ZIP)'
            }}</b-form-radio>
          </b-form-radio-group>
        </b-form-group>
        <template v-if="mhDownloadFormat === 'silhouette'">
          <b-form-group
            :label="ui[uiLang].mh_download_card_size || 'Tamanho do card'"
            class="mt-3"
          >
            <b-form-select
              v-model="mhDownloadCardSize"
              :options="silhouetteCardSizeOptions"
              value-field="key"
              text-field="label"
              size="sm"
            />
            <div
              v-if="
                silhouetteCardSizeOptions.length === 0 && hasSilhouetteSupport
              "
              class="text-muted small mt-1"
            >
              Carregando…
            </div>
          </b-form-group>
          <b-form-group
            :label="ui[uiLang].mh_download_paper || 'Papel de impressão'"
          >
            <b-form-radio-group
              v-model="mhDownloadSilhouettePaper"
              name="mh-silhouette-paper"
            >
              <b-form-radio value="letter">{{
                ui[uiLang].silhouette_letter || 'Letter (EUA)'
              }}</b-form-radio>
              <b-form-radio value="a4">{{
                ui[uiLang].silhouette_a4 || 'A4'
              }}</b-form-radio>
            </b-form-radio-group>
          </b-form-group>
          <b-form-group>
            <b-form-checkbox v-model="mhDownloadCardsTouch">
              {{
                ui[uiLang].silhouette_cards_touch ||
                'Cards se tocam (reduz falha de impressão)'
              }}
            </b-form-checkbox>
          </b-form-group>
          <b-form-group>
            <b-form-checkbox v-model="mhDownloadIncludeImages">
              {{
                ui[uiLang].silhouette_include_images ||
                'PDF com imagem dos cards'
              }}
            </b-form-checkbox>
          </b-form-group>
        </template>
        <div class="text-right mt-3">
          <b-button
            variant="secondary"
            class="mr-2"
            @click="showMhDownloadModal = false"
          >
            {{ ui[uiLang].cancel || 'Cancelar' }}
          </b-button>
          <b-button
            variant="success"
            :disabled="mhDeckDownloading === mhDownloadDeck.id"
            @click="confirmMhDownload"
          >
            <fa
              v-if="mhDeckDownloading === mhDownloadDeck.id"
              icon="spinner"
              spin
              class="mr-1"
            />
            {{
              mhDeckDownloading === mhDownloadDeck.id
                ? ui[uiLang].mh_download_generating || 'Gerando…'
                : ui[uiLang].mh_download_zip_btn || 'Baixar ZIP'
            }}
          </b-button>
        </div>
      </template>
    </b-modal>

    <LoadingDialog />
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import LoadingDialog from '../components/LoadingDialog.vue'
import YgoImportDeckModal from '../components/YgoImportDeckModal.vue'
import YgoDecksPanel from '../components/index/YgoDecksPanel.vue'
import YgoCreateEditPanel from '../components/index/YgoCreateEditPanel.vue'
import YgoSearchDataPanel from '../components/index/YgoSearchDataPanel.vue'
import ui from '../../../static/lang.ui.json'
import cardMeta from '../../../static/lang.card_meta.json'
import archetypesList from '../../../static/archetypes.json'
import failedCanvasArtIds from '../../../static/ygo/failed-canvas-art.json'
import failedThumbArtIds from '../../../static/ygo/failed-thumb-art.json'

const FAILED_CANVAS_ART_IDS = new Set(
  failedCanvasArtIds.map((id) => String(id))
)
const FAILED_THUMB_ART_IDS = new Set(failedThumbArtIds.map((id) => String(id)))

const YGOPRODECK_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const YGOPRODECK_CHECK_VER = 'https://db.ygoprodeck.com/api/v7/checkDBVer.php'
const SYNC_TIMEOUT_MS = 60000
const DECK_SNAPSHOT_MIGRATION_KEY = 'deckSnapshotMigration_v1'
const LINK_MARKER_TO_INDEX = {
  'Top-Left': 1,
  Top: 2,
  'Top-Right': 3,
  Left: 4,
  Right: 6,
  'Bottom-Left': 7,
  Bottom: 8,
  'Bottom-Right': 9,
}
const INDEX_TO_LINK_MARKER = Object.fromEntries(
  Object.entries(LINK_MARKER_TO_INDEX).map(([marker, index]) => [index, marker])
)

export default {
  components: {
    LoadingDialog,
    YgoDecksPanel,
    YgoImportDeckModal,
    YgoCreateEditPanel,
    YgoSearchDataPanel,
  },
  data() {
    return {
      activeTab: 0,
      localCards: [],
      lastSync: null,
      localDatabaseVersion: null,
      syncLoading: false,
      syncProgress: 0,
      syncError: null,
      cardPhotoLoading: false,

      adCollapsed: false,
      pageScrolling: 0,

      uiLang: 'pt',
      ui,
      cardLang: 'pt',
      cardMeta,

      holo: true,
      cardRare: '0',
      cardRareOpts: [
        { value: '0', text: 'N' },
        { value: '1', text: 'R' },
        { value: '2', text: 'UR' },
      ],
      titleColor: '#000000',
      cardLoadYgoProEnabled: true,
      cardKey: '',
      apiCardCache: {},
      apiCardImageUrls: {},
      cardPreviewUrls: {},
      apiCardFullArtUrls: {},
      apiCardImagePromises: Object.create(null),
      hasCardFullArtCache: false,
      apiCardLoading: false,
      apiCardError: null,
      apiCardFetchTimer: null,
      fullArtPresenceCache: Object.create(null),
      fullArtPresencePromises: Object.create(null),
      cardTitle: '',
      cardImg: null,
      fullart: false,
      cardType: 'Monster',
      cardSubtype: 'Normal',
      cardEff1: 'normal',
      cardEff2: 'none',
      cardAttr: 'LIGHT',
      cardCustomRaceEnabled: false,
      cardCustomRace: '',
      cardRace: 'dragon',
      Pendulum: true,
      Special: true,
      cardLevel: '12',
      cardLevelOpts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
        value: n,
        text: String(n),
      })),
      cardBLUE: 12,
      cardRED: 12,
      pendulumSize: 23,
      cardPendulumInfo: '',

      cardATK: '',
      cardDEF: '',
      links: {
        1: { val: false, symbol: '◤' },
        2: { val: false, symbol: '▲' },
        3: { val: false, symbol: '◥' },
        4: { val: false, symbol: '◀' },
        6: { val: false, symbol: '▶' },
        7: { val: false, symbol: '◣' },
        8: { val: false, symbol: '▼' },
        9: { val: false, symbol: '◢' },
      },
      infoSize: '22',
      infoPosition: 8,
      cardInfo: '',

      imgs: {},
      imageAssetCache: Object.create(null),
      brokenBundledThumbs: Object.create(null),
      brokenBundledCanvasArts: Object.create(null),
      relatedCardsCache: Object.create(null),

      searchMode: 'archetype',
      searchByName: '',
      searchByArchetype: '',
      archetypeOptions: archetypesList,
      showArchetypeDropdown: false,
      showNameDropdown: false,
      searchResults: [],
      searchQueryNormalized: '',
      searchLoading: false,
      searchTried: false,
      relatedCards: [],
      /** Aba da terceira coluna YGO: 0 = Criar/Editar, 1 = Busca */
      dataPanelTabYgo: 0,

      userDecks: [],
      deckSearchQuery: '',
      deckSortBy: 'updated_at',
      selectedDeckId: null,
      selectedDeckCards: [],
      /** IDs de cards removidos do deck (só persistem ao clicar Salvar na coluna do meio) */
      pendingDeckRemovesYgo: [],
      /** 'decks' = lista de decks como cards; 'deck-cards' = cards do deck selecionado */
      centerColumnView: 'decks',
      /** deckId -> URL da imagem do primeiro card (para thumbnail do deck) */
      deckFirstCardImages: {},
      deckCardImageUrls: {},
      batchDownloading: false,
      showSilhouetteModal: false,
      showYgoDownloadModal: false,
      showYgoHandTestModal: false,
      ygoHandTestCards: [],
      ygoDownloadFormat: 'png',
      silhouettePaperSize: 'a4',
      silhouetteCardSize: 'japanese',
      silhouetteCardsTouch: true,
      silhouetteIncludeImages: true,
      silhouetteDownloading: false,
      loadedFromDeck: false,
      editingDeckCardId: null,
      editorModeYgo: 'base',
      /** true = form bloqueado até clicar em Editar (só visualização do card do deck) */
      deckEditLock: false,
      viewingBaseCard: false,

      showArtApplyModal: false,

      showNewDeckModal: false,
      newDeckName: '',
      showImportDeckModal: false,
      importDeckName: '',
      importDeckText: '',
      importDeckLoading: false,
      importDeckFeedback: '',
      showEditDeckModal: false,
      editingDeckId: null,
      editingDeckName: '',

      programmaticUpdate: false,
      snapshotAtLoad: null,
      initialSnapshotWhenNotFromCollection: null,
      pendingLeaveAction: null,

      // Monster Hunter card (desc1/desc2 layout fixo: ver preview)
      mhTitle: '',
      mhCardType: 'time-01',
      mhDesc1: '',
      mhDesc2: '',
      mhBox1Top: 240,
      mhBox1Left: 100,
      mhBox1Width: 800,
      mhBox1Height: 420,
      mhBox1FontSize: 46,
      mhBox1Bg: true,
      mhBox2Top: 730,
      mhBox2Left: 100,
      mhBox2Width: 800,
      mhBox2Height: 500,
      mhBox2FontSize: 46,
      mhBox2Bg: true,
      mhTitleTop: 60,
      mhTitleLeft: 100,
      mhTitleWidth: 800,
      mhTitleHeight: 150,
      mhTitleFontSize: 74,
      mhTitleBg: true,
      mhNumberValue: '',
      mhNumberTop: 1220,
      mhNumberLeft: 49,
      mhNumberWidth: 170,
      mhNumberHeight: 170,
      mhNumberFontSize: 120,
      mhNumberBg: false,
      mhIconColor: 'time-01',
      /** Posição do ícone por layout (cada tipo de card tem sua própria posição) */
      mhLayoutIcon: {
        'time-01': { bottom: 90, right: 72, width: 148, height: 148 },
        'time-02': { bottom: 65, right: 62, width: 148, height: 148 },
      },
      mhPreviewScale: 1,
      // Monster Hunter decks
      mhUserDecks: [],
      mhSelectedDeckId: null,
      mhSelectedDeckCards: [],
      /** IDs de cards MH removidos do deck (só persistem ao clicar Salvar na coluna do meio) */
      pendingDeckRemovesMh: [],
      /** Aba da terceira coluna MH: 0 = Criar/Editar, 1 = Busca */
      dataPanelTabMh: 0,
      /** Todos os cards MH do banco (para busca na aba Busca) */
      mhAllCardsFromDb: [],
      /** Texto da busca na aba Busca MH */
      mhSearchQuery: '',
      /** 'decks' = lista de decks como cards; 'deck-cards' = cards do deck selecionado */
      mhCenterColumnView: 'decks',
      editingMhDeckCardId: null,
      /** true = form MH bloqueado até clicar em Editar */
      mhDeckEditLock: false,
      snapshotMhAtLoad: null,
      mhDeckDownloading: null,
      showMhDownloadModal: false,
      mhDownloadDeck: null,
      mhDownloadFormat: 'png',
      mhDownloadSilhouettePaper: 'a4',
      mhDownloadCardSize: 'japanese',
      mhDownloadCardsTouch: true,
      mhDownloadIncludeImages: true,
      silhouetteCardSizeOptions: [],
      newDeckGame: 'yugioh',
    }
  },
  computed: {
    mhCardPreviewStyle() {
      return {
        width: '1000px',
        height: '1450px',
        transform: `scale(${this.mhPreviewScale})`,
        transformOrigin: 'top left',
        backgroundImage: `url('images/pic/mh/layout/${
          this.mhCardType || 'time-01'
        }.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    },
    /** Quantas cópias do card atual (grupo) existem no deck MH */
    mhCurrentCardQuantityInDeck() {
      if (!this.mhSelectedDeckId || !this.editingMhDeckCardId) return 0
      const current = this.mhSelectedDeckCards.find(
        (c) => c.id === this.editingMhDeckCardId
      )
      if (!current) return 0
      const groupId = current.copyGroupId || current.id
      return this.mhSelectedDeckCards.filter(
        (c) => (c.copyGroupId || c.id) === groupId
      ).length
    },
    mhCardTypeOpts() {
      return [
        {
          value: 'time-01',
          text: this.ui[this.uiLang]?.mh_type_tempo || 'Tempo',
        },
        {
          value: 'time-02',
          text: this.ui[this.uiLang]?.mh_type_tempo_02 || 'Tempo 02',
        },
      ]
    },
    mhIconStyle() {
      const layout =
        this.mhLayoutIcon[this.mhCardType] || this.mhLayoutIcon['time-01']
      return {
        bottom: (layout.bottom ?? 90) + 'px',
        right: (layout.right ?? 72) + 'px',
        width: (layout.width ?? 148) + 'px',
        height: (layout.height ?? 148) + 'px',
        objectFit: 'contain',
      }
    },
    hasSilhouetteSupport() {
      return typeof window !== 'undefined' && !!window.silhouette
    },
    ygoDeckDownloading() {
      return this.batchDownloading || this.silhouetteDownloading
    },
    localCardsMap() {
      const map = {}
      for (const card of this.localCards) {
        map[String(card.id)] = this.map_ygoprodeck_to_internal(card)
      }
      return map
    },
    cardMetaLang() {
      return this.cardMeta[this.cardLang] || this.cardMeta.pt
    },
    syncProgressText() {
      const t = this.ui[this.uiLang].db_sync_progress
      return typeof t === 'string'
        ? t.replace('{{progress}}', this.syncProgress)
        : ''
    },
    filteredArchetypes() {
      if (!this.searchByArchetype.trim()) return this.archetypeOptions
      const q = this.normalizeSearchQuery(this.searchByArchetype)
      return this.archetypeOptions.filter((a) =>
        this.stripAccents(a.archetype_name.toLowerCase()).includes(q)
      )
    },
    filteredCardsByName() {
      if (!this.searchByName.trim()) return []
      const q = this.normalizeSearchQuery(this.searchByName)
      return this.localCards.filter((c) => {
        const name = this.stripAccents((c.name || '').toLowerCase())
        return name.includes(q)
      })
    },
    searchResultsByArchetype() {
      return this.searchResults.filter((c) => c.matchType === 'archetype')
    },
    searchResultsByName() {
      const idsArchetype = new Set(
        this.searchResults
          .filter((c) => c.matchType === 'archetype')
          .map((c) => String(c.id))
      )
      return this.searchResults.filter(
        (c) => c.matchType === 'name' && !idsArchetype.has(String(c.id))
      )
    },
    searchResultsByDesc() {
      const idsArchetype = new Set(
        this.searchResults
          .filter((c) => c.matchType === 'archetype')
          .map((c) => String(c.id))
      )
      const idsName = new Set(
        this.searchResults
          .filter((c) => c.matchType === 'name')
          .map((c) => String(c.id))
      )
      return this.searchResults.filter(
        (c) =>
          c.matchType === 'desc' &&
          !idsArchetype.has(String(c.id)) &&
          !idsName.has(String(c.id))
      )
    },
    searchResultsRelated() {
      const idsPrior = new Set(
        this.searchResults
          .filter(
            (c) =>
              c.matchType === 'archetype' ||
              c.matchType === 'name' ||
              c.matchType === 'desc'
          )
          .map((c) => String(c.id))
      )
      return this.searchResults.filter(
        (c) => c.matchType === 'related' && !idsPrior.has(String(c.id))
      )
    },
    searchResultsCitedRelated() {
      const idsPrior = new Set(
        this.searchResults
          .filter(
            (c) =>
              c.matchType === 'archetype' ||
              c.matchType === 'name' ||
              c.matchType === 'desc'
          )
          .map((c) => String(c.id))
      )
      return this.searchResults.filter(
        (c) =>
          (c.matchType === 'name' || c.matchType === 'desc') &&
          !idsPrior.has(String(c.id))
      )
    },
    cardSearchIndex() {
      return this.localCards.map((card) => {
        const descEn = this.normalizeSearchQuery(card.desc || '')
        const descPt = this.normalizeSearchQuery(card.desc || '')
        const descRaw = this.normalizeSearchQuery(card.desc || '')
        const archetype = this.normalizeSearchQuery(
          card.archetype ||
            card.archetype_name ||
            (Array.isArray(card.archetypes) ? card.archetypes.join(' ') : '') ||
            (Array.isArray(card.archetypeNames)
              ? card.archetypeNames.join(' ')
              : '') ||
            ''
        )
        return {
          card,
          id: String(card.id),
          archetype,
          nameEn: this.normalizeSearchQuery(card.name || ''),
          namePt: this.normalizeSearchQuery(card.name || ''),
          descEn,
          descPt,
          descRaw,
          combinedDesc: [descEn, descPt, descRaw].filter(Boolean).join(' '),
          extractedNames: this.extractReferencedNames(card),
        }
      })
    },
    cardDisplayDeps() {
      return JSON.stringify(this.getCurrentCardSnapshot())
    },
    isFieldsLocked() {
      return this.editorModeYgo === 'base-readonly'
    },
    /** Quantas cópias do card atual existem no deck selecionado (por cardKey) */
    currentCardQuantityInDeck() {
      if (!this.selectedDeckId || !this.cardKey) return 0
      return this.selectedDeckCards.filter(
        (item) => String(item.cardKey) === String(this.cardKey)
      ).length
    },
    /** Cards do deck YGO ordenados: estrela (nível) ascendente, depois nome alfabético */
    sortedSelectedDeckCards() {
      return [...(this.selectedDeckCards || [])].sort((a, b) => {
        const levelA = parseInt(a.snapshot?.level, 10) || 0
        const levelB = parseInt(b.snapshot?.level, 10) || 0
        if (levelA !== levelB) return levelA - levelB
        return (a.name || '').localeCompare(b.name || '', 'pt')
      })
    },
    /** Main Deck: apenas monstros, magias e armadilhas; ordem: Monstro → Magia → Armadilha, depois nível e nome */
    mainDeckCards() {
      const main = (this.selectedDeckCards || []).filter(
        (item) => !this.isExtraDeckItem(item)
      )
      const typeOrder = (snap) => {
        const t = Array.isArray(snap?.type)
          ? snap.type[0]
          : String(snap?.type || '')
        if (t === 'Monster') return 0
        if (t === 'Spell') return 1
        if (t === 'Trap') return 2
        return 0
      }
      return [...main].sort((a, b) => {
        const orderA = typeOrder(a.snapshot)
        const orderB = typeOrder(b.snapshot)
        if (orderA !== orderB) return orderA - orderB
        const levelA = parseInt(a.snapshot?.level, 10) || 0
        const levelB = parseInt(b.snapshot?.level, 10) || 0
        if (levelA !== levelB) return levelA - levelB
        return (a.name || '').localeCompare(b.name || '', 'pt')
      })
    },
    /** Extra Deck: Fusion, Synchro, Xyz, Link (já em div separada); ordenado por nível e nome */
    extraDeckCards() {
      return this.sortedSelectedDeckCards.filter((item) =>
        this.isExtraDeckItem(item)
      )
    },
    /** Cards do deck MH ordenados por título (alfabético) */
    sortedMhSelectedDeckCards() {
      return [...(this.mhSelectedDeckCards || [])].sort((a, b) => {
        const nameA = (a.name || a.snapshot?.mhTitle || '').trim().toLowerCase()
        const nameB = (b.name || b.snapshot?.mhTitle || '').trim().toLowerCase()
        return nameA.localeCompare(nameB, 'pt')
      })
    },
    /** Cards MH do banco filtrados por mhSearchQuery (para aba Busca MH) */
    mhSearchFilteredCards() {
      const q = (this.mhSearchQuery || '').trim().toLowerCase()
      if (!q) return this.mhAllCardsFromDb.slice(0, 100)
      const list = this.mhAllCardsFromDb.filter((c) => {
        const name = (c.name || c.snapshot?.mhTitle || '').toLowerCase()
        return name.includes(q)
      })
      return list.slice(0, 100)
    },
    currentBaseCard() {
      if (!this.cardKey) return null
      return (
        this.localCards.find((c) => String(c.id) === String(this.cardKey)) ||
        null
      )
    },
    isCurrentCardPendulum() {
      const card = this.currentBaseCard
      if (!card) return this.Pendulum
      const typeStr = (card.type || '').toLowerCase()
      return (
        typeStr.includes('pendulum') ||
        typeStr.includes('pêndulo') ||
        typeStr.includes('pendulo') ||
        card.scale != null ||
        (Array.isArray(card.scales) && card.scales.length > 0)
      )
    },
    nameIndexMap() {
      const map = new Map()
      for (const card of this.localCards) {
        const name = this.normalizeSearchQuery(card.name || '')
        if (name) {
          if (!map.has(name)) map.set(name, [])
          map.get(name).push(card)
        }
      }
      return map
    },
    hasUnsavedLayoutChanges() {
      if (this.snapshotAtLoad == null) return false
      const current = this.getCurrentCardSnapshot()
      return JSON.stringify(this.snapshotAtLoad) !== JSON.stringify(current)
    },
    isCurrentCardInDeck() {
      if (!this.cardKey || !this.selectedDeckId) return false
      return this.selectedDeckCards.some(
        (item) => String(item.cardKey) === String(this.cardKey)
      )
    },
    selectedDeck() {
      if (!this.selectedDeckId) return null
      return this.userDecks.find((d) => d.id === this.selectedDeckId) || null
    },
    currentDeckCardIdForCover() {
      if (
        !this.selectedDeckId ||
        !this.cardKey ||
        !this.selectedDeckCards.length
      )
        return null
      if (this.editingDeckCardId) return this.editingDeckCardId
      const first = this.selectedDeckCards.find(
        (c) => String(c.cardKey) === String(this.cardKey)
      )
      return first ? first.id : null
    },
    isCurrentCardDeckCover() {
      const deck = this.selectedDeck
      const id = this.currentDeckCardIdForCover
      return !!(deck && id && deck.cover_card_id === id)
    },
    filteredUserDecks() {
      const query = this.normalizeSearchQuery(this.deckSearchQuery || '')
      const list = query
        ? this.userDecks.filter((deck) => {
            const name = this.normalizeSearchQuery(deck.name || '')
            return name.includes(query)
          })
        : [...this.userDecks]

      const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt')
      const byDate = (field) => (a, b) =>
        String(b?.[field] || '').localeCompare(String(a?.[field] || ''))

      if (this.deckSortBy === 'name') return list.sort(byName)
      if (this.deckSortBy === 'created_at')
        return list.sort(byDate('created_at'))
      return list.sort(byDate('updated_at'))
    },
    mhSelectedDeck() {
      if (!this.mhSelectedDeckId) return null
      return (
        this.mhUserDecks.find((d) => d.id === this.mhSelectedDeckId) || null
      )
    },
    deckDirtyYgo() {
      return (
        this.pendingDeckRemovesYgo.length > 0 ||
        this.selectedDeckCards.some((c) => String(c.id).startsWith('pending_'))
      )
    },
    deckDirtyMh() {
      return (
        this.pendingDeckRemovesMh.length > 0 ||
        this.mhSelectedDeckCards.some((c) =>
          String(c.id).startsWith('pending_')
        )
      )
    },
    importDeckNameIndex() {
      const map = new Map()
      for (const card of this.localCards || []) {
        const candidates = [card.name]
        for (const candidate of candidates) {
          const normalized = this.normalizeSearchQuery(candidate || '')
          if (!normalized || map.has(normalized)) continue
          map.set(normalized, card)
        }
      }
      return map
    },
    importDeckPreview() {
      const parsedEntries = this.parseImportedDeckText(this.importDeckText)
      const resolvedEntries = []
      const missingNames = []

      for (const entry of parsedEntries) {
        const card = this.resolveImportedDeckCard(entry.name)
        if (!card) {
          missingNames.push(entry.name)
          continue
        }
        resolvedEntries.push({
          card,
          quantity: entry.quantity,
          name: entry.name,
        })
      }

      return {
        parsedCount: parsedEntries.length,
        resolvedCount: resolvedEntries.length,
        missingCount: missingNames.length,
        totalCards: resolvedEntries.reduce(
          (sum, entry) => sum + entry.quantity,
          0
        ),
        resolvedEntries,
        missingNames,
      }
    },
    hasUnsavedMHChanges() {
      if (this.editingMhDeckCardId == null || this.snapshotMhAtLoad == null)
        return false
      const current = this.getCurrentMHCardSnapshot()
      return JSON.stringify(this.snapshotMhAtLoad) !== JSON.stringify(current)
    },
    cardTypeOpts() {
      return [
        { value: 'Monster', text: this.ui[this.uiLang].monster_card },
        { value: 'Spell', text: this.ui[this.uiLang].spell_card },
        { value: 'Trap', text: this.ui[this.uiLang].trap_card },
      ]
    },
    cardSubtypeOpts() {
      const m = this.ui[this.uiLang].m_card
      const s = this.ui[this.uiLang].st_card
      return {
        Monster: [
          { value: 'Normal', text: m.normal },
          { value: 'Effect', text: m.effect },
          { value: 'Fusion', text: m.fusion },
          { value: 'Ritual', text: m.ritual },
          { value: 'Synchro', text: m.synchro },
          { value: 'Xyz', text: m.xyz },
          { value: 'Link', text: m.link },
          { value: 'Token', text: m.token },
          { value: 'Slifer', text: m.slifer },
          { value: 'Ra', text: m.ra },
          { value: 'Obelisk', text: m.obelisk },
          { value: 'LDragon', text: m.ldragon },
        ],
        Spell: [
          { value: 'Normal', text: s.normal },
          { value: 'Continuous', text: s.continuous },
          { value: 'Field', text: s.field },
          { value: 'Equip', text: s.equip },
          { value: 'Quick', text: s.quick },
          { value: 'Ritual', text: s.ritual },
        ],
        Trap: [
          { value: 'Normal', text: s.normal },
          { value: 'Continuous', text: s.continuous },
          { value: 'Counter', text: s.counter },
        ],
      }
    },
    cardEffOpts() {
      return {
        none: this.ui[this.uiLang].card_effect_opts.none,
        normal: this.ui[this.uiLang].card_effect_opts.normal,
        toon: this.ui[this.uiLang].card_effect_opts.toon,
        spirit: this.ui[this.uiLang].card_effect_opts.spirit,
        union: this.ui[this.uiLang].card_effect_opts.union,
        gemini: this.ui[this.uiLang].card_effect_opts.gemini,
        flip: this.ui[this.uiLang].card_effect_opts.flip,
        tuner: this.ui[this.uiLang].card_effect_opts.tuner,
      }
    },
    cardAttrOpts() {
      return [
        { value: 'DIVINE', text: this.ui[this.uiLang].card_attr_opts.divine },
        { value: 'EARTH', text: this.ui[this.uiLang].card_attr_opts.earth },
        { value: 'WATER', text: this.ui[this.uiLang].card_attr_opts.water },
        { value: 'FIRE', text: this.ui[this.uiLang].card_attr_opts.fire },
        { value: 'WIND', text: this.ui[this.uiLang].card_attr_opts.wind },
        { value: 'LIGHT', text: this.ui[this.uiLang].card_attr_opts.light },
        { value: 'DARK', text: this.ui[this.uiLang].card_attr_opts.dark },
      ]
    },
    cardRaceOpts() {
      const o = this.ui[this.uiLang].card_race_type_opts
      return [
        { value: 'fiend', text: o.fiend },
        { value: 'zombie', text: o.zombie },
        { value: 'sea_serpent', text: o.sea_serpent },
        { value: 'thunder', text: o.thunder },
        { value: 'rock', text: o.rock },
        { value: 'machine', text: o.machine },
        { value: 'dinosaur', text: o.dinosaur },
        { value: 'beast', text: o.beast },
        { value: 'insect', text: o.insect },
        { value: 'fish', text: o.fish },
        { value: 'plant', text: o.plant },
        { value: 'beast_warrior', text: o.beast_warrior },
        { value: 'warrior', text: o.warrior },
        { value: 'winged_beast', text: o.winged_beast },
        { value: 'fairy', text: o.fairy },
        { value: 'dragon', text: o.dragon },
        { value: 'reptile', text: o.reptile },
        { value: 'aqua', text: o.aqua },
        { value: 'pyro', text: o.pyro },
        { value: 'spellcaster', text: o.spellcaster },
        { value: 'wyrm', text: o.wyrm },
        { value: 'cyberse', text: o.cyberse },
        { value: 'psychic', text: o.psychic },
        { value: 'divine_beast', text: o.divine_beast },
        { value: 'creator_god', text: o.creator_god },
      ]
    },
    cardTemplateText() {
      let templateUrl =
        this.cardType !== 'Monster' ? this.cardType : this.cardSubtype
      if (
        this.Pendulum &&
        !['Slifer', 'Ra', 'Obelisk', 'LDragon'].includes(this.cardSubtype)
      )
        templateUrl += 'Pendulum'
      return templateUrl
    },
    isEffectMonster() {
      return (
        this.cardSubtype === 'Effect' ||
        ['Fusion', 'Synchro', 'Xyz', 'Ritual', 'Link'].includes(
          this.cardSubtype
        ) ||
        (this.cardEff2 !== 'none' && this.cardSubtype !== 'Normal')
      )
    },
    isXyzMonster() {
      return this.cardType === 'Monster' && this.cardSubtype === 'Xyz'
    },
    isLinkMonster() {
      return this.cardType === 'Monster' && this.cardSubtype === 'Link'
    },
    canPendulumEnabled() {
      return (
        this.cardType === 'Monster' &&
        !['Slifer', 'Ra', 'Obelisk', 'LDragon'].includes(this.cardSubtype)
      )
    },
    cardEff1Opts() {
      return Object.keys(this.cardEffOpts)
        .filter(
          (key) => key !== 'none' && (key === 'normal' || key !== this.cardEff2)
        )
        .map((key) => ({ value: key, text: this.cardEffOpts[key] }))
    },
    cardEff2Opts() {
      return Object.keys(this.cardEffOpts)
        .filter((key) => key === 'normal' || key !== this.cardEff1)
        .map((key) => ({
          value: key,
          text:
            key === 'normal'
              ? this.ui[this.uiLang].m_card.effect
              : this.cardEffOpts[key],
        }))
    },
  },
  watch: {
    localCards() {
      this.relatedCardsCache = Object.create(null)
    },
    dataPanelTabMh(val) {
      if (val === 1) this.ensureMhAllCardsLoaded()
    },
    cardLang() {
      if (this.cardKey === '') this.load_default_data()
    },
    cardKey(val) {
      if (this.apiCardFetchTimer) clearTimeout(this.apiCardFetchTimer)
      this.apiCardError = null
      const key = String(val).trim()
      if (key.length >= 8 && !this.programmaticUpdate) {
        this.setYgoEditorState('base-readonly')
      }
      if (!this.cardLoadYgoProEnabled || key.length < 8) return
      if (this.localCardsMap[key]) return
      this.apiCardFetchTimer = setTimeout(() => {
        this.fetchCardFromApi(key)
      }, 500)
    },
    cardType() {
      if (!this.programmaticUpdate) this.cardSubtype = 'Normal'
      if (this.cardType !== 'Monster') this.Pendulum = false
    },
    cardSubtype() {
      if (['Slifer', 'Ra', 'Obelisk', 'LDragon'].includes(this.cardSubtype))
        this.Pendulum = false
    },
    cardDisplayDeps() {
      if (this.programmaticUpdate) return
      if (this.$ygoDb && this.cardKey) this.saveLastCard()
      this.scheduleDrawCard()
    },
    infoSize() {
      this.scheduleDrawCard()
    },
    infoPosition() {
      this.scheduleDrawCard()
    },
    pendulumSize() {
      this.scheduleDrawCard()
    },
    activeTab(tab) {
      if (tab === 1) {
        this.$nextTick(() => this.updateMhPreviewScale())
        this.loadMHDecks()
      }
    },
  },
  mounted() {
    window.addEventListener('scroll', this.onScroll)
    window.addEventListener('resize', this.updateMhPreviewScale)
    this.fireLoadingDialog()
    this.load_default_data()
    this.initYgoDb()
    if (this.$ygoDb) this.loadDecks()
    this.$nextTick(() => this.updateMhPreviewScale())
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.updateMhPreviewScale)
    if (this._drawCardRaf) cancelAnimationFrame(this._drawCardRaf)
  },
  methods: {
    ...mapMutations(['fireLoadingDialog', 'closeLoadingDialog']),

    isExtraDeckItem(item) {
      const extraTypes = ['Fusion', 'Xyz', 'Synchro', 'Link']
      const typeParts = Array.isArray(item?.snapshot?.type)
        ? item.snapshot.type
        : String(item?.snapshot?.type || '')
            .split('/')
            .map((part) => part.trim())
      return typeParts.some((part) => extraTypes.includes(part))
    },

    openImportDeckModal() {
      this.importDeckName = ''
      this.importDeckText = ''
      this.importDeckFeedback = ''
      this.importDeckLoading = false
      this.showImportDeckModal = true
    },

    parseImportedDeckText(rawText) {
      const entries = []
      const lines = String(rawText || '').split(/\r?\n/)
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('//') || line.startsWith('==')) continue
        const match = line.match(/^(\d+)\s+(.+?)$/)
        if (!match) continue
        const quantity = Number(match[1]) || 0
        const name = (match[2] || '').trim()
        if (!quantity || !name) continue
        entries.push({ quantity, name })
      }
      return entries
    },

    resolveImportedDeckCard(name) {
      const normalized = this.normalizeSearchQuery(name)
      if (!normalized) return null
      const exact = this.importDeckNameIndex.get(normalized)
      if (exact) return exact

      let partial = null
      for (const [candidate, card] of this.importDeckNameIndex.entries()) {
        if (candidate.includes(normalized) || normalized.includes(candidate)) {
          if (partial && String(partial.id) !== String(card.id)) return null
          partial = card
        }
      }
      return partial
    },

    setYgoEditorState(mode, options = {}) {
      this.editorModeYgo = mode || 'base'
      this.loadedFromDeck = mode === 'deck-readonly' || mode === 'deck-edit'
      this.deckEditLock = mode === 'deck-readonly'
      if (Object.prototype.hasOwnProperty.call(options, 'editingDeckCardId')) {
        this.editingDeckCardId = options.editingDeckCardId
      }
    },

    unlockCurrentEdit() {
      if (this.editingDeckCardId) {
        this.setYgoEditorState('deck-edit')
        return
      }
      this.setYgoEditorState('base-edit', { editingDeckCardId: null })
    },

    normalizeDeckItemForPersistence(item, index) {
      return {
        id:
          item && item.id && !String(item.id).startsWith('pending_')
            ? String(item.id)
            : undefined,
        card_id:
          item?.card_id ??
          (item?.cardKey ? Number(item.cardKey) || null : null),
        sort_order: index,
        name: item?.name || 'Card',
        cardKey: item?.cardKey || '',
        cardLang: item?.cardLang || this.cardLang || 'pt',
        snapshot: JSON.parse(JSON.stringify(item?.snapshot || {})),
        thumbnailDataUrl: item?.thumbnailDataUrl || '',
        copyGroupId: item?.copyGroupId,
      }
    },

    getPreferredLocalizedCardName(card) {
      if (!card) return ''
      return card.name || ''
    },

    composeCurrentCardDescription(snapshot = null) {
      const source = snapshot || this.getCurrentCardSnapshot()
      const isPendulum = Array.isArray(source?.type) ? !!source.type[4] : false
      const monsterText = String(source?.infoText || '').trim()
      const pendulumText = String(source?.pendulumText || '').trim()
      if (!isPendulum) return monsterText
      const parts = []
      if (pendulumText) {
        parts.push('[ Pendulum Effect ]')
        parts.push(pendulumText)
      }
      if (monsterText) {
        if (parts.length) parts.push('')
        parts.push('[ Monster Effect ]')
        parts.push(monsterText)
      }
      return parts.join('\n')
    },

    formatCardRaceForStorage(race) {
      return String(race || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim()
    },

    buildCardTypeMetadata(snapshot) {
      const parts = Array.isArray(snapshot?.type) ? snapshot.type : []
      const cardType = parts[0] || 'Monster'
      const cardSubtype = parts[1] || 'Normal'
      const eff1 = parts[2] || 'normal'
      const eff2 = parts[3] || 'none'
      const isPendulum = !!parts[4]
      const effectMods = [eff1, eff2].filter(
        (value) => value && value !== 'normal' && value !== 'none'
      )

      if (cardType === 'Spell') {
        const raceRaw = String(snapshot?.race || 'normal')
          .replace(/_/g, '-')
          .toLowerCase()
        const spellRace =
          raceRaw === 'quick' || raceRaw === 'quick-play'
            ? 'Quick-Play'
            : raceRaw.charAt(0).toUpperCase() + raceRaw.slice(1)
        return {
          frameType: 'spell',
          type: `${spellRace} Spell Card`,
          typeline: [spellRace],
        }
      }

      if (cardType === 'Trap') {
        const trapRace = this.formatCardRaceForStorage(
          snapshot?.race || 'Normal'
        )
        return {
          frameType: 'trap',
          type: `${trapRace} Trap Card`,
          typeline: [trapRace],
        }
      }

      const subtypeFrameMap = {
        Normal: 'normal',
        Effect: 'effect',
        Ritual: 'ritual',
        Fusion: 'fusion',
        Synchro: 'synchro',
        Xyz: 'xyz',
        Link: 'link',
        Token: 'token',
      }
      const frameType = subtypeFrameMap[cardSubtype] || 'effect'
      const race = this.formatCardRaceForStorage(snapshot?.race || 'Dragon')
      const typeline = [race]
      if (isPendulum) typeline.push('Pendulum')
      if (cardSubtype && cardSubtype !== 'Effect' && cardSubtype !== 'Normal') {
        typeline.push(cardSubtype)
      }
      if (
        cardSubtype === 'Effect' ||
        effectMods.length ||
        String(snapshot?.infoText || '').trim()
      ) {
        typeline.push('Effect')
      } else if (cardSubtype === 'Normal') {
        typeline.push('Normal')
      }
      for (const mod of effectMods) {
        typeline.push(mod.charAt(0).toUpperCase() + mod.slice(1))
      }

      const typeParts = []
      if (isPendulum) typeParts.push('Pendulum')
      if (cardSubtype && cardSubtype !== 'Effect' && cardSubtype !== 'Normal') {
        typeParts.push(cardSubtype)
      }
      if (typeline.includes('Effect')) typeParts.push('Effect')
      else if (cardSubtype === 'Normal') typeParts.push('Normal')
      typeParts.push('Monster')

      return {
        frameType,
        type: typeParts.join(' '),
        typeline,
      }
    },

    buildStoredCardFromSnapshot(baseCard, snapshot) {
      const nextCard = JSON.parse(JSON.stringify(baseCard || {}))
      const { frameType, type, typeline } = this.buildCardTypeMetadata(snapshot)
      const unifiedName = String(snapshot?.title || '').trim()
      const unifiedDesc = this.composeCurrentCardDescription(snapshot)
      const scaleValue = Number(snapshot?.blue ?? snapshot?.red ?? 0) || 0
      const linkmarkers = []
      for (let i = 1; i <= 9; i++) {
        if (i === 5) continue
        if (snapshot?.[`link${i}`]) {
          const marker = INDEX_TO_LINK_MARKER[i]
          if (marker) linkmarkers.push(marker)
        }
      }

      nextCard.name = unifiedName || nextCard.name || ''
      nextCard.desc = unifiedDesc || nextCard.desc || ''
      nextCard.lang = 'pt'
      nextCard.frameType = frameType
      nextCard.type = type
      nextCard.typeline = typeline
      nextCard.attribute = snapshot?.attribute || nextCard.attribute || 'DARK'
      nextCard.race = this.formatCardRaceForStorage(
        snapshot?.race || nextCard.race || 'Dragon'
      )
      nextCard.level = Number(snapshot?.level) || 0
      nextCard.atk =
        snapshot?.atk === '?' || snapshot?.atk === '' || snapshot?.atk == null
          ? -1
          : Number(snapshot.atk)
      nextCard.def =
        snapshot?.def === '?' || snapshot?.def === '' || snapshot?.def == null
          ? -1
          : Number(snapshot.def)
      nextCard.scale = scaleValue
      nextCard.scales = [scaleValue, scaleValue]
      nextCard.linkmarkers = linkmarkers
      nextCard.linkval = linkmarkers.length
      nextCard.pend_desc_pt = snapshot?.pendulumText || ''
      nextCard.monster_desc_pt = snapshot?.infoText || ''
      nextCard.custom_snapshot = JSON.parse(JSON.stringify(snapshot))

      return nextCard
    },

    async captureCurrentCardPreviewBlob() {
      const canvas = this.$refs.yugiohcard
      if (!canvas) return null
      await this.$nextTick()
      await new Promise((resolve) => requestAnimationFrame(resolve))
      return new Promise((resolve) => {
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob((blob) => resolve(blob || null), 'image/webp', 0.95)
          return
        }
        try {
          const dataUrl = canvas.toDataURL('image/webp', 0.95)
          const [, base64 = ''] = dataUrl.split(',')
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i)
          resolve(new Blob([bytes], { type: 'image/webp' }))
        } catch (_) {
          resolve(null)
        }
      })
    },

    async captureCurrentDeckCardThumbnailDataUrl() {
      const sourceCanvas = this.$refs.yugiohcard
      if (!sourceCanvas) return ''
      await this.$nextTick()
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const thumbWidth = 220
      const scale = thumbWidth / sourceCanvas.width
      const thumbHeight = Math.max(1, Math.round(sourceCanvas.height * scale))
      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = thumbWidth
      thumbCanvas.height = thumbHeight
      const ctx = thumbCanvas.getContext('2d')
      if (!ctx) return ''
      ctx.drawImage(sourceCanvas, 0, 0, thumbWidth, thumbHeight)
      try {
        return thumbCanvas.toDataURL('image/webp', 0.9)
      } catch (_) {
        return ''
      }
    },

    replaceCardInCollections(updatedCard) {
      const key = String(updatedCard?.id || '')
      const replaceOne = (entry) =>
        String(entry?.id) === key ? { ...entry, ...updatedCard } : entry
      this.localCards = this.localCards.map(replaceOne)
      this.searchResults = this.searchResults.map((entry) =>
        String(entry?.id) === key
          ? {
              ...entry,
              ...updatedCard,
            }
          : entry
      )
      this.relatedCards = this.relatedCards.map((entry) =>
        String(entry?.id) === key
          ? {
              ...entry,
              ...updatedCard,
            }
          : entry
      )
    },

    revokeBlobUrl(url) {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url)
        } catch (_) {}
      }
    },

    mergeDeckSnapshotWithBase(cardKey, snapshot) {
      const key = String(cardKey || '')
      const baseCard = this.localCards.find((c) => String(c.id) === key)
      if (!baseCard || !snapshot) return snapshot || {}
      const { infoText, pendulumText } = this.getCardEffectTexts(baseCard)
      return {
        ...snapshot,
        title: snapshot.title || this.getPreferredLocalizedCardName(baseCard),
        infoText: snapshot.infoText || infoText,
        pendulumText: snapshot.pendulumText || pendulumText || '',
      }
    },

    captureCurrentCardSnapshot() {
      return JSON.parse(JSON.stringify(this.getCurrentCardSnapshot()))
    },

    async importYgoDeck() {
      if (
        !this.$ygoDb ||
        this.importDeckLoading ||
        !this.importDeckName.trim() ||
        !this.importDeckText.trim()
      )
        return

      const preview = this.importDeckPreview
      if (!preview.parsedCount) {
        this.importDeckFeedback =
          'Nenhuma linha valida encontrada. Use o formato: quantidade + nome do card.'
        return
      }

      if (!preview.resolvedCount) {
        this.importDeckFeedback =
          'Nenhum card da lista foi encontrado no banco local.'
        return
      }

      this.importDeckLoading = true
      try {
        const cardsToImport = []
        for (const entry of preview.resolvedEntries) {
          for (let i = 0; i < entry.quantity; i++) {
            cardsToImport.push({
              card_id: Number(entry.card.id) || null,
              name: entry.card.name || entry.name,
              cardKey: String(entry.card.id),
              cardLang: this.cardLang || 'pt',
              snapshot: this.map_ygoprodeck_to_internal(entry.card),
            })
          }
        }

        const deckId = await this.$ygoDb.importDeckWithCards(
          this.importDeckName.trim(),
          'yugioh',
          cardsToImport
        )

        await this.loadDecks()
        const createdDeck = this.userDecks.find(
          (deck) => deck.id === deckId
        ) || {
          id: deckId,
          name: this.importDeckName.trim(),
        }
        await this.selectDeck(createdDeck)

        const importedCount = preview.totalCards
        const summary =
          preview.missingCount > 0
            ? `Deck importado com ${importedCount} cards. ${preview.missingCount} nome(s) nao foram encontrados.`
            : `Deck importado com ${importedCount} cards.`

        this.$bvToast &&
          this.$bvToast.toast(summary, {
            variant: preview.missingCount > 0 ? 'warning' : 'success',
          })

        this.showImportDeckModal = false
        this.importDeckName = ''
        this.importDeckText = ''
        this.importDeckFeedback =
          preview.missingCount > 0
            ? `Nao encontrados: ${preview.missingNames.slice(0, 8).join(', ')}${
                preview.missingCount > 8 ? '...' : ''
              }`
            : ''
      } catch (err) {
        console.error(err)
        this.importDeckFeedback = err.message || 'Erro ao importar deck.'
        this.$bvToast &&
          this.$bvToast.toast(this.importDeckFeedback, {
            variant: 'danger',
          })
      } finally {
        this.importDeckLoading = false
      }
    },

    updateMhPreviewScale() {
      const wrap = this.$refs.mhPreviewWrap
      if (!wrap) return
      const w = wrap.clientWidth || 1000
      this.mhPreviewScale = Math.min(1, w / 1000)
    },

    /**
     * Substitui códigos emoji/nome no texto por <img> da pasta pic/mh/emoji.
     * Basta adicionar um PNG na pasta (ex: fire.png) e usar emoji/fire no texto.
     */
    mhTextWithEmojis(text) {
      if (text == null || text === '') return ''
      const s = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>')
      return s.replace(
        /emoji\/([a-zA-Z0-9_-]+)/g,
        (_, name) =>
          `<img src="images/pic/mh/emoji/${name}.png" alt="emoji/${name}" class="mh-inline-emoji" />`
      )
    },

    getCurrentMHCardSnapshot() {
      return {
        mhTitle: this.mhTitle,
        mhDesc1: this.mhDesc1,
        mhDesc2: this.mhDesc2,
        mhCardType: this.mhCardType,
        mhIconColor: this.mhIconColor,
        mhBox1Top: this.mhBox1Top,
        mhBox1Left: this.mhBox1Left,
        mhBox1Width: this.mhBox1Width,
        mhBox1Height: this.mhBox1Height,
        mhBox1FontSize: this.mhBox1FontSize,
        mhBox1Bg: this.mhBox1Bg,
        mhBox2Top: this.mhBox2Top,
        mhBox2Left: this.mhBox2Left,
        mhBox2Width: this.mhBox2Width,
        mhBox2Height: this.mhBox2Height,
        mhBox2FontSize: this.mhBox2FontSize,
        mhBox2Bg: this.mhBox2Bg,
        mhTitleTop: this.mhTitleTop,
        mhTitleLeft: this.mhTitleLeft,
        mhTitleWidth: this.mhTitleWidth,
        mhTitleHeight: this.mhTitleHeight,
        mhTitleFontSize: this.mhTitleFontSize,
        mhTitleBg: this.mhTitleBg,
        mhNumberValue: this.mhNumberValue,
        mhNumberTop: this.mhNumberTop,
        mhNumberLeft: this.mhNumberLeft,
        mhNumberWidth: this.mhNumberWidth,
        mhNumberHeight: this.mhNumberHeight,
        mhNumberFontSize: this.mhNumberFontSize,
        mhNumberBg: this.mhNumberBg,
      }
    },

    loadFromMHSnapshot(data) {
      if (!data) return
      this.mhTitle = data.mhTitle ?? ''
      this.mhDesc1 = data.mhDesc1 ?? ''
      this.mhDesc2 = data.mhDesc2 ?? ''
      this.mhCardType = data.mhCardType ?? 'time-01'
      this.mhIconColor = data.mhIconColor ?? 'time-01'
      this.mhBox1Top = data.mhBox1Top ?? 240
      this.mhBox1Left = data.mhBox1Left ?? 100
      this.mhBox1Width = data.mhBox1Width ?? 800
      this.mhBox1Height = data.mhBox1Height ?? 420
      this.mhBox1FontSize = data.mhBox1FontSize ?? 46
      this.mhBox1Bg = data.mhBox1Bg ?? false
      this.mhBox2Top = data.mhBox2Top ?? 730
      this.mhBox2Left = data.mhBox2Left ?? 100
      this.mhBox2Width = data.mhBox2Width ?? 800
      this.mhBox2Height = data.mhBox2Height ?? 500
      this.mhBox2FontSize = data.mhBox2FontSize ?? 46
      this.mhBox2Bg = data.mhBox2Bg ?? false
      this.mhTitleTop = data.mhTitleTop ?? 60
      this.mhTitleLeft = data.mhTitleLeft ?? 100
      this.mhTitleWidth = data.mhTitleWidth ?? 800
      this.mhTitleHeight = data.mhTitleHeight ?? 150
      this.mhTitleFontSize = data.mhTitleFontSize ?? 74
      this.mhTitleBg = data.mhTitleBg ?? true
      this.mhNumberValue = data.mhNumberValue ?? ''
      this.mhNumberTop = data.mhNumberTop ?? 1220
      this.mhNumberLeft = data.mhNumberLeft ?? 49
      this.mhNumberWidth = data.mhNumberWidth ?? 170
      this.mhNumberHeight = data.mhNumberHeight ?? 170
      this.mhNumberFontSize = data.mhNumberFontSize ?? 120
      this.mhNumberBg = data.mhNumberBg ?? false
    },

    loadNewMHCard() {
      this.editingMhDeckCardId = null
      this.snapshotMhAtLoad = null
      this.mhDeckEditLock = false
      this.loadFromMHSnapshot({})
    },

    scheduleDrawCard() {
      if (this._drawCardRaf) cancelAnimationFrame(this._drawCardRaf)
      this._drawCardRaf = requestAnimationFrame(() => {
        this._drawCardRaf = null
        this.drawCard()
      })
    },

    loadCanvasImage(src) {
      const resolvedSrc = src || 'images/default.jpg'
      const isRemoteHttp =
        typeof resolvedSrc === 'string' && resolvedSrc.startsWith('http')
      const finalSrc = isRemoteHttp ? 'images/default.jpg' : resolvedSrc

      if (this.imageAssetCache[finalSrc]) {
        return this.imageAssetCache[finalSrc]
      }

      const promise = new Promise((resolve) => {
        const image = new window.Image()
        if (typeof finalSrc === 'string' && finalSrc.startsWith('blob:')) {
          image.crossOrigin = 'anonymous'
        }
        const done = () => resolve(image)
        image.onload = done
        image.onerror = () => {
          const normalizedSrc =
            typeof finalSrc === 'string' ? finalSrc.replace(/\\/g, '/') : ''
          const localWebpMatch = normalizedSrc.match(
            /^(.*)?(ygo\/pics\/[^/]+)\.webp$/i
          )
          if (localWebpMatch) {
            const prefix = localWebpMatch[1] || ''
            const relativePath = localWebpMatch[2]
            this.loadCanvasImage(`${prefix}${relativePath}.jpg`).then(resolve)
            return
          }
          if (finalSrc === 'images/default.jpg') {
            resolve(image)
            return
          }
          this.loadCanvasImage('images/default.jpg').then(resolve)
        }
        image.src = finalSrc
        if (image.complete && (image.naturalWidth > 0 || image.width > 0)) {
          resolve(image)
        }
      })

      this.imageAssetCache[finalSrc] = promise
      return promise
    },

    isBundledLocalArtUrl(url) {
      return (
        typeof url === 'string' && /^ygo\/pics\/.+\.(webp|jpg|png)$/i.test(url)
      )
    },

    getBundledCanvasArtUrl(cardId, extension = 'webp') {
      if (!cardId) return null
      if (FAILED_CANVAS_ART_IDS.has(String(cardId))) return null
      if (this.brokenBundledCanvasArts[String(cardId)]) return null
      return `ygo/pics/${cardId}.${extension}`
    },

    getBundledThumbArtUrl(cardId, extension = 'webp') {
      if (!cardId) return null
      if (FAILED_THUMB_ART_IDS.has(String(cardId))) return null
      if (this.brokenBundledThumbs[String(cardId)]) return null
      return `ygo/thumbs/${cardId}.${extension}`
    },

    async loadDeckCardForEdit(item) {
      if (this.hasUnsavedLayoutChanges) {
        this.pendingLeaveAction = { type: 'loadDeckCard', item }
        this.$refs.unsavedChangesModal.show()
        return
      }
      await this.doLoadDeckCardForEdit(item)
    },

    async doLoadDeckCardForEdit(item) {
      this.initialSnapshotWhenNotFromCollection = null
      this.setYgoEditorState('deck-readonly', { editingDeckCardId: item.id })
      this._editInitialCardKey = item.cardKey
      this.viewingBaseCard = false
      this.relatedCards = []
      const mergedSnapshot = this.mergeDeckSnapshotWithBase(
        item.cardKey,
        item.snapshot || {}
      )
      this.loadFromSnapshot(mergedSnapshot)
      this.snapshotAtLoad = this.captureCurrentCardSnapshot()
      this.cardKey = item.cardKey
      this.cardLang = item.cardLang || 'pt'
      const imgUrl = await this.getExportImageUrlForBatch(item.cardKey)
      this.cardPhotoLoading = !!imgUrl
      if (imgUrl) {
        this.$nextTick(() => this.fireLoadingDialog())
        if (this.isBundledLocalArtUrl(imgUrl)) {
          this.$set(this.apiCardImageUrls, String(item.cardKey), imgUrl)
          this.cardPhotoLoading = false
          this.drawCard(imgUrl)
        } else {
          await this.ensureCardImage(item.cardKey, imgUrl)
        }
      } else {
        this.cardPhotoLoading = false
        this.$nextTick(() => {
          this.fireLoadingDialog()
          this.drawCard()
        })
      }
      this.$nextTick(() => this.setYgoEditorState('deck-readonly'))
    },

    unlockDeckEdit() {
      this.setYgoEditorState('deck-edit')
    },

    async removeOneFromDeck() {
      if (!this.selectedDeckId || !this.editingDeckCardId) return
      const id = this.editingDeckCardId
      if (String(id).startsWith('pending_')) {
        const idx = this.selectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.selectedDeckCards.splice(idx, 1)
      } else {
        this.pendingDeckRemovesYgo.push(id)
        const idx = this.selectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.selectedDeckCards.splice(idx, 1)
      }
      await this.saveDeckStateYgo()
      const remaining = this.selectedDeckCards.filter(
        (item) => String(item.cardKey) === String(this.cardKey)
      )
      if (remaining.length === 0) {
        this.setYgoEditorState('base-readonly', { editingDeckCardId: null })
        this.load_default_data()
      } else {
        this.doLoadDeckCardForEdit(remaining[0])
      }
    },

    async addCopyToDeck() {
      if (!this.cardKey || !this.selectedDeckId || !this.editingDeckCardId)
        return
      const current = this.selectedDeckCards.find(
        (c) => c.id === this.editingDeckCardId
      )
      if (!current) return
      const snapshot = this.getCurrentCardSnapshot()
      const name = this.cardTitle || 'Card'
      const sameCards = this.selectedDeckCards.filter(
        (item) => String(item.cardKey) === String(this.cardKey)
      )
      const insertAfter = sameCards.length
        ? Math.max(
            ...sameCards.map((c) => (c.sort_order != null ? c.sort_order : -1))
          )
        : -1
      const pid = `pending_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`
      const thumbnailDataUrl =
        await this.captureCurrentDeckCardThumbnailDataUrl()
      this.selectedDeckCards.push({
        id: pid,
        deck_id: this.selectedDeckId,
        card_id: Number(this.cardKey) || null,
        sort_order: insertAfter + 1,
        name,
        cardKey: this.cardKey,
        cardLang: this.cardLang,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        thumbnailDataUrl,
      })
      this.setYgoEditorState('deck-readonly')
      await this.saveDeckStateYgo()
    },

    /** Nome do ícone (Spell/Trap) para images/pic/*.webp — normalizado para os assets existentes. */
    getSpellTrapIconSubtype() {
      const s = (this.cardSubtype || '').trim()
      const lower = s.toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ')
      if (lower.startsWith('quick')) return 'Quick'
      if (lower === 'continuous') return 'Continuous'
      if (lower === 'counter') return 'Counter'
      if (lower === 'field') return 'Field'
      if (lower === 'equip') return 'Equip'
      if (lower === 'ritual') return 'Ritual'
      return s || 'Quick'
    },

    doDrawCard() {
      this.fireLoadingDialog()
      this.drawCard()
    },

    // Preparação antes da criação do cartão (só usa imagens locais; sem hotlink)
    // optionalPhotoUrl: quando passado (ex.: após ensureCardImage), usa direto para evitar timing/reatividade
    drawCard(optionalPhotoUrl) {
      let cardImgUrl =
        optionalPhotoUrl ??
        (this.cardImg ? URL.createObjectURL(this.cardImg) : null)
      const templateLang = this.cardMetaLang._templateLang
      if (this.fullart && this.cardKey) {
        const fullArtUrl = this.apiCardFullArtUrls[this.cardKey]
        if (fullArtUrl) {
          cardImgUrl = fullArtUrl
        } else {
          this.ensureFullArtImage(this.cardKey, true)
          cardImgUrl = cardImgUrl || this.apiCardImageUrls[this.cardKey] || null
        }
      }
      if (cardImgUrl == null) {
        if (
          !this.fullart &&
          this.cardLoadYgoProEnabled &&
          !this._exportingCard &&
          !this.loadedFromDeck
        ) {
          const hasData = this.load_ygopro_data(this.cardKey)
          if (hasData) cardImgUrl = this.apiCardImageUrls[this.cardKey] || null
        }
        if (cardImgUrl == null && this.loadedFromDeck)
          cardImgUrl = this.apiCardImageUrls[this.cardKey] || null
      }
      if (this._exportingCard && cardImgUrl == null)
        cardImgUrl =
          (this.fullart && this.apiCardFullArtUrls[this.cardKey]) ||
          this.apiCardImageUrls[this.cardKey] ||
          'images/default.jpg'
      this.imgs = {
        template: `images/card/${templateLang}/${this.cardTemplateText}.png`,
        holo: 'images/pic/holo.png',
        link1: 'images/pic/LINK1.png',
        link2: 'images/pic/LINK2.png',
        link3: 'images/pic/LINK3.png',
        link4: 'images/pic/LINK4.png',
        link6: 'images/pic/LINK6.png',
        link7: 'images/pic/LINK7.png',
        link8: 'images/pic/LINK8.png',
        link9: 'images/pic/LINK9.png',
        attr:
          this.cardType === 'Monster'
            ? `images/attr/${templateLang}/${this.cardAttr}.webp`
            : `images/attr/${templateLang}/${this.cardType}.webp`,
        photo: cardImgUrl || 'images/default.jpg', // placeholder até imagem local estar pronta
        levelOrSubtype:
          this.cardType !== 'Monster' && this.cardSubtype !== 'Normal'
            ? `images/pic/${this.getSpellTrapIconSubtype()}.webp`
            : `images/pic/${this.isXyzMonster ? 'Rank' : 'Level'}.webp`,
      }
      this.drawCardLoadingImages(() => {
        this.drawCardProcess()
        if (this._drawCardOnDrawn) {
          const fn = this._drawCardOnDrawn
          this._drawCardOnDrawn = null
          fn()
        }
      })
    },

    // Carregando a imagem do cartão. Só chama o callback quando todas as imagens
    // (incluindo a foto da carta) terminarem de carregar — a carta só é exibida quando a request da imagem concluir.
    drawCardLoadingImages(callback) {
      const keys = Object.keys(this.imgs)
      Promise.allSettled(
        keys.map(async (key) => {
          this.imgs[key] = await this.loadCanvasImage(this.imgs[key])
        })
      ).then(() => {
        callback()
      })
    },

    // Fluxo principal de desenho do cartão.
    drawCardProcess() {
      const canvas = this.$refs.yugiohcard
      const ctx = canvas.getContext('2d')
      canvas.width = 1000
      canvas.height = 1450

      // Full Art: só a imagem enviada pelo usuário, sem moldura/fundo/título/texto.
      const fullArtUrl =
        this.fullart && this.cardKey && this.apiCardFullArtUrls[this.cardKey]
      if (fullArtUrl) {
        const photo = this.imgs.photo
        const pw = photo.naturalWidth || photo.width || 0
        const ph = photo.naturalHeight || photo.height || 0
        if (pw > 0 && ph > 0) {
          const scale = Math.max(1000 / pw, 1450 / ph)
          const drawW = pw * scale
          const drawH = ph * scale
          const drawX = (1000 - drawW) / 2
          const drawY = (1450 - drawH) / 2
          ctx.drawImage(photo, drawX, drawY, drawW, drawH)
        }
        this.closeLoadingDialog()
        return
      }

      const langStr = this.cardMetaLang
      const offset = langStr._offset
      const fontName = langStr._fontName

      // Desenhar o plano de fundo.
      this.drawCardImg(ctx)

      // Desenhar o título do cartão.
      this.drawCardTitle(ctx, offset, fontName)

      // Desenhar os dados do cartão.
      this.drawCardInfo(ctx, langStr, offset, fontName)

      // Desenhar o código do cartão.
      if (this.cardKey !== '') {
        ctx.fillStyle = this.isXyzMonster && !this.Pendulum ? '#FFF' : '#000'
        ctx.font = `22pt 'cardkey', 'MatrixBoldSmallCaps', ${fontName[2]}`
        ctx.textAlign = 'left'
        ctx.fillText(this.cardKey.padStart(8, '0'), 54, 1405) // 卡片密碼
      }
      ctx.fillStyle = '#000'

      // Desenhar o selo de autenticidade.
      if (this.holo) ctx.drawImage(this.imgs.holo, 928, 1371, 44, 46)

      // Descrição do efeito do Pêndulo.
      if (this.Pendulum) this.drawCardPendulumInfoText(ctx, offset, fontName)

      // Descrição da carta.
      this.drawCardInfoText(ctx, offset, fontName)

      this.closeLoadingDialog()
    },

    // Fluxo principal de desenho - Plano de fundo.
    drawCardImg(ctx) {
      let cX, cY, cW, cH
      if (this.Pendulum) {
        cX = 69
        cY = 255
        cW = 862
        cH = 647
      } else {
        cX = 123
        cY = 268
        cW = 754
        cH = 754
      }

      const photo = this.imgs.photo
      const pw = photo.naturalWidth || photo.width || 0
      const ph = photo.naturalHeight || photo.height || 0
      if (pw > 0 && ph > 0) {
        if (this.Pendulum) {
          const scale = Math.max(cW / pw, cH / ph)
          const drawW = pw * scale
          const drawH = ph * scale
          const drawX = cX + (cW - drawW) / 2
          const drawY = cY
          ctx.drawImage(photo, drawX, drawY, drawW, drawH)
        } else {
          const iW = (pw / ph) * cH
          const iH = (ph / pw) * cW
          if (pw <= ph) ctx.drawImage(photo, cX, cY - (iH - cH) / 2, cW, iH)
          else ctx.drawImage(photo, cX - (iW - cW) / 2, cY, iW, cH)
        }
      }
      ctx.drawImage(this.imgs.template, 0, 0, 1000, 1450)
      ctx.drawImage(this.imgs.attr, 840, 68, 90, 90)
    },

    // // Fluxo principal de desenho - Título.
    drawCardTitle(ctx, offset, fontName) {
      ctx.font = `${57 + offset.tS}pt ${fontName[0]}, ${fontName[3]}, ${
        fontName[4]
      }, ${fontName[5]}`
      const useWhiteTitle =
        this.isLinkMonster ||
        this.isXyzMonster ||
        this.cardType === 'Trap' ||
        this.cardType === 'Spell'
      ctx.fillStyle = useWhiteTitle ? '#FFFFFF' : this.rareColor(ctx)
      ctx.fillText(this.cardTitle, 77 + offset.tX, 140 + offset.tY, 750)
      ctx.shadowColor = '#000'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    },

    // Fluxo principal de desenho - Conteúdo.
    drawCardInfo(ctx, langStr, offset, fontName) {
      const linkPosition = {
        Link: {
          X: [86, 410, 826, 70, 0, 878, 86, 410, 826],
          Y: [231, 214, 231, 556, 0, 556, 967, 1020, 967],
          W: [86, 177, 86, 52, 0, 52, 86, 177, 86],
          H: [86, 52, 86, 177, 0, 177, 86, 52, 86],
        },
        LinkPendulum: {
          X: [42, 421, 881, 21, 0, 934, 42, 421, 881],
          Y: [227, 211, 227, 732, 0, 732, 1319, 1365, 1319],
          W: [75, 155, 75, 46, 0, 46, 75, 155, 75],
          H: [75, 46, 75, 155, 0, 155, 75, 46, 75],
        },
      }
      ctx.font = `${(this.cardType === 'Monster' ? 25 : 40) - offset.sS}pt ${
        fontName[1]
      }`
      ctx.fillStyle = '#000'
      if (this.cardType === 'Monster') {
        // Carta de Monstro
        // Texto do Atributo do Monstro
        const cardSubtypeFilter = [
          'Normal',
          'Effect',
          'Slifer',
          'Ra',
          'Obelisk',
          'LDragon',
        ]
        const typeText =
          (this.cardCustomRaceEnabled
            ? this.cardCustomRace
            : langStr.Race[this.cardRace]) + // Tipo
          (!cardSubtypeFilter.includes(this.cardSubtype)
            ? langStr.Subtype[this.cardSubtype]
            : '') + // Tipo de Face do Card
          langStr.Effect[this.cardEff1] + // Função 1 (Efeito)
          (this.cardEff1 !== this.cardEff2
            ? langStr.Effect[this.cardEff2]
            : '') + // Função 2 (Efeito)
          (this.Pendulum ? langStr.M_PENDULUM : '') + // Função 3 (Pêndulo)
          (this.isEffectMonster ? langStr.M_EFFECT : '') // Função 4 (Efeito)

        // Atributo do Monstro
        ctx.fillText(
          `${langStr.QUOTE_L}${typeText}${langStr.QUOTE_R}`,
          63 + offset.oX,
          1120 + offset.oY,
          750
        )

        // ATK do Monstro
        ctx.font = `33pt 'MatrixBoldSmallCaps', ${fontName[2]}`
        ctx.textAlign = 'right'
        if (this.cardATK.includes('∞')) {
          ctx.font = `Bold 32pt 'Times New Roman', ${fontName[2]}`
        }
        ctx.fillText(this.cardATK, 719, 1353, 95)

        // DEF do Monstro / LINK
        ctx.font = `33pt 'MatrixBoldSmallCaps', ${fontName[2]}`
        if (this.isLinkMonster) {
          this.cardDEF = String(
            Object.values(this.links).filter((item, ind, arr) => item.val)
              .length
          )
          ctx.font = `28pt 'link', 'MatrixBoldSmallCaps', ${fontName[2]}`
        } else if (this.cardDEF.includes('∞')) {
          ctx.font = `Bold 32pt 'Times New Roman', ${fontName[2]}`
        }
        ctx.fillText(
          this.cardDEF,
          920 - (this.isLinkMonster ? 3 : 0),
          1353 - (this.isLinkMonster ? 1 : 0),
          95
        )

        // Nível / Classe / Ligação do Monstro
        ctx.textAlign = 'left'
        if (!this.isLinkMonster) {
          // Monstro não Link
          for (let i = 1; i <= this.cardLevel; i++)
            ctx.drawImage(
              this.imgs.levelOrSubtype,
              this.isXyzMonster ? 122 + (i - 1) * 63 : 820 - (i - 1) * 63,
              181,
              58,
              58
            )
        } else {
          // Monstro de Link
          const linkStr = this.Pendulum ? 'LinkPendulum' : 'Link'
          // Imagem de Link
          for (let i = 1; i <= 9; i++)
            if (i !== 5 && this.links[i].val)
              ctx.drawImage(
                this.imgs[`link${i}`],
                linkPosition[linkStr].X[i - 1],
                linkPosition[linkStr].Y[i - 1],
                linkPosition[linkStr].W[i - 1],
                linkPosition[linkStr].H[i - 1]
              )
        }
      } else {
        // Tipo de Carta Mágica / Armadilha
        const typeText =
          (this.cardType === 'Spell' ? langStr.Spell : langStr.Trap) +
          (this.cardSubtype === 'Normal' ? '' : langStr.SEP)
        const y = 222 + offset.sY1
        const iconW = 58
        const iconH = 58
        const gap = 4

        if (this.cardSubtype !== 'Normal') {
          // Ícone dentro dos colchetes: [ CARTA DE MAGO (ícone) ]
          ctx.textAlign = 'left'
          const openB = langStr.QUOTE_L
          const closeB = langStr.QUOTE_R
          const wOpen = ctx.measureText(openB).width
          const wText = ctx.measureText(typeText).width
          const wClose = ctx.measureText(closeB).width
          const totalW = wOpen + wText + gap + iconW + gap + wClose
          const rightEdge = 920 + offset.sX1
          let x = rightEdge - totalW

          ctx.fillText(openB, x, y)
          x += wOpen
          ctx.fillText(typeText, x, y)
          x += wText + gap
          const iconImg = this.imgs.levelOrSubtype
          if (iconImg && (iconImg.naturalWidth > 0 || iconImg.width > 0)) {
            ctx.drawImage(iconImg, x, y - iconH + 14, iconW, iconH)
          }
          x += iconW + gap
          ctx.fillText(closeB, x, y)
        } else {
          ctx.textAlign = 'right'
          ctx.fillText(
            `${langStr.QUOTE_L}${typeText}${langStr.QUOTE_R}`,
            920 + offset.sX1,
            y
          )
        }
      }
    },

    // Preencha a descrição do efeito de Pêndulo
    drawCardPendulumInfoText(ctx, offset, fontName) {
      // Draw symbols
      ctx.textAlign = 'center'
      ctx.font = "55pt 'MatrixBoldSmallCaps'"
      ctx.fillText(
        this.cardBLUE,
        106 -
          (['Xyz', 'Link', 'Token'].includes(this.cardSubtype) ||
          this.cardType !== 'Monster'
            ? 5
            : 0),
        1040,
        60
      )
      ctx.fillText(this.cardRED, 895, 1040, 60)
      // Escreva texto.
      const baseFontSize = 22
      const xStart = 160
      const yStart = 920 + offset.oY
      const maxW = 660
      const yLimit = 1070
      const safeYLimit = yLimit - 12

      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const {
        fontSize,
        lines,
        lineHeight: lh,
      } = this.fitTextToBox(ctx, this.cardPendulumInfo || '', {
        baseFontSize,
        minFontSize: 6,
        maxWidth: maxW,
        availableHeight: safeYLimit - yStart,
        lineHeightOffset: offset.lh,
        fontName,
      })
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      ctx.save()
      ctx.beginPath()
      ctx.rect(xStart, yStart, maxW, safeYLimit - yStart)
      ctx.clip()
      let drawY = yStart
      for (const line of lines) {
        if (drawY + lh > safeYLimit) break
        ctx.fillText(line, xStart, drawY)
        drawY += lh
      }
      ctx.restore()
    },

    drawCardInfoText(ctx, offset, fontName) {
      const baseFontSize = 20
      const topOffset = Number(this.infoPosition) || 0
      const xStart = 75
      const yStart =
        1095 + offset.oY + (this.cardType === 'Monster' ? 30 : 0) + topOffset
      const maxW = 825
      const yLimit = this.cardType === 'Monster' ? 1330 : 1390
      const safeYLimit = yLimit - (this.cardType === 'Monster' ? 18 : 14)

      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const {
        fontSize,
        lines,
        lineHeight: lh,
      } = this.fitTextToBox(ctx, this.cardInfo || '', {
        baseFontSize,
        minFontSize: 6,
        maxWidth: maxW,
        availableHeight: safeYLimit - yStart,
        lineHeightOffset: offset.lh,
        fontName,
      })
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      ctx.save()
      ctx.beginPath()
      ctx.rect(xStart, yStart, maxW, safeYLimit - yStart)
      ctx.clip()
      let drawY = yStart
      for (const line of lines) {
        if (drawY + lh > safeYLimit) break
        ctx.fillText(line, xStart, drawY)
        drawY += lh
      }
      ctx.restore()
    },

    // Cor do cartão.
    rareColor(ctx) {
      let gradient
      switch (this.cardRare) {
        case '2':
          ctx.shadowColor = '#dcff32'
          ctx.shadowBlur = 1
          ctx.shadowOffsetX = 0.4
          ctx.shadowOffsetY = 1.5
          return '#524100' // "#3b2f00";
        case '1':
          gradient = ctx.createLinearGradient(0, 0, 600, 0)
          gradient.addColorStop('0', '#ffdabf')
          gradient.addColorStop('0.14', '#fff6bf')
          gradient.addColorStop('0.28', '#fffebf')
          gradient.addColorStop('0.42', '#d8ffbf')
          gradient.addColorStop('0.56', '#bfffd4')
          gradient.addColorStop('0.7', '#bffdff')
          gradient.addColorStop('0.84', '#bfe4ff')
          gradient.addColorStop('1', '#bfc2ff')
          return gradient
        default:
          return this.titleColor
      }
    },

    /**
     * Separação silábica segundo regras do português:
     * 1) V.CV — consoante entre vogais vai pra próxima sílaba: a-mi-go
     * 2) VC.CV — duas consoantes: se formam cluster (br,tr,etc.) ficam juntas,
     *    senão separam: ab-so, a-brir
     * 3) rr, ss — sempre separam: car-ro, pas-so
     * 4) Dígrafos (ch, lh, nh) nunca separam
     * 5) Ditongos (ai, ei, ão, etc.) ficam juntos
     * 6) Hiato (vogais que não formam ditongo) separam: sa-ú-de
     * 7) qu, gu antes de vogal: o 'u' faz parte da consoante
     */
    findSyllableBreaks(word) {
      const w = word.toLowerCase()
      const len = w.length
      if (len <= 3) return []

      const isVowelChar = (ch) => /[aeiouáéíóúâêôãõàèìòùäëïöüy]/.test(ch)

      const types = []
      for (let i = 0; i < len; i++) {
        types.push(isVowelChar(w[i]) ? 'V' : 'C')
      }

      for (let i = 0; i < len - 2; i++) {
        if (
          (w[i] === 'q' || w[i] === 'g') &&
          w[i + 1] === 'u' &&
          isVowelChar(w[i + 2])
        ) {
          types[i + 1] = 'C'
        }
      }

      const fallingDiphs = new Set([
        'ai',
        'ei',
        'oi',
        'ui',
        'au',
        'eu',
        'ou',
        'iu',
        'ão',
        'ãe',
        'ãi',
        'õe',
      ])

      const nucleiStarts = []
      let inNucleus = false
      for (let i = 0; i < len; i++) {
        if (types[i] === 'V') {
          if (!inNucleus) {
            nucleiStarts.push(i)
            inNucleus = true
          } else {
            const pair = w[i - 1] + w[i]
            if (!fallingDiphs.has(pair)) {
              nucleiStarts.push(i)
            }
          }
        } else {
          inNucleus = false
        }
      }

      if (nucleiStarts.length <= 1) return []

      const insepOnset = new Set([
        'bl',
        'br',
        'cl',
        'cr',
        'dr',
        'fl',
        'fr',
        'gl',
        'gr',
        'pl',
        'pr',
        'tl',
        'tr',
        'vr',
        'ch',
        'lh',
        'nh',
      ])

      const breaks = []

      for (let n = 0; n < nucleiStarts.length - 1; n++) {
        const nextNucStart = nucleiStarts[n + 1]
        let endOfNuc = nucleiStarts[n]
        while (endOfNuc + 1 < nextNucStart && types[endOfNuc + 1] === 'V') {
          endOfNuc++
        }

        const consStart = endOfNuc + 1
        const consEnd = nextNucStart
        const consCount = consEnd - consStart

        if (consCount === 0) {
          breaks.push(nextNucStart)
        } else if (consCount === 1) {
          breaks.push(consStart)
        } else if (consCount === 2) {
          const pair = w[consStart] + w[consStart + 1]
          if (pair === 'rr' || pair === 'ss') {
            breaks.push(consStart + 1)
          } else if (insepOnset.has(pair) || pair === 'qu' || pair === 'gu') {
            breaks.push(consStart)
          } else {
            breaks.push(consStart + 1)
          }
        } else {
          const lastTwo = w[consEnd - 2] + w[consEnd - 1]
          if (insepOnset.has(lastTwo)) {
            breaks.push(consEnd - 2)
          } else {
            breaks.push(consEnd - 1)
          }
        }
      }

      return [...new Set(breaks)]
        .filter((b) => b >= 1 && b <= len - 1)
        .sort((a, b) => a - b)
    },

    breakWordAtSyllable(ctx, word, maxWidth) {
      const hyphen = '-'

      const hyphenPositions = []
      for (let i = 1; i < word.length; i++) {
        if (word[i - 1] === '-') hyphenPositions.push(i)
      }
      if (hyphenPositions.length > 0) {
        for (let k = hyphenPositions.length - 1; k >= 0; k--) {
          const pos = hyphenPositions[k]
          const part1 = word.slice(0, pos)
          if (ctx.measureText(part1).width <= maxWidth) {
            return { first: part1, rest: word.slice(pos) }
          }
        }
      }

      const syllBreaks = this.findSyllableBreaks(word)
      if (syllBreaks.length > 0) {
        for (let k = syllBreaks.length - 1; k >= 0; k--) {
          const pos = syllBreaks[k]
          const part1 = word.slice(0, pos) + hyphen
          if (ctx.measureText(part1).width <= maxWidth) {
            return { first: part1, rest: word.slice(pos) }
          }
        }
      }

      for (let i = word.length - 1; i >= 2; i--) {
        const part1 = word.slice(0, i) + hyphen
        if (ctx.measureText(part1).width <= maxWidth) {
          return { first: part1, rest: word.slice(i) }
        }
      }
      return null
    },

    computeWrappedLines(ctx, text, maxWidth) {
      const lines = []
      if (text == null || text === '') return lines
      const paragraphs = String(text).split('\n')

      for (const para of paragraphs) {
        if (!para.trim()) {
          lines.push('')
          continue
        }
        const tokens = para.split(/(\s+)/)
        let currentLine = ''
        let currentWidth = 0

        const flushLine = () => {
          if (currentLine) {
            lines.push(currentLine.trimEnd())
            currentLine = ''
            currentWidth = 0
          }
        }

        const breakAndPush = (word) => {
          let rest = word
          while (rest.length > 0) {
            const restW = ctx.measureText(rest).width
            if (restW <= maxWidth) {
              currentLine = rest
              currentWidth = restW
              break
            }
            const br = this.breakWordAtSyllable(ctx, rest, maxWidth)
            if (br && br.rest.length > 0) {
              lines.push(br.first)
              rest = br.rest
            } else {
              let cut = Math.max(1, rest.length - 1)
              while (
                cut > 1 &&
                ctx.measureText(rest.slice(0, cut) + '-').width > maxWidth
              ) {
                cut -= 1
              }
              const head = rest.slice(0, cut)
              const tail = rest.slice(cut)
              lines.push(tail ? `${head}-` : head)
              rest = tail
            }
          }
        }

        for (const token of tokens) {
          if (/^\s+$/.test(token)) {
            if (!currentLine) continue
            const w = ctx.measureText(' ').width
            if (currentWidth + w > maxWidth) {
              flushLine()
              continue
            }
            currentLine += ' '
            currentWidth += w
            continue
          }
          const wordWidth = ctx.measureText(token).width
          if (currentWidth + wordWidth <= maxWidth) {
            currentLine += token
            currentWidth += wordWidth
            continue
          }

          const remaining = maxWidth - currentWidth
          const br = this.breakWordAtSyllable(ctx, token, remaining)
          if (br && br.first.length >= 3) {
            currentLine += br.first
            flushLine()
            const restW = ctx.measureText(br.rest).width
            if (restW <= maxWidth) {
              currentLine = br.rest
              currentWidth = restW
            } else {
              breakAndPush(br.rest)
            }
          } else {
            flushLine()
            if (wordWidth <= maxWidth) {
              currentLine = token
              currentWidth = wordWidth
            } else {
              breakAndPush(token)
            }
          }
        }
        if (currentLine.trim()) lines.push(currentLine.trimEnd())
      }
      return lines
    },

    fitTextToBox(
      ctx,
      text,
      {
        baseFontSize,
        minFontSize = 6,
        maxWidth,
        availableHeight,
        lineHeightOffset = 0,
        fontName,
      }
    ) {
      const applyFont = (size) => {
        ctx.font = `${size}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      }
      const measure = (size) => {
        applyFont(size)
        const lines = this.computeWrappedLines(ctx, text || '', maxWidth)
        const lineHeight = size + lineHeightOffset
        return {
          size,
          lines,
          lineHeight,
          totalHeight: lines.length * lineHeight,
        }
      }

      let fitted = measure(Math.max(baseFontSize, minFontSize))
      while (
        fitted.size > minFontSize &&
        fitted.totalHeight > availableHeight
      ) {
        fitted = measure(Math.max(minFontSize, fitted.size - 1))
      }

      let best = fitted
      for (
        let probeSize = best.size + 0.25;
        probeSize <= baseFontSize;
        probeSize += 0.25
      ) {
        const candidate = measure(Number(probeSize.toFixed(2)))
        if (candidate.totalHeight <= availableHeight) {
          best = candidate
          continue
        }
        break
      }

      return {
        fontSize: Number(best.size.toFixed(2)),
        lines: best.lines,
        lineHeight: best.lineHeight,
      }
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const lines = this.computeWrappedLines(ctx, text, maxWidth)
      let initHeight = y
      for (const line of lines) {
        ctx.fillText(line, x, initHeight)
        initHeight += lineHeight
      }
    },

    // Baixar Card.
    download_img() {
      const canvas = this.$refs.yugiohcard
      const name = this.sanitizeFilename(this.cardTitle) || 'card'
      const baseName = `${name}.jpg`
      const baseNamePng = `${name}.png`
      if (canvas.msToBlob) {
        // para o Internet Explorer.
        const blob = canvas.msToBlob()
        window.navigator.msSaveBlob(blob, baseNamePng)
      } else {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/jpeg')
        a.download = baseName
        a.click()
      }
    },

    // Carregar configuração padrão.
    load_default_data() {
      if (this.hasUnsavedLayoutChanges) {
        this.pendingLeaveAction = { type: 'loadDefault' }
        this.$refs.unsavedChangesModal.show()
        return
      }
      this.doLoadDefaultData()
    },

    doLoadDefaultData() {
      this.initialSnapshotWhenNotFromCollection = null
      this.setYgoEditorState('base-readonly', { editingDeckCardId: null })
      this.snapshotAtLoad = null
      this.viewingBaseCard = false
      this.relatedCards = []
      const data = this.cardMetaLang.Default
      this.holo = true
      this.cardRare = '0'
      this.titleColor = '#000000'
      this.cardLoadYgoProEnabled = true
      this.cardKey = ''
      this.cardTitle = data.title
      this.cardImg = null
      this.fullart = false
      this.hasCardFullArtCache = false
      this.cardType = 'Monster'
      this.cardSubtype = 'Normal'
      this.cardAttr = 'DARK'
      this.cardEff1 = 'normal'
      this.cardEff2 = 'none'
      this.cardCustomRaceEnabled = false
      this.cardCustomRace = ''
      this.cardRace = 'spellcaster'
      this.Pendulum = false
      this.Special = false
      this.cardLevel = '7'
      this.cardBLUE = '12'
      this.cardRED = '12'
      this.cardATK = '2500'
      this.cardDEF = '2100'
      for (let i = 1; i <= 9; i++) if (i !== 5) this.links[i].val = false
      this.cardInfo = data.info
      this.infoSize = data.size
      this.infoPosition = 8
      this.cardPendulumInfo = data.pInfo
      this.pendulumSize = data.pSize
    },

    splitPendulumEffectText(text) {
      const raw = String(text || '')
        .replace(/\r/g, '')
        .trim()
      if (!raw) return { pendulumText: '', monsterText: '' }

      const pendulumHeader =
        /\[\s*(?:pendulum effect|efeito de p[eê]ndulo)\s*\]/i
      const monsterHeader = /\[\s*(?:monster effect|efeito de monstro)\s*\]/i
      const pendulumMatch = pendulumHeader.exec(raw)
      const monsterMatch = monsterHeader.exec(raw)

      if (!pendulumMatch && !monsterMatch) {
        return { pendulumText: '', monsterText: raw }
      }

      const pendulumText =
        pendulumMatch && monsterMatch
          ? raw
              .slice(
                pendulumMatch.index + pendulumMatch[0].length,
                monsterMatch.index
              )
              .trim()
          : pendulumMatch
          ? raw.slice(pendulumMatch.index + pendulumMatch[0].length).trim()
          : ''

      const monsterText = monsterMatch
        ? raw.slice(monsterMatch.index + monsterMatch[0].length).trim()
        : pendulumMatch
        ? ''
        : raw

      return { pendulumText, monsterText }
    },

    getCardEffectTexts(card) {
      const preferredDesc = card.desc || ''
      const splitPreferred = this.splitPendulumEffectText(preferredDesc)
      // Prioridade: split de desc_pt/desc_en (respeita tradução salva); fallback nos campos separados da API
      const fallbackPendulum =
        card.pend_desc_pt ||
        card.pendulum_desc_pt ||
        card.pend_desc ||
        card.pendulum_desc_en ||
        card.pendulum_desc ||
        ''
      const fallbackMonster = card.monster_desc_pt || card.monster_desc || ''
      return {
        infoText:
          splitPreferred.monsterText || fallbackMonster || preferredDesc,
        pendulumText: splitPreferred.pendulumText || fallbackPendulum || '',
      }
    },

    // Mapeia resposta da API YGOPRODeck para o formato interno do app.
    map_ygoprodeck_to_internal(card) {
      if (card?.custom_snapshot) {
        return JSON.parse(JSON.stringify(card.custom_snapshot))
      }
      const typeStr = (card.type || '').toLowerCase()
      const frameType = (card.frameType || '').toLowerCase()
      const typeline = (card.typeline || []).map((t) => String(t).toLowerCase())
      let cardType = 'Monster'
      let cardSubtype = 'Normal'
      let eff1 = 'normal'
      let eff2 = 'none'
      let pendulum = false
      const special = false

      // Modificadores de efeito: chaves internas + variações (ex.: PT "regulador" = tuner)
      const effectModVariants = {
        tuner: ['tuner', 'regulador', 'sincronizador'],
        spirit: ['spirit', 'espírito', 'espirito'],
        toon: ['toon'],
        union: ['union', 'união', 'uniao'],
        gemini: ['gemini', 'gêmeo', 'gemeo'],
        flip: ['flip', 'virar'],
      }
      const hasEffectMod = (modKey) => {
        const variants = effectModVariants[modKey] || [modKey]
        const inStr = (s) => variants.some((v) => s.includes(v))
        return inStr(typeStr) || typeline.some(inStr)
      }
      const effectModKeys = Object.keys(effectModVariants)
      for (const mod of effectModKeys) {
        if (!hasEffectMod(mod)) continue
        if (eff1 === 'normal') {
          eff1 = mod
        } else if (eff2 === 'none') {
          eff2 = mod
          break
        }
      }

      if (
        typeStr.includes('spell') ||
        typeStr.includes('magic') ||
        typeStr.includes('magia')
      ) {
        cardType = 'Spell'
        const r = (card.race || 'Normal').toLowerCase().replace(/\s+/g, '-')
        cardSubtype =
          r === 'quick-play'
            ? 'Quick'
            : r
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join('-')
        if (cardSubtype === 'Quick-Play') cardSubtype = 'Quick'
      } else if (typeStr.includes('trap') || typeStr.includes('armadilha')) {
        cardType = 'Trap'
        const r = (card.race || 'Normal').toLowerCase()
        cardSubtype = r.charAt(0).toUpperCase() + r.slice(1)
      } else {
        // Subtipos de monstro: inglês + abreviações/PT (sincro = Synchro)
        if (
          typeStr.includes('fusion') ||
          typeStr.includes('fusão') ||
          typeStr.includes('fusao')
        )
          cardSubtype = 'Fusion'
        else if (typeStr.includes('ritual')) cardSubtype = 'Ritual'
        else if (typeStr.includes('synchro') || typeStr.includes('sincro'))
          cardSubtype = 'Synchro'
        else if (typeStr.includes('xyz')) cardSubtype = 'Xyz'
        else if (typeStr.includes('link')) cardSubtype = 'Link'
        else if (typeStr.includes('token') || typeStr.includes('ficha'))
          cardSubtype = 'Token'
        else if (
          frameType === 'effect' ||
          typeline.includes('effect') ||
          typeline.includes('efeito')
        )
          cardSubtype = 'Effect'
        else cardSubtype = 'Normal'
        pendulum =
          typeStr.includes('pendulum') ||
          typeStr.includes('pêndulo') ||
          typeStr.includes('pendulo') ||
          Boolean(card.scale != null || card.scales)
      }

      const race = (card.race || '')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_')
      const linkmarkers = card.linkmarkers || []
      const link = {}
      for (let i = 1; i <= 9; i++) link[`link${i}`] = false
      for (const m of linkmarkers) {
        const idx = LINK_MARKER_TO_INDEX[m]
        if (idx) link[`link${idx}`] = true
      }

      const scale = card.scale != null ? Number(card.scale) : 1
      const scales = card.scales
      const blue = Array.isArray(scales) ? scales[0] : scale
      const red = Array.isArray(scales) ? scales[1] : scale
      const { infoText, pendulumText } = this.getCardEffectTexts(card)

      return {
        rare: '0',
        color: '#000000',
        title: card.name || '',
        type: [cardType, cardSubtype, eff1, eff2, pendulum, special],
        attribute: card.attribute || (cardType !== 'Monster' ? '' : 'DARK'),
        race: race || 'dragon',
        level: card.level != null ? String(card.level) : '0',
        blue: blue != null ? blue : 1,
        red: red != null ? red : 1,
        atk:
          card.atk != null && card.atk !== -1 && card.atk !== '-1'
            ? String(card.atk)
            : '?',
        def:
          cardType === 'Monster' && cardSubtype === 'Link'
            ? card.def != null && card.def !== -1 && card.def !== '-1'
              ? String(card.def)
              : '0'
            : card.def != null && card.def !== -1 && card.def !== '-1'
            ? String(card.def)
            : '?',
        ...link,
        infoText,
        size: 20,
        pendulumText,
        pSize: 22,
      }
    },

    fetchCardFromApi(key) {
      if (this.apiCardCache[key]) return
      this.apiCardLoading = true
      this.apiCardError = null
      const data = this.localCardsMap[key]
      if (data) {
        const card = this.localCards.find((c) => String(c.id) === key)
        const imgUrl =
          card && card.card_images && card.card_images[0]
            ? this.getCanvasImageUrl(card.card_images[0], key)
            : null
        this.load_ygopro_data(key)
        this.cardPhotoLoading = !!imgUrl
        if (imgUrl) this.ensureCardImage(key, imgUrl)
      } else {
        this.apiCardError = 'Carta não encontrada no banco local.'
      }
      this.apiCardLoading = false
    },
    async ensureCardImage(id, imageUrl, { forCurrentCard = true } = {}) {
      if (!imageUrl) return
      const key = String(id)
      let scheduledDraw = false
      const isBundledLocalArt = this.isBundledLocalArtUrl(imageUrl)

      if (this.apiCardImageUrls[key]) {
        if (forCurrentCard) {
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard(this.apiCardImageUrls[key])
          })
        }
        return this.apiCardImageUrls[key]
      }

      if (isBundledLocalArt) {
        this.$set(this.apiCardImageUrls, key, imageUrl)
        if (forCurrentCard) {
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard(imageUrl)
          })
        }
        return imageUrl
      }

      if (this.apiCardImagePromises[key]) {
        const pendingUrl = await this.apiCardImagePromises[key]
        if (forCurrentCard) {
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard(pendingUrl || null)
          })
        }
        return pendingUrl
      }

      const setUrlAndDraw = (url) => {
        this.$set(this.apiCardImageUrls, key, url)
        if (forCurrentCard) {
          scheduledDraw = true
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard(url)
          })
        }
      }

      const loadPromise = (async () => {
        const timeout = (promise, ms) =>
          Promise.race([
            promise,
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error('timeout')), ms)
            ),
          ])

        if (window.cardArt) {
          try {
            const url = await timeout(
              window.cardArt.getUrl(key, imageUrl),
              15000
            )
            if (url) {
              setUrlAndDraw(url)
              return url
            }
          } catch (_) {
            /* timeout or download error, fall through */
          }
        }

        if (this.$ygoDb) {
          const blob = await timeout(this.$ygoDb.getCardImage(key), 8000)
          if (blob) {
            const url = URL.createObjectURL(blob)
            setUrlAndDraw(url)
            return url
          }
        }

        setUrlAndDraw(null)
        return null
      })()

      this.apiCardImagePromises[key] = loadPromise

      try {
        return await loadPromise
      } catch (e) {
        console.warn('ensureCardImage falhou para', key, e)
        this.$set(this.apiCardImageUrls, key, null)
        if (forCurrentCard) {
          scheduledDraw = true
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard()
          })
        }
        return null
      } finally {
        delete this.apiCardImagePromises[key]
        if (forCurrentCard && !scheduledDraw) {
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard()
          })
        }
      }
    },

    async ensureFullArtImage(cardId, forCurrentCard = true) {
      if (!this.$ygoDb || !cardId) return null
      const key = String(cardId)
      if (this.apiCardFullArtUrls[key]) {
        if (forCurrentCard) {
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard(this.apiCardFullArtUrls[key])
          })
        }
        return this.apiCardFullArtUrls[key]
      }
      try {
        const blob = await this.$ygoDb.getCardFullArtImage(key)
        if (blob) {
          const url = URL.createObjectURL(blob)
          this.$set(this.apiCardFullArtUrls, key, url)
          if (forCurrentCard) {
            this.$nextTick(() => {
              this.fireLoadingDialog()
              this.drawCard(url)
            })
          }
          return url
        }
      } catch (e) {
        console.warn('ensureFullArtImage falhou para', key, e)
      }
      // Não chamar drawCard() aqui quando não há blob: o drawCard que chamou ensureFullArtImage
      // já prosseguiu com a imagem normal/default; chamar de novo causaria loop infinito.
      return null
    },

    async ensureFullArtPresence(cardId) {
      if (!this.$ygoDb || !cardId) return false
      const key = String(cardId)
      if (typeof this.fullArtPresenceCache[key] === 'boolean') {
        return this.fullArtPresenceCache[key]
      }
      if (this.fullArtPresencePromises[key]) {
        return this.fullArtPresencePromises[key]
      }
      const loadPromise = (async () => {
        try {
          const hasFullArt = await this.$ygoDb.hasCardFullArt(key)
          this.$set(this.fullArtPresenceCache, key, hasFullArt)
          return hasFullArt
        } catch (_) {
          this.$set(this.fullArtPresenceCache, key, false)
          return false
        } finally {
          delete this.fullArtPresencePromises[key]
        }
      })()
      this.fullArtPresencePromises[key] = loadPromise
      return loadPromise
    },

    async refreshHasCardFullArt() {
      if (!this.$ygoDb || !this.cardKey) {
        this.hasCardFullArtCache = false
        return
      }
      try {
        this.hasCardFullArtCache = await this.$ygoDb.hasCardFullArt(
          this.cardKey
        )
      } catch (_) {
        this.hasCardFullArtCache = false
      }
    },

    async onUploadFullArt(file) {
      if (!this.$ygoDb || !this.cardKey || !file) return
      const key = String(this.cardKey)
      try {
        await this.$ygoDb.saveCardFullArtImage(key, file)
        this.hasCardFullArtCache = true
        this.$set(this.fullArtPresenceCache, key, true)
        const url = await this.ensureFullArtImage(key, true)
        if (url) this.drawCard(url)
      } catch (e) {
        console.warn('onUploadFullArt falhou', e)
      }
    },

    /** URL para o canvas: só image_url_cropped ou image_url (nunca image_url_small). */
    getCanvasImageUrl(img, cardId = null) {
      if (cardId) {
        return this.getBundledCanvasArtUrl(cardId, 'webp')
      }
      if (!img) return null
      if (img.image_url_cropped) return img.image_url_cropped
      if (img.image_url && img.image_url !== img.image_url_small)
        return img.image_url
      return null
    },

    /** Lista de resultados: usa image_url_small (miniatura). */
    getCardImageSrc(card) {
      const previewUrl = this.cardPreviewUrls[String(card?.id)]
      if (previewUrl) return previewUrl
      const fullArtUrl = this.apiCardFullArtUrls[String(card?.id)]
      if (fullArtUrl) return fullArtUrl
      const localThumb = this.getBundledThumbArtUrl(String(card?.id), 'webp')
      if (localThumb) return localThumb
      const cachedImageUrl = this.apiCardImageUrls[String(card?.id)]
      if (cachedImageUrl) return cachedImageUrl
      const localCanvas = this.getBundledCanvasArtUrl(String(card?.id), 'webp')
      if (localCanvas) return localCanvas
      const img = card.card_images && card.card_images[0]
      const url = img && (img.image_url || img.image_url_small)
      return url || 'images/default.jpg'
    },

    getSearchResultImageSrc(card) {
      const previewUrl = this.cardPreviewUrls[String(card?.id)]
      if (previewUrl) return previewUrl
      const fullArtUrl = this.apiCardFullArtUrls[String(card?.id)]
      if (fullArtUrl) return fullArtUrl
      const localThumb = this.getBundledThumbArtUrl(String(card?.id), 'webp')
      if (localThumb) return localThumb
      const cachedImageUrl = this.apiCardImageUrls[String(card?.id)]
      if (cachedImageUrl) return cachedImageUrl
      const localCanvas = this.getBundledCanvasArtUrl(String(card?.id), 'webp')
      if (localCanvas) return localCanvas
      const img = card.card_images && card.card_images[0]
      if (!img) return 'images/default.jpg'
      return img.image_url_small || img.image_url || 'images/default.jpg'
    },

    /** Cor de fundo do card na lista de busca por tipo/subtipo. */
    getSearchResultCardBg(card) {
      const t = (card.type || '').toLowerCase()
      const f = (card.frameType || '').toLowerCase()
      if (t.includes('spell') || t.includes('magic') || t.includes('magia'))
        return '#008872'
      if (t.includes('trap') || t.includes('armadilha')) return '#9D1C6F'
      if (t.includes('fusion') || t.includes('fusão') || t.includes('fusao'))
        return '#93539A'
      if (t.includes('ritual')) return '#597DBC'
      if (t.includes('synchro') || t.includes('sincro')) return '#E6E2E0'
      if (t.includes('link')) return '#00477F'
      if (t.includes('token') || t.includes('ficha')) return '#736967'
      if (t.includes('xyz')) return '#2D2D2D'
      if (
        t.includes('effect') ||
        t.includes('efeito') ||
        f === 'effect' ||
        f === 'efeito'
      )
        return '#B5663B'
      if (t.includes('normal')) return '#BB8C40'
      return '#555'
    },

    /** Texto claro em fundos escuros; escuro em Synchro. */
    getSearchResultTextClass(card) {
      const t = (card.type || '').toLowerCase()
      if (t.includes('synchro') || t.includes('sincro')) return 'text-dark'
      return 'text-white'
    },

    onCardImgError(card, event) {
      if (!event?.target) return
      const target = event.target
      const cardId = String(card?.id || '')
      const currentSrc = target.getAttribute('src') || ''
      const localThumb = this.getBundledThumbArtUrl(cardId, 'webp')
      const localCanvas = this.getBundledCanvasArtUrl(cardId, 'webp')
      const img = card.card_images && card.card_images[0]
      const remoteLarge = img && img.image_url
      const remoteSmall = img && img.image_url_small

      if (localThumb && currentSrc === localThumb) {
        this.$set(this.brokenBundledThumbs, cardId, true)
        const nextSrc =
          localCanvas || remoteLarge || remoteSmall || 'images/default.jpg'
        if (nextSrc !== currentSrc) target.src = nextSrc
        return
      }

      if (localCanvas && currentSrc === localCanvas) {
        this.$set(this.brokenBundledCanvasArts, cardId, true)
        const nextSrc = remoteLarge || remoteSmall || 'images/default.jpg'
        if (nextSrc !== currentSrc) target.src = nextSrc
        return
      }

      if (
        remoteSmall &&
        currentSrc === remoteSmall &&
        remoteLarge &&
        remoteLarge !== currentSrc
      ) {
        target.src = remoteLarge
        return
      }

      if (currentSrc !== 'images/default.jpg') {
        target.src = 'images/default.jpg'
      }
    },

    onSearchResultImgError(card, event) {
      this.onCardImgError(card, event)
    },
    async migrateYgoDeckSnapshotsIfNeeded() {
      if (!this.$ygoDb || !this.localCards.length) return
      try {
        const already = await this.$ygoDb.getSyncMeta(
          DECK_SNAPSHOT_MIGRATION_KEY
        )
        if (already === '1') return

        const decks = await this.$ygoDb.getDecks('yugioh')
        if (!Array.isArray(decks) || !decks.length) {
          await this.$ygoDb.updateSyncMeta(DECK_SNAPSHOT_MIGRATION_KEY, '1')
          return
        }

        const localById = new Map(this.localCards.map((c) => [String(c.id), c]))

        for (const deck of decks) {
          const cards = await this.$ygoDb.getDeckCards(deck.id)
          if (!Array.isArray(cards) || !cards.length) continue
          for (const item of cards) {
            const cardKey = item.cardKey != null ? String(item.cardKey) : null
            if (!cardKey) continue
            const base = localById.get(cardKey)
            if (!base) continue

            const mapped = this.map_ygoprodeck_to_internal(base)
            const snapshot = item.snapshot || {}
            const nextSnapshot = { ...snapshot }
            let changed = false

            if (Array.isArray(mapped.type)) {
              const prevType = Array.isArray(snapshot.type) ? snapshot.type : []
              const nextType = mapped.type
              const typesDiffer =
                prevType.length !== nextType.length ||
                prevType.some((v, idx) => v !== nextType[idx])
              if (typesDiffer) {
                nextSnapshot.type = [...nextType]
                changed = true
              }
            }

            for (let i = 1; i <= 9; i++) {
              if (i === 5) continue
              const key = `link${i}`
              const prev = snapshot[key]
              const next = mapped[key]
              if (prev !== next) {
                nextSnapshot[key] = next
                changed = true
              }
            }

            if (!changed) continue

            await this.$ygoDb.updateDeckCard(item.id, {
              name: item.name,
              cardKey: item.cardKey,
              cardLang: item.cardLang || 'pt',
              snapshot: nextSnapshot,
            })
          }
        }

        await this.$ygoDb.updateSyncMeta(DECK_SNAPSHOT_MIGRATION_KEY, '1')
      } catch (e) {
        console.warn('migrateYgoDeckSnapshotsIfNeeded falhou', e)
      }
    },
    async initYgoDb() {
      if (!this.$ygoDb) return
      try {
        const { cards, lastSync, databaseVersion } = await this.$ygoDb.getDB()
        this.localCards = Array.isArray(cards) ? cards : []
        this.lastSync = lastSync
        this.localDatabaseVersion = databaseVersion ?? null
        await this.migrateYgoDeckSnapshotsIfNeeded()
        if (await this.$ygoDb.shouldSync(lastSync)) await this.syncYgoDb()
        await this.restoreSearchState()
        await this.restoreLastCard()
      } catch (e) {
        this.syncError = this.ui[this.uiLang].db_sync_error
      }
    },

    async saveSearchState() {
      if (!this.$ygoDb) return
      const state = {
        searchMode: this.searchMode,
        searchQueryNormalized: this.searchQueryNormalized,
        searchTried: this.searchTried,
      }
      try {
        await this.$ygoDb.updateSyncMeta('searchState', JSON.stringify(state))
      } catch (_) {
        /* ignore */
      }
    },

    async restoreSearchState() {
      if (!this.$ygoDb || this.localCards.length === 0) return
      try {
        const raw = await this.$ygoDb.getSyncMeta('searchState')
        if (!raw) return
        const state = JSON.parse(raw)
        this.searchMode = state.searchMode || 'archetype'
        this.searchByArchetype = ''
        this.searchByName = ''
        this.searchTried = false
        const hasQuery =
          (this.searchMode === 'archetype' && this.searchByArchetype.trim()) ||
          (this.searchMode === 'name' && this.searchByName.trim())
        if (hasQuery) this.searchCards()
      } catch (_) {
        /* ignore */
      }
    },

    saveLastCard() {
      if (!this.$ygoDb || !this.cardKey) return
      if (this._saveLastCardTimer) clearTimeout(this._saveLastCardTimer)
      this._saveLastCardTimer = setTimeout(async () => {
        try {
          const state = {
            cardKey: this.cardKey,
            cardLang: this.cardLang,
            snapshot: this.getCurrentCardSnapshot(),
          }
          await this.$ygoDb.updateSyncMeta('lastCard', JSON.stringify(state))
        } catch (_) {
          /* ignore */
        }
      }, 800)
    },

    async restoreLastCard() {
      if (!this.$ygoDb) return
      try {
        const raw = await this.$ygoDb.getSyncMeta('lastCard')
        if (!raw) return
        const state = JSON.parse(raw)
        if (!state.snapshot) return
        this.programmaticUpdate = true
        this.loadFromSnapshot(state.snapshot)
        this.cardKey = state.cardKey || ''
        this.cardLang = state.cardLang || 'pt'
        this.viewingBaseCard = !!this.localCardsMap[this.cardKey]
        this.snapshotAtLoad = this.captureCurrentCardSnapshot()
        this.setYgoEditorState('base-readonly', { editingDeckCardId: null })
        const card = this.localCards.find(
          (c) => String(c.id) === String(this.cardKey)
        )
        const img = card?.card_images?.[0]
        const imgUrl = img ? this.getCanvasImageUrl(img, this.cardKey) : null
        if (imgUrl) {
          this.cardPhotoLoading = true
          this.$nextTick(() => this.fireLoadingDialog())
          await this.ensureCardImage(this.cardKey, imgUrl)
        }
        this.$nextTick(() => this.drawCard())
        this.relatedCards = []
      } catch (_) {
        /* ignore */
      }
    },

    async forceResync() {
      if (!this.$ygoDb) return
      await this.$ygoDb.updateSyncMeta('databaseVersion', '')
      await this.syncYgoDb()
      const { cards, lastSync, databaseVersion } = await this.$ygoDb.getDB()
      this.localCards = Array.isArray(cards) ? cards : []
      this.lastSync = lastSync
      this.localDatabaseVersion = databaseVersion ?? null
    },

    async syncYgoDb() {
      this.syncLoading = true
      this.syncProgress = 0
      this.syncError = null
      try {
        const res = await fetch(YGOPRODECK_CHECK_VER)
        const verList = await res.json()
        const remoteVersion =
          Array.isArray(verList) && verList[0] && verList[0].database_version
            ? String(verList[0].database_version)
            : null
        const hasNewVersion =
          remoteVersion && remoteVersion !== this.localDatabaseVersion
        const forceRefresh = !this.localDatabaseVersion
        const mustRefetch = hasNewVersion || forceRefresh
        if (!mustRefetch) {
          if (remoteVersion && this.localDatabaseVersion === remoteVersion) {
            await this.$ygoDb.updateSyncMeta('lastSync', Date.now())
            await this.$ygoDb.updateSyncMeta('databaseVersion', remoteVersion)
            this.lastSync = Date.now()
          }
          this.syncLoading = false
          return
        }
        await this.downloadAndSaveCards(remoteVersion)
      } catch (e) {
        this.syncError = this.ui[this.uiLang].db_sync_error
      } finally {
        this.syncLoading = false
      }
    },
    async downloadAndSaveCards(remoteVersion) {
      if (!this.$ygoDb) return
      this.syncProgress = 5
      await this.$ygoDb.clearCards()
      await this.$ygoDb.clearCardImages()
      this.syncProgress = 10

      try {
        const enData = await this.fetchCardListFromApi(YGOPRODECK_API)
        if (Array.isArray(enData) && enData.length > 0) {
          await this.$ygoDb.saveCardsEN(enData)
        }
      } catch (err) {
        this.syncError = this.ui[this.uiLang].db_sync_error
      }
      this.syncProgress = 50

      try {
        const ptUrl = `${YGOPRODECK_API}?language=pt`
        const ptData = await this.fetchCardListFromApi(ptUrl)
        if (Array.isArray(ptData) && ptData.length > 0) {
          await this.$ygoDb.mergeCardsPT(ptData)
        }
      } catch (err) {
        this.syncError = this.ui[this.uiLang].db_sync_error
      }
      this.syncProgress = 90

      await this.$ygoDb.updateSyncMeta('lastSync', Date.now())
      await this.$ygoDb.updateSyncMeta('databaseVersion', remoteVersion)

      const { cards, lastSync, databaseVersion } = await this.$ygoDb.getDB()
      this.localCards = cards || []
      this.lastSync = lastSync
      this.localDatabaseVersion = databaseVersion
      this.syncProgress = 100
      this.syncLoading = false
    },

    fetchCardListFromApi(url) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const timeoutId = setTimeout(() => {
          xhr.abort()
          reject(new Error('timeout'))
        }, SYNC_TIMEOUT_MS)
        xhr.open('GET', url)
        xhr.timeout = SYNC_TIMEOUT_MS
        xhr.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            this.syncProgress = Math.min(this.syncProgress + 2, 90)
          }
        }
        xhr.onload = () => {
          clearTimeout(timeoutId)
          try {
            const json = JSON.parse(xhr.responseText)
            resolve(Array.isArray(json.data) ? json.data : [])
          } catch (e) {
            reject(e)
          }
        }
        xhr.onerror = () => {
          clearTimeout(timeoutId)
          reject(new Error('network'))
        }
        xhr.onabort = () => {
          clearTimeout(timeoutId)
          reject(new Error('abort'))
        }
        xhr.send()
      })
    },
    closeArchetypeDropdown() {
      setTimeout(() => {
        this.showArchetypeDropdown = false
      }, 200)
    },
    selectArchetype(opt) {
      this.searchByArchetype = opt.archetype_name
      this.showArchetypeDropdown = false
      this.searchCards()
    },

    closeNameDropdown() {
      setTimeout(() => {
        this.showNameDropdown = false
      }, 200)
    },
    selectCardFromName(card) {
      this.searchByName = card.name || ''
      this.showNameDropdown = false
      this.searchCards()
    },

    stripAccents(str) {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    },

    extractReferencedNames(card) {
      const seen = new Set()
      const add = (s) => {
        const n = this.normalizeSearchQuery(s)
        if (n && n.length >= 2) seen.add(n)
      }
      const texts = [card.desc].filter(Boolean)
      const quoteRe = /"([^"]+)"/g
      for (const text of texts) {
        let m
        while ((m = quoteRe.exec(text)) !== null) {
          const raw = m[1].trim()
          add(raw)
          const ma = raw.match(/^(.+?)\(a\)$/i)
          const mo = raw.match(/^(.+?)\(o\)$/i)
          if (ma) {
            const base = ma[1].trim()
            add(base)
            if (base.endsWith('o')) add(base.slice(0, -1) + 'a')
          } else if (mo) {
            const base = mo[1].trim()
            add(base)
            if (base.endsWith('a')) add(base.slice(0, -1) + 'o')
          }
        }
      }
      return [...seen]
    },

    findCardsByExtractedNames(names) {
      const found = new Map()
      const namesList = names.filter(Boolean)
      for (const name of namesList) {
        const exact = this.nameIndexMap.get(name)
        if (exact) for (const c of exact) found.set(String(c.id), c)
      }
      if (namesList.length === 0) return [...found.values()]
      for (const entry of this.cardSearchIndex) {
        if (found.has(entry.id)) continue
        for (const name of namesList) {
          if (
            (entry.nameEn && entry.nameEn.includes(name)) ||
            (entry.namePt && entry.namePt.includes(name))
          ) {
            found.set(entry.id, entry.card)
            break
          }
        }
      }
      return [...found.values()]
    },

    findCardsMentioning(cardNames) {
      const namesNorm = cardNames
        .map((s) => this.normalizeSearchQuery(s))
        .filter(Boolean)
      if (!namesNorm.length) return []
      const found = new Map()
      for (const entry of this.cardSearchIndex) {
        if (!entry.combinedDesc) continue
        for (const q of namesNorm) {
          if (entry.combinedDesc.includes(q)) {
            found.set(entry.id, entry.card)
            break
          }
        }
      }
      return [...found.values()]
    },

    cardTypePriority(card) {
      const t = (card.type || '').toLowerCase()
      const f = (card.frameType || '').toLowerCase()
      const has = (...args) => args.some((w) => t.includes(w))
      const hasNot = (...args) => !args.some((w) => t.includes(w))
      if (has('token', 'ficha') || f === 'token' || f === 'ficha') return 99
      if (
        f === 'normal' ||
        (has('normal') &&
          hasNot(
            'effect',
            'efeito',
            'spell',
            'magic',
            'magia',
            'trap',
            'armadilha'
          ))
      )
        return 0
      if (has('effect', 'efeito') || f === 'effect' || f === 'efeito') return 1
      if (has('spell', 'magic', 'magia')) return 2
      if (has('trap', 'armadilha')) return 3
      if (has('ritual')) return 4
      if (has('fusion', 'fusão', 'fusao')) return 5
      if (has('synchro', 'sincro')) return 6
      if (has('xyz')) return 7
      if (has('pendulum', 'pêndulo', 'pendulo')) return 8
      if (has('link')) return 9
      return 10
    },

    buildRelatedCards(card, depth = 2) {
      const mainId = String(card.id)
      const cacheKey = `${mainId}:${depth}`
      if (this.relatedCardsCache[cacheKey]) {
        return this.relatedCardsCache[cacheKey]
      }
      const collected = new Map()
      const add = (c) => {
        const id = String(c.id)
        if (id === mainId || collected.has(id)) return
        collected.set(id, { ...c, _matchLang: c._matchLang || 'en' })
      }

      const mainNames = [card.name]
        .filter(Boolean)
        .map((s) => this.normalizeSearchQuery(s))

      const level1Cited = this.findCardsByExtractedNames(
        this.extractReferencedNames(card)
      )
      const level1Mentioning = this.findCardsMentioning(mainNames)
      for (const c of level1Cited) add(c)
      for (const c of level1Mentioning) add(c)

      if (depth >= 2) {
        const level1Cards = [...collected.values()].slice(0, 8)
        for (const c1 of level1Cards) {
          const cited = this.findCardsByExtractedNames(
            this.extractReferencedNames(c1)
          )
          const names1 = [c1.name]
            .filter(Boolean)
            .map((s) => this.normalizeSearchQuery(s))
          const mentioning = this.findCardsMentioning(names1)
          for (const c of cited) add(c)
          for (const c of mentioning) add(c)
        }
      }

      const excludeIds = new Set(this.searchResults.map((r) => String(r.id)))
      const result = [...collected.values()]
        .filter((c) => !excludeIds.has(String(c.id)))
        .sort((a, b) => this.cardTypePriority(a) - this.cardTypePriority(b))
        .slice(0, 150)
      this.relatedCardsCache[cacheKey] = result
      return result
    },

    normalizeSearchQuery(q) {
      return this.stripAccents(
        (q || '').toLowerCase().replace(/\s+/g, ' ').trim()
      )
    },

    getSearchSectionLabel(sectionKey) {
      const key = 'search_section_' + sectionKey
      const raw = this.ui[this.uiLang] && this.ui[this.uiLang][key]
      const fallbacks = {
        archetype: 'Arquétipo "__Q__"',
        related: 'Cards relacionados a "__Q__"',
        name: '"__Q__"',
        desc: 'Cards que mencionam "__Q__" na descrição',
      }
      const template = raw || fallbacks[sectionKey] || ''
      const q = this.searchQueryNormalized
      return template.replace(/\{\{q\}\}/gi, q).replace(/__Q__/g, q)
    },

    getCardMatchInfo(entry, queryNorm) {
      if (!queryNorm) return { type: 'none', lang: 'en' }
      if (
        entry.archetype &&
        (entry.archetype === queryNorm || entry.archetype.includes(queryNorm))
      ) {
        const lang = entry.namePt.includes(queryNorm) ? 'pt' : 'en'
        return { type: 'archetype', lang }
      }
      if (entry.namePt.includes(queryNorm)) return { type: 'name', lang: 'pt' }
      if (entry.nameEn.includes(queryNorm)) return { type: 'name', lang: 'en' }
      if (entry.descPt.includes(queryNorm)) return { type: 'desc', lang: 'pt' }
      if (entry.descEn.includes(queryNorm) || entry.descRaw.includes(queryNorm))
        return { type: 'desc', lang: 'en' }
      return { type: 'none', lang: 'en' }
    },

    getDisplayName(card) {
      return card.name || ''
    },

    getFilteredCardDisplayName(card) {
      if (!this.searchByName) return card.name || ''
      const q = this.normalizeSearchQuery(this.searchByName)
      const name = this.stripAccents((card.name || '').toLowerCase())
      if (name.includes(q)) return card.name || ''
      return card.name || ''
    },

    searchCards() {
      this.searchTried = true
      this.searchResults = []
      this.searchLoading = true
      this.showArchetypeDropdown = false
      this.showNameDropdown = false
      const queryRaw =
        this.searchMode === 'name'
          ? this.searchByName.trim()
          : this.searchByArchetype.trim()
      if (!queryRaw) {
        this.searchLoading = false
        return
      }
      const queryNorm = this.normalizeSearchQuery(queryRaw)
      const matchPriority = { archetype: 0, name: 1, desc: 2, related: 3 }
      const withType = this.cardSearchIndex
        .map((entry) => {
          const info = this.getCardMatchInfo(entry, queryNorm)
          return {
            ...entry.card,
            matchType: info.type,
            _matchLang: info.lang,
          }
        })
        .filter((c) => c.matchType !== 'none')
        .sort((a, b) => {
          const mp = matchPriority[a.matchType] - matchPriority[b.matchType]
          if (mp !== 0) return mp
          return this.cardTypePriority(a) - this.cardTypePriority(b)
        })
      const archCards = withType.filter((c) => c.matchType === 'archetype')
      const nameCards = withType.filter((c) => c.matchType === 'name')
      const descCards = withType.filter((c) => c.matchType === 'desc')
      const existingIds = new Set(
        [...archCards, ...nameCards, ...descCards]
          .slice(0, 300)
          .map((c) => String(c.id))
      )
      const primaryForExpand = [...archCards, ...nameCards, ...descCards].slice(
        0,
        3
      )
      const relatedExpanded = new Map()
      for (const primary of primaryForExpand) {
        for (const c of this.buildRelatedCards(primary, 2)) {
          if (!existingIds.has(String(c.id))) {
            relatedExpanded.set(String(c.id), {
              ...c,
              matchType: 'related',
              _matchLang: c._matchLang || 'en',
            })
          }
        }
      }
      const relatedCardsList = [...relatedExpanded.values()].slice(0, 100)
      this.searchResults = [
        ...archCards.slice(0, 100),
        ...nameCards.slice(0, 100),
        ...descCards.slice(0, 100),
        ...relatedCardsList,
      ]
      this.searchQueryNormalized = queryNorm
      this.searchLoading = false
      this.preloadSearchResultImages()
      this.saveSearchState()
    },

    preloadSearchResultImages() {
      if (!this.$ygoDb || !this.searchResults.length) return
      const limit = 20
      for (const card of this.searchResults.slice(0, limit)) {
        this.$ygoDb.hasCardImage(String(card.id)).then((hasCustomImage) => {
          if (hasCustomImage && !this.apiCardImageUrls[String(card.id)]) {
            const img = card.card_images && card.card_images[0]
            const imgUrl = img
              ? this.getCanvasImageUrl(img, String(card.id))
              : null
            this.ensureCardImage(String(card.id), imgUrl, {
              forCurrentCard: false,
            })
          }
        })
        this.ensureFullArtPresence(String(card.id)).then((hasFullArt) => {
          if (hasFullArt && !this.apiCardFullArtUrls[String(card.id)]) {
            this.ensureFullArtImage(String(card.id), false)
          }
        })
        const img = card.card_images && card.card_images[0]
        const imgUrl = img ? this.getCanvasImageUrl(img, String(card.id)) : null
        if (imgUrl && !this.apiCardImageUrls[String(card.id)]) {
          this.ensureCardImage(String(card.id), imgUrl, {
            forCurrentCard: false,
          })
        }
      }
    },

    applyCardFromSearch(card) {
      if (this.hasUnsavedLayoutChanges) {
        this.pendingLeaveAction = { type: 'applyCardFromSearch', card }
        this.$refs.unsavedChangesModal.show()
        return
      }
      this.doApplyCardFromSearch(card)
    },

    doApplyCardFromSearch(card) {
      this.searchByName = ''
      this.searchByArchetype = ''
      this.saveSearchState()
      this.initialSnapshotWhenNotFromCollection = null
      this.setYgoEditorState('base-readonly', { editingDeckCardId: null })
      this.snapshotAtLoad = null
      this.viewingBaseCard = true
      const key = String(card.id)
      const img = card.card_images && card.card_images[0]
      const imgUrl = img ? this.getCanvasImageUrl(img, key) : null
      this.cardKey = key
      this.cardLang = card.lang || 'pt'
      this.load_ygopro_data(key)
      this.cardPhotoLoading = !!imgUrl
      if (imgUrl) {
        this.$nextTick(() => this.fireLoadingDialog())
        this.ensureCardImage(key, imgUrl)
        // Fallback: garantir que loading não fique infinito se ensureCardImage travar
        setTimeout(() => {
          if (this.cardPhotoLoading && this.cardKey === key) {
            this.cardPhotoLoading = false
            this.closeLoadingDialog()
            this.drawCard()
          }
        }, 20000)
      } else {
        this.cardPhotoLoading = false
        this.$nextTick(() => {
          this.fireLoadingDialog()
          this.drawCard()
        })
      }
      this.$nextTick(() => {
        setTimeout(() => {
          const loadedSnapshot = this.captureCurrentCardSnapshot()
          this.initialSnapshotWhenNotFromCollection = JSON.parse(
            JSON.stringify(loadedSnapshot)
          )
          this.snapshotAtLoad = JSON.parse(JSON.stringify(loadedSnapshot))
        }, 800)
      })
      this.relatedCards = []
    },

    preloadRelatedCardImages() {
      if (!this.$ygoDb || !this.relatedCards.length) return
      const limit = 20
      for (const card of this.relatedCards.slice(0, limit)) {
        const img = card.card_images && card.card_images[0]
        const imgUrl = img ? this.getCanvasImageUrl(img, String(card.id)) : null
        if (imgUrl && !this.apiCardImageUrls[String(card.id)]) {
          this.ensureCardImage(String(card.id), imgUrl, {
            forCurrentCard: false,
          })
        }
      }
    },

    getCurrentCardSnapshot() {
      const link = {}
      for (let i = 1; i <= 9; i++)
        if (i !== 5) link[`link${i}`] = this.links[i].val
      return {
        rare: this.cardRare,
        color: this.cardType === 'Spell' ? '#FFFFFF' : this.titleColor,
        title: this.cardTitle,
        type: [
          this.cardType,
          this.cardSubtype,
          this.cardEff1,
          this.cardEff2,
          this.Pendulum,
          this.Special,
        ],
        attribute: this.cardAttr,
        race: this.cardRace,
        level: this.cardLevel,
        blue: this.cardBLUE,
        red: this.cardRED,
        atk: this.cardATK,
        def: this.cardDEF,
        ...link,
        infoText: this.cardInfo,
        size: Number(this.infoSize) || 20,
        infoPosition: Number(this.infoPosition) || 0,
        pendulumText: this.cardPendulumInfo,
        pSize: Number(this.pendulumSize) || 22,
        fullart: this.fullart,
      }
    },

    async addToDeckCurrent() {
      if (!this.cardKey || !this.selectedDeckId) return
      const snapshot = this.getCurrentCardSnapshot()
      const name = this.cardTitle || 'Card'
      const pid = `pending_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`
      const maxOrder = Math.max(
        -1,
        ...this.selectedDeckCards.map((c) =>
          c.sort_order != null ? c.sort_order : -1
        )
      )
      const thumbnailDataUrl =
        await this.captureCurrentDeckCardThumbnailDataUrl()
      this.selectedDeckCards.push({
        id: pid,
        deck_id: this.selectedDeckId,
        card_id: Number(this.cardKey) || null,
        sort_order: maxOrder + 1,
        name,
        cardKey: this.cardKey,
        cardLang: this.cardLang,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        thumbnailDataUrl,
      })
      this.setYgoEditorState('deck-readonly', { editingDeckCardId: pid })
      this.snapshotAtLoad = JSON.parse(JSON.stringify(snapshot))
      await this.saveDeckStateYgo()
    },

    async saveCurrentCardChanges() {
      if (!this.$ygoDb) return
      if (this.editingDeckCardId) {
        return this.saveDeckCardChanges()
      }
      return this.saveBaseCardChanges()
    },

    async saveBaseCardChanges() {
      if (!this.$ygoDb || !this.cardKey || !this.currentBaseCard) return
      const snapshot = this.getCurrentCardSnapshot()
      const key = String(this.cardKey)
      const updatedCard = this.buildStoredCardFromSnapshot(
        this.currentBaseCard,
        snapshot
      )
      await this.$ygoDb.updateCardBase(key, {
        name: updatedCard.name || '',
        desc: updatedCard.desc || '',
        data: updatedCard,
      })

      const previewBlob = await this.captureCurrentCardPreviewBlob()
      if (previewBlob) {
        this.revokeBlobUrl(this.cardPreviewUrls[key])
        this.revokeBlobUrl(this.deckCardImageUrls[key])
        await this.$ygoDb.saveCardPreviewImage(key, previewBlob)
        const previewUrl = URL.createObjectURL(previewBlob)
        this.$set(this.cardPreviewUrls, key, previewUrl)
        this.$set(this.deckCardImageUrls, key, previewUrl)
      }

      const { cards } = await this.$ygoDb.getDB()
      this.localCards = cards || []
      const refreshedCard =
        this.localCards.find((card) => String(card.id) === key) || updatedCard
      this.replaceCardInCollections(refreshedCard)
      this.$set(
        this.apiCardCache,
        key,
        this.map_ygoprodeck_to_internal(refreshedCard)
      )
      this.snapshotAtLoad = JSON.parse(JSON.stringify(snapshot))
      this.viewingBaseCard = true
      this.setYgoEditorState('base-readonly', { editingDeckCardId: null })
      await this.loadDeckCards()
    },

    async saveDeckCardChanges() {
      if (!this.$ygoDb || !this.editingDeckCardId) return
      const snapshot = this.getCurrentCardSnapshot()
      const snapshotEqual =
        JSON.stringify(snapshot) === JSON.stringify(this.snapshotAtLoad)
      const imageChanged =
        (this._editInitialCardKey != null &&
          String(this.cardKey) !== String(this._editInitialCardKey)) ||
        this.cardImg != null
      if (snapshotEqual && imageChanged) {
        this.showArtApplyModal = true
        return
      }
      await this.saveDeckCardChangesApply('all')
    },

    async onArtApplyThis() {
      this.showArtApplyModal = false
      await this.saveDeckCardChangesApply('this')
    },
    async onArtApplyAll() {
      this.showArtApplyModal = false
      await this.saveDeckCardChangesApply('all')
    },

    /** Aplica o salvamento: 'this' = só esta cópia, 'all' = todas as cópias (mesmo cardKey) */
    async saveDeckCardChangesApply(scope) {
      if (!this.$ygoDb) return
      const snapshot = this.getCurrentCardSnapshot()
      const name = this.cardTitle || 'Card'
      const key = String(this.cardKey || '')
      const payload = {
        name,
        cardKey: this.cardKey,
        cardLang: this.cardLang,
        snapshot,
        thumbnailDataUrl: '',
      }
      if (scope === 'this') {
        const id = this.editingDeckCardId
        if (!String(id).startsWith('pending_')) {
          await this.$ygoDb.updateDeckCardsBulk([{ id, cardData: payload }])
        }
        const item = this.selectedDeckCards.find((c) => c.id === id)
        if (item) {
          item.name = name
          item.cardKey = this.cardKey
          item.cardLang = this.cardLang
          item.snapshot = JSON.parse(JSON.stringify(snapshot))
          item.thumbnailDataUrl = ''
        }
      } else {
        const oldKey =
          this._editInitialCardKey != null
            ? String(this._editInitialCardKey)
            : String(this.cardKey)
        const toUpdate = this.selectedDeckCards.filter(
          (item) => String(item.cardKey) === oldKey
        )
        const persistedUpdates = []
        for (const item of toUpdate) {
          if (!String(item.id).startsWith('pending_')) {
            persistedUpdates.push({ id: item.id, cardData: payload })
          }
          item.name = name
          item.cardKey = this.cardKey
          item.cardLang = this.cardLang
          item.snapshot = JSON.parse(JSON.stringify(snapshot))
          item.thumbnailDataUrl = ''
        }
        if (persistedUpdates.length) {
          await this.$ygoDb.updateDeckCardsBulk(persistedUpdates)
        }
      }
      const previewBlob = await this.captureCurrentCardPreviewBlob()
      if (previewBlob && key) {
        this.revokeBlobUrl(this.cardPreviewUrls[key])
        await this.$ygoDb.saveCardPreviewImage(key, previewBlob)
        const previewUrl = URL.createObjectURL(previewBlob)
        this.$set(this.cardPreviewUrls, key, previewUrl)
        this.selectedDeckCards
          .filter((item) => String(item.cardKey) === key)
          .forEach((item) => {
            this.$set(this.deckCardImageUrls, String(item.id), previewUrl)
          })
      }
      this.snapshotAtLoad = JSON.parse(JSON.stringify(snapshot))
      this._editInitialCardKey = this.cardKey
      // Finalizar o modo de edição após salvar com sucesso
      this.setYgoEditorState('deck-readonly', {
        editingDeckCardId: this.editingDeckCardId,
      })
    },

    async onUnsavedModalSave() {
      this.$refs.unsavedChangesModal.hide()
      const action = this.pendingLeaveAction
      this.pendingLeaveAction = null
      if (!action) return
      await this.saveCurrentCardChanges()
      this.runPendingLeaveAction(action)
    },

    onUnsavedModalDiscard() {
      this.$refs.unsavedChangesModal.hide()
      const action = this.pendingLeaveAction
      this.pendingLeaveAction = null
      // Limpar estado de alterações não salvas antes de executar a ação,
      // para que hasUnsavedLayoutChanges fique false e não mostre o modal de novo
      this.setYgoEditorState('base', { editingDeckCardId: null })
      this.snapshotAtLoad = null
      this.$nextTick(() => {
        this.runPendingLeaveAction(action)
      })
    },

    onUnsavedModalCancel() {
      this.$refs.unsavedChangesModal.hide()
      this.pendingLeaveAction = null
    },

    runPendingLeaveAction(action) {
      if (!action) return
      if (action.type === 'loadDeckCard') {
        this.doLoadDeckCardForEdit(action.item)
      } else if (action.type === 'loadDefault') {
        this.doLoadDefaultData()
      } else if (action.type === 'applyCardFromSearch') {
        this.doApplyCardFromSearch(action.card)
      }
    },

    // -------- Decks --------

    async loadDecks() {
      if (!this.$ygoDb) return
      this.userDecks = await this.$ygoDb.getDecks('yugioh')
      await this.loadDeckFirstCardImages()
    },

    async loadDeckFirstCardImages() {
      if (!this.$ygoDb || !this.userDecks.length) return
      for (const deck of this.userDecks) {
        try {
          const cards = await this.$ygoDb.getDeckCards(deck.id)
          const coverCard =
            deck.cover_card_id && cards
              ? cards.find((c) => c.id === deck.cover_card_id)
              : null
          const cardToShow = coverCard || (cards && cards[0])
          if (cardToShow) {
            await this.ensureDeckCardImageUrl(cardToShow)
            const url = this.getDeckCardImageSrc(cardToShow)
            this.$set(this.deckFirstCardImages, deck.id, url)
          } else {
            this.$set(this.deckFirstCardImages, deck.id, null)
          }
        } catch (_) {
          this.$set(this.deckFirstCardImages, deck.id, null)
        }
      }
    },

    async selectDeck(deck) {
      this.selectedDeckId = deck.id
      await this.loadDeckCards()
      this.centerColumnView = 'deck-cards'
    },

    goBackToDeckList() {
      this.centerColumnView = 'decks'
    },

    async toggleDeckCover() {
      if (!this.$ygoDb || !this.selectedDeckId) return
      const id = this.currentDeckCardIdForCover
      if (!id) return
      const newCover = this.isCurrentCardDeckCover
        ? null
        : this.currentDeckCardIdForCover
      await this.$ygoDb.updateDeckCover(this.selectedDeckId, newCover)
      await this.loadDecks()
    },

    openEditDeckModal(deck) {
      this.editingDeckId = deck.id
      this.editingDeckName = deck.name || ''
      this.showEditDeckModal = true
    },
    async saveEditDeck() {
      if (!this.$ygoDb || !this.editingDeckId || !this.editingDeckName.trim())
        return
      await this.$ygoDb.updateDeck(
        this.editingDeckId,
        this.editingDeckName.trim()
      )
      const wasMhDeck = this.mhUserDecks.some(
        (d) => d.id === this.editingDeckId
      )
      this.showEditDeckModal = false
      this.editingDeckId = null
      this.editingDeckName = ''
      if (wasMhDeck) await this.loadMHDecks()
      else await this.loadDecks()
    },
    async renameDeck(id, newName) {
      if (!this.$ygoDb || !newName.trim()) return
      await this.$ygoDb.updateDeck(id, newName.trim())
      await this.loadDecks()
    },

    async deleteDeck(id) {
      if (!this.$ygoDb) return
      if (this.selectedDeckId === id) {
        this.selectedDeckId = null
        this.selectedDeckCards = []
        this.centerColumnView = 'decks'
      }
      await this.$ygoDb.deleteDeck(id)
      await this.loadDecks()
    },

    // -------- Monster Hunter Decks --------
    async loadMHDecks() {
      if (!this.$ygoDb) return
      this.mhUserDecks = await this.$ygoDb.getDecks('monsterhunter')
    },

    async createDeck() {
      if (!this.$ygoDb || !this.newDeckName.trim()) return
      const game = this.newDeckGame || 'yugioh'
      const id = await this.$ygoDb.createDeck(this.newDeckName.trim(), game)
      this.newDeckName = ''
      this.showNewDeckModal = false
      if (game === 'monsterhunter') {
        await this.loadMHDecks()
        this.mhSelectedDeckId = id
        await this.loadMHDeckCards()
        this.mhCenterColumnView = 'deck-cards'
      } else {
        await this.loadDecks()
      }
    },

    async selectMhDeck(deck) {
      this.mhSelectedDeckId = deck.id
      await this.loadMHDeckCards()
      this.mhCenterColumnView = 'deck-cards'
    },

    goBackToMhDeckList() {
      this.mhCenterColumnView = 'decks'
    },

    openEditMhDeckModal(deck) {
      this.editingDeckId = deck.id
      this.editingDeckName = deck.name || ''
      this.showEditDeckModal = true
    },

    async deleteMhDeck(id) {
      if (!this.$ygoDb) return
      if (this.mhSelectedDeckId === id) {
        this.mhSelectedDeckId = null
        this.mhSelectedDeckCards = []
        this.editingMhDeckCardId = null
        this.snapshotMhAtLoad = null
        this.mhCenterColumnView = 'decks'
      }
      await this.$ygoDb.deleteDeck(id)
      await this.loadMHDecks()
    },

    async loadMHDeckCards() {
      if (!this.$ygoDb || !this.mhSelectedDeckId) return
      const items = await this.$ygoDb.getDeckCards(this.mhSelectedDeckId)
      this.mhSelectedDeckCards = items || []
      this.pendingDeckRemovesMh = []
    },

    async saveOrAddMhCard() {
      if (!this.mhSelectedDeckId) return
      if (this.editingMhDeckCardId) {
        await this.saveMhDeckCardChanges()
      } else {
        this.addCurrentMHToDeckPending()
      }
    },

    addCurrentMHToDeckPending() {
      if (!this.mhSelectedDeckId) return
      const snapshot = this.getCurrentMHCardSnapshot()
      const name = this.mhTitle?.trim() || 'Card MH'
      const pid = `pending_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`
      const maxOrder = Math.max(
        -1,
        ...this.mhSelectedDeckCards.map((c) =>
          c.sort_order != null ? c.sort_order : -1
        )
      )
      this.mhSelectedDeckCards.push({
        id: pid,
        deck_id: this.mhSelectedDeckId,
        name,
        sort_order: maxOrder + 1,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      })
      this.editingMhDeckCardId = pid
      this.snapshotMhAtLoad = JSON.parse(JSON.stringify(snapshot))
      this.mhDeckEditLock = true
    },

    async saveMhDeckCardChanges() {
      if (!this.editingMhDeckCardId) return
      const snapshot = this.getCurrentMHCardSnapshot()
      const name = this.mhTitle?.trim() || 'Card MH'
      const current = this.mhSelectedDeckCards.find(
        (c) => c.id === this.editingMhDeckCardId
      )
      if (!current) return
      const groupId = current.copyGroupId || current.id
      const toUpdate = this.mhSelectedDeckCards.filter(
        (c) => (c.copyGroupId || c.id) === groupId
      )
      if (String(this.editingMhDeckCardId).startsWith('pending_')) {
        for (const item of toUpdate) {
          item.name = name
          item.snapshot = JSON.parse(JSON.stringify(snapshot))
        }
      } else {
        for (const item of toUpdate) {
          if (!String(item.id).startsWith('pending_')) {
            await this.$ygoDb.updateDeckCard(item.id, { name, snapshot })
          }
          item.name = name
          item.snapshot = JSON.parse(JSON.stringify(snapshot))
        }
      }
      this.snapshotMhAtLoad = JSON.parse(JSON.stringify(snapshot))
    },

    loadMhDeckCardForEdit(item) {
      this.loadFromMHSnapshot(item.snapshot || {})
      this.editingMhDeckCardId = item.id
      this.snapshotMhAtLoad = JSON.parse(JSON.stringify(item.snapshot || {}))
      this.mhDeckEditLock = true
    },

    async ensureMhAllCardsLoaded() {
      if (this.mhAllCardsFromDb.length > 0 || !this.$ygoDb) return
      const list = await this.$ygoDb.getDeckCardsByGame('monsterhunter')
      this.mhAllCardsFromDb = list || []
    },

    selectMhCardFromSearch(card) {
      this.loadFromMHSnapshot(card.snapshot || {})
      this.editingMhDeckCardId = card.id
      this.snapshotMhAtLoad = JSON.parse(JSON.stringify(card.snapshot || {}))
      this.mhDeckEditLock = true
      if (card.deck_id) {
        this.loadMHDecks().then(() => {
          this.mhSelectedDeckId = card.deck_id
          this.loadMHDeckCards()
        })
      }
    },

    unlockMhDeckEdit() {
      this.mhDeckEditLock = false
    },

    removeOneFromMhDeck() {
      if (!this.mhSelectedDeckId || !this.editingMhDeckCardId) return
      const current = this.mhSelectedDeckCards.find(
        (c) => c.id === this.editingMhDeckCardId
      )
      if (!current) return
      const id = this.editingMhDeckCardId
      const groupId = current.copyGroupId || current.id
      if (String(id).startsWith('pending_')) {
        const idx = this.mhSelectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.mhSelectedDeckCards.splice(idx, 1)
      } else {
        this.pendingDeckRemovesMh.push(id)
        const idx = this.mhSelectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.mhSelectedDeckCards.splice(idx, 1)
      }
      const remaining = this.mhSelectedDeckCards.filter(
        (c) => (c.copyGroupId || c.id) === groupId
      )
      if (remaining.length === 0) {
        this.editingMhDeckCardId = null
        this.snapshotMhAtLoad = null
        this.mhDeckEditLock = false
        this.loadNewMHCard()
      } else {
        this.loadMhDeckCardForEdit(remaining[0])
      }
    },

    addCopyToMhDeck() {
      if (!this.mhSelectedDeckId || !this.editingMhDeckCardId) return
      const current = this.mhSelectedDeckCards.find(
        (c) => c.id === this.editingMhDeckCardId
      )
      if (!current) return
      const snapshot = this.getCurrentMHCardSnapshot()
      const name = this.mhTitle?.trim() || 'Card MH'
      const copyGroupId = current.copyGroupId || current.id
      const sameGroup = this.mhSelectedDeckCards.filter(
        (c) => (c.copyGroupId || c.id) === copyGroupId
      )
      const insertAfter = sameGroup.length
        ? Math.max(
            ...sameGroup.map((c) => (c.sort_order != null ? c.sort_order : -1))
          )
        : -1
      const pid = `pending_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`
      this.mhSelectedDeckCards.push({
        id: pid,
        deck_id: this.mhSelectedDeckId,
        name,
        sort_order: insertAfter + 1,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        copyGroupId,
      })
      this.mhDeckEditLock = true
    },

    removeMhDeckCard(id) {
      if (String(id).startsWith('pending_')) {
        const idx = this.mhSelectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.mhSelectedDeckCards.splice(idx, 1)
      } else {
        this.pendingDeckRemovesMh.push(id)
        const idx = this.mhSelectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.mhSelectedDeckCards.splice(idx, 1)
      }
      if (this.editingMhDeckCardId === id) {
        this.editingMhDeckCardId = null
        this.snapshotMhAtLoad = null
        this.mhDeckEditLock = false
      }
    },

    async saveDeckStateMh() {
      if (!this.$ygoDb || !this.mhSelectedDeckId) return
      const payload = this.mhSelectedDeckCards.map((item, index) => ({
        id:
          item && item.id && !String(item.id).startsWith('pending_')
            ? String(item.id)
            : undefined,
        card_id: null,
        sort_order: index,
        name: item.name,
        snapshot: JSON.parse(JSON.stringify(item.snapshot || {})),
        copyGroupId: item.copyGroupId,
      }))
      await this.$ygoDb.replaceDeckCards(this.mhSelectedDeckId, payload)
      await this.loadMHDeckCards()
      this.pendingDeckRemovesMh = []
    },

    discardDeckStateMh() {
      this.pendingDeckRemovesMh = []
      this.loadMHDeckCards()
    },

    async loadSilhouetteCardSizeOptions() {
      if (
        typeof window === 'undefined' ||
        !window.silhouette ||
        !window.silhouette.getCardSizeOptions
      )
        return
      try {
        this.silhouetteCardSizeOptions =
          (await window.silhouette.getCardSizeOptions()) || []
      } catch (_) {
        this.silhouetteCardSizeOptions = []
      }
    },

    openSilhouetteModal() {
      this.loadSilhouetteCardSizeOptions()
      this.showSilhouetteModal = true
    },

    openYgoDownloadModal() {
      this.ygoDownloadFormat = 'png'
      this.showYgoDownloadModal = true
    },

    openYgoHandTestModal() {
      this.drawYgoTestHand()
      this.showYgoHandTestModal = true
    },

    async openYgoHandTestCard(item) {
      if (!item) return
      this.showYgoHandTestModal = false
      await this.doLoadDeckCardForEdit(item)
    },

    async copyYgoHandTestNames() {
      if (!this.ygoHandTestCards.length) return
      const text = this.ygoHandTestCards
        .map((item, index) =>
          index === 5
            ? `${item.name || 'Card'} (Compra do turno)`
            : item.name || 'Card'
        )
        .join('\n')
      try {
        await navigator.clipboard.writeText(text)
        if (this.$bvToast) {
          this.$bvToast.toast('Nomes copiados.', { variant: 'success' })
        }
      } catch (_) {
        if (this.$bvToast) {
          this.$bvToast.toast('Não foi possível copiar.', {
            variant: 'danger',
          })
        }
      }
    },

    drawYgoTestHand() {
      const source = Array.isArray(this.mainDeckCards) ? this.mainDeckCards : []
      if (!source.length) {
        this.ygoHandTestCards = []
        return
      }
      const shuffled = [...source]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      this.ygoHandTestCards = shuffled.slice(0, Math.min(6, shuffled.length))
    },

    async confirmYgoDownload() {
      if (this.ygoDownloadFormat === 'png') {
        await this.batchDownloadDeck()
      } else {
        await this.downloadSilhouetteDeck()
      }
      this.showYgoDownloadModal = false
    },

    async openMhDownloadModal(deck) {
      this.mhDownloadDeck = deck
      this.mhDownloadFormat = 'png'
      this.mhDownloadSilhouettePaper = 'a4'
      this.mhDownloadCardSize = 'japanese'
      await this.loadSilhouetteCardSizeOptions()
      this.showMhDownloadModal = true
    },

    async confirmMhDownload() {
      if (!this.mhDownloadDeck) return
      try {
        if (this.mhDownloadFormat === 'png') {
          await this.downloadMhDeckAsPng(this.mhDownloadDeck)
        } else {
          await this.downloadMhDeckAsSilhouette(this.mhDownloadDeck)
        }
      } finally {
        this.showMhDownloadModal = false
        this.mhDownloadDeck = null
      }
    },

    async downloadMhDeckAsPng(deck) {
      if (!this.$ygoDb || !deck || !deck.id) return
      this.mhDeckDownloading = deck.id
      const prevTab = this.activeTab
      this.activeTab = 1
      await this.$nextTick()
      await new Promise((r) => setTimeout(r, 300))
      try {
        const cards = await this.$ygoDb.getDeckCards(deck.id)
        const sorted = [...(cards || [])].sort((a, b) => {
          const na = (a.name || a.snapshot?.mhTitle || '').trim().toLowerCase()
          const nb = (b.name || b.snapshot?.mhTitle || '').trim().toLowerCase()
          return na.localeCompare(nb, 'pt')
        })
        const zip = new JSZip()
        const payload = {
          name: deck.name,
          game: 'monsterhunter',
          exportedAt: new Date().toISOString(),
          cards: sorted.map((c) => ({
            id: c.id,
            name: c.name,
            snapshot: c.snapshot,
          })),
        }
        zip.file('deck.json', JSON.stringify(payload, null, 2))
        for (let i = 0; i < sorted.length; i++) {
          const card = sorted[i]
          this.loadFromMHSnapshot(card.snapshot || {})
          await this.$nextTick()
          await new Promise((r) => setTimeout(r, 150))
          const wrap = this.$refs.mhPreviewWrap
          if (wrap) {
            const canvas = await html2canvas(wrap, { scale: 2, useCORS: true })
            const base64 = canvas
              .toDataURL('image/png')
              .replace(/^data:image\/png;base64,/, '')
            const fname = `${this.sanitizeFilename(card.name || 'card')}_${
              i + 1
            }.png`
            zip.file(fname, base64, { base64: true })
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = zipUrl
        a.download = `${this.sanitizeFilename(deck.name)}.zip`
        a.click()
        URL.revokeObjectURL(zipUrl)
      } catch (err) {
        console.error(err)
        this.$bvToast &&
          this.$bvToast.toast(err.message || 'Erro ao gerar imagens.', {
            variant: 'danger',
          })
      } finally {
        this.mhDeckDownloading = null
        this.activeTab = prevTab
      }
    },

    async downloadMhDeckAsSilhouette(deck) {
      if (!this.$ygoDb || !deck || !deck.id) return
      if (typeof window === 'undefined' || !window.silhouette) {
        this.$bvToast &&
          this.$bvToast.toast(
            'Exportação Silhuete disponível apenas no app desktop.',
            { variant: 'warning' }
          )
        return
      }
      this.mhDeckDownloading = deck.id
      const prevTab = this.activeTab
      this.activeTab = 1
      await this.$nextTick()
      await new Promise((r) => setTimeout(r, 300))
      try {
        const cards = await this.$ygoDb.getDeckCards(deck.id)
        const sorted = [...(cards || [])].sort((a, b) => {
          const na = (a.name || a.snapshot?.mhTitle || '').trim().toLowerCase()
          const nb = (b.name || b.snapshot?.mhTitle || '').trim().toLowerCase()
          return na.localeCompare(nb, 'pt')
        })
        const images = []
        for (let i = 0; i < sorted.length; i++) {
          const card = sorted[i]
          this.loadFromMHSnapshot(card.snapshot || {})
          await this.$nextTick()
          await new Promise((r) => setTimeout(r, 150))
          const wrap = this.$refs.mhPreviewWrap
          if (wrap) {
            const canvas = await html2canvas(wrap, { scale: 2, useCORS: true })
            const base64 = canvas
              .toDataURL('image/png')
              .replace(/^data:image\/png;base64,/, '')
            const mhCardType =
              (card.snapshot && card.snapshot.mhCardType) || 'time-01'
            images.push({ base64, backImageType: mhCardType })
          }
        }
        const { pdfBase64, templateFileName, templateBase64 } =
          await window.silhouette.generatePdf({
            images,
            cardSize: this.mhDownloadCardSize,
            paperSize: this.mhDownloadSilhouettePaper,
            cardsTouch: this.mhDownloadCardsTouch,
            includeImages: this.mhDownloadIncludeImages,
          })
        const zip = new JSZip()
        const baseName = this.sanitizeFilename(deck.name)
        zip.file(`${baseName}.pdf`, pdfBase64, { base64: true })
        if (templateBase64 && templateFileName) {
          zip.file(templateFileName, templateBase64, { base64: true })
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = zipUrl
        a.download = `${baseName}-silhuete.zip`
        a.click()
        URL.revokeObjectURL(zipUrl)
      } catch (err) {
        console.error(err)
        this.$bvToast &&
          this.$bvToast.toast(
            err.message || 'Erro ao gerar PDF para Silhuete.',
            { variant: 'danger' }
          )
      } finally {
        this.mhDeckDownloading = null
        this.activeTab = prevTab
      }
    },

    async loadDeckCards() {
      if (!this.$ygoDb || !this.selectedDeckId) return
      const items = await this.$ygoDb.getDeckCards(this.selectedDeckId)
      this.selectedDeckCards = (items || []).map((item) => {
        const baseCard = this.localCards.find(
          (c) => String(c.id) === String(item.cardKey)
        )
        return {
          ...item,
          name: this.getPreferredLocalizedCardName(baseCard) || item.name,
          snapshot: item.snapshot || {},
        }
      })
      this.pendingDeckRemovesYgo = []
      this.selectedDeckCards.forEach((item) =>
        this.ensureDeckCardImageUrl(item)
      )
    },

    async removeDeckCard(id) {
      if (String(id).startsWith('pending_')) {
        const idx = this.selectedDeckCards.findIndex((c) => c.id === id)
        if (idx !== -1) this.selectedDeckCards.splice(idx, 1)
        if (this.editingDeckCardId === id) {
          this.setYgoEditorState('base', { editingDeckCardId: null })
          this.snapshotAtLoad = null
        }
        this.$delete(this.deckCardImageUrls, id)
        await this.saveDeckStateYgo()
        return
      }
      this.pendingDeckRemovesYgo.push(id)
      const idx = this.selectedDeckCards.findIndex((c) => c.id === id)
      if (idx !== -1) this.selectedDeckCards.splice(idx, 1)
      if (this.editingDeckCardId === id) {
        this.setYgoEditorState('base', { editingDeckCardId: null })
        this.snapshotAtLoad = null
      }
      this.$delete(this.deckCardImageUrls, id)
      await this.saveDeckStateYgo()
    },

    async saveDeckStateYgo() {
      if (!this.$ygoDb || !this.selectedDeckId) return
      const payload = this.selectedDeckCards.map((item, index) =>
        this.normalizeDeckItemForPersistence(item, index)
      )
      await this.$ygoDb.replaceDeckCards(this.selectedDeckId, payload)
      await this.loadDeckCards()
      this.pendingDeckRemovesYgo = []
    },

    discardDeckStateYgo() {
      this.pendingDeckRemovesYgo = []
      this.loadDeckCards()
    },

    getDeckCardImageSrc(item) {
      const key = String(item?.cardKey || '')
      const deckCardCacheKey = String(item?.id || key)
      if (this.cardPreviewUrls[key]) {
        return this.cardPreviewUrls[key]
      }
      if (item?.snapshot?.fullart && this.apiCardFullArtUrls[key]) {
        return this.apiCardFullArtUrls[key]
      }
      if (this.deckCardImageUrls[deckCardCacheKey]) {
        return this.deckCardImageUrls[deckCardCacheKey]
      }
      const bundledThumbUrl = this.getBundledThumbArtUrl(String(key), 'webp')
      if (bundledThumbUrl) {
        return bundledThumbUrl
      }
      const bundledCanvasUrl = this.getBundledCanvasArtUrl(String(key), 'webp')
      if (bundledCanvasUrl) {
        return bundledCanvasUrl
      }
      if (this.apiCardImageUrls[key]) {
        return this.apiCardImageUrls[key]
      }
      return (
        this.deckCardImageUrls[deckCardCacheKey] ||
        this.apiCardImageUrls[key] ||
        null
      )
    },

    async ensureDeckCardImageUrl(item) {
      const key = String(item?.cardKey || '')
      const deckCardCacheKey = String(item?.id || key)
      if (this.cardPreviewUrls[key]) {
        this.$set(
          this.deckCardImageUrls,
          deckCardCacheKey,
          this.cardPreviewUrls[key]
        )
        return this.cardPreviewUrls[key]
      }
      if (item?.snapshot?.fullart) {
        const fullArtUrl = await this.ensureFullArtImage(key, false)
        if (fullArtUrl) {
          this.$set(this.deckCardImageUrls, deckCardCacheKey, fullArtUrl)
          this.$set(this.fullArtPresenceCache, key, true)
          return fullArtUrl
        }
      }
      if (this.deckCardImageUrls[deckCardCacheKey]) {
        return this.deckCardImageUrls[deckCardCacheKey]
      }
      if (this.$ygoDb) {
        try {
          const hasPreviewImage = await this.$ygoDb.hasCardPreviewImage(key)
          if (hasPreviewImage) {
            const blob = await this.$ygoDb.getCardPreviewImage(key)
            if (blob) {
              const url = URL.createObjectURL(blob)
              this.$set(this.cardPreviewUrls, key, url)
              this.$set(this.deckCardImageUrls, deckCardCacheKey, url)
              return url
            }
          }
        } catch (_) {}
      }
      const bundledThumbUrl = this.getBundledThumbArtUrl(String(key), 'webp')
      if (bundledThumbUrl) {
        this.$set(this.deckCardImageUrls, deckCardCacheKey, bundledThumbUrl)
        return bundledThumbUrl
      }
      const bundledCanvasUrl = this.getBundledCanvasArtUrl(String(key), 'webp')
      if (bundledCanvasUrl) {
        this.$set(this.deckCardImageUrls, deckCardCacheKey, bundledCanvasUrl)
        return bundledCanvasUrl
      }
      if (this.apiCardImageUrls[key]) {
        this.$set(
          this.deckCardImageUrls,
          deckCardCacheKey,
          this.apiCardImageUrls[key]
        )
        return this.apiCardImageUrls[key]
      }
      const blob = await this.$ygoDb.getCardImage(key)
      if (blob) {
        const url = URL.createObjectURL(blob)
        this.$set(this.deckCardImageUrls, deckCardCacheKey, url)
        return url
      }
      const card = this.localCards.find((c) => String(c.id) === key)
      const img = card?.card_images?.[0]
      const imgUrl = img ? this.getCanvasImageUrl(img, key) : null
      if (imgUrl) {
        await this.ensureCardImage(key, imgUrl, { forCurrentCard: false })
        if (this.apiCardImageUrls[key]) {
          this.$set(
            this.deckCardImageUrls,
            deckCardCacheKey,
            this.apiCardImageUrls[key]
          )
          return this.apiCardImageUrls[key]
        }
      }
      return null
    },

    // -------- Tradução --------

    sanitizeFilename(s) {
      return (
        (s || '')
          .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '')
          .replace(/\s+/g, ' ')
          .trim() || 'card'
      )
    },
    async batchDownloadDeck() {
      if (!this.selectedDeckCards.length || !this.selectedDeck) return
      this.batchDownloading = true
      const saveState = {
        snapshot: this.getCurrentCardSnapshot(),
        cardKey: this.cardKey,
        cardLang: this.cardLang,
      }
      this._exportingCard = true
      const zip = new JSZip()
      try {
        const ordered = this.sortedSelectedDeckCards
        for (let i = 0; i < ordered.length; i++) {
          const entry = ordered[i]
          const imgUrl = await this.getExportImageUrlForBatch(entry.cardKey)
          if (imgUrl)
            await this.ensureCardImage(entry.cardKey, imgUrl, {
              forCurrentCard: false,
            })
          this.loadFromSnapshot(entry.snapshot)
          this.cardKey = entry.cardKey
          if (entry.snapshot.fullart)
            await this.ensureFullArtImage(entry.cardKey, false)
          const url =
            (entry.snapshot.fullart &&
              this.apiCardFullArtUrls[entry.cardKey]) ||
            this.apiCardImageUrls[entry.cardKey] ||
            imgUrl
          await this.$nextTick()
          await new Promise((resolve) => {
            this._drawCardOnDrawn = resolve
            this.drawCard(url)
          })
          await this.$nextTick()
          await new Promise((resolve) => requestAnimationFrame(resolve))
          const canvas = this.$refs.yugiohcard
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png')
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
            const fname = `${this.sanitizeFilename(entry.name)}_${
              entry.cardKey
            }.png`
            zip.file(fname, base64, { base64: true })
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = zipUrl
        a.download = `${this.sanitizeFilename(this.selectedDeck.name)}.zip`
        a.click()
        URL.revokeObjectURL(zipUrl)
      } finally {
        this._exportingCard = false
        this.batchDownloading = false
        this.loadFromSnapshot(saveState.snapshot)
        this.cardKey = saveState.cardKey
        this.cardLang = saveState.cardLang
        this.drawCard()
      }
    },

    async downloadSilhouetteDeck() {
      if (
        !this.selectedDeckCards.length ||
        !this.selectedDeck ||
        !window.silhouette
      )
        return
      this.silhouetteDownloading = true
      this.showSilhouetteModal = false
      const saveState = {
        snapshot: this.getCurrentCardSnapshot(),
        cardKey: this.cardKey,
        cardLang: this.cardLang,
      }
      this._exportingCard = true
      try {
        const images = []
        const ordered = this.sortedSelectedDeckCards
        for (let i = 0; i < ordered.length; i++) {
          const entry = ordered[i]
          const imgUrl = await this.getExportImageUrlForBatch(entry.cardKey)
          if (imgUrl)
            await this.ensureCardImage(entry.cardKey, imgUrl, {
              forCurrentCard: false,
            })
          this.loadFromSnapshot(entry.snapshot)
          this.cardKey = entry.cardKey
          if (entry.snapshot.fullart)
            await this.ensureFullArtImage(entry.cardKey, false)
          const url =
            (entry.snapshot.fullart &&
              this.apiCardFullArtUrls[entry.cardKey]) ||
            this.apiCardImageUrls[entry.cardKey] ||
            imgUrl
          await this.$nextTick()
          await new Promise((resolve) => {
            this._drawCardOnDrawn = resolve
            this.drawCard(url)
          })
          await this.$nextTick()
          await new Promise((resolve) => requestAnimationFrame(resolve))
          const canvas = this.$refs.yugiohcard
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png')
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
            images.push({ base64 })
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        const { pdfBase64, templateFileName, templateBase64 } =
          await window.silhouette.generatePdf({
            images,
            cardSize: this.silhouetteCardSize,
            paperSize: this.silhouettePaperSize,
            cardsTouch: this.silhouetteCardsTouch,
            includeImages: this.silhouetteIncludeImages,
          })
        const baseName = this.sanitizeFilename(this.selectedDeck.name)
        const zip = new JSZip()
        // PDF pronto para impressão dentro do ZIP
        zip.file(`${baseName}.pdf`, pdfBase64, { base64: true })
        // Arquivo de corte para a Silhouette — mesmo ZIP
        if (templateBase64 && templateFileName) {
          zip.file(templateFileName, templateBase64, { base64: true })
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const aZip = document.createElement('a')
        aZip.href = zipUrl
        aZip.download = `${baseName}-silhuete.zip`
        aZip.click()
        URL.revokeObjectURL(zipUrl)
      } catch (err) {
        console.error(err)
        this.$bvToast &&
          this.$bvToast.toast(
            err.message || 'Erro ao gerar PDF para Silhuete.',
            { variant: 'danger' }
          )
      } finally {
        this._exportingCard = false
        this.silhouetteDownloading = false
        this.loadFromSnapshot(saveState.snapshot)
        this.cardKey = saveState.cardKey
        this.cardLang = saveState.cardLang
        this.drawCard()
      }
    },

    async getExportImageUrlForBatch(cardKey) {
      const bundledUrl = this.getBundledCanvasArtUrl(cardKey, 'webp')
      if (bundledUrl) return bundledUrl
      const card = this.localCards.find((c) => String(c.id) === cardKey)
      const img = card?.card_images?.[0]
      const localCardUrl = img ? this.getCanvasImageUrl(img, cardKey) : null
      if (this.$ygoDb) {
        const blob = await this.$ygoDb.getCardImage(cardKey)
        if (blob) {
          const blobUrl = URL.createObjectURL(blob)
          try {
            const probe = await this.loadCanvasImage(blobUrl)
            const width = probe?.naturalWidth || probe?.width || 0
            const height = probe?.naturalHeight || probe?.height || 0
            const looksLikeRenderedCard = width === 1000 && height === 1450
            if (!looksLikeRenderedCard) return blobUrl
          } catch (_) {}
          this.revokeBlobUrl(blobUrl)
        }
      }
      return localCardUrl
    },

    // Carregar dados do YGOPRO2 (local) ou da API YGOPRODeck (cache).
    load_ygopro_data(key) {
      const data = this.localCardsMap[key] || this.apiCardCache[key]
      if (!data) return false
      const card = this.localCards.find((c) => String(c.id) === key)
      this.cardLang = (card && card.lang) || 'pt'
      this.loadFromSnapshot(data)
      this.refreshHasCardFullArt()
      return true
    },

    loadFromSnapshot(data) {
      this.programmaticUpdate = true
      const typeArr = Array.isArray(data.type) ? data.type : []
      this.cardRare = data.rare
      this.titleColor = data.color
      this.cardTitle = data.title
      this.cardImg = null
      this.cardType = typeArr[0] ?? 'Monster'
      this.cardSubtype = typeArr[1] ?? 'Normal'
      if (data.attribute !== 'Trap' && data.attribute !== 'Spell')
        this.cardAttr = data.attribute
      this.cardEff1 = typeArr[2] ?? 'normal'
      this.cardEff2 = typeArr[3] ?? 'none'
      this.cardCustomRaceEnabled = false
      this.cardCustomRace = ''
      this.cardRace = data.race
      this.Pendulum = typeArr[4] ?? false
      this.Special = typeArr[5] ?? false
      this.cardLevel = data.level
      this.cardBLUE = data.blue
      this.cardRED = data.red
      this.cardATK =
        data.atk === -1 || data.atk === '-1' ? '?' : data.atk ?? '0'
      this.cardDEF =
        data.def === -1 || data.def === '-1' ? '?' : data.def ?? '0'
      for (let i = 1; i <= 9; i++)
        if (i !== 5) this.links[i].val = Boolean(data[`link${i}`])
      this.cardInfo = data.infoText
      this.infoSize = data.size
      this.infoPosition =
        data.infoPosition != null ? Number(data.infoPosition) : 5
      this.cardPendulumInfo = data.pendulumText
      this.pendulumSize = data.pSize
      this.fullart = data.fullart === true
      setTimeout(() => {
        this.programmaticUpdate = false
      }, 650)
      if (this.fullart && this.cardKey) this.refreshHasCardFullArt()
    },

    // Quando a página é rolada.
    onScroll() {
      const currentScrollPosition =
        window.pageYOffset || document.documentElement.scrollTop
      this.pageScrolling = currentScrollPosition
    },

    // Efeito 3D - Movimento.
    move(e) {
      const THRESHOLD = 5
      const cardWrap = this.$refs['yugiohcard-wrap']
      const { clientX, clientY, currentTarget } = e
      const { clientWidth, clientHeight, offsetLeft, offsetTop } = currentTarget

      const horizontal = (clientX - offsetLeft) / clientWidth
      const vertical = (clientY - offsetTop) / clientHeight

      const rotateX = (THRESHOLD / 2 - horizontal * THRESHOLD).toFixed(2)
      const rotateY = (vertical * THRESHOLD - THRESHOLD / 2).toFixed(2)

      cardWrap.style.transform = `perspective(${clientWidth}px) rotateX(${rotateY}deg) rotateY(${rotateX}deg) scale3d(1, 1, 1)`
    },

    // Efeito 3D - Saindo.
    leave(e) {
      const cardWrap = this.$refs['yugiohcard-wrap']
      cardWrap.style.transform = `perspective(${e.currentTarget.clientWidth}px) rotateX(0deg) rotateY(0deg)`
    },
  },
}
</script>

<style>
/* fonte convertida usando font-converter.net. Obrigado! */

.preloadfont {
  font-family: YourFont;
  opacity: 0;
  height: 0;
  width: 0;
  display: inline-block;
}

:root {
  --chevron-down-svg-path: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'%3E%3Cpath fill='%23CCC' d='M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z'%3E%3C/path%3E%3C/svg%3E");
}

body {
  background: url('../../../static/ygo-bg.png') center center / cover no-repeat
    fixed;
  font-family: 'Noto Sans JP', 'Noto Sans TC', 'Noto Sans SC', 'arial',
    '微軟正黑體';
  /* Cada coluna tem seu próprio scroll; evitamos scroll global da página */
  overflow: hidden;
}

/* Textos azuis → preto (Bootstrap primary, links, btn-link) */
#app .text-primary,
#app .btn-link,
#app a {
  color: #000 !important;
}
#app .btn-link:hover,
#app a:hover {
  color: #000 !important;
  opacity: 0.85;
}

/* Textos muito claros (muted/secondary) que não davam pra ler → preto. Labels/legendas acima dos campos ficam brancos (herdam do painel). */
#app .text-muted,
#app .text-secondary {
  color: #000 !important;
}
#app .text-muted:hover,
#app .text-secondary:hover {
  color: #000 !important;
}

/* Placeholder: cor única em todo o sistema */
#app input::placeholder,
#app textarea::placeholder {
  color: #c0bebb;
}
#app input::-webkit-input-placeholder,
#app textarea::-webkit-input-placeholder {
  color: #c0bebb;
}
#app input::-moz-placeholder,
#app textarea::-moz-placeholder {
  color: #c0bebb;
  opacity: 1;
}
#app input:-ms-input-placeholder,
#app textarea:-ms-input-placeholder {
  color: #c0bebb;
}

/* Abas de jogos (Yugioh, Monster Hunter): ativa = branco/preto; inativas = glass + texto branco */
#app .main-game-tabs .nav-tabs .nav-link {
  border-radius: 0.5rem 0.5rem 0 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-right: 4px;
}
#app .main-game-tabs .nav-tabs .nav-link:not(.active) {
  background: rgba(40, 44, 52, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
#app .main-game-tabs .nav-tabs .nav-link:not(.active):hover {
  background: rgba(50, 55, 65, 0.6);
  color: #fff !important;
}
#app .main-game-tabs .nav-tabs .nav-link.active {
  background: #fff !important;
  color: #000 !important;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

/* -------------------- Layout 3 colunas (altura total) -------------------- */
html,
body,
#app {
  height: 100%;
  min-height: 100%;
}
#app {
  display: flex;
  flex-direction: column;
}
.main-fullheight {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tabs-fullheight {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-content-fullheight {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-content-fullheight .tab-pane {
  flex: 1;
  min-height: 0;
  display: none;
  flex-direction: column;
}
.tab-content-fullheight .tab-pane.active {
  display: flex !important;
}
.row-three-cols {
  padding: 0 16px;
  flex: 1;
  min-height: 0;
  max-height: 100%;
  display: flex;
  align-items: stretch;
  /* colunas ocupam tudo, espaço controlado por gap */
  justify-content: space-between;
  column-gap: 16px;
}
.col-panel {
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}
/* Colunas 1 e 3: canvas e form. Aumente o 3º valor do clamp (máx.) para colunas mais largas. */
.row-three-cols > #card-panel,
.row-three-cols > #data-panel,
.row-three-cols > #mh-card-panel,
.row-three-cols > #mh-data-panel {
  flex: 0 1 clamp(420px, 30vw, 720px);
  min-width: 420px;
  max-width: clamp(420px, 30vw, 720px);
}
/*
  Agora a coluna do meio (#decks-panel) deve ocupar 90% do espaço restante,
  após as colunas dos forms/canvas (que são de 550px cada).
  Usar flex-basis como 0 e flex-grow como 0.9 para alcançar este comportamento.
*/
/*
  Para aumentar o tamanho de #decks-panel dentro de .row-three-cols,
  ajuste as propriedades de flex em vez de usar width fixa.
  Exemplo: aumenta o flex-grow para ocupar mais espaço disponível.
  Remova o width fixo se possível.
*/
.row-three-cols > #decks-panel,
.row-three-cols > #mh-decks-panel {
  /* Remova width fixa que pode ser sobrescrita pelo flexbox ou outros estilos */
  /* width: 1200px !important; */

  /* Faz a coluna central crescer até onde puder */
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
}

/*
  Se quiser ocupar ainda mais espaço relativo que as colunas laterais, aumente o flex-grow:
  Exemplo: flex: 3 1 0;
*/
.min-h-0 {
  min-height: 0;
}
.deck-cards-scroll {
  align-content: flex-start;
}

/* Colunas com scroll próprio */
.col-panel-inner {
  overflow-y: auto;
  min-height: 0;
  max-height: 100%;
}
#data-panel,
#mh-data-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  container-type: inline-size;
}
.decks-panel-inner,
#data-panel .panel-bg,
#mh-data-panel .panel-bg {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: visible;
  width: 100%;
  max-width: 100%;
}
#data-panel .tab-content,
#mh-data-panel .tab-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}
/* Abas inativas: não ocupam espaço (evita busca aparecer na coluna Criar/Editar) */
#data-panel .tab-pane:not(.active),
#mh-data-panel .tab-pane:not(.active) {
  display: none !important;
}
#data-panel .tab-pane,
#mh-data-panel .tab-pane {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: 100%;
}
#data-panel .tabs,
#data-panel .tab-content,
#mh-data-panel .tabs,
#mh-data-panel .tab-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: 100%;
}
#data-panel .tab-pane.active,
#mh-data-panel .tab-pane.active {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: 100%;
}
#data-panel .data-panel-tabs,
#mh-data-panel .data-panel-tabs {
  width: 100%;
  max-width: 100%;
}
#data-panel .nav-tabs,
#data-panel .alert,
#data-panel .search-panel-col,
#data-panel .my-3.mx-0,
#mh-data-panel .nav-tabs,
#mh-data-panel .alert,
#mh-data-panel .search-panel-col,
#mh-data-panel .my-3.mx-0 {
  flex-shrink: 0;
}
/* Aba Criar/Editar: ocupa toda a altura da coluna */
.ygo-create-edit-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* Coluna direita: área do form usa o espaço que sobra e rola */
.data-panel-editor-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding-right: 6px;
  overflow-y: auto;
  overflow-x: hidden;
}
/* Aba Busca: coluna com altura garantida e sem cortar o dropdown */
.search-tab-layout {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 400px;
  height: 100%;
}
/* Container da busca: NÃO usar overflow hidden para o dropdown do autocomplete aparecer */
.search-tab-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: visible;
}
/* Área de resultados: ocupa o resto e só ela rola */
.data-panel-search-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 200px;
  width: 100%;
  margin-top: 12px;
  padding-right: 6px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
.search-results-panel {
  display: block;
  flex: 0 0 auto;
}
.search-collapse-title {
  font-size: 1.8rem;
}
/* Grid preenche a largura; miniaturas crescem para ocupar o espaço */
.search-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 6px;
  align-content: start;
}
.data-panel-editor-scroll::-webkit-scrollbar {
  width: 10px;
}
.data-panel-search-scroll::-webkit-scrollbar {
  width: 10px;
}
.data-panel-editor-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}
.data-panel-search-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}
.data-panel-editor-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}
.data-panel-search-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}
.card-form-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding-right: 0;
  overflow: visible;
}
.data-panel-fieldset {
  display: block;
  min-height: auto;
  margin: 0;
  padding: 0;
  border: 0;
  width: 100%;
}

/* -------------------- Estilos de Bloco -------------------- */
header {
  font-family: 'en', 'zh';
  font-size: 1.5rem;
  line-height: 1.2rem;
}
nav {
  background-color: #2f2f2f;
}
/* Efeito glass nas colunas (backdrop blur + fundo semi-transparente) */
.panel-bg {
  background: rgba(40, 44, 52, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  color: #fff;
}
.form-faded {
  opacity: 0.65;
  pointer-events: none;
}

.deck-name-input,
.deck-name-input:focus {
  color: #121212 !important;
}

/* Painel de busca (aba Busca) */
.search-panel-col {
  position: relative;
  z-index: 1050;
}
.archetype-dropdown {
  z-index: 1060;
}

@container (max-width: 520px) {
  #data-panel .px-2[class*='col-lg-'],
  #data-panel .px-2[class*='col-xl-'],
  #mh-data-panel .px-2[class*='col-lg-'],
  #mh-data-panel .px-2[class*='col-xl-'] {
    flex: 0 0 100%;
    max-width: 100%;
  }

  #data-panel .my-3 table,
  #mh-data-panel .my-3 table {
    width: 100%;
  }
}

@media (max-height: 1080px) {
  .main-fullheight {
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }

  #data-panel .panel-bg,
  #card-panel .panel-bg,
  #decks-panel .panel-bg,
  #mh-data-panel .panel-bg,
  #mh-card-panel .panel-bg,
  #mh-decks-panel .panel-bg {
    padding: 1rem !important;
  }

  .card-deck-actions {
    margin-top: 0.75rem !important;
    padding-top: 0.75rem !important;
  }
}

@media (max-width: 1599.98px) {
  .row-three-cols > #card-panel,
  .row-three-cols > #data-panel,
  .row-three-cols > #mh-card-panel,
  .row-three-cols > #mh-data-panel {
    flex-basis: clamp(380px, 28vw, 460px);
    min-width: 380px;
    max-width: clamp(380px, 28vw, 460px);
  }
}

@media (max-width: 1279.98px) {
  .row-three-cols {
    flex-wrap: wrap;
    row-gap: 16px;
  }

  .row-three-cols > #card-panel,
  .row-three-cols > #decks-panel,
  .row-three-cols > #data-panel,
  .row-three-cols > #mh-card-panel,
  .row-three-cols > #mh-decks-panel,
  .row-three-cols > #mh-data-panel {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
  }
}

/* -------------------- Estilos de Área de Cartão -------------------- */
.padding-transition {
  transition: all 0.5s linear;
}
#yugiohcard-wrap {
  transition: transform 0.1s ease;
  transform-style: preserve-3d;
  will-change: transform;
  padding: 16px 12px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
#yugiohcard-wrap:hover #yugiohcard {
  transform: translateZ(12px);
}
#yugiohcard {
  transition: transform 0.3s ease;
  width: 90%;
  height: auto;
  max-height: 65vh;
}

.card-deck-actions {
  flex-shrink: 0;
}
.card-deck-actions .btn {
  min-width: 52px;
  min-height: 40px;
  font-size: 0.9rem;
  padding: 0.4rem 1rem;
}

/* -------------------- Estilos de Área de Entrada -------------------- */
/* Cor de fundo da Área de Entrada */
select,
textarea,
input,
.custom-file-label {
  background-color: #7777774a !important;
  color: #ccc !important;
  border: 0 !important;
}
/* Ícone do menu suspenso */
.custom-select {
  background-image: var(--chevron-down-svg-path);
}
/* Cor de fundo do menu suspenso */
select option {
  background: #666666;
  color: #fff;
}
/* Cor da caixa de seleção */
.checkbox-wrap {
  width: 100%;
}
.checkbox-wrap > label {
  width: 100%;
  text-align: left;
  border: none;
  color: #787878 !important;
  background-color: #7777774a !important;
}
.checkbox-wrap.active > label {
  color: #fff !important;
  background-color: #17a2b8 !important;
}
/* Botão de upload de arquivo */
.custom-file-label::after {
  content: '✚' !important;
  background-color: #787878 !important;
  color: #fff;
}
/* Thumbnails de busca */
.search-thumb {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.search-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: 2;
}
/* Cards de deck na lista (thumbnail = primeiro card, nome abaixo) */
.deck-card-item:hover .deck-card-thumb-wrap {
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
}
.deck-card-item {
  width: clamp(128px, 8vw, 156px);
  flex-shrink: 0;
}
.deck-card-thumb-wrap {
  width: 100%;
  aspect-ratio: 59 / 86;
  height: auto;
  min-height: 186px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.deck-card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.deck-card-thumb-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-size: 2rem;
}
.hand-test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: start;
}
.hand-test-card {
  width: 100%;
  min-width: 0;
}
.hand-test-card-thumb {
  width: 100%;
  aspect-ratio: 59 / 86;
  min-height: 204px;
  border: 2px solid rgba(255, 255, 255, 0.08);
}
.hand-test-draw-card .hand-test-card-thumb {
  border: 3px solid #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}
.hand-test-draw-label {
  color: #ff6b6b;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.hand-test-modal-content {
  background: #3A3632 !important;
}

/* Container do deck: sempre 10 colunas — cards redimensionam com a coluna */
.deck-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  align-content: start;
  min-height: 0;
}
/* Área da lista de cards do deck: scroll vertical quando não couber tudo */
.deck-sections-scroll {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.deck-section {
  min-width: 0;
}
.deck-section-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.deck-section-label-extra {
  color: #8fd6ff;
}
.deck-grid-extra {
  padding-bottom: 4px;
}
/* Thumbnails de deck */
.deck-thumb-wrap {
  cursor: pointer;
  transition: transform 0.15s;
  min-width: 0;
}
.deck-thumb-wrap:hover {
  transform: scale(1.08);
  z-index: 2;
}
.deck-thumb {
  width: 100%;
  height: auto;
  display: block;
}
/* MH deck thumbs na coluna central: herda o grid, sem override de tamanho */
.deck-thumb-active {
  outline: 2px solid #007bff;
  border-radius: 4px;
}
.deck-thumb-remove {
  display: none;
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 53, 69, 0.9);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  z-index: 3;
}
.deck-thumb-wrap:hover .deck-thumb-remove {
  display: block;
}
.deck-thumb-remove:hover {
  background: #dc3545;
}

/* Miniaturas de cards MH – dimensões via aspect-ratio, posicionamento % */
.mh-deck-thumb {
  width: 100%;
  aspect-ratio: 848 / 1264;
  background-size: cover;
  background-position: center;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 4px;
}
.mh-deck-thumb-title {
  position: absolute;
  top: 5%;
  left: 6%;
  right: 6%;
  font-family: 'EB Garamond', serif;
  font-size: clamp(6px, 1.2vw, 11px);
  font-weight: bold;
  color: #000;
  text-align: center;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 0 2px #fff, 0 0 3px #fff;
}
.mh-deck-thumb-desc {
  position: absolute;
  top: 18%;
  left: 6%;
  right: 6%;
  max-height: 30%;
  font-family: 'EB Garamond', serif;
  font-size: clamp(5px, 0.9vw, 8px);
  color: #222;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  text-shadow: 0 0 1px #fff;
}
.mh-deck-thumb-icon-wrap {
  position: absolute;
  bottom: 5%;
  right: 6%;
  width: 20%;
  height: 14%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mh-deck-thumb-icon {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
}

/* MH search results thumbnails */
.mh-search-thumb-wrap {
  flex: 0 0 72px;
  max-width: 72px;
  cursor: pointer;
  transition: transform 0.15s;
}
.mh-search-thumb-wrap:hover {
  transform: scale(1.08);
  z-index: 2;
}

/* Monster Hunter card preview */
.mh-card-preview {
  font-family: 'EB Garamond', serif;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.mh-text-box {
  font-family: 'EB Garamond', serif;
  color: #000;
  text-align: center;
  padding: 4px;
  box-sizing: border-box;
  word-wrap: break-word;
  display: table;
  width: 100%;
  height: 100%;
}
.mh-text-box .mh-text-inner {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
  white-space: pre-line;
  line-height: 1.25;
  margin: 0;
  padding: 0;
}
.mh-number-box .mh-text-inner {
  paint-order: stroke fill;
  -webkit-text-stroke: 3px #000;
  color: #fff;
  text-shadow: 0 0 2px #000;
  font-weight: bold;
}
.mh-inline-emoji {
  height: 1em;
  max-height: 1.2em;
  width: auto;
  vertical-align: middle;
  display: inline-block;
}
</style>
