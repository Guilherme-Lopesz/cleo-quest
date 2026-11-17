/**
 * Fases da vida da Cleo (Mestre §8.1). Ordem e nomes são editoriais.
 * TODO_OWNER: ajustar nomes, períodos e ordem conforme as fotos reais.
 */
export interface Phase {
  id: string;
  title: string;
  period: string;
  summary: string;
}

export const PHASES: Phase[] = [
  {
    id: 'chegada',
    title: 'A chegada',
    period: 'Primeiros dias',
    summary: 'Uma bolinha de pelo chega em casa e decide que tudo é dela.',
  },
  {
    id: 'filhote',
    title: 'Filhote',
    period: 'Primeiros meses',
    summary: 'Orelhas grandes demais, energia infinita e muitas caixas.',
  },
  {
    id: 'jovem',
    title: 'Jovem',
    period: 'Primeiro ano',
    summary: 'A fase das escaladas, das janelas e do colete teal.',
  },
  {
    id: 'adulta',
    title: 'Adulta',
    period: 'Hoje',
    summary: 'Rainha do sofá, fiscal de caixas, especialista em sonecas.',
  },
];

export function phaseById(id: string | undefined): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}
