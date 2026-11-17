/**
 * Fases da vida da Cleo (Mestre §8.1). Nascimento: 05/03/2026.
 * TODO_OWNER: ajustar nomes e períodos quando as fotos reais forem importadas.
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
    period: 'Primeiras semanas em casa',
    summary: 'Uma bolinha de pelo chega em casa e decide que tudo é dela.',
  },
  {
    id: 'filhote',
    title: 'Filhote',
    period: 'Abril a junho de 2026',
    summary: 'Orelhas grandes demais, energia infinita e muitas caixas.',
  },
  {
    id: 'jovem',
    title: 'Jovem',
    period: 'Julho a setembro de 2026',
    summary: 'A fase das escaladas, das janelas e do colete teal.',
  },
  {
    id: 'hoje',
    title: 'Hoje',
    period: 'Oito meses e contando',
    summary: 'Fiscal de caixas, especialista em sonecas e dona do sofá.',
  },
];

export function phaseById(id: string | undefined): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}
