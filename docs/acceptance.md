# Critérios de aceite — evidências

Legenda: **U** teste unitário · **I** integração (Vitest + IndexedDB) · **E** E2E Playwright (desktop + mobile) · **M** verificação manual · **P** pendente.

## Documento Mestre §17

### Conteúdo

| Critério                                    | Status | Evidência                                                      |
| ------------------------------------------- | ------ | -------------------------------------------------------------- |
| Hero apresenta a Cleo                       | ✅     | E `smoke.spec`, `a11y.spec`                                    |
| Contador de idade usa data real configurada | ✅     | `birthDate = 2026-03-05`; U `cleo-config.test`; E `smoke.spec` |
| Timeline exibe capítulos e fotos            | ✅     | E `gallery.spec › história`                                    |
| Galeria filtra e abre imagens               | ✅     | E `gallery.spec` (filtro, lightbox, teclado, foco de volta)    |
| Tema Hora da Soneca funciona                | ✅     | E `preferences.spec`; axe nos dois temas                       |
| Layout é responsivo                         | ✅     | Toda a suíte E roda em Pixel 7 e desktop                       |

### Jogo

| Critério                               | Status | Evidência                                                          |
| -------------------------------------- | ------ | ------------------------------------------------------------------ |
| Cleo pixel art possui animação básica  | ✅     | 12 animações, U `character-fsm.test`, E walker reage ao toque      |
| Pegue o Novelo inicia, pausa e termina | ✅     | E `yarn-game.spec`                                                 |
| Controles por toque e teclado          | ✅     | E (toque/clique); setas/A/D implementados — M                      |
| Cinco corações no início               | ✅     | E `yarn-game.spec`, I                                              |
| Perder vida dispara feedback visual    | ✅     | reação da Cleo + tremor + HUD; E `other-games.spec` (pescaria 5→4) |
| Zero corações encerra a partida        | ✅     | U `session-rules.test`, I                                          |
| Resultado calculado uma única vez      | ✅     | I "reenvio não paga de novo"                                       |

### Economia

| Critério                           | Status | Evidência                                                      |
| ---------------------------------- | ------ | -------------------------------------------------------------- |
| Recompensa calculada pelo Core     | ✅     | U `reward-policy.test`; minigames não importam serviços (lint) |
| Saldo não fica negativo            | ✅     | U `economy` + schema Zod (`nonnegative`)                       |
| Loja valida produto e saldo        | ✅     | U, I, E (botão desabilitado sem saldo)                         |
| Compra atômica                     | ✅     | I com falha injetada (memória e Dexie)                         |
| Item pode ser equipado             | ✅     | I, E (camada aparece na prévia e na Cleo caminhante)           |
| Progresso persiste após recarregar | ✅     | I "reabrir o banco", E `economy.spec`, `yarn-game.spec`        |

### Qualidade

| Critério                               | Status | Evidência                                                   |
| -------------------------------------- | ------ | ----------------------------------------------------------- |
| Testes unitários dos serviços críticos | ✅     | 82 testes Vitest                                            |
| Pipeline de build                      | ✅     | `.github/workflows/`                                        |
| Sem erros críticos no console          | ✅     | E `a11y.spec › sem erros no console`                        |
| Imagens otimizadas                     | ✅     | WebP + miniaturas, `width/height`, lazy                     |
| Controles acessíveis                   | ✅     | axe WCAG 2.1 AA sem violações sérias em 9 páginas × 2 temas |
| Preferência de movimento respeitada    | ✅     | CSS + FSM (U "não caminha") + botão no rodapé               |

## SAD §21

| Critério                                           | Status | Evidência                                                                                    |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Publica no GitHub Pages                            | ⏳     | Workflow pronto; depende de _Settings → Pages → GitHub Actions_                              |
| Home não carrega Phaser                            | ✅     | E `smoke.spec`                                                                               |
| Phaser só ao abrir minigame                        | ✅     | E `yarn-game.spec`, `other-games.spec` (Memória não carrega)                                 |
| Minigame não importa repositórios nem altera saldo | ✅     | regra `no-restricted-imports` no ESLint (CI)                                                 |
| Core inicia e encerra sessões                      | ✅     | U, I                                                                                         |
| Corações por partida, restaurados na próxima       | ✅     | I "nova partida restaura corações"                                                           |
| Zero corações encerra                              | ✅     | U, I                                                                                         |
| Recompensas calculadas pelo Core                   | ✅     | U, I                                                                                         |
| Recompensas idempotentes                           | ✅     | I (`grantReward`, sessão, conquista, capítulo); E (carinho repetido)                         |
| Compra debita e adiciona na mesma transação        | ✅     | I                                                                                            |
| Falha de compra não altera saldo nem inventário    | ✅     | I (falha injetada)                                                                           |
| Inventário persiste após reload                    | ✅     | I, E                                                                                         |
| Item não possuído não pode ser equipado            | ✅     | U, I                                                                                         |
| Dados persistidos passam por validação             | ✅     | I "registro corrompido não é sobrescrito"                                                    |
| Migração de schema tem testes                      | ✅     | I (fixture v1). Só existe v1; o padrão para v2 está documentado em `dexie-db.ts`             |
| Galeria usa thumbnails e lazy loading              | ✅     | E `gallery.spec`                                                                             |
| Áudio não inicia automaticamente                   | ✅     | U `audio.test`; E `audio.spec` (nada baixado com som desligado; gravações carregam ao ligar) |
| `prefers-reduced-motion` respeitado                | ✅     | CSS global + FSM + animador + jogos (`ctx.reducedMotion`)                                    |
| Fluxos críticos com testes automatizados           | ✅     | 68 E2E                                                                                       |
| CI bloqueia deploy se validações falharem          | ✅     | Comprovado: o 1º deploy foi bloqueado por um E2E instável, corrigido em `8fa6f19`            |
