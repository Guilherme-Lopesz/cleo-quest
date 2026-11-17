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

Decisão: nenhuma requisição externa (fontes, CDNs, analytics). Pilha de fontes do sistema; o HUD usa monoespaçada do sistema com `image-rendering: pixelated` apenas nos sprites. Uma fonte pixel própria pode ser adicionada depois como asset local.

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

## D-014 — Data de nascimento e coerência do conteúdo

Contexto: proprietário informou nascimento em 05/03/2026 (≈ 8 meses em nov/2026). Os exemplos citavam fase "adulta" e datas de 2024–2025.
Decisão: `birthDate = '2026-03-05'`; fases passam a chegada → filhote → jovem → **hoje**; ilustrações provisórias, diário e museu redatados entre abr e nov de 2026.
Impacto: contador de dias ativo no hero; ids `adulta-*` viraram `hoje-*` (substituir pelo mesmo id ao importar fotos reais).

## D-015 — Voz da Cleo com gravações; interface continua em chiptune

Contexto: proprietário enviou 8 efeitos de gato (bibliotecas e ElevenLabs).
Decisão: gravações reais só para a **voz/reações da Cleo**; efeitos de interface (captura, moeda, compra, conquista) seguem sintetizados, coerentes com a pixel art.
Uso: `meow` (2 variações: carinho, feliz, equipar, vitória), `meowSleepy` (acordá-la, caminha), `purr` (comer/beber), `scratch` (arranhador, carinho demais), `chirp` ("tremido" de caça: mordida na Pescaria).
Descartados: ronronar de 12 s (redundante, 3× maior) e miado "aflito" (quase inaudível, −35 LUFS, e emocionalmente pesado para um jogo "sem pressão").
Tratamento (ffmpeg): recorte, mono, passa-alta, passa-baixa 9 kHz, −18 LUFS, fades, 22 kHz/56 kbps → 49 KB no total, em `public/audio/cleo/`.
Regras: só tocam em resposta a ação do visitante (adormecer por inatividade é silencioso); carregam após o primeiro gesto e só com som ligado; variação de afinação ±6%; fallback sintetizado se um arquivo falhar.
Licença: nomes dos arquivos seguem o padrão da Pixabay (licença de uso livre); **confirmar** a origem antes de uso comercial. Créditos no rodapé.
