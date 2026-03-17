module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,
  },
  extends: ['plugin:vue/recommended', 'prettier'],
  ignorePatterns: ['dist/', 'release/', '.nuxt/', 'static/ygo/pics/', 'static/ygo/thumbs/'],
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}
