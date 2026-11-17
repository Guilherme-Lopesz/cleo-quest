# Registro de decisões técnicas (ADR leve)

Formato: **Contexto → Decisão → Impacto**. Decisões aqui respeitam o Documento Mestre e o SAD; onde um deles foi ajustado, o motivo está registrado.

## D-001 — Precedência entre documentos

Contexto: Mestre e SAD divergem em nomes e organização (contrato de minigame, eventos, pastas, tabelas).
Decisão: produto → Mestre; arquitetura/contratos → SAD. O Mestre declara seus contratos como "conceituais".
Impacto: nenhuma funcionalidade perdida; nomenclatura única no código.

## D-002 — Versões da stack

Contexto: no início (nov/2026) as versões correntes eram Astro 7, Phaser 4.2, TypeScript 7, Vitest 5, ESLint 10.
Decisão: Astro 7, Vitest 5, ESLint 10 (atuais). **TypeScript 5.9** (o 7.x é o novo compilador e ainda tem atrito com `astro check`/typescript-eslint). **Phaser 3.90** (linha madura; o 4.x é major recente).
Impacto: upgrade de Phaser 4 fica isolado em `features/game-engine/phaser/` pelo adapter; nenhum minigame importa Phaser diretamente fora do módulo da cena.

## D-003 — Categoria × tipo de item

Contexto: Mestre define tipos de uso (`cosmetic/toy/consumable/furniture/collectible`); SAD define categorias de vitrine (`FOOD/TOY/BOWL/DECORATION/OUTFIT/SPECIAL`).
Decisão: `CatalogItem` tem `category` (SAD) **e** `kind` (Mestre). `category` agrupa a loja; `kind` governa equipar/consumir/decorar.
Impacto: loja e inventário usam o mesmo catálogo sem heurísticas.

## D-004 — Saldo inicial

Decisão: bônus de boas-vindas de **50 Cleo Coins**, concedido por `grantReward({ reason: 'FIRST_VISIT', sourceId: 'first-visit' })` — idempotente por construção.
Impacto: 1 constante em `shared/config/economy.ts`.

## D-005 — Casinha no MVP

Decisão: entra, com slots predefinidos (quarto, cozinha, brincadeiras, jardim) e interações visuais. Sem mecânica de necessidades.
Impacto: tabela `house` no Dexie v1.

## D-006 — Comida

Decisão: consumível temático — usar decrementa quantidade e dispara animação `eating`. Não simula fome.

## D-007 — Pausa ao perder foco

Decisão: `visibilitychange` oculto → `pause()`; retomar exige ação do jogador.

## D-008 — Resultado implausível

Decisão: score acima de `limits.maxScore` ou duração fora da faixa → `INVALID_RESULT`; sessão encerra como `COMPLETED` com recompensa 0 e aviso na UI. Não trava o jogador, não premia.

## D-009 — Áudio

Decisão: Web Audio API pura, sem Howler. Efeitos sintetizados; slots para sons reais da Cleo.

## D-010 — Tipografia e terceiros

Decisão: nenhuma requisição externa (fontes, CDNs, analytics). Pilha de fontes do sistema + fonte pixel gerada localmente para o HUD.

## D-011 — Pixel art da Cleo

Contexto: instrução do projeto: a identidade visual não pode ser "imagem temporária"; precisa de pixel art consistente, colete teal e animações.
Decisão: gerador determinístico próprio (`scripts/sprites/`) com camadas (corpo, marcas tabby, peito branco, olhos azul-gelo, nariz rosa, colete teal, acessórios) → spritesheets PNG + manifesto JSON de animações. Composição por camadas em runtime (Mestre §5.6).
Impacto: trocar a arte depois é substituir PNGs mantendo o manifesto.

## D-012 — Servidor de E2E

Contexto: `astro preview` no Astro 7 roda como daemon e encerra o processo pai, o que o `webServer` do Playwright interpreta como falha.
Decisão: `scripts/serve-dist.mjs` serve `dist/` sob o `base` do Pages, sem fallback SPA (igual ao hosting).

## D-013 — Browsers do Playwright no workspace

Contexto: o CDN do Playwright é bloqueado neste ambiente de desenvolvimento.
Decisão: `PW_CHANNEL=chrome` usa o Chrome do sistema localmente; no CI o Chromium gerenciado é instalado normalmente. Limitação de ambiente, não do produto.
