# Arquitetura implementada

Segue o SAD v1. Este documento descreve **o que existe no código**, para orientar manutenção.

## Camadas e diretórios

```
src/
├── pages/, layouts/, components/        Website (Astro): rotas estáticas, layout, HUD, cartões
├── content/                              Dados editoriais: timeline, diário, museu, fases, falas, catálogo, fotos
├── features/
│   ├── game-core/
│   │   ├── contracts/                    Tipos, Result/DomainError, eventos, portas, schemas Zod
│   │   ├── domain/                       Regras puras: sessão, recompensa, validação, economia, loja, inventário, casinha
│   │   ├── application/                  Serviços (casos de uso), Event Bus, store de UI, GameCore (raiz de composição)
│   │   ├── config/                       Economia, jogos, conquistas, catálogo
│   │   └── index.ts                      getGameCore(): escolhe persistência e inicializa uma vez por página
│   ├── game-engine/                      Registro de jogos, adapter Phaser (import dinâmico), GameHost (lifecycle + HUD)
│   ├── minigames/                        yarn-catcher (Phaser), fishing (Phaser), cat-memory (DOM)
│   ├── character/                        FSM da Cleo, SpriteView por camadas, walker, animador, outfit
│   ├── shop/, inventory/, house/, achievements/, gallery/   Controladores de página (UI → serviços)
│   ├── audio/                            AudioManager (Web Audio, efeitos sintetizados)
│   ├── preferences/                      Tema, som, volume, movimento (localStorage + Zod)
│   └── integrations/site-events.ts       Toasts, exploração de capítulos, fotos vistas, easter eggs
├── infrastructure/persistence/           DexieProgressStore (IndexedDB) e MemoryProgressStore
└── styles/                               tokens, temas (claro / Hora da Soneca), utilitários
scripts/sprites, scripts/photos           Geração de pixel art e pipeline de imagens (Sharp)
```

## Fronteiras (verificadas pelo ESLint — violar quebra o CI)

| Módulo                                | Não pode importar                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `game-core/domain`, `contracts`       | Astro, Phaser, Dexie, infraestrutura, componentes                                                   |
| `game-core/application`               | Phaser, Astro, componentes                                                                          |
| `minigames/*`                         | Dexie, infraestrutura, `game-core/domain`, `game-core/application` — só contratos via `GameContext` |
| `game-engine/*`                       | Dexie, persistência                                                                                 |
| `components`, `pages`, `layouts` (TS) | Dexie, persistência                                                                                 |

## Persistência

Porta `ProgressStore` (`contracts/ports.ts`) com `transaction(tables, fn)`: se `fn` lança, nada é gravado.

- **DexieProgressStore**: transação `rw` do IndexedDB; toda leitura **e** escrita passa pelo schema Zod da tabela. Dado inválido → `PersistenceError('CORRUPT')` → `VALIDATION_FAILURE`; nunca é sobrescrito silenciosamente.
- **MemoryProgressStore**: snapshot/rollback; usado em testes e como fallback quando não há IndexedDB (a UI avisa que o progresso dura só a visita).

Banco `cleo-quest` v1: `profiles, wallet, sessions, inventory, purchases, rewardClaims, achievements, statistics, customization, house`. Preferências ficam no `localStorage` (`cleo-quest:preferences`).

## Fluxos críticos

**Partida:** `GameHost.start` → `SessionService.start` (abandona sessão ativa anterior; 5 corações) → `def.load()` (import dinâmico; Phaser só aqui) → `module.mount(stage, GameContext)`.
O jogo chama `ctx.reportHeartLost()` (serializado no host) e, ao final, `ctx.submitResult({ score, outcome, metrics })`.
`SessionService.complete` em **uma transação**: valida plausibilidade → `calculateReward` (`min(participação + score·k + bônus, teto)`) → fecha sessão → credita carteira + grava `rewardClaim session:<id>` → estatísticas. Reenvio devolve a sessão já processada sem pagar de novo. Falha de gravação → tela de erro com "Tentar novamente" (idempotente).

**Compra:** `ShopService.purchase` em uma transação sobre `wallet, inventory, purchases, statistics`; regras em `planPurchase` (existe/habilitado, único, limite, saldo). Teste de integração injeta falha na gravação do recibo e confirma rollback do débito e do item.

**Recompensas idempotentes:** toda concessão passa por `EconomyService.grantReward(sourceId)`. Chaves: `first-visit`, `session:<id>`, `achievement:<id>`, `chapter:<id>`, `egg:<id>`.

**Eventos:** publicados **após** o commit. Listeners isolados (`try/catch`). Conquistas assinam o bus e avaliam critérios a partir do estado persistido.

## Personagem

`scripts/sprites/cleo.ts` desenha a Cleo por geometria e máscaras (pelagem creme-acinzentada, "M" tabby, peito branco, olhos azul-gelo, nariz/orelhas rosados) em 7 camadas (`base, vest, crown, hat, bow, tie, fx`) e 12 animações. O runtime empilha camadas como `<span>` com `background-position` (DOM) ou sprites Phaser (jogos). A FSM (`features/character/fsm.ts`) é pura e testada; o walker só a renderiza e pausa com a aba oculta ou com movimento reduzido.

## Orçamento de assets (build atual)

| Recurso                              | Tamanho (gzip)                | Carregado em                                                  |
| ------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| Phaser                               | ~306 KB                       | só `/parque/yarn-catcher` e `/parque/fishing`, após "Começar" |
| Dexie                                | ~30 KB                        | ocioso, em todas as páginas (saldo no cabeçalho)              |
| Zod + schemas                        | ~24 KB                        | idem                                                          |
| Game Core                            | ~10 KB                        | idem                                                          |
| Sprites da Cleo (7 camadas) + ícones | ~150 KB total, PNG            | sob demanda                                                   |
| Galeria                              | WebP 1600px + miniatura 480px | miniaturas com `loading="lazy"`; original só no lightbox      |
