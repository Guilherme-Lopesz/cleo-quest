import { withBase } from '@shared/config/site';

describe('withBase', () => {
  it('prefixa caminhos com o base configurado', () => {
    // Em testes o BASE_URL do Vite é "/".
    expect(withBase('/loja')).toBe('/loja');
    expect(withBase('loja')).toBe('/loja');
  });
});
