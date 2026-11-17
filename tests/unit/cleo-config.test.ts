import { daysAlive } from '@shared/config/cleo';

describe('daysAlive', () => {
  it('retorna null sem data configurada ou com data inválida/futura', () => {
    expect(daysAlive(new Date('2026-11-17'), null)).toBeNull();
    expect(daysAlive(new Date('2026-11-17'), 'ontem')).toBeNull();
    expect(daysAlive(new Date('2026-11-17'), '2030-01-01')).toBeNull();
  });
  it('conta dias completos', () => {
    expect(daysAlive(new Date('2026-11-17T12:00:00'), '2026-11-10')).toBe(7);
    expect(daysAlive(new Date('2026-11-10T00:00:00'), '2026-11-10')).toBe(0);
  });
});
