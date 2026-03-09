# Verificação de performance – Yu-Gi-Oh Card Maker

**Data:** Março 2025  
**Escopo:** `src/renderer/pages/index.vue`, store, fluxos de busca e desenho do card.

---

## 1. Resumo executivo

| Área              | Status   | Impacto |
|-------------------|----------|---------|
| Redesenho do card | Corrigido | Alto    |
| Loading infinito  | Corrigido | Alto    |
| Computed pesados  | Atenção  | Médio   |
| Busca (searchCards)| Atenção | Médio   |
| Timers / cleanup  | Atenção  | Baixo   |
| v-for / listas   | OK       | Baixo   |

---

## 2. O que já foi corrigido (sessões anteriores)

- **`setInterval(this.drawCard, 1500)` removido** – Redesenho a cada 1,5 s causava uso constante de CPU e travamentos. Substituído por `scheduleDrawCard()` com `requestAnimationFrame` e reatividade via `cardDisplayDeps`.
- **Timeout em `ensureCardImage`** – `$ygoDb.getCardImage()` com timeout de 8 s e fallback de 20 s em `doApplyCardFromSearch` para evitar loading infinito ao clicar em cards.
- **`beforeDestroy`** – Uso de `cancelAnimationFrame(this._drawCardRaf)` para evitar vazamento e callbacks após destroy.

---

## 3. Pontos de atenção (recomendações)

### 3.1 Computed pesados com `localCards` grande

- **`localCardsMap()`**  
  - Recalcula um mapa de **todos** os `localCards` e chama `map_ygoprodeck_to_internal(card)` por card.  
  - Usado em: `load_ygopro_data`, `fetchCardFromApi`, watcher de `cardKey`, `restoreLastCard`, etc.  
  - **Risco:** Com 10k+ cartas, qualquer dependência reativa que toque nesse computed pode causar picos de CPU.  
  - **Sugestão:** Manter o mapa em `data` (ou em um módulo/cache) e atualizá-lo apenas quando `localCards` mudar (ex.: após sync), em vez de um computed que recalcula sempre que acessado.

- **`nameIndexMap()`**  
  - Percorre todo `localCards`, normaliza nomes EN/PT e monta um `Map`.  
  - Usado em `findCardsByExtractedNames` (que é usada em `buildRelatedCards` e na busca).  
  - **Risco:** O(n) a cada acesso ao computed; em buscas/relacionados pode ser chamado várias vezes.  
  - **Sugestão:** Cache ou atualização sob demanda (ex.: só quando `localCards` mudar), em vez de computed puro.

- **`filteredCardsByName()`**  
  - `this.localCards.filter(...)` a cada alteração de `searchByName`.  
  - **Risco:** Com 10k+ cartas, cada tecla no campo “busca por nome” dispara um filter em 10k itens.  
  - **Sugestão:** Debounce de 150–200 ms no input e/ou limitar o resultado (ex.: `.slice(0, 50)`) antes de passar para o template. O template já usa `.slice(0, 15)`; o custo está no filter completo.

### 3.2 `getCurrentCardSnapshot()` e `JSON.stringify`

- **Onde é usado:**  
  - `cardDisplayDeps` (computed) → `JSON.stringify(this.getCurrentCardSnapshot())`  
  - `hasUnsavedLayoutChanges` → compara `JSON.stringify(this.snapshotAtLoad)` com `JSON.stringify(current)`  
  - `currentSnapshotForAutoSave` → `{ cardKey, ...getCurrentCardSnapshot() }`  

- **Risco:** Várias chamadas a `getCurrentCardSnapshot()` e `JSON.stringify` em mudanças de formulário (digitação, selects, etc.). Custo é moderado por chamada, mas pode somar em telas muito reativas.  
- **Sugestão:** Manter como está por enquanto; se surgir lag ao editar o card, considerar cache do snapshot (ex.: só recalcular quando um subconjunto de campos mudar) ou comparação sem stringify (comparar campos críticos).

### 3.3 Busca (`searchCards()`)

- **Fluxo atual:**  
  - `localCards.map(getCardMatchInfo)` → filter → sort  
  - Para os primeiros 3 resultados, chama `buildRelatedCards(primary, 2)` e expande relacionados.  
  - Monta `searchResults` com slices (100 arquétipo, 100 nome, 100 desc, 100 relacionados).  

- **Risco:** Com 10k+ cartas, o `.map` + `.filter` + `.sort` é pesado; `buildRelatedCards` (que usa `nameIndexMap`, `findCardsByExtractedNames`, `findCardsMentioning`) repete trabalho para cada um dos 3 primários.  
- **Sugestão:**  
  - Rodar a busca em `requestIdleCallback` ou em um worker (se o banco for só em memória/JSON).  
  - Ou limitar o conjunto antes do map (ex.: por arquétipo primeiro, depois nome/desc).  
  - Manter `buildRelatedCards` apenas para os 3 primeiros está ok; evitar chamar para muitos cards.

### 3.4 Carregamento de imagens do card (`drawCardLoadingImages`)

- **Comportamento:** Cria várias `new Image()`, define `onload`/`onerror`, e usa um `setTimeout(finish, 10000)` como fallback.  
- **Risco:** Timeout de 10 s é longo; em conexão lenta o usuário espera bastante.  
- **Sugestão:** Reduzir para 5 s ou menos e garantir que `finish` sempre chame `closeLoadingDialog()` (para não deixar loading travado).

### 3.5 Timers e cleanup em `beforeDestroy`

- **Timers que não são cancelados no destroy:**  
  - `apiCardFetchTimer`  
  - `autoSaveTimer`  
  - `_saveLastCardTimer`  

- **Risco:** Se o usuário sair da tela/componente antes do timer disparar, o callback pode rodar com `this` desmontado e acessar `this.$ygoDb`, etc.  
- **Sugestão:** Em `beforeDestroy`, dar `clearTimeout` nesses três (e qualquer outro timer guardado em `this`).

---

## 4. Pontos que estão bons

- **v-for:** Uso de `:key` estável (ids, etc.) nas listas (search results, related, decks, deck cards).  
- **Slices no template:** `filteredArchetypes.slice(0, 15)`, `filteredCardsByName.slice(0, 15)` limitam itens renderizados.  
- **requestIdleCallback:** Uso em `buildRelatedCards` após aplicar card da busca mantém a UI responsiva.  
- **Timeouts em rede:** `ensureCardImage` com timeout para `window.cardArt.get` e para `$ygoDb.getCardImage` evita loading infinito.  
- **Redesenho do canvas:** Uso de `scheduleDrawCard()` com `requestAnimationFrame` evita redraws desnecessários e mantém no máximo um por frame.

---

## 5. Checklist rápido para futuras mudanças

- [ ] Novos computeds que dependem de `localCards` inteiro: considerar cache/atualização sob demanda.  
- [ ] Novos `setInterval`/`setTimeout`: registrar em `this` e limpar em `beforeDestroy`.  
- [ ] Buscas/filters em listas grandes: considerar debounce, limite de resultado ou worker.  
- [ ] Chamadas assíncronas (API, DB): sempre ter timeout e tratamento de erro que desligue loading (ex.: `cardPhotoLoading = false`, `closeLoadingDialog()`).

---

## 6. Como medir na prática

1. **Chrome DevTools → Performance:** Gravar alguns segundos ao digitar no nome do card, trocar de card e fazer uma busca; ver tempo de script e frames.  
2. **Vue DevTools:** Ver quantas vezes os computeds (`localCardsMap`, `nameIndexMap`, `filteredCardsByName`, `cardDisplayDeps`) são reavaliados em uma ação.  
3. **Network:** Conferir se imagens de cards têm timeout e se não ficam penduradas; ver se há muitas requisições simultâneas (ex.: preload de 20 miniaturas).

Com as correções já feitas (interval removido, timeouts e `scheduleDrawCard`), o sistema tende a estar bem mais fluido; os itens acima são otimizações adicionais conforme o banco e o uso crescerem.
