<template>
  <div id="app">
    <!-- Área do título -->
    <header>
      <b-navbar type="dark" fixed="top">
        <div class="text-center text-white mx-auto">yugioh card makers</div>
      </b-navbar>
    </header>

    <!-- Área de conteúdo principal -->
    <main class="container-fluid mt-5 mb-3 h-100 py-3 py-md-5 px-0 px-sm-5">
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
                  class="card-body"
                  @mousemove="move"
                  @mouseleave="leave"
                >
                  <canvas
                    id="yugiohcard"
                    ref="yugiohcard"
                    class="cardbg img-fluid"
                  ></canvas>
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
            <div class="card-body">
              <!-- Idioma, Antifalsificação, Raridade, Cor -->
              <b-row class="mb-3">
                <!-- Idioma -->
                <b-col class="px-2">
                  <label>{{ ui[uiLang].ui_lang }}</label>
                  <b-form-select
                    v-model="uiLang"
                    :options="uiLangOpts"
                  ></b-form-select>
                </b-col>
              </b-row>

              <!-- Idioma, Autenticidade, Raridade, Cor -->
              <b-row class="mb-3">
                <!-- Idioma -->
                <b-col cols="6" lg="3" class="px-2">
                  <label>{{ ui[uiLang].card_lang }}</label>
                  <b-form-select
                    v-model="cardLang"
                    :options="cardLangOpts"
                  ></b-form-select>
                </b-col>
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
                      >{{ ui[uiLang].auto_fill_card_data }}</b-form-checkbox
                    >
                  </div>
                </b-col>
                <b-col cols="6" lg="8" class="px-2">
                  <label
                    ><small>{{ ui[uiLang].card_secret_note }}</small></label
                  >
                  <b-form-input
                    v-model="cardKey"
                    type="number"
                    maxlength="8"
                    :placeholder="ui[uiLang].plz_input_card_secret"
                  />
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
                <b-col v-show="canPendulumEnabled" cols="6" lg="4" class="px-2">
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
                <b-col v-show="cardType === 'Monster'" cols="4" class="px-2">
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
                          >{{ links[row * 3 + col].symbol }}</b-form-checkbox
                        >
                      </td>
                    </tr>
                  </table>
                </b-col>

                <!-- Tamanho do texto -->
                <b-col cols="4" class="px-2">
                  <label>{{ ui[uiLang].text_size }}</label>
                  <b-form-input v-model="infoSize" type="number"></b-form-input>
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

              <!-- Área de botões -->
              <b-row class="my-3">
                <b-col class="px-2">
                  <button
                    type="button"
                    class="my-2 btn btn-info"
                    @click="doDrawCard"
                  >
                    {{ ui[uiLang].generate }}</button
                  >&emsp;
                  <button
                    type="button"
                    class="my-2 btn btn-success"
                    @click="download_img"
                  >
                    {{ ui[uiLang].download }}
                  </button>
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
          </div>
        </b-col>
      </b-row>
    </main>

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
              aria-label="Star linziyou0601/yugioh-card-maker on GitHub"
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
              aria-label="Star linziyou0601/yugioh-card-maker on GitHub"
            >
              <fa :icon="['fab', 'github']" /> GitHub
            </a>
          </div>
        </b-col>
      </b-row>
    </footer>

    <LoadingDialog />
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import ui from '../static/lang.ui.json'
import cardMeta from '../static/lang.card_meta.json'
import ygoproData from '../static/ygo/card_data.json'

export default {
  data() {
    return {
      adCollapsed: false,
      pageScrolling: 0,

      uiLang: 'pt',
      ui,
      cardLang: 'pt',
      cardMeta,

      holo: true,
      cardRare: '0',
      cardRareOpts: {
        0: 'N',
        1: 'R',
        2: 'UR',
      },
      titleColor: '#000000',
      cardLoadYgoProEnabled: true,
      cardKey: '',
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
      cardLevelOpts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
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
      cardInfo: '',

      imgs: {},
    }
  },
  computed: {
    uiLangOpts() {
      return Object.fromEntries(
        Object.keys(this.ui).map((key) => [key, this.ui[key].name || key])
      )
    },
    cardLangOpts() {
      return Object.fromEntries(
        Object.keys(this.cardMeta).map((key) => [
          key,
          this.cardMeta[key].name || key,
        ])
      )
    },
    cardTypeOpts() {
      return {
        Monster: this.ui[this.uiLang].monster_card,
        Spell: this.ui[this.uiLang].spell_card,
        Trap: this.ui[this.uiLang].trap_card,
      }
    },
    cardSubtypeOpts() {
      return {
        Monster: {
          Normal: this.ui[this.uiLang].m_card.normal,
          Effect: this.ui[this.uiLang].m_card.effect,
          Fusion: this.ui[this.uiLang].m_card.fusion,
          Ritual: this.ui[this.uiLang].m_card.ritual,
          Synchro: this.ui[this.uiLang].m_card.synchro,
          Xyz: this.ui[this.uiLang].m_card.xyz,
          Link: this.ui[this.uiLang].m_card.link,
          Token: this.ui[this.uiLang].m_card.token,
          Slifer: this.ui[this.uiLang].m_card.slifer,
          Ra: this.ui[this.uiLang].m_card.ra,
          Obelisk: this.ui[this.uiLang].m_card.obelisk,
          LDragon: this.ui[this.uiLang].m_card.ldragon,
        },
        Spell: {
          Normal: this.ui[this.uiLang].st_card.normal,
          Continuous: this.ui[this.uiLang].st_card.continuous,
          Field: this.ui[this.uiLang].st_card.field,
          Equip: this.ui[this.uiLang].st_card.equip,
          Quick: this.ui[this.uiLang].st_card.quick,
          Ritual: this.ui[this.uiLang].st_card.ritual,
        },
        Trap: {
          Normal: this.ui[this.uiLang].st_card.normal,
          Continuous: this.ui[this.uiLang].st_card.continuous,
          Counter: this.ui[this.uiLang].st_card.counter,
        },
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
      return {
        fiend: this.ui[this.uiLang].card_race_type_opts.fiend,
        zombie: this.ui[this.uiLang].card_race_type_opts.zombie,
        sea_serpent: this.ui[this.uiLang].card_race_type_opts.sea_serpent,
        thunder: this.ui[this.uiLang].card_race_type_opts.thunder,
        rock: this.ui[this.uiLang].card_race_type_opts.rock,
        machine: this.ui[this.uiLang].card_race_type_opts.machine,
        dinosaur: this.ui[this.uiLang].card_race_type_opts.dinosaur,
        beast: this.ui[this.uiLang].card_race_type_opts.beast,
        insect: this.ui[this.uiLang].card_race_type_opts.insect,
        fish: this.ui[this.uiLang].card_race_type_opts.fish,
        plant: this.ui[this.uiLang].card_race_type_opts.plant,
        beast_warrior: this.ui[this.uiLang].card_race_type_opts.beast_warrior,
        warrior: this.ui[this.uiLang].card_race_type_opts.warrior,
        winged_beast: this.ui[this.uiLang].card_race_type_opts.winged_beast,
        fairy: this.ui[this.uiLang].card_race_type_opts.fairy,
        dragon: this.ui[this.uiLang].card_race_type_opts.dragon,
        reptile: this.ui[this.uiLang].card_race_type_opts.reptile,
        aqua: this.ui[this.uiLang].card_race_type_opts.aqua,
        pyro: this.ui[this.uiLang].card_race_type_opts.pyro,
        spellcaster: this.ui[this.uiLang].card_race_type_opts.spellcaster,
        wyrm: this.ui[this.uiLang].card_race_type_opts.wyrm,
        cyberse: this.ui[this.uiLang].card_race_type_opts.cyberse,
        psychic: this.ui[this.uiLang].card_race_type_opts.psychic,
        divine_beast: this.ui[this.uiLang].card_race_type_opts.divine_beast,
        creator_god: this.ui[this.uiLang].card_race_type_opts.creator_god,
      }
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
      return Object.fromEntries(
        Object.keys(this.cardEffOpts)
          .filter((key) => {
            // Remova "none" e remova duplicatas com "Eff2" (exceto quando o valor for "normal")
            return key !== 'none' && (key === 'normal' || key !== this.cardEff2)
          })
          .map((key) => [key, this.cardEffOpts[key]])
      )
    },
    cardEff2Opts() {
      return Object.fromEntries(
        Object.keys(this.cardEffOpts)
          .filter((key) => {
            // Remova duplicatas com "Eff1" (exceto quando o valor for "normal")）
            return key === 'normal' || key !== this.cardEff1
          })
          .map((key) => {
            return [
              key,
              key === 'normal'
                ? this.ui[this.uiLang].m_card.effect
                : this.cardEffOpts[key],
            ]
          })
      )
    },
  },
  watch: {
    uiLang() {
      if (this.cardLangOpts[this.uiLang]) this.cardLang = this.uiLang
    },
    cardLang() {
      if (this.cardKey === '') this.load_default_data()
    },
    cardType() {
      this.cardSubtype = 'Normal'
      if (this.cardType !== 'Monster') this.Pendulum = false
    },
    cardSubtype() {
      if (['Slifer', 'Ra', 'Obelisk', 'LDragon'].includes(this.cardSubtype))
        this.Pendulum = false
    },
  },
  mounted() {
    window.addEventListener('scroll', this.onScroll)
    this.fireLoadingDialog()
    this.load_default_data()
    setInterval(this.drawCard, 1500)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.onScroll)
  },
  methods: {
    ...mapMutations(['fireLoadingDialog', 'closeLoadingDialog']),

    doDrawCard() {
      this.fireLoadingDialog()
      this.drawCard()
    },

    // Preparação antes da criação do cartão
    drawCard() {
      let cardImgUrl = this.cardImg ? URL.createObjectURL(this.cardImg) : null
      const templateLang = this.cardMeta[this.cardLang]._templateLang
      if (this.cardLoadYgoProEnabled) {
        const hasData = this.load_ygopro_data(this.cardKey)
        if (hasData) cardImgUrl = `ygo/pics/${this.cardKey}.jpg`
      }
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
        photo: cardImgUrl || 'images/default.jpg',
        levelOrSubtype:
          this.cardType !== 'Monster' && this.cardSubtype !== 'Normal'
            ? `images/pic/${this.cardSubtype}.webp`
            : `images/pic/${this.isXyzMonster ? 'Rank' : 'Level'}.webp`,
      }
      this.drawCardLoadingImages(this.drawCardProcess) // Após carregar a imagem do cartão, desenhe o conteúdo do cartão.
    },

    // Carregando a imagem do cartão.
    drawCardLoadingImages(callback) {
      const length = Object.keys(this.imgs).length
      let count = 0
      for (const key in this.imgs) {
        const image = new window.Image()
        image.src = this.imgs[key]
        this.imgs[key] = image
        this.imgs[key].onload = function () {
          count += 1
          if (count >= length) setTimeout(callback, 200)
        }
      }
    },

    // Fluxo principal de desenho do cartão.
    drawCardProcess() {
      const canvas = this.$refs.yugiohcard
      const ctx = canvas.getContext('2d')
      canvas.width = 1000
      canvas.height = 1450

      const langStr = this.cardMeta[this.cardLang]
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
      const iW = (photo.width / photo.height) * cH
      const iH = (photo.height / photo.width) * cW
      if (photo.width <= photo.height * (this.Pendulum ? 1.33 : 1))
        ctx.drawImage(photo, cX, cY - (iH - cH) / 2, cW, iH)
      else ctx.drawImage(photo, cX - (iW - cW) / 2, cY, iW, cH)
      ctx.drawImage(this.imgs.template, 0, 0, 1000, 1450)
      ctx.drawImage(this.imgs.attr, 840, 68, 90, 90)
    },

    // // Fluxo principal de desenho - Título.
    drawCardTitle(ctx, offset, fontName) {
      ctx.font = `${57 + offset.tS}pt ${fontName[0]}, ${fontName[3]}, ${
        fontName[4]
      }, ${fontName[5]}`
      ctx.fillStyle = this.rareColor(ctx)
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
        // Tipo de Carta Mágica
        // Armadilha
        const typeText =
          (this.cardType === 'Spell' ? langStr.Spell : langStr.Trap) +
          (this.cardSubtype === 'Normal' ? '' : langStr.SEP)
        ctx.textAlign = 'right'
        ctx.fillText(
          `${langStr.QUOTE_L}${typeText}${langStr.QUOTE_R}`,
          920 + offset.sX1,
          222 + offset.sY1
        ) // Carta de Magia/Armadilha
        if (this.cardSubtype !== 'Normal')
          ctx.drawImage(
            this.imgs.levelOrSubtype,
            820 + offset.sX2,
            178 + offset.sY2,
            58,
            58
          ) // Subtipo de Magia/Armadilha
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
      const fontSize = Number(this.pendulumSize)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      this.wrapText(
        ctx,
        this.cardPendulumInfo,
        160,
        920 + offset.oY,
        660,
        fontSize + offset.lh
      )
    },

    // Preencha a descrição do cartão.
    drawCardInfoText(ctx, offset, fontName) {
      const fontSize = Number(this.infoSize)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = `${fontSize}pt ${fontName[2]}, ${fontName[3]}, ${fontName[4]}, ${fontName[5]}`
      this.wrapText(
        ctx,
        this.cardInfo,
        75,
        1095 + offset.oY + (this.cardType === 'Monster' ? 30 : 0),
        825,
        fontSize + offset.lh
      )
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

    // Área de texto.
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      let lineWidth = 0 - ctx.measureText(text[0]).width // Largura da linha atualmente ocupada.
      const fieldWidth = maxWidth // Largura do campo.
      let initHeight = y // Altura do texto em relação ao topo da imagem.
      let lastSubStrIndex = 0 // Altura do texto em relação ao topo da imagem.
      for (let i = 0; i < text.length; i++) {
        lineWidth += ctx.measureText(text[i]).width
        if (lineWidth > fieldWidth || text.substring(i, i + 1) === '\n') {
          if (text.substring(i, i + 1) === '\n') i++
          ctx.fillText(text.substring(lastSubStrIndex, i), x, initHeight)
          initHeight += lineHeight
          lineWidth = 0
          lastSubStrIndex = i
        }
        if (i === text.length - 1) {
          // Se a linha atual não exceder o comprimento máximo e já for a última palavra, preencha diretamente.
          ctx.fillText(text.substring(lastSubStrIndex, i + 1), x, initHeight)
        }
      }
    },

    // Baixar Card.
    download_img() {
      const canvas = this.$refs.yugiohcard
      if (canvas.msToBlob) {
        // para o Internet Explorer.
        const blob = canvas.msToBlob()
        window.navigator.msSaveBlob(blob, 'YuGiOh.png')
      } else {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/jpeg')
        a.download = 'YuGiOh.jpg'
        a.click()
      }
    },

    // Carregar configuração padrão.
    load_default_data() {
      const data = this.cardMeta[this.cardLang].Default
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
      this.cardPendulumInfo = data.pInfo
      this.pendulumSize = data.pSize
    },

    // Carregar dados do YGOPRO2.
    load_ygopro_data(key) {
      const data = ygoproData[key]
      if (!data) return false
      this.cardLang = 'zh'
      this.cardRare = data.rare
      this.titleColor = data.color
      this.cardTitle = data.title
      this.cardImg = null //
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
      this.cardPendulumInfo = data.pendulumText
      this.pendulumSize = data.pSize
      return true
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
  background: url('~static/Screentone.png') round,
    -webkit-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -webkit-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('~static/Screentone.png') round,
    -moz-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -moz-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('~static/Screentone.png') round,
    -o-linear-gradient(to bottom right, #000000bb, #66666699, #000000bb),
    -o-linear-gradient(to bottom left, #111111bb, #11111199, #111111bb);
  background: url('~static/Screentone.png') round,
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
</style>
