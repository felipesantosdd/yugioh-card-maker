<template>
  <div id="app">
    <!-- Área do título -->

    <!-- Área de conteúdo principal -->
    <main class="container-fluid mt-5 mb-3 h-100 py-3 py-md-5 px-0 px-sm-5">
      <b-tabs v-model="activeTab" content-class="mt-3" class="px-2 px-sm-5">
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
          <!-- Busca por nome ou arquétipo -->
          <b-row class="mb-3 justify-content-center">
            <b-col cols="12" class="px-2 px-sm-5 search-panel-col">
              <div class="panel-bg shadow p-3">
                <b-row class="align-items-end">
                  <b-col cols="12" md="auto" class="mb-2 mb-md-0">
                    <label class="d-block mb-2">{{
                      ui[uiLang].search_cards
                    }}</label>
                    <b-form-radio-group
                      v-model="searchMode"
                      buttons
                      button-variant="outline-secondary"
                      size="sm"
                    >
                      <b-form-radio value="archetype">{{
                        ui[uiLang].search_by_archetype
                      }}</b-form-radio>
                      <b-form-radio value="name">{{
                        ui[uiLang].search_by_name
                      }}</b-form-radio>
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
                        v-model="searchByArchetype"
                        :placeholder="ui[uiLang].search_placeholder_archetype"
                        autocomplete="off"
                        @focus="showArchetypeDropdown = true"
                        @keyup.enter="
                          filteredArchetypes.length
                            ? selectArchetype(filteredArchetypes[0])
                            : searchCards()
                        "
                        @input="showArchetypeDropdown = true"
                        @blur="closeArchetypeDropdown"
                      />
                      <ul
                        v-if="
                          showArchetypeDropdown && searchByArchetype.length >= 1
                        "
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
                        v-model="searchByName"
                        :placeholder="ui[uiLang].search_placeholder_name"
                        autocomplete="off"
                        @focus="showNameDropdown = true"
                        @keyup.enter="
                          filteredCardsByName.length
                            ? selectCardFromName(filteredCardsByName[0])
                            : null
                        "
                        @input="showNameDropdown = true"
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
            </b-col>
          </b-row>

          <b-row class="h-100 justify-content-center align-content-center">
            <!-- Área de desenho do cartão -->
            <b-col
              id="card-panel"
              cols="12"
              md="6"
              lg="4"
              class="mt-3 mt-sm-5 mt-md-0"
            >
              <div
                :class="{
                  'padding-transition': true,
                  'sticky-top': true,
                  'pt-5': pageScrolling > 10,
                }"
              >
                <div
                  :class="{
                    'padding-transition': true,
                    'pt-5': pageScrolling > 10,
                  }"
                >
                  <div class="panel-bg shadow p-3">
                    <div
                      id="yugiohcard-wrap"
                      ref="yugiohcard-wrap"
                      class="card-body position-relative"
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
                  </div>
                </div>
              </div>
            </b-col>
            <!-- Área de dados do cartão -->
            <b-col
              id="data-panel"
              cols="12"
              md="6"
              lg="8"
              class="mt-3 mt-sm-5 mt-md-0"
            >
              <div class="panel-bg shadow p-3">
                <!-- Banner de campos bloqueados -->
                <div
                  v-if="isFieldsLocked"
                  class="
                    alert alert-info
                    py-2
                    mb-3
                    small
                    d-flex
                    align-items-center
                    justify-content-between
                  "
                >
                  <span>
                    <fa :icon="['fas', 'lock']" class="mr-1" />
                    {{
                      ui[uiLang].fields_locked ||
                      'Card do banco de dados (somente leitura). Adicione a um deck para editar.'
                    }}
                  </span>
                  <span>
                    <b-button
                      v-if="baseCardNeedsTranslation"
                      size="sm"
                      variant="warning"
                      class="mr-2"
                      @click="openTranslationModal"
                    >
                      <fa :icon="['fas', 'language']" class="mr-1" />
                      {{ ui[uiLang].translate || 'Traduzir' }}
                    </b-button>
                  </span>
                </div>
                <fieldset :disabled="isFieldsLocked">
                  <div class="card-body">
                    <!-- Autenticidade, Raridade, Cor -->
                    <b-row class="mb-3">
                      <!-- Etiqueta de autenticidade -->
                      <b-col cols="6" lg="3" class="px-2">
                        <div class="form-check px-0">
                          <label>{{ ui[uiLang].square_foil_stamp }}</label>
                          <b-form-checkbox
                            v-model="holo"
                            :class="{ 'checkbox-wrap': true, active: holo }"
                            button
                            >{{
                              holo ? ui[uiLang].on : ui[uiLang].off
                            }}</b-form-checkbox
                          >
                        </div>
                      </b-col>
                      <!-- Etiqueta de autenticação -->
                      <b-col cols="6" lg="3" class="px-2">
                        <label>{{ ui[uiLang].rarity }}</label>
                        <b-form-select
                          v-model="cardRare"
                          :options="cardRareOpts"
                        ></b-form-select>
                      </b-col>
                      <!-- Cor do nome do card -->
                      <b-col cols="6" lg="3" class="px-2">
                        <label>{{ ui[uiLang].title_color }}</label>
                        <b-form-input
                          v-model="titleColor"
                          type="color"
                        ></b-form-input>
                      </b-col>
                    </b-row>

                    <!-- Codigo do card -->
                    <b-row class="my-3">
                      <b-col cols="6" lg="4" class="px-2">
                        <div class="form-check px-0">
                          <label>{{ ui[uiLang].card_secret }}</label>
                          <b-form-checkbox
                            v-model="cardLoadYgoProEnabled"
                            :class="{
                              'checkbox-wrap': true,
                              active: cardLoadYgoProEnabled,
                            }"
                            button
                            >{{
                              ui[uiLang].auto_fill_card_data
                            }}</b-form-checkbox
                          >
                        </div>
                      </b-col>
                      <b-col cols="6" lg="8" class="px-2">
                        <label
                          ><small>{{
                            ui[uiLang].card_secret_note
                          }}</small></label
                        >
                        <b-form-input
                          v-model="cardKey"
                          type="number"
                          maxlength="8"
                          :placeholder="ui[uiLang].plz_input_card_secret"
                        />
                        <small v-if="apiCardLoading" class="text-muted">{{
                          ui[uiLang].search_loading
                        }}</small>
                        <small v-else-if="apiCardError" class="text-danger">{{
                          apiCardError
                        }}</small>
                      </b-col>
                    </b-row>

                    <!-- Nome do card -->
                    <b-row class="my-3">
                      <b-col class="px-2">
                        <label>{{ ui[uiLang].card_name }}</label>
                        <b-form-input v-model="cardTitle"></b-form-input>
                      </b-col>
                    </b-row>

                    <!-- Imagem do card -->
                    <b-row class="my-3">
                      <b-col class="px-2">
                        <b-form-file
                          v-model="cardImg"
                          :state="Boolean(cardImg)"
                          :placeholder="ui[uiLang].upload_image"
                          browse="✚"
                          accept="image/*"
                          :drop-placeholder="ui[uiLang].drag_and_drop"
                        ></b-form-file>
                      </b-col>
                    </b-row>

                    <!-- Tipo do card, Face do card, Efeito do card -->
                    <b-row class="my-3">
                      <!-- Tipo de card -->
                      <b-col cols="6" lg="3" class="px-2">
                        <label>{{ ui[uiLang].card_type }}</label>
                        <b-form-select
                          v-model="cardType"
                          :options="cardTypeOpts"
                        ></b-form-select>
                      </b-col>

                      <!-- Face do card -->
                      <b-col cols="6" lg="3" class="px-2">
                        <label>{{ ui[uiLang].card_subtype }}</label>
                        <b-form-select
                          v-model="cardSubtype"
                          :options="cardSubtypeOpts[cardType]"
                        ></b-form-select>
                      </b-col>

                      <!-- Efeito -->
                      <b-col
                        v-show="cardType === 'Monster'"
                        cols="6"
                        lg="3"
                        class="px-2"
                      >
                        <label>{{ ui[uiLang].card_effect }}</label>
                        <b-form-select
                          v-model="cardEff1"
                          :options="cardEff1Opts"
                        ></b-form-select>
                      </b-col>
                      <b-col
                        v-show="cardType === 'Monster'"
                        cols="6"
                        lg="3"
                        class="px-2"
                      >
                        <label>&emsp;</label>
                        <b-form-select
                          v-model="cardEff2"
                          :options="cardEff2Opts"
                        ></b-form-select>
                      </b-col>
                    </b-row>

                    <!-- Atributo, Tipo -->
                    <b-row v-show="cardType === 'Monster'" class="my-3">
                      <!-- 屬性 -->
                      <b-col cols="12" lg="6" class="px-2">
                        <label>{{ ui[uiLang].card_attribute }}</label>
                        <b-form-select
                          v-model="cardAttr"
                          :options="cardAttrOpts"
                        ></b-form-select>
                      </b-col>

                      <!-- Tipo de Card -->
                      <b-col
                        v-show="cardType === 'Monster'"
                        cols="6"
                        lg="3"
                        class="px-2"
                      >
                        <div class="form-check px-0">
                          <label>{{ ui[uiLang].card_race_type }}</label>
                          <b-form-checkbox
                            v-model="cardCustomRaceEnabled"
                            :class="{
                              'checkbox-wrap': true,
                              active: cardCustomRaceEnabled,
                            }"
                            button
                            >{{ ui[uiLang].custom }}</b-form-checkbox
                          >
                        </div>
                      </b-col>
                      <!-- Tipo - Seleção de Tipo -->
                      <b-col
                        v-show="!cardCustomRaceEnabled"
                        cols="6"
                        lg="3"
                        class="px-2"
                      >
                        <label>&emsp;</label>
                        <b-form-select
                          v-model="cardRace"
                          :options="cardRaceOpts"
                        ></b-form-select>
                      </b-col>
                      <!-- Tipo - Entrada Personalizada -->
                      <b-col
                        v-show="cardCustomRaceEnabled"
                        cols="6"
                        lg="3"
                        class="px-2"
                      >
                        <label>&emsp;</label>
                        <b-form-input
                          v-model="cardCustomRace"
                          type="text"
                          maxlength="8"
                          :placeholder="ui[uiLang].plz_input_race_type"
                        />
                      </b-col>
                    </b-row>

                    <!-- Balanço de Pêndulo, Invocação Especial, Nível -->
                    <b-row class="my-3">
                      <!-- Balanço de Pêndulo -->
                      <b-col
                        v-show="canPendulumEnabled"
                        cols="6"
                        lg="4"
                        class="px-2"
                      >
                        <div class="form-check px-0">
                          <label>&emsp;</label>
                          <b-form-checkbox
                            v-model="Pendulum"
                            :class="{ 'checkbox-wrap': true, active: Pendulum }"
                            button
                            >{{ ui[uiLang].pendulum }}</b-form-checkbox
                          >
                        </div>
                      </b-col>

                      <!-- Invocação Especial -->
                      <b-col
                        v-show="cardType === 'Monster'"
                        cols="6"
                        lg="4"
                        class="px-2"
                      >
                        <div class="form-check px-0">
                          <label>&emsp;</label>
                          <b-form-checkbox
                            v-model="Special"
                            :class="{ 'checkbox-wrap': true, active: Special }"
                            button
                            >{{ ui[uiLang].special_summon }}</b-form-checkbox
                          >
                        </div>
                      </b-col>

                      <!-- Nível -->
                      <b-col
                        v-show="cardType === 'Monster' && !isLinkMonster"
                        cols="12"
                        lg="4"
                        class="px-2"
                      >
                        <label>{{ ui[uiLang].lavel_and_rank }}</label>
                        <b-form-select
                          v-model="cardLevel"
                          :options="cardLevelOpts"
                        ></b-form-select>
                      </b-col>
                    </b-row>

                    <!-- Área de Efeito de Pêndulo -->
                    <b-row v-show="Pendulum" class="my-3">
                      <b-col cols="12">
                        <h4 class="text-light text-center">
                          {{ ui[uiLang].pendulum_area }}
                        </h4>
                      </b-col>
                      <b-col cols="12">
                        <b-row class="mb-3">
                          <b-col cols="4" class="px-2">
                            <label>{{ ui[uiLang].pendulum_blue }}</label>
                            <b-form-input
                              v-model="cardBLUE"
                              type="number"
                              min="0"
                              max="12"
                            ></b-form-input>
                          </b-col>

                          <b-col cols="4" class="px-2">
                            <label>{{ ui[uiLang].pendulum_red }}</label>
                            <b-form-input
                              v-model="cardRED"
                              type="number"
                              min="0"
                              max="12"
                            ></b-form-input>
                          </b-col>

                          <b-col cols="4" class="px-2">
                            <label>{{ ui[uiLang].text_size }}</label>
                            <b-form-input
                              v-model="pendulumSize"
                              type="number"
                            ></b-form-input>
                          </b-col>
                        </b-row>

                        <b-row class="my-3">
                          <b-col class="px-2">
                            <label>{{ ui[uiLang].card_info_text }}</label>
                            <b-form-textarea
                              v-model="cardPendulumInfo"
                              rows="5"
                            ></b-form-textarea>
                          </b-col>
                        </b-row>
                      </b-col>
                    </b-row>

                    <!-- Área de Ataque/Defesa -->
                    <b-row class="my-3">
                      <!-- Ataque -->
                      <b-col
                        v-show="cardType === 'Monster'"
                        cols="4"
                        class="px-2"
                      >
                        <label>{{ ui[uiLang].attack }}</label>
                        <b-form-input
                          v-model="cardATK"
                          type="text"
                          maxlength="6"
                        ></b-form-input>
                      </b-col>

                      <!-- Defesa -->
                      <b-col
                        v-show="cardType === 'Monster' && !isLinkMonster"
                        cols="4"
                        class="px-2"
                      >
                        <label>{{ ui[uiLang].defence }}</label>
                        <b-form-input
                          v-model="cardDEF"
                          type="text"
                          maxlength="6"
                        ></b-form-input>
                      </b-col>

                      <!-- Link -->
                      <b-col v-show="isLinkMonster" cols="4" class="px-2">
                        <label>{{ ui[uiLang].link }}</label>
                        <table>
                          <tr v-for="row in [0, 1, 2]" :key="row">
                            <td v-for="col in [1, 2, 3]" :key="col">
                              <b-form-checkbox
                                v-if="row * 3 + col !== 5"
                                v-model="links[row * 3 + col].val"
                                :class="{
                                  'checkbox-wrap': true,
                                  active: links[row * 3 + col].val,
                                }"
                                button
                                >{{
                                  links[row * 3 + col].symbol
                                }}</b-form-checkbox
                              >
                            </td>
                          </tr>
                        </table>
                      </b-col>

                      <!-- Tamanho do texto e posição (top) -->
                      <b-col cols="2" class="px-2">
                        <label>{{ ui[uiLang].text_size }}</label>
                        <b-form-input
                          v-model.number="infoSize"
                          type="number"
                        ></b-form-input>
                      </b-col>
                      <b-col cols="2" class="px-2">
                        <label>{{ ui[uiLang].text_position }}</label>
                        <b-form-input
                          v-model.number="infoPosition"
                          type="number"
                          placeholder="0"
                        ></b-form-input>
                      </b-col>
                    </b-row>

                    <!-- Descrição do cartão -->
                    <b-row class="my-3">
                      <b-col class="px-2">
                        <label>{{ ui[uiLang].card_info_text }}</label>
                        <b-form-textarea
                          v-model="cardInfo"
                          rows="5"
                        ></b-form-textarea>
                      </b-col>
                    </b-row>
                  </div>
                </fieldset>
                <!-- Área de botões (fora do fieldset para não serem desabilitados) -->
                <b-row class="my-3 mx-0">
                  <b-col class="px-2">
                    <button
                      type="button"
                      class="my-2 btn btn-success"
                      @click="download_img"
                    >
                      {{ ui[uiLang].download }}
                    </button>
                    <b-button
                      v-if="
                        cardKey &&
                        selectedDeckId &&
                        !isCurrentCardInDeck
                      "
                      class="my-2 ml-2"
                      variant="outline-primary"
                      @click="addToDeckCurrent"
                    >
                      {{ ui[uiLang].add_to_deck || 'Adicionar ao Deck' }}
                    </b-button>
                    <b-button
                      v-if="hasUnsavedLayoutChanges"
                      class="my-2 ml-2"
                      variant="success"
                      @click="saveDeckCardChanges"
                    >
                      {{ ui[uiLang].save_changes }}
                    </b-button>
                    <label style="color: #ccc"
                      >&emsp;{{ ui[uiLang].auto_gen_note }}</label
                    >
                  </b-col>
                  <b-col cols="6" class="px-2 text-right">
                    <button
                      type="button"
                      class="my-2 btn btn-danger"
                      @click="load_default_data"
                    >
                      {{ ui[uiLang].reset_to_default }}
                    </button>
                  </b-col>
                </b-row>
              </div>

              <!-- Resultados da busca (classificados: arquétipo > nome > descrição) -->
              <div
                v-if="searchResults.length > 0"
                class="panel-bg shadow p-3 mt-3"
              >
                <label class="d-block mb-2">{{
                  ui[uiLang].search_results
                }}</label>
                <template v-if="searchResultsByArchetype.length > 0">
                  <div class="small text-muted mb-1 mt-2">
                    {{ getSearchSectionLabel('archetype') }}
                  </div>
                  <div
                    class="d-flex flex-wrap mb-3"
                    style="max-height: 320px; overflow-y: auto; gap: 4px"
                  >
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
                </template>
                <template
                  v-if="searchMode === 'name' && searchResultsByName.length > 0"
                >
                  <div class="small text-muted mb-1 mt-2">
                    {{ getSearchSectionLabel('name') }}
                  </div>
                  <div
                    class="d-flex flex-wrap mb-3"
                    style="max-height: 320px; overflow-y: auto; gap: 4px"
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
                </template>
                <template
                  v-if="searchMode === 'name' && searchResultsByDesc.length > 0"
                >
                  <div class="small text-muted mb-1 mt-2">
                    {{ getSearchSectionLabel('desc') }}
                  </div>
                  <div
                    class="d-flex flex-wrap"
                    style="max-height: 320px; overflow-y: auto; gap: 4px"
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
                </template>
                <template v-if="searchResultsCitedRelated.length > 0">
                  <div class="small text-muted mb-1 mt-2">
                    {{
                      ui[uiLang].search_section_cited ||
                      'Cards citados e relacionados'
                    }}
                  </div>
                  <div
                    class="d-flex flex-wrap"
                    style="max-height: 320px; overflow-y: auto; gap: 4px"
                  >
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
                </template>
                <template
                  v-if="
                    searchMode === 'archetype' &&
                    searchResultsRelated.length > 0
                  "
                >
                  <div class="small text-muted mb-1 mt-2">
                    {{ getSearchSectionLabel('related') }}
                  </div>
                  <div
                    class="d-flex flex-wrap"
                    style="max-height: 320px; overflow-y: auto; gap: 4px"
                  >
                    <img
                      v-for="card in searchResultsRelated"
                      :key="'rel-' + card.id"
                      v-b-tooltip.hover.top="getDisplayName(card)"
                      :src="getSearchResultImageSrc(card)"
                      :alt="getDisplayName(card)"
                      class="search-thumb rounded"
                      loading="lazy"
                      @click="applyCardFromSearch(card)"
                      @error="onSearchResultImgError(card, $event)"
                    />
                  </div>
                </template>
              </div>
              <div
                v-else-if="searchTried && !searchLoading"
                class="panel-bg shadow p-3 mt-3 text-muted text-center"
              >
                {{ ui[uiLang].search_no_results }}
              </div>

              <!-- Cards relacionados ao card selecionado -->
              <div
                v-if="viewingBaseCard && relatedCards.length > 0"
                class="panel-bg shadow p-3 mt-3"
              >
                <label class="d-block mb-2">{{
                  ui[uiLang].related_to_selected
                }}</label>
                <div
                  class="d-flex flex-wrap"
                  style="max-height: 320px; overflow-y: auto; gap: 4px"
                >
                  <img
                    v-for="card in relatedCards"
                    :key="'rel-sel-' + card.id"
                    v-b-tooltip.hover.top="getDisplayName(card)"
                    :src="getSearchResultImageSrc(card)"
                    :alt="getDisplayName(card)"
                    class="search-thumb rounded"
                    loading="lazy"
                    @click="applyCardFromSearch(card)"
                    @error="onSearchResultImgError(card, $event)"
                  />
                </div>
              </div>

              <!-- Meus Decks -->
              <div class="panel-bg shadow p-3 mt-3">
                <div
                  class="d-flex align-items-center justify-content-between mb-2"
                >
                  <label class="mb-0">{{
                    ui[uiLang].my_decks || 'Meus Decks'
                  }}</label>
                  <b-button
                    size="sm"
                    variant="outline-success"
                    @click="showNewDeckModal = true"
                  >
                    <fa :icon="['fas', 'plus']" />
                    {{ ui[uiLang].new_deck || 'Novo Deck' }}
                  </b-button>
                </div>

                <!-- Lista de decks -->
                <div v-if="userDecks.length > 0" class="mb-3">
                  <div
                    v-for="deck in userDecks"
                    :key="deck.id"
                    class="
                      d-flex
                      align-items-center
                      justify-content-between
                      border
                      rounded
                      p-2
                      mb-1
                    "
                    :class="
                      selectedDeckId === deck.id
                        ? 'border-primary bg-dark'
                        : 'bg-dark'
                    "
                    style="cursor: pointer"
                    @click="selectDeck(deck)"
                  >
                    <span class="text-white small">
                      <fa
                        :icon="['fas', 'folder']"
                        class="mr-1"
                        :class="
                          selectedDeckId === deck.id
                            ? 'text-primary'
                            : 'text-muted'
                        "
                      />
                      {{ deck.name }}
                    </span>
                    <div>
                      <b-button
                        size="sm"
                        variant="outline-secondary"
                        class="mr-1"
                        title="Editar nome"
                        @click.stop="openEditDeckModal(deck)"
                      >
                        <fa :icon="['fas', 'pen']" />
                      </b-button>
                      <b-button
                        size="sm"
                        variant="outline-danger"
                        @click.stop="deleteDeck(deck.id)"
                      >
                        <fa :icon="['fas', 'trash']" />
                      </b-button>
                    </div>
                  </div>
                </div>
                <p v-else class="text-muted small mb-2">
                  {{ ui[uiLang].no_decks || 'Nenhum deck criado.' }}
                </p>

                <!-- Cards do deck selecionado -->
                <div v-if="selectedDeck">
                  <div
                    class="
                      d-flex
                      align-items-center
                      justify-content-between
                      mb-2
                    "
                  >
                    <label class="mb-0 text-light small">
                      <fa :icon="['fas', 'folder-open']" class="mr-1" />
                      {{ selectedDeck.name }} ({{ selectedDeckCards.length }})
                    </label>
                    <b-button
                      v-if="selectedDeckCards.length > 0"
                      size="sm"
                      variant="outline-info"
                      :disabled="batchDownloading"
                      @click="batchDownloadDeck"
                    >
                      {{
                        batchDownloading
                          ? ui[uiLang].batch_downloading || 'Baixando...'
                          : ui[uiLang].batch_download || 'Baixar Todos'
                      }}
                    </b-button>
                  </div>
                  <div
                    v-if="selectedDeckCards.length > 0"
                    class="d-flex flex-wrap"
                    style="max-height: 280px; overflow-y: auto; gap: 4px"
                  >
                    <div
                      v-for="item in selectedDeckCards"
                      :key="item.id"
                      v-b-tooltip.hover.top="item.name"
                      class="deck-thumb-wrap position-relative"
                      :class="
                        editingDeckCardId === item.id ? 'deck-thumb-active' : ''
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
                  <p v-else class="text-muted small mb-0">
                    {{
                      ui[uiLang].deck_empty ||
                      'Deck vazio. Busque um card e adicione.'
                    }}
                  </p>
                </div>
              </div>
            </b-col>
          </b-row>

          <!-- Área do rodapé -->
          <footer class="container-fluid mb-5 px-0 px-md-5">
            <b-row class="justify-content-center align-content-center">
              <b-col id="footer-panel" cols="12">
                <div class="card-body text-center text-white">
                  Linziyou
                  <a
                    class="text-white text-decoration-none"
                    href="https://github.com/linziyou0601"
                    data-size="large"
                    aria-label="Ver projeto no GitHub"
                  >
                    <fa :icon="['fab', 'github']" /> GitHub
                  </a>
                </div>
                <div class="card-body text-center text-white">
                  Felipesantosdd
                  <a
                    class="text-white text-decoration-none"
                    href="https://github.com/felipesantosdd"
                    data-size="large"
                    aria-label="Ver projeto no GitHub"
                  >
                    <fa :icon="['fab', 'github']" /> GitHub
                  </a>
                </div>
              </b-col>
            </b-row>
          </footer>
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

    <!-- Modal: Tradução PT-BR -->
    <b-modal
      v-model="showTranslationModal"
      :title="ui[uiLang].translate_title || 'Traduzir Card para PT-BR'"
      ok-title=""
      cancel-title=""
      hide-footer
      centered
      size="lg"
    >
      <b-form @submit.prevent="saveTranslation">
        <b-form-group :label="ui[uiLang].card_name_pt || 'Nome em Português'">
          <b-form-input
            v-model="translationName"
            :placeholder="
              ui[uiLang].card_name_pt_placeholder || 'Nome traduzido'
            "
          />
        </b-form-group>
        <b-form-group
          :label="ui[uiLang].card_desc_pt || 'Descrição em Português'"
        >
          <b-form-textarea
            v-model="translationDesc"
            rows="6"
            :placeholder="
              ui[uiLang].card_desc_pt_placeholder ||
              'Efeito/descrição traduzida'
            "
          />
        </b-form-group>
        <div class="text-muted small mb-3">
          {{
            ui[uiLang].translate_note ||
            'Esta tradução será salva no banco local. Quando uma tradução oficial for disponibilizada pela API, ela substituirá a sua.'
          }}
        </div>
        <div class="text-right">
          <b-button
            variant="secondary"
            class="mr-2"
            @click="showTranslationModal = false"
            >{{ ui[uiLang].cancel || 'Cancelar' }}</b-button
          >
          <b-button type="submit" variant="success">{{
            ui[uiLang].save || 'Salvar'
          }}</b-button>
        </div>
      </b-form>
    </b-modal>

    <LoadingDialog />
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import JSZip from 'jszip'
import LoadingDialog from '../components/LoadingDialog.vue'
import ui from '../../../static/lang.ui.json'
import cardMeta from '../../../static/lang.card_meta.json'
import archetypesList from '../../../static/archetypes.json'

const YGOPRODECK_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const YGOPRODECK_CHECK_VER = 'https://db.ygoprodeck.com/api/v7/checkDBVer.php'
const SYNC_TIMEOUT_MS = 60000
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

export default {
  components: { LoadingDialog },
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
      apiCardLoading: false,
      apiCardError: null,
      apiCardFetchTimer: null,
      cardTitle: '',
      cardImg: null,
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

      userDecks: [],
      selectedDeckId: null,
      selectedDeckCards: [],
      deckCardImageUrls: {},
      batchDownloading: false,
      loadedFromDeck: false,
      editingDeckCardId: null,
      viewingBaseCard: false,

      showTranslationModal: false,
      translationName: '',
      translationDesc: '',
      translatingCardId: null,

      showNewDeckModal: false,
      newDeckName: '',
      showEditDeckModal: false,
      editingDeckId: null,
      editingDeckName: '',

      programmaticUpdate: false,
      autoSaveTimer: null,

      snapshotAtLoad: null,
      initialSnapshotWhenNotFromCollection: null,
      pendingLeaveAction: null,
    }
  },
  computed: {
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
        const en = this.stripAccents((c.name_en || c.name || '').toLowerCase())
        const pt = this.stripAccents((c.name_pt || '').toLowerCase())
        return en.includes(q) || pt.includes(q)
      })
    },
    searchResultsByArchetype() {
      return this.searchResults.filter((c) => c.matchType === 'archetype')
    },
    searchResultsByName() {
      return this.searchResults.filter((c) => c.matchType === 'name')
    },
    searchResultsByDesc() {
      return this.searchResults.filter((c) => c.matchType === 'desc')
    },
    searchResultsRelated() {
      return this.searchResults.filter(
        (c) => c.matchType === 'name' || c.matchType === 'desc'
      )
    },
    searchResultsCitedRelated() {
      return this.searchResults.filter((c) => c.matchType === 'related')
    },
    currentSnapshotForAutoSave() {
      if (!this.cardKey) return null
      return { cardKey: this.cardKey, ...this.getCurrentCardSnapshot() }
    },
    cardDisplayDeps() {
      return JSON.stringify(this.getCurrentCardSnapshot())
    },
    isFieldsLocked() {
      return this.viewingBaseCard && !this.loadedFromDeck
    },
    currentBaseCard() {
      if (!this.cardKey) return null
      return (
        this.localCards.find((c) => String(c.id) === String(this.cardKey)) ||
        null
      )
    },
    nameIndexMap() {
      const map = new Map()
      for (const card of this.localCards) {
        const en = this.normalizeSearchQuery(card.name_en || card.name || '')
        const pt = this.normalizeSearchQuery(card.name_pt || '')
        if (en) {
          if (!map.has(en)) map.set(en, [])
          map.get(en).push(card)
        }
        if (pt && pt !== en) {
          if (!map.has(pt)) map.set(pt, [])
          map.get(pt).push(card)
        }
      }
      return map
    },
    baseCardNeedsTranslation() {
      if (!this.currentBaseCard) return false
      return (
        !this.currentBaseCard.name_pt || this.currentBaseCard.name_pt === ''
      )
    },
    hasUnsavedLayoutChanges() {
      if (this.editingDeckCardId == null || this.snapshotAtLoad == null)
        return false
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
    cardLang() {
      if (this.cardKey === '') this.load_default_data()
    },
    cardKey(val) {
      if (this.apiCardFetchTimer) clearTimeout(this.apiCardFetchTimer)
      this.apiCardError = null
      const key = String(val).trim()
      if (key.length >= 8) this.loadedFromDeck = false
      if (!this.cardLoadYgoProEnabled || key.length < 8) return
      if (this.localCardsMap[key]) return
      this.apiCardFetchTimer = setTimeout(() => {
        this.fetchCardFromApi(key)
      }, 500)
    },
    cardType() {
      this.cardSubtype = 'Normal'
      if (this.cardType !== 'Monster') this.Pendulum = false
    },
    cardSubtype() {
      if (['Slifer', 'Ra', 'Obelisk', 'LDragon'].includes(this.cardSubtype))
        this.Pendulum = false
    },
    currentSnapshotForAutoSave: {
      deep: true,
      handler() {
        if (this.programmaticUpdate) return
        if (this.$ygoDb && this.cardKey) this.saveLastCard()
        if (!this.cardKey || !this.$ygoDb) return
        if (!this.loadedFromDeck || !this.editingDeckCardId) return
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer)
        this.autoSaveTimer = setTimeout(() => {
          this.autoSaveTimer = null
          this.autoSaveDeckCard()
        }, 500)
      },
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
    cardDisplayDeps() {
      this.scheduleDrawCard()
    },
  },
  mounted() {
    window.addEventListener('scroll', this.onScroll)
    this.fireLoadingDialog()
    this.load_default_data()
    this.initYgoDb()
    if (this.$ygoDb) this.loadDecks()
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.onScroll)
    if (this._drawCardRaf) cancelAnimationFrame(this._drawCardRaf)
  },
  methods: {
    ...mapMutations(['fireLoadingDialog', 'closeLoadingDialog']),

    scheduleDrawCard() {
      if (this._drawCardRaf) cancelAnimationFrame(this._drawCardRaf)
      this._drawCardRaf = requestAnimationFrame(() => {
        this._drawCardRaf = null
        this.drawCard()
      })
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
      this.editingDeckCardId = item.id
      this.viewingBaseCard = false
      this.relatedCards = []
      this.snapshotAtLoad = JSON.parse(JSON.stringify(item.snapshot))
      this.loadFromSnapshot(item.snapshot)
      this.cardKey = item.cardKey
      this.cardLang = item.cardLang || 'pt'
      const imgUrl = await this.getExportImageUrlForBatch(item.cardKey)
      this.cardPhotoLoading = !!imgUrl
      if (imgUrl) {
        this.$nextTick(() => this.fireLoadingDialog())
        await this.ensureCardImage(item.cardKey, imgUrl)
        this.drawCard(this.apiCardImageUrls[item.cardKey] || null)
      } else {
        this.cardPhotoLoading = false
        this.$nextTick(() => {
          this.fireLoadingDialog()
          this.drawCard()
        })
      }
      this.$nextTick(() => {
        this.loadedFromDeck = true
      })
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
      if (
        cardImgUrl == null &&
        this.cardLoadYgoProEnabled &&
        !this._exportingCard &&
        !this.loadedFromDeck
      ) {
        const hasData = this.load_ygopro_data(this.cardKey)
        if (hasData) cardImgUrl = this.apiCardImageUrls[this.cardKey] || null
      }
      if (cardImgUrl == null && this.loadedFromDeck)
        cardImgUrl = this.apiCardImageUrls[this.cardKey] || null
      if (this._exportingCard && cardImgUrl == null)
        cardImgUrl = this.apiCardImageUrls[this.cardKey] || 'images/default.jpg'
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
            ? `images/pic/${this.cardSubtype}.webp`
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
      let count = 0
      let done = false
      const finish = () => {
        if (done) return
        done = true
        setTimeout(callback, 100)
      }
      const maybeDone = () => {
        count += 1
        if (count >= keys.length) finish()
      }
      setTimeout(finish, 10000)
      for (const key of keys) {
        const src = this.imgs[key]
        const image = new window.Image()
        if (typeof src === 'string' && src.startsWith('blob:')) {
          image.crossOrigin = 'anonymous'
        }
        this.imgs[key] = image
        if (key === 'photo') {
          let photoDone = false
          const photoMaybeDone = () => {
            if (photoDone) return
            photoDone = true
            maybeDone()
          }
          if (typeof src === 'string' && src.startsWith('http')) {
            image.onload = photoMaybeDone
            image.onerror = photoMaybeDone
            image.src = 'images/default.jpg'
          } else {
            image.onload = photoMaybeDone
            image.onerror = () => {
              const def = new window.Image()
              def.onload = () => {
                this.imgs.photo = def
                photoMaybeDone()
              }
              def.onerror = photoMaybeDone
              def.src = 'images/default.jpg'
            }
            image.src = src || 'images/default.jpg'
          }
        } else {
          image.onload = maybeDone
          image.onerror = maybeDone
          image.src = src
        }
      }
    },

    // Fluxo principal de desenho do cartão.
    drawCardProcess() {
      const canvas = this.$refs.yugiohcard
      const ctx = canvas.getContext('2d')
      canvas.width = 1000
      canvas.height = 1450

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
        const iW = (pw / ph) * cH
        const iH = (ph / pw) * cW
        if (pw <= ph * (this.Pendulum ? 1.33 : 1))
          ctx.drawImage(photo, cX, cY - (iH - cH) / 2, cW, iH)
        else ctx.drawImage(photo, cX - (iW - cW) / 2, cY, iW, cH)
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
        this.isLinkMonster || this.isXyzMonster || this.cardType === 'Trap'
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
          (this.Special ? langStr.M_SPECIAL : '') + // Invocação Especial
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
          ctx.drawImage(
            this.imgs.levelOrSubtype,
            x,
            y - iconH + 14,
            iconW,
            iconH
          )
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
      const baseFontSize = Number(this.pendulumSize) || 20
      const xStart = 160
      const yStart = 920 + offset.oY
      const maxW = 660
      const yLimit = 1070

      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const minFontSize = 12
      let fontSize = Math.max(baseFontSize, minFontSize)
      let lines = this.computeWrappedLines(
        ctx,
        this.cardPendulumInfo || '',
        maxW
      )

      while (fontSize >= minFontSize) {
        const lh = fontSize + offset.lh
        ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
        lines = this.computeWrappedLines(ctx, this.cardPendulumInfo || '', maxW)
        const totalHeight = lines.length * lh
        if (yStart + totalHeight <= yLimit) break
        fontSize -= 1
      }

      const lh = fontSize + offset.lh
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      ctx.save()
      ctx.beginPath()
      ctx.rect(xStart, yStart, maxW, yLimit - yStart)
      ctx.clip()
      let drawY = yStart
      for (const line of lines) {
        if (drawY + lh > yLimit) break
        ctx.fillText(line, xStart, drawY)
        drawY += lh
      }
      ctx.restore()
    },

    drawCardInfoText(ctx, offset, fontName) {
      const baseFontSize = Number(this.infoSize) || 20
      const topOffset = Number(this.infoPosition) || 0
      const xStart = 75
      const yStart =
        1095 + offset.oY + (this.cardType === 'Monster' ? 30 : 0) + topOffset
      const maxW = 825
      const yLimit = this.cardType === 'Monster' ? 1330 : 1390

      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const minFontSize = 12
      let fontSize = Math.max(baseFontSize, minFontSize)
      let lines = this.computeWrappedLines(ctx, this.cardInfo || '', maxW)

      while (fontSize >= minFontSize) {
        const lh = fontSize + offset.lh
        ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
        lines = this.computeWrappedLines(ctx, this.cardInfo, maxW)
        const totalHeight = lines.length * lh
        if (yStart + totalHeight <= yLimit) break
        fontSize -= 1
      }

      const lh = fontSize + offset.lh
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      ctx.save()
      ctx.beginPath()
      ctx.rect(xStart, yStart, maxW, yLimit - yStart)
      ctx.clip()
      let drawY = yStart
      for (const line of lines) {
        if (drawY + lh > yLimit) break
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
              lines.push(rest)
              rest = ''
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
      this.editingDeckCardId = null
      this.snapshotAtLoad = null
      this.loadedFromDeck = false
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

    // Mapeia resposta da API YGOPRODeck para o formato interno do app.
    map_ygoprodeck_to_internal(card) {
      const typeStr = (card.type || '').toLowerCase()
      const frameType = (card.frameType || '').toLowerCase()
      const typeline = card.typeline || []
      let cardType = 'Monster'
      let cardSubtype = 'Normal'
      const eff1 = 'normal'
      const eff2 = 'none'
      let pendulum = false
      const special = false

      if (typeStr.includes('spell')) {
        cardType = 'Spell'
        const r = (card.race || 'Normal').toLowerCase()
        cardSubtype =
          r === 'quick-play' ? 'Quick' : r.charAt(0).toUpperCase() + r.slice(1)
      } else if (typeStr.includes('trap')) {
        cardType = 'Trap'
        const r = (card.race || 'Normal').toLowerCase()
        cardSubtype = r.charAt(0).toUpperCase() + r.slice(1)
      } else {
        if (typeStr.includes('fusion')) cardSubtype = 'Fusion'
        else if (typeStr.includes('ritual')) cardSubtype = 'Ritual'
        else if (typeStr.includes('synchro')) cardSubtype = 'Synchro'
        else if (typeStr.includes('xyz')) cardSubtype = 'Xyz'
        else if (typeStr.includes('link')) cardSubtype = 'Link'
        else if (typeStr.includes('token')) cardSubtype = 'Token'
        else if (frameType === 'effect' || typeline.includes('Effect'))
          cardSubtype = 'Effect'
        else cardSubtype = 'Normal'
        pendulum =
          typeStr.includes('pendulum') ||
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
        atk: card.atk != null ? String(card.atk) : '0',
        def:
          card.def != null
            ? String(card.def)
            : cardType === 'Monster' && cardSubtype === 'Link'
            ? '0'
            : '0',
        ...link,
        infoText: card.desc || '',
        size: 20,
        pendulumText: card.pendulum_desc || '',
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
            ? this.getCanvasImageUrl(card.card_images[0])
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

      try {
        const timeout = (promise, ms) =>
          Promise.race([
            promise,
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error('timeout')), ms)
            ),
          ])

        if (window.cardArt) {
          try {
            const base64 = await timeout(
              window.cardArt.get(key, imageUrl),
              15000
            )
            if (base64) {
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++)
                bytes[i] = binary.charCodeAt(i)
              const blob = new Blob([bytes], { type: 'image/webp' })
              const url = URL.createObjectURL(blob)
              setUrlAndDraw(url)
              return
            }
          } catch (_) {
            /* timeout or download error, fall through */
          }
        }

        if (this.$ygoDb) {
          const blob = await timeout(
            this.$ygoDb.getCardImage(key),
            8000
          )
          if (blob) {
            const url = URL.createObjectURL(blob)
            setUrlAndDraw(url)
            return
          }
        }

        setUrlAndDraw(null)
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
      } finally {
        if (forCurrentCard && !scheduledDraw) {
          this.cardPhotoLoading = false
          this.$nextTick(() => {
            this.fireLoadingDialog()
            this.drawCard()
          })
        }
      }
    },

    /** URL para o canvas: só image_url_cropped ou image_url (nunca image_url_small). */
    getCanvasImageUrl(img) {
      if (!img) return null
      if (img.image_url_cropped) return img.image_url_cropped
      if (img.image_url && img.image_url !== img.image_url_small)
        return img.image_url
      return null
    },

    /** Lista de resultados: usa image_url_small (miniatura). */
    getCardImageSrc(card) {
      const img = card.card_images && card.card_images[0]
      const url = img && (img.image_url_small || img.image_url)
      return url || 'images/default.jpg'
    },

    getSearchResultImageSrc(card) {
      const img = card.card_images && card.card_images[0]
      if (!img) return 'images/default.jpg'
      return img.image_url_small || img.image_url || 'images/default.jpg'
    },

    /** Cor de fundo do card na lista de busca por tipo/subtipo. */
    getSearchResultCardBg(card) {
      const t = (card.type || '').toLowerCase()
      if (t.includes('spell')) return '#008872'
      if (t.includes('trap')) return '#9D1C6F'
      if (t.includes('fusion')) return '#93539A'
      if (t.includes('ritual')) return '#597DBC'
      if (t.includes('synchro')) return '#E6E2E0'
      if (t.includes('link')) return '#00477F'
      if (t.includes('token')) return '#736967'
      if (t.includes('xyz')) return '#2D2D2D'
      if (
        t.includes('effect') ||
        (card.frameType || '').toLowerCase() === 'effect'
      )
        return '#B5663B'
      if (t.includes('normal')) return '#BB8C40'
      return '#555'
    },

    /** Texto claro em fundos escuros; escuro em Synchro. */
    getSearchResultTextClass(card) {
      const t = (card.type || '').toLowerCase()
      if (t.includes('synchro')) return 'text-dark'
      return 'text-white'
    },

    onCardImgError(card, event) {
      const img = card.card_images && card.card_images[0]
      const url = img && (img.image_url_small || img.image_url)
      if (url && event.target) event.target.src = url
    },

    onSearchResultImgError(card, event) {
      const fallback = this.getCardImageSrc(card)
      if (event.target) event.target.src = fallback
    },
    async initYgoDb() {
      if (!this.$ygoDb) return
      try {
        const { cards, lastSync, databaseVersion } = await this.$ygoDb.getDB()
        this.localCards = Array.isArray(cards) ? cards : []
        this.lastSync = lastSync
        this.localDatabaseVersion = databaseVersion ?? null
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
        this.loadedFromDeck = false
        this.editingDeckCardId = null
        const card = this.localCards.find(
          (c) => String(c.id) === String(this.cardKey)
        )
        const img = card?.card_images?.[0]
        const imgUrl = img ? this.getCanvasImageUrl(img) : null
        if (imgUrl) {
          this.cardPhotoLoading = true
          this.$nextTick(() => this.fireLoadingDialog())
          await this.ensureCardImage(this.cardKey, imgUrl)
        }
        this.$nextTick(() => this.drawCard())
        if (card && this.viewingBaseCard) {
          setTimeout(() => {
            this.relatedCards = this.buildRelatedCards(card, 2)
            this.preloadRelatedCardImages()
          }, 0)
        }
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
      this.searchByName = ''
      this.showNameDropdown = false
      this.applyCardFromSearch(card)
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
      const texts = [card.desc_en, card.desc_pt, card.desc].filter(Boolean)
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
      const n = (s) => this.normalizeSearchQuery(s || '')
      const namesList = names.filter(Boolean)
      for (const name of namesList) {
        const exact = this.nameIndexMap.get(name)
        if (exact) for (const c of exact) found.set(String(c.id), c)
      }
      if (namesList.length === 0) return [...found.values()]
      for (const card of this.localCards) {
        if (found.has(String(card.id))) continue
        const en = n(card.name_en || card.name)
        const pt = n(card.name_pt)
        for (const name of namesList) {
          if ((en && en.includes(name)) || (pt && pt.includes(name))) {
            found.set(String(card.id), card)
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
      const n = (s) => this.stripAccents((s || '').toLowerCase())
      for (const card of this.localCards) {
        const descEn = n(card.desc_en)
        const descPt = n(card.desc_pt)
        const descRaw = n(card.desc)
        const combined = [descEn, descPt, descRaw].filter(Boolean).join(' ')
        if (!combined) continue
        for (const q of namesNorm) {
          if (combined.includes(q)) {
            found.set(String(card.id), card)
            break
          }
        }
      }
      return [...found.values()]
    },

    cardTypePriority(card) {
      const t = (card.type || '').toLowerCase()
      const f = (card.frameType || '').toLowerCase()
      if (t.includes('token') || f === 'token') return 99
      if (
        f === 'normal' ||
        (t.includes('normal') &&
          !t.includes('effect') &&
          !t.includes('spell') &&
          !t.includes('trap'))
      )
        return 0
      if (t.includes('effect') || f === 'effect') return 1
      if (t.includes('spell')) return 2
      if (t.includes('trap')) return 3
      if (t.includes('ritual')) return 4
      if (t.includes('fusion')) return 5
      if (t.includes('synchro')) return 6
      if (t.includes('xyz')) return 7
      if (t.includes('pendulum')) return 8
      if (t.includes('link')) return 9
      return 10
    },

    buildRelatedCards(card, depth = 2) {
      const mainId = String(card.id)
      const collected = new Map()
      const add = (c) => {
        const id = String(c.id)
        if (id === mainId || collected.has(id)) return
        collected.set(id, { ...c, _matchLang: c._matchLang || 'en' })
      }

      const mainNames = [card.name_en || card.name, card.name_pt]
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
          const names1 = [c1.name_en || c1.name, c1.name_pt]
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

    getCardMatchInfo(card, queryNorm) {
      if (!queryNorm) return { type: 'none', lang: 'en' }
      const n = (s) => this.stripAccents((s || '').toLowerCase())
      const arch = n(card.archetype)
      const nameEn = n(card.name_en || card.name)
      const namePt = n(card.name_pt)
      const descEn = n(card.desc_en)
      const descPt = n(card.desc_pt)
      const descRaw = n(card.desc)

      if (arch && (arch === queryNorm || arch.includes(queryNorm))) {
        const lang = namePt.includes(queryNorm) ? 'pt' : 'en'
        return { type: 'archetype', lang }
      }
      if (namePt.includes(queryNorm)) return { type: 'name', lang: 'pt' }
      if (nameEn.includes(queryNorm)) return { type: 'name', lang: 'en' }
      if (descPt.includes(queryNorm)) return { type: 'desc', lang: 'pt' }
      if (descEn.includes(queryNorm) || descRaw.includes(queryNorm))
        return { type: 'desc', lang: 'en' }
      return { type: 'none', lang: 'en' }
    },

    getDisplayName(card) {
      if (card._matchLang === 'pt' && card.name_pt) return card.name_pt
      if (card._matchLang === 'en' || card._matchLang)
        return card.name_en || card.name || ''
      if (this.cardLang === 'pt' && card.name_pt) return card.name_pt
      return card.name_en || card.name || ''
    },

    getFilteredCardDisplayName(card) {
      if (!this.searchByName) return card.name_en || card.name || ''
      const q = this.normalizeSearchQuery(this.searchByName)
      const pt = this.stripAccents((card.name_pt || '').toLowerCase())
      if (pt.includes(q) && card.name_pt) return card.name_pt
      return card.name_en || card.name || ''
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
      const withType = this.localCards
        .map((c) => {
          const info = this.getCardMatchInfo(c, queryNorm)
          return { ...c, matchType: info.type, _matchLang: info.lang }
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
        const img = card.card_images && card.card_images[0]
        const imgUrl = img ? this.getCanvasImageUrl(img) : null
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
      this.editingDeckCardId = null
      this.snapshotAtLoad = null
      this.loadedFromDeck = false
      this.viewingBaseCard = true
      const key = String(card.id)
      const img = card.card_images && card.card_images[0]
      const imgUrl = img ? this.getCanvasImageUrl(img) : null
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
          this.initialSnapshotWhenNotFromCollection = JSON.parse(
            JSON.stringify(this.getCurrentCardSnapshot())
          )
        }, 800)
      })
      const runRelated = () => {
        this.relatedCards = this.buildRelatedCards(card, 2)
        this.preloadRelatedCardImages()
      }
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => runRelated(), { timeout: 500 })
      } else {
        setTimeout(runRelated, 150)
      }
    },

    preloadRelatedCardImages() {
      if (!this.$ygoDb || !this.relatedCards.length) return
      const limit = 20
      for (const card of this.relatedCards.slice(0, limit)) {
        const img = card.card_images && card.card_images[0]
        const imgUrl = img ? this.getCanvasImageUrl(img) : null
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
        color: this.titleColor,
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
      }
    },

    async addToDeckCurrent() {
      if (!this.$ygoDb || !this.cardKey || !this.selectedDeckId) return
      const snapshot = this.getCurrentCardSnapshot()
      const name = this.cardTitle || 'Card'
      const id = await this.$ygoDb.addCardToDeck(
        this.selectedDeckId,
        Number(this.cardKey) || null,
        {
          name,
          cardKey: this.cardKey,
          cardLang: this.cardLang,
          snapshot,
        }
      )
      await this.loadDeckCards()
      this.editingDeckCardId = id
      this.loadedFromDeck = true
      this.snapshotAtLoad = JSON.parse(JSON.stringify(snapshot))
    },

    async saveDeckCardChanges() {
      if (!this.$ygoDb || !this.editingDeckCardId) return
      const snapshot = this.getCurrentCardSnapshot()
      const name = this.cardTitle || 'Card'
      await this.$ygoDb.updateDeckCard(this.editingDeckCardId, {
        name,
        cardKey: this.cardKey,
        cardLang: this.cardLang,
        snapshot,
      })
      this.snapshotAtLoad = JSON.parse(JSON.stringify(snapshot))
      await this.loadDeckCards()
    },

    async autoSaveDeckCard() {
      if (!this.editingDeckCardId || !this.$ygoDb) return
      await this.saveDeckCardChanges()
    },

    async onUnsavedModalSave() {
      this.$refs.unsavedChangesModal.hide()
      const action = this.pendingLeaveAction
      this.pendingLeaveAction = null
      if (!action) return
      await this.saveDeckCardChanges()
      this.runPendingLeaveAction(action)
    },

    onUnsavedModalDiscard() {
      this.$refs.unsavedChangesModal.hide()
      const action = this.pendingLeaveAction
      this.pendingLeaveAction = null
      // Limpar estado de alterações não salvas antes de executar a ação,
      // para que hasUnsavedLayoutChanges fique false e não mostre o modal de novo
      this.editingDeckCardId = null
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
    },

    async createDeck() {
      if (!this.$ygoDb || !this.newDeckName.trim()) return
      await this.$ygoDb.createDeck(this.newDeckName.trim(), 'yugioh')
      this.newDeckName = ''
      this.showNewDeckModal = false
      await this.loadDecks()
    },

    async selectDeck(deck) {
      this.selectedDeckId = deck.id
      await this.loadDeckCards()
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
      this.showEditDeckModal = false
      this.editingDeckId = null
      this.editingDeckName = ''
      await this.loadDecks()
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
      }
      await this.$ygoDb.deleteDeck(id)
      await this.loadDecks()
    },

    async loadDeckCards() {
      if (!this.$ygoDb || !this.selectedDeckId) return
      const items = await this.$ygoDb.getDeckCards(this.selectedDeckId)
      this.selectedDeckCards = items || []
      items.forEach((item) => this.ensureDeckCardImageUrl(item))
    },

    async removeDeckCard(id) {
      if (!this.$ygoDb) return
      if (this.editingDeckCardId === id) {
        this.editingDeckCardId = null
        this.snapshotAtLoad = null
      }
      await this.$ygoDb.removeDeckCard(id)
      await this.loadDeckCards()
      this.$delete(this.deckCardImageUrls, id)
    },

    getDeckCardImageSrc(item) {
      const key = item.cardKey
      const card = this.localCards.find((c) => String(c.id) === String(key))
      const img = card?.card_images?.[0]
      if (img && (img.image_url_small || img.image_url)) {
        return img.image_url_small || img.image_url
      }
      return this.deckCardImageUrls[key] || this.apiCardImageUrls[key] || null
    },

    async ensureDeckCardImageUrl(item) {
      const key = item.cardKey
      if (this.deckCardImageUrls[key]) return this.deckCardImageUrls[key]
      if (this.apiCardImageUrls[key]) {
        this.$set(this.deckCardImageUrls, key, this.apiCardImageUrls[key])
        return this.apiCardImageUrls[key]
      }
      const blob = await this.$ygoDb.getCardImage(key)
      if (blob) {
        const url = URL.createObjectURL(blob)
        this.$set(this.deckCardImageUrls, key, url)
        return url
      }
      const card = this.localCards.find((c) => String(c.id) === key)
      const img = card?.card_images?.[0]
      const imgUrl = img ? this.getCanvasImageUrl(img) : null
      if (imgUrl) {
        await this.ensureCardImage(key, imgUrl, { forCurrentCard: false })
        if (this.apiCardImageUrls[key]) {
          this.$set(this.deckCardImageUrls, key, this.apiCardImageUrls[key])
          return this.apiCardImageUrls[key]
        }
      }
      return null
    },

    // -------- Tradução --------

    openTranslationModal() {
      if (!this.currentBaseCard) return
      this.translatingCardId = this.currentBaseCard.id
      this.translationName = this.currentBaseCard.name_pt || ''
      this.translationDesc = this.currentBaseCard.desc_pt || ''
      this.showTranslationModal = true
    },

    async saveTranslation() {
      if (!this.$ygoDb || !this.translatingCardId) return
      await this.$ygoDb.updateCardTranslation(
        this.translatingCardId,
        this.translationName,
        this.translationDesc
      )
      this.showTranslationModal = false
      const { cards } = await this.$ygoDb.getDB()
      this.localCards = cards || []
      if (
        this.cardKey &&
        String(this.translatingCardId) === String(this.cardKey)
      ) {
        this.cardTitle = this.translationName || this.cardTitle
        this.cardInfo = this.translationDesc || this.cardInfo
        this.$nextTick(() => this.drawCard())
      }
    },

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
        for (let i = 0; i < this.selectedDeckCards.length; i++) {
          const entry = this.selectedDeckCards[i]
          const imgUrl = await this.getExportImageUrlForBatch(entry.cardKey)
          if (imgUrl)
            await this.ensureCardImage(entry.cardKey, imgUrl, {
              forCurrentCard: false,
            })
          this.loadFromSnapshot(entry.snapshot)
          this.cardKey = entry.cardKey
          const url = this.apiCardImageUrls[entry.cardKey] || imgUrl
          await new Promise((resolve) => {
            this._drawCardOnDrawn = resolve
            this.drawCard(url)
          })
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

    async getExportImageUrlForBatch(cardKey) {
      if (this.$ygoDb) {
        const blob = await this.$ygoDb.getCardImage(cardKey)
        if (blob) return URL.createObjectURL(blob)
      }
      const card = this.localCards.find((c) => String(c.id) === cardKey)
      const img = card?.card_images?.[0]
      return img ? this.getCanvasImageUrl(img) : null
    },

    // Carregar dados do YGOPRO2 (local) ou da API YGOPRODeck (cache).
    load_ygopro_data(key) {
      const data = this.localCardsMap[key] || this.apiCardCache[key]
      if (!data) return false
      const card = this.localCards.find((c) => String(c.id) === key)
      this.cardLang = (card && card.lang) || 'pt'
      this.loadFromSnapshot(data)
      return true
    },

    loadFromSnapshot(data) {
      this.programmaticUpdate = true
      this.cardRare = data.rare
      this.titleColor = data.color
      this.cardTitle = data.title
      this.cardImg = null
      this.cardType = data.type[0]
      this.cardSubtype = data.type[1]
      if (data.attribute !== 'Trap' && data.attribute !== 'Spell')
        this.cardAttr = data.attribute
      this.cardEff1 = data.type[2]
      this.cardEff2 = data.type[3]
      this.cardCustomRaceEnabled = false
      this.cardCustomRace = ''
      this.cardRace = data.race
      this.Pendulum = data.type[4]
      this.Special = data.type[5]
      this.cardLevel = data.level
      this.cardBLUE = data.blue
      this.cardRED = data.red
      this.cardATK = data.atk
      this.cardDEF = data.def
      for (let i = 1; i <= 9; i++)
        if (i !== 5) this.links[i].val = data[`link${i}`]
      this.cardInfo = data.infoText
      this.infoSize = data.size
      this.infoPosition =
        data.infoPosition != null ? Number(data.infoPosition) : 5
      this.cardPendulumInfo = data.pendulumText
      this.pendulumSize = data.pSize
      setTimeout(() => {
        this.programmaticUpdate = false
      }, 650)
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
  background: url('../../../static/Screentone.png') round,
    -webkit-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -webkit-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('../../../static/Screentone.png') round,
    -moz-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -moz-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('../../../static/Screentone.png') round,
    -o-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -o-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('../../../static/Screentone.png') round,
    linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background-blend-mode: multiply;
  font-family: 'Noto Sans JP', 'Noto Sans TC', 'Noto Sans SC', 'arial',
    '微軟正黑體';
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
.panel-bg {
  background-color: #5555556a;
  border-radius: 1rem;
  color: #fff;
}

.deck-name-input,
.deck-name-input:focus {
  color: #121212 !important;
}

/* Painel de busca acima do canvas para o dropdown de arquétipo aparecer */
.search-panel-col {
  position: relative;
  z-index: 1050;
}
.archetype-dropdown {
  z-index: 1060;
}

/* -------------------- Estilos de Área de Cartão -------------------- */
.padding-transition {
  transition: all 0.5s linear;
}
#yugiohcard-wrap {
  transition: transform 0.1s ease;
  transform-style: preserve-3d;
  will-change: transform;
}
#yugiohcard-wrap:hover #yugiohcard {
  transform: translateZ(12px);
}
#yugiohcard {
  transition: transform 0.3s ease;
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
  height: 200px;
  width: auto;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.search-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: 2;
}
/* Thumbnails de deck */
.deck-thumb-wrap {
  cursor: pointer;
  transition: transform 0.15s;
}
.deck-thumb-wrap:hover {
  transform: scale(1.08);
  z-index: 2;
}
.deck-thumb {
  height: 200px;
  width: auto;
  display: block;
}
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
</style>
