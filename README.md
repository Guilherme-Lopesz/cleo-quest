# Cleo Quest

Site-jogo da gatinha **Cleo** (a Floquinha): história em capítulos, galeria, máquina do tempo, três minigames 2D, economia de **Cleo Coins**, loja, inventário, personalização, casinha decorável e conquistas. Estático, mobile-first, sem backend; o progresso fica no navegador (IndexedDB).

**Publicado em:** https://guilherme-lopesz.github.io/cleo-quest/

## Requisitos

- Node 22.12+
- pnpm 10 (`corepack enable`)

## Instalação e execução

```bash
pnpm install
pnpm dev          # http://localhost:4321/cleo-quest/
```

| Comando                       | O que faz                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm verify`                 | lint + Prettier + typecheck (astro check + tsc) + Vitest + build — o mesmo gate do CI     |
| `pnpm test`                   | testes unitários e de integração (Vitest, IndexedDB em memória)                           |
| `pnpm build` / `pnpm preview` | build estático em `dist/`                                                                 |
| `pnpm test:e2e`               | Playwright contra o build, desktop e mobile (`PW_CHANNEL=chrome` usa o Chrome do sistema) |
| `pnpm sprites`                | regenera os spritesheets da Cleo (camadas + manifesto de animações)                       |
| `pnpm sprites:items`          | regenera os ícones pixel art do catálogo                                                  |
| `pnpm photos:import`          | importa fotos reais de `photos-source/` (ver abaixo)                                      |
| `pnpm photos:placeholders`    | regenera as ilustrações provisórias da galeria                                            |

## Conteúdo que o proprietário edita (sem tocar em componentes)

| O quê                                 | Onde                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| Data de nascimento (contador de dias) | `src/shared/config/cleo.ts` → `birthDate`                    |
| Sons da Cleo                          | `public/audio/cleo/*.mp3` (mesmos nomes para substituir)     |
| Fases da vida                         | `src/content/phases.ts`                                      |
| Capítulos da timeline                 | `src/content/timeline/*.md`                                  |
| Diário secreto                        | `src/content/diary/*.md`                                     |
| Museu                                 | `src/content/museum/*.md`                                    |
| Carta da Cleo                         | `src/content/letter.ts`                                      |
| Falas da Cleo                         | `src/content/phrases.ts`                                     |
| Itens da loja e preços                | `src/content/catalog/items.json` (validado por Zod no build) |
| Recompensas e limites por jogo        | `src/features/game-core/config/games.ts`                     |
| Conquistas                            | `src/features/game-core/config/achievements.ts`              |

### Importar as fotos reais

1. Copie as fotos para `photos-source/` (ignorada pelo git; os originais nunca são alterados).
2. Descreva cada uma em `photos-source/metadata.json`:
   ```json
   {
     "IMG_0001": {
       "alt": "Cleo dormindo na caixa",
       "date": "2026-03-10",
       "phase": "adulta",
       "tags": ["soneca", "caixa"]
     }
   }
   ```
3. `pnpm photos:import` gera WebP 1600px + miniatura 480px e atualiza `src/content/gallery/photos.json`. Fotos sem `alt` abortam a importação.
4. Para substituir uma ilustração provisória, use o mesmo nome de arquivo do `id` dela (ex.: `jovem-01.jpg`).

## Publicação

Push na `main` dispara `.github/workflows/deploy.yml`: lint → typecheck → testes → build → E2E → GitHub Pages. Qualquer falha bloqueia a publicação. Em PRs e outras branches roda só o CI (`ci.yml`).

Configuração única no GitHub: **Settings → Pages → Source: GitHub Actions**.

`site` e `base` vêm do nome do repositório. Para domínio próprio, defina `SITE_URL` e `BASE_PATH=/` no workflow.

**Rollback:** reverta o commit na `main` (`git revert <sha> && git push`) ou reexecute o workflow de um commit anterior em _Actions → Deploy GitHub Pages → Re-run_. Dados dos visitantes não são afetados: ficam no navegador de cada um e o schema local só avança com migração.

## Documentação

- `docs/architecture.md` — arquitetura como implementada (módulos, fronteiras, fluxos)
- `docs/decisions.md` — decisões técnicas registradas
- `docs/acceptance.md` — critérios de aceite do Mestre e do SAD, com a evidência de cada um
- `docs/limitations.md` — limitações conhecidas e pendências

Especificação de origem: _Cleo Quest — Documento Mestre v1_ e _Cleo Quest — SAD v1_.
