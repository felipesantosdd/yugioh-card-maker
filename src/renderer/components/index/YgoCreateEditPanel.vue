<template>
  <div class="ygo-create-edit-panel d-flex flex-column min-h-0">
    <div
      v-if="currentBaseCard"
      class="
        d-flex
        justify-content-end
        align-items-center
        flex-shrink-0
        h-200%
      "
    >
      <b-button
        size="sm"
        :variant="baseCardNeedsTranslation ? 'warning' : 'outline-warning'"
        @click="$emit('open-translation-modal')"
      >
        <fa :icon="['fas', 'language']" class="mr-1" />
        {{ ui[uiLang].translate || 'Traduzir' }}
      </b-button>
    </div>
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
      <span></span>
    </div>
    <div
      class="
        data-panel-editor-scroll
        d-flex
        flex-column flex-grow-1
        min-h-0
      "
    >
      <fieldset
        :disabled="isFieldsLocked || deckEditLock"
        class="d-flex flex-column data-panel-fieldset"
      >
        <div
          class="card-body card-form-scroll"
          :class="{ 'form-faded': deckEditLock }"
        >
          <b-row class="mb-3">
            <b-col cols="6" lg="3" class="px-2">
              <div class="form-check px-0">
                <label>{{ ui[uiLang].square_foil_stamp }}</label>
                <b-form-checkbox
                  :value="holo"
                  :class="{
                    'checkbox-wrap': true,
                    active: holo,
                  }"
                  button
                  @input="$emit('update:holo', $event)"
                  >{{ holo ? ui[uiLang].on : ui[uiLang].off }}</b-form-checkbox
                >
              </div>
            </b-col>
            <b-col cols="6" lg="3" class="px-2">
              <label>{{ ui[uiLang].rarity }}</label>
              <b-form-select
                :value="cardRare"
                :options="cardRareOpts"
                @input="$emit('update:cardRare', $event)"
              ></b-form-select>
            </b-col>
            <b-col cols="6" lg="3" class="px-2">
              <label>{{ ui[uiLang].title_color }}</label>
              <b-form-input
                :value="titleColor"
                type="color"
                @input="$emit('update:titleColor', $event)"
              ></b-form-input>
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col cols="6" lg="4" class="px-2">
              <div class="form-check px-0">
                <label>{{ ui[uiLang].card_secret }}</label>
                <b-form-checkbox
                  :value="cardLoadYgoProEnabled"
                  :class="{
                    'checkbox-wrap': true,
                    active: cardLoadYgoProEnabled,
                  }"
                  button
                  @input="$emit('update:cardLoadYgoProEnabled', $event)"
                  >{{ ui[uiLang].auto_fill_card_data }}</b-form-checkbox
                >
              </div>
            </b-col>
            <b-col cols="6" lg="8" class="px-2">
              <label
                ><small>{{ ui[uiLang].card_secret_note }}</small></label
              >
              <b-form-input
                :value="cardKey"
                type="number"
                maxlength="8"
                :placeholder="ui[uiLang].plz_input_card_secret"
                @input="$emit('update:cardKey', $event)"
              />
              <small v-if="apiCardLoading" class="text-muted">{{
                ui[uiLang].search_loading
              }}</small>
              <small v-else-if="apiCardError" class="text-danger">{{
                apiCardError
              }}</small>
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col class="px-2">
              <label>{{ ui[uiLang].card_name }}</label>
              <b-form-input
                :value="cardTitle"
                @input="$emit('update:cardTitle', $event)"
              ></b-form-input>
            </b-col>
          </b-row>
          <b-row class="my-3 fullart-and-upload-row">
            <b-col class="px-2 fullart-toggle-col">
              <label class="d-block">{{ ui[uiLang].art_style || 'Estilo da arte' }}</label>
              <b-form-checkbox
                :checked="fullart"
                :class="{ 'checkbox-wrap': true, active: fullart }"
                button
                switch
                @input="$emit('update:fullart', $event)"
              >
                {{ fullart ? (ui[uiLang].art_style_fullart || 'Full Art') : (ui[uiLang].art_style_normal || 'Normal') }}
              </b-form-checkbox>
            </b-col>
            <b-col class="px-2 card-art-upload-col">
              <template v-if="!fullart">
                <label class="d-block">{{ ui[uiLang].upload_image }}</label>
                <b-form-file
                  :value="cardImg"
                  :state="Boolean(cardImg)"
                  :placeholder="ui[uiLang].upload_image"
                  browse="✚"
                  accept="image/*"
                  :drop-placeholder="ui[uiLang].drag_and_drop"
                  @input="$emit('update:cardImg', $event)"
                ></b-form-file>
              </template>
              <template v-else>
                <label class="d-block">{{ ui[uiLang].fullart_upload || 'Enviar imagem Full Art' }}</label>
                <template v-if="hasCardFullArt">
                  <span class="text-success small mr-2">
                    {{ ui[uiLang].fullart_defined || 'Imagem Full Art definida' }}
                  </span>
                  <b-button size="sm" variant="outline-light" @click="$refs.fullartFileInput.click()">
                    {{ ui[uiLang].fullart_change || 'Trocar' }}
                  </b-button>
                </template>
                <b-button
                  v-else
                  size="sm"
                  variant="outline-info"
                  @click="$refs.fullartFileInput.click()"
                >
                  {{ ui[uiLang].fullart_upload || 'Enviar imagem Full Art' }}
                </b-button>
                <input
                  ref="fullartFileInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="onFullArtFileChange"
                />
              </template>
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col cols="6" lg="3" class="px-2">
              <label>{{ ui[uiLang].card_type }}</label>
              <b-form-select
                :value="cardType"
                :options="cardTypeOpts"
                @input="$emit('update:cardType', $event)"
              ></b-form-select>
            </b-col>
            <b-col cols="6" lg="3" class="px-2">
              <label>{{ ui[uiLang].card_subtype }}</label>
              <b-form-select
                :value="cardSubtype"
                :options="cardSubtypeOpts[cardType]"
                @input="$emit('update:cardSubtype', $event)"
              ></b-form-select>
            </b-col>
            <b-col
              v-show="cardType === 'Monster'"
              cols="6"
              lg="3"
              class="px-2"
            >
              <label>{{ ui[uiLang].card_effect }}</label>
              <b-form-select
                :value="cardEff1"
                :options="cardEff1Opts"
                @input="$emit('update:cardEff1', $event)"
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
                :value="cardEff2"
                :options="cardEff2Opts"
                @input="$emit('update:cardEff2', $event)"
              ></b-form-select>
            </b-col>
          </b-row>
          <b-row v-show="cardType === 'Monster'" class="my-3">
            <b-col cols="12" lg="6" class="px-2">
              <label>{{ ui[uiLang].card_attribute }}</label>
              <b-form-select
                :value="cardAttr"
                :options="cardAttrOpts"
                @input="$emit('update:cardAttr', $event)"
              ></b-form-select>
            </b-col>
            <b-col
              v-show="cardType === 'Monster'"
              cols="6"
              lg="3"
              class="px-2"
            >
              <div class="form-check px-0">
                <label>{{ ui[uiLang].card_race_type }}</label>
                <b-form-checkbox
                  :value="cardCustomRaceEnabled"
                  :class="{
                    'checkbox-wrap': true,
                    active: cardCustomRaceEnabled,
                  }"
                  button
                  @input="$emit('update:cardCustomRaceEnabled', $event)"
                  >{{ ui[uiLang].custom }}</b-form-checkbox
                >
              </div>
            </b-col>
            <b-col
              v-show="!cardCustomRaceEnabled"
              cols="6"
              lg="3"
              class="px-2"
            >
              <label>&emsp;</label>
              <b-form-select
                :value="cardRace"
                :options="cardRaceOpts"
                @input="$emit('update:cardRace', $event)"
              ></b-form-select>
            </b-col>
            <b-col
              v-show="cardCustomRaceEnabled"
              cols="6"
              lg="3"
              class="px-2"
            >
              <label>&emsp;</label>
              <b-form-input
                :value="cardCustomRace"
                type="text"
                maxlength="8"
                :placeholder="ui[uiLang].plz_input_race_type"
                @input="$emit('update:cardCustomRace', $event)"
              />
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col
              v-show="canPendulumEnabled"
              cols="6"
              lg="4"
              class="px-2"
            >
              <div class="form-check px-0">
                <label>&emsp;</label>
                <b-form-checkbox
                  :value="Pendulum"
                  :class="{
                    'checkbox-wrap': true,
                    active: Pendulum,
                  }"
                  button
                  @input="$emit('update:Pendulum', $event)"
                  >{{ ui[uiLang].pendulum }}</b-form-checkbox
                >
              </div>
            </b-col>
            <b-col
              v-show="cardType === 'Monster'"
              cols="6"
              lg="4"
              class="px-2"
            >
              <div class="form-check px-0">
                <label>&emsp;</label>
                <b-form-checkbox
                  :value="Special"
                  :class="{
                    'checkbox-wrap': true,
                    active: Special,
                  }"
                  button
                  @input="$emit('update:Special', $event)"
                  >{{ ui[uiLang].special_summon }}</b-form-checkbox
                >
              </div>
            </b-col>
            <b-col
              v-show="cardType === 'Monster' && !isLinkMonster"
              cols="12"
              lg="4"
              class="px-2"
            >
              <label>{{ ui[uiLang].lavel_and_rank }}</label>
              <b-form-select
                :value="cardLevel"
                :options="cardLevelOpts"
                @input="$emit('update:cardLevel', $event)"
              ></b-form-select>
            </b-col>
          </b-row>
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
                    :value="cardBLUE"
                    type="number"
                    min="0"
                    max="12"
                    @input="$emit('update:cardBLUE', $event)"
                  ></b-form-input>
                </b-col>
                <b-col cols="4" class="px-2">
                  <label>{{ ui[uiLang].pendulum_red }}</label>
                  <b-form-input
                    :value="cardRED"
                    type="number"
                    min="0"
                    max="12"
                    @input="$emit('update:cardRED', $event)"
                  ></b-form-input>
                </b-col>
                <b-col cols="4" class="px-2">
                  <label>{{ ui[uiLang].text_size }}</label>
                  <b-form-input
                    :value="pendulumSize"
                    type="number"
                    @input="$emit('update:pendulumSize', $event)"
                  ></b-form-input>
                </b-col>
              </b-row>
              <b-row class="my-3">
                <b-col class="px-2">
                  <label>{{
                    ui[uiLang].pendulum_effect_label || 'Efeito de Pêndulo'
                  }}</label>
                  <b-form-textarea
                    :value="cardPendulumInfo"
                    rows="5"
                    @input="$emit('update:cardPendulumInfo', $event)"
                  ></b-form-textarea>
                </b-col>
              </b-row>
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col
              v-show="cardType === 'Monster'"
              cols="4"
              class="px-2"
            >
              <label>{{ ui[uiLang].attack }}</label>
              <b-form-input
                :value="cardATK"
                type="text"
                maxlength="6"
                @input="$emit('update:cardATK', $event)"
              ></b-form-input>
            </b-col>
            <b-col
              v-show="cardType === 'Monster' && !isLinkMonster"
              cols="4"
              class="px-2"
            >
              <label>{{ ui[uiLang].defence }}</label>
              <b-form-input
                :value="cardDEF"
                type="text"
                maxlength="6"
                @input="$emit('update:cardDEF', $event)"
              ></b-form-input>
            </b-col>
            <b-col v-show="isLinkMonster" cols="4" class="px-2">
              <label>{{ ui[uiLang].link }}</label>
              <table>
                <tr v-for="row in [0, 1, 2]" :key="row">
                  <td v-for="col in [1, 2, 3]" :key="col">
                    <b-form-checkbox
                      v-if="row * 3 + col !== 5"
                      :value="links[row * 3 + col].val"
                      :class="{
                        'checkbox-wrap': true,
                        active: links[row * 3 + col].val,
                      }"
                      button
                      @input="$emit('update:link', { index: row * 3 + col, value: $event })"
                      >{{ links[row * 3 + col].symbol }}</b-form-checkbox
                    >
                  </td>
                </tr>
              </table>
            </b-col>
            <b-col cols="2" class="px-2">
              <label>{{ ui[uiLang].text_size }}</label>
              <b-form-input
                :value="infoSize"
                type="number"
                @input="$emit('update:infoSize', $event)"
              ></b-form-input>
            </b-col>
            <b-col cols="2" class="px-2">
              <label>{{ ui[uiLang].text_position }}</label>
              <b-form-input
                :value="infoPosition"
                type="number"
                placeholder="0"
                @input="$emit('update:infoPosition', $event)"
              ></b-form-input>
            </b-col>
          </b-row>
          <b-row class="my-3">
            <b-col class="px-2">
              <label>{{
                Pendulum
                  ? ui[uiLang].monster_effect_label || 'Efeito de Monstro'
                  : ui[uiLang].card_info_text
              }}</label>
              <b-form-textarea
                :value="cardInfo"
                rows="5"
                @input="$emit('update:cardInfo', $event)"
              ></b-form-textarea>
            </b-col>
          </b-row>
        </div>
      </fieldset>
      <b-row class="my-3 mx-0 flex-shrink-0">
        <b-col class="px-2">
          <button
            type="button"
            class="my-2 btn btn-success"
            @click="$emit('download-img')"
          >
            {{ ui[uiLang].download }}
          </button>
          <b-button
            v-if="hasUnsavedLayoutChanges"
            class="my-2 ml-2"
            variant="success"
            @click="$emit('save-deck-card-changes')"
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
            @click="$emit('load-default-data')"
          >
            {{ ui[uiLang].reset_to_default }}
          </button>
        </b-col>
      </b-row>
    </div>
  </div>
</template>

<script>
export default {
  name: 'YgoCreateEditPanel',
  props: {
    ui: { type: Object, required: true },
    uiLang: { type: String, required: true },
    currentBaseCard: { type: Object, default: null },
    isFieldsLocked: { type: Boolean, required: true },
    deckEditLock: { type: Boolean, required: true },
    baseCardNeedsTranslation: { type: Boolean, required: true },
    holo: { type: Boolean, required: true },
    cardRare: { type: [String, Number], required: true },
    cardRareOpts: { type: Array, required: true },
    titleColor: { type: String, required: true },
    cardLoadYgoProEnabled: { type: Boolean, required: true },
    cardKey: { type: [String, Number], required: true },
    apiCardLoading: { type: Boolean, required: true },
    apiCardError: { type: String, default: '' },
    cardTitle: { type: String, required: true },
    cardImg: { type: [File, Object, String], default: null },
    fullart: { type: Boolean, default: false },
    hasCardFullArt: { type: Boolean, default: false },
    cardType: { type: String, required: true },
    cardTypeOpts: { type: Array, required: true },
    cardSubtype: { type: String, required: true },
    cardSubtypeOpts: { type: Object, required: true },
    cardEff1: { type: String, required: true },
    cardEff1Opts: { type: Array, required: true },
    cardEff2: { type: String, required: true },
    cardEff2Opts: { type: Array, required: true },
    cardAttr: { type: String, required: true },
    cardAttrOpts: { type: Array, required: true },
    cardCustomRaceEnabled: { type: Boolean, required: true },
    cardCustomRace: { type: String, required: true },
    cardRace: { type: String, required: true },
    cardRaceOpts: { type: Array, required: true },
    canPendulumEnabled: { type: Boolean, required: true },
    Pendulum: { type: Boolean, required: true },
    Special: { type: Boolean, required: true },
    cardLevel: { type: Number, required: true },
    cardLevelOpts: { type: Array, required: true },
    cardBLUE: { type: [String, Number], required: true },
    cardRED: { type: [String, Number], required: true },
    pendulumSize: { type: [String, Number], required: true },
    cardPendulumInfo: { type: String, required: true },
    cardATK: { type: String, required: true },
    cardDEF: { type: String, required: true },
    isLinkMonster: { type: Boolean, required: true },
    links: { type: Object, required: true },
    infoSize: { type: [String, Number], required: true },
    infoPosition: { type: [String, Number], required: true },
    cardInfo: { type: String, required: true },
    hasUnsavedLayoutChanges: { type: Boolean, required: true },
  },
  computed: {
    artStyleOpts() {
      const u = this.ui && this.ui[this.uiLang]
      return [
        { value: 'normal', text: (u && u.art_style_normal) || 'Normal' },
        { value: 'fullart', text: (u && u.art_style_fullart) || 'Full Art' },
      ]
    },
  },
  methods: {
    onFullArtFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (file) this.$emit('upload-fullart', file)
      e.target.value = ''
    },
  },
}
</script>

<style scoped>
.fullart-and-upload-row {
  display: flex;
  align-items: flex-end;
}
.fullart-and-upload-row .fullart-toggle-col {
  flex: 0 0 20%;
  max-width: 20%;
}
.fullart-and-upload-row .card-art-upload-col {
  flex: 1 1 80%;
  max-width: 80%;
}
</style>

