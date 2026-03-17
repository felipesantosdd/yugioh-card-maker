# Arquitetura Atual

## Stack oficial

O projeto ativo usa:

- Electron no processo principal em `src/main`
- preload em `src/preload`
- renderer Vue 2 + webpack em `src/renderer`

## Legado

Os arquivos baseados em Nuxt na raiz (`pages/`, `components/`, `plugins/`, `store/`, `nuxt.config.js`) permanecem apenas como referencia historica enquanto a migracao nao termina. Novas features e correcoes devem ser feitas somente na stack Electron.
