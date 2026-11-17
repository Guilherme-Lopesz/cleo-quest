# Cleo Quest

Site-jogo da gatinha Cleo (Floquinha): história, galeria, minigames 2D, Cleo Coins, loja, inventário, personalização, casinha e conquistas. 100% estático, mobile-first, sem backend. Progresso salvo no navegador.

> Em desenvolvimento. Veja `docs/` para arquitetura, decisões e critérios de aceite.

## Requisitos

- Node 22.12+ e pnpm 10

## Comandos

| Comando              | O que faz                                                                   |
| -------------------- | --------------------------------------------------------------------------- |
| `pnpm install`       | instala dependências                                                        |
| `pnpm dev`           | servidor de desenvolvimento (`http://localhost:4321/cleo-quest/`)           |
| `pnpm build`         | build de produção em `dist/`                                                |
| `pnpm verify`        | lint + typecheck + testes unitários/integração + build                      |
| `pnpm test`          | Vitest                                                                      |
| `pnpm test:e2e`      | Playwright contra o build (`PW_CHANNEL=chrome` para usar Chrome do sistema) |
| `pnpm sprites`       | regenera a pixel art da Cleo                                                |
| `pnpm photos:import` | processa fotos de `photos-source/` para a galeria                           |

## Publicação

Push na `main` dispara `.github/workflows/deploy.yml`: lint → typecheck → testes → build → E2E → GitHub Pages. O `base` é derivado do nome do repositório; para domínio próprio defina `SITE_URL` e `BASE_PATH`.
