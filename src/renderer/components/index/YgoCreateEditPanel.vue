<template>
  <div class="ygo-create-edit-panel d-flex flex-column min-h-0">
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
          <b-row class="mb-3 align-items-end">
            <b-col cols="12" lg="8" class="px-2">
              <label>{{ ui[uiLang].card_name }}</label>
              <b-form-input
                :value="cardTitle"
                @input="$emit('update:cardTitle', $event)"
              ></b-form-input>
            </b-col>
            <b-col cols="12" lg="4" class="px-2 mt-3 mt-lg-0">
              <label>{{ ui[uiLang].title_color }}</label>
              <b-form-input
                :value="titleColor"
                type="color"
                @input="$emit('update:titleColor', $event)"
              ></b-form-input>
            </b-col>
          </b-row>
          <b-row v-if="!hasSavedBaseCard" class="mb-3">
            <b-col cols="12" class="px-2">
              <label>Nome em ingles</label>
              <b-form-input
                :value="cardTitleEn"
                placeholder="English card name"
                @input="$emit('update:cardTitleEn', $event)"
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
                  @input="onCardArtFileChange"
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
          <div v-if="cardArtVariants.length > 1" class="art-variants-panel mb-3">
            <label class="d-block mb-2">{{
              ui[uiLang].art_variant_select || 'Artes do card'
            }}</label>
            <div class="art-variants-list">
              <button
                v-for="(variant, index) in cardArtVariants"
                :key="variant.id"
                type="button"
                class="art-variant-tile"
                :class="{
                  active: String(selectedCardArtVariantId) === String(variant.id),
                }"
                :title="variant.label || `Arte ${index + 1}`"
                @click="$emit('select-card-art-variant', String(variant.id))"
              >
                <span
                  class="art-variant-remove"
                  title="Apagar esta arte"
                  @click.stop="$emit('delete-card-art-variant', String(variant.id))"
                >
                  ×
                </span>
                <div class="art-variant-thumb">
                  <img
                    v-if="variant.previewUrl"
                    :src="variant.previewUrl"
                    :alt="variant.label || `Arte ${index + 1}`"
                  />
                  <span v-else class="art-variant-fallback">
                    {{ index + 1 }}
                  </span>
                </div>
                <span class="art-variant-label">
                  {{ variant.label || `Arte ${index + 1}` }}
                </span>
              </button>
            </div>
            <small class="text-muted d-block mt-2">
              {{
                ui[uiLang].art_variant_hint ||
                'Clique na arte que deve ficar ativa para este card.'
              }}
            </small>
          </div>
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
                  :checked="Pendulum"
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
              v-show="cardType === 'Monster' && !isLinkMonster"
              cols="12"
              lg="8"
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
                <b-col cols="6" class="px-2">
                  <label>{{
                    ui[uiLang].pendulum_scale_single || 'Escala de Pêndulo'
                  }}</label>
                  <b-form-input
                    :value="pendulumScaleValue"
                    type="number"
                    min="0"
                    max="12"
                    @input="onPendulumScaleInput"
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
            <b-col cols="4" class="px-2">
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
            v-if="!isFieldsLocked && !deckEditLock"
            class="my-2 ml-2"
            variant="success"
            :disabled="!canSaveCurrentCard"
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
    holo: { type: Boolean, required: true },
    cardRare: { type: [String, Number], required: true },
    cardRareOpts: { type: Array, required: true },
    titleColor: { type: String, required: true },
    cardLoadYgoProEnabled: { type: Boolean, required: true },
    cardKey: { type: [String, Number], required: true },
    apiCardLoading: { type: Boolean, required: true },
    apiCardError: { type: String, default: '' },
    cardTitle: { type: String, required: true },
    cardTitleEn: { type: String, required: true },
    cardImg: { type: [File, Object, String], default: null },
    cardArtVariants: { type: Array, default: () => [] },
    selectedCardArtVariantId: { type: [String, Number, null], default: null },
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
    cardLevel: { type: [String, Number], required: true },
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
    canSaveCurrentCard: { type: Boolean, required: true },
  },
  computed: {
    artStyleOpts() {
      const u = this.ui && this.ui[this.uiLang]
      return [
        { value: 'normal', text: (u && u.art_style_normal) || 'Normal' },
        { value: 'fullart', text: (u && u.art_style_fullart) || 'Full Art' },
      ]
    },
    pendulumScaleValue() {
      return this.cardBLUE != null && this.cardBLUE !== ''
        ? this.cardBLUE
        : this.cardRED
    },
    hasSavedBaseCard() {
      return !!(this.currentBaseCard && this.cardKey)
    },
  },
  methods: {
    onCardArtFileChange(file) {
      if (file) this.$emit('upload-card-image', file)
    },
    onFullArtFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (file) this.$emit('upload-fullart', file)
      e.target.value = ''
    },
    onPendulumScaleInput(value) {
      this.$emit('update:cardBLUE', value)
      this.$emit('update:cardRED', value)
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
.art-variants-panel {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}
.art-variants-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.art-variant-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 90px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}
.art-variant-tile:hover {
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-1px);
}
.art-variant-tile.active {
  border-color: #3db8ff;
  background: rgba(61, 184, 255, 0.14);
  box-shadow: 0 0 0 1px rgba(61, 184, 255, 0.25);
}
.art-variant-thumb {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}
.art-variant-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.art-variant-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(180, 32, 32, 0.92);
  color: #fff;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.art-variant-remove:hover {
  background: rgba(220, 48, 48, 0.98);
}
.art-variant-fallback {
  font-size: 18px;
  font-weight: 700;
  opacity: 0.8;
}
.art-variant-label {
  max-width: 100%;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 991.98px) {
  .fullart-and-upload-row .fullart-toggle-col,
  .fullart-and-upload-row .card-art-upload-col {
    flex: 0 0 100%;
    max-width: 100%;
  }
  .fullart-and-upload-row .card-art-upload-col {
    margin-top: 12px;
  }
}
</style>

