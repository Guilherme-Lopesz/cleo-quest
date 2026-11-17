# Limitações conhecidas e pendências

## Dependem do proprietário

1. **Fotos reais.** A galeria tem 14 _ilustrações provisórias_ (marcadas na UI e no manifesto com `placeholder: true`), feitas com a própria pixel art da Cleo. A meta de 200+ fotos depende de `pnpm photos:import` com as fotos e o `alt` de cada uma.
2. **Timeline, diário e museu.** Textos de exemplo, plausíveis mas inventados, na voz da Cleo. Precisam ser revisados com fatos reais.
3. **Sons.** A voz da Cleo usa efeitos de biblioteca e de ElevenLabs (D-015), não gravações dela. Se houver gravações reais, basta substituir os arquivos em `public/audio/cleo/` mantendo os nomes. Confirmar a licença dos arquivos de biblioteca.
4. **Pixel art.** A Cleo é gerada por código com a paleta e os traços descritos no Mestre §2.2 (consistente em todas as telas e animações). Uma revisão comparando com fotos reais pode pedir ajustes de proporção ou marcas, feitos em `scripts/sprites/cleo.ts` + `pnpm sprites`.

## Técnicas

- **Integridade local.** Como previsto no SAD §12.2, quem edita o IndexedDB pelo DevTools altera o próprio saldo. As validações protegem consistência, não são antifraude.
- **Progresso por navegador.** Sem sincronização. Há exportação de backup JSON (página de conquistas); **importação ainda não existe** (SAD §9.5 a coloca em versão posterior).
- **Recuperação de dados corrompidos.** A operação falha sem sobrescrever e a mensagem orienta a usar "Apagar progresso". Não há reparo automático parcial.
- **Cenários (`equipSlot: SCENE`).** O tipo existe no contrato e na customização, mas nenhum item de cenário está no catálogo. A casinha cumpre o papel de ambiente decorável na V1.
- **Expansões do Mestre §6.4–6.5** (A Grande Aventura, Coloque a Cleo para Dormir) e **PWA/offline** ficaram fora, conforme o próprio roadmap.
- **Balanceamento.** Recompensas seguem as faixas do Mestre (5–30 / 10–40 / 15–35), ainda não calibradas com jogadores reais.
- **Testes em dispositivos reais.** A suíte E2E roda em Chromium desktop e emulação Pixel 7. Safari/iOS e Firefox não foram testados.
- **Fonte pixel.** O HUD usa monoespaçada do sistema; não há fonte pixel própria (D-010).
