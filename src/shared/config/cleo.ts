/**
 * Dados da personagem fornecidos pelo proprietário.
 * TODO_OWNER: preencher `birthDate` (ISO, ex.: "2021-03-15") para ativar o
 * contador de dias de vida no hero (Mestre §4.1 / §18).
 */
export const CLEO = {
  name: 'Cleo',
  nickname: 'Floquinha',
  birthDate: null as string | null,
  pronouns: 'ela',
} as const;

/** Dias completos entre a data de nascimento e `now`. `null` se não configurada. */
export function daysAlive(
  now: Date = new Date(),
  birthDate: string | null = CLEO.birthDate,
): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const ms = now.getTime() - birth.getTime();
  return ms < 0 ? null : Math.floor(ms / 86_400_000);
}
