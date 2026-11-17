/** Falas da Cleo (Mestre §2.5). Editável em dados; a UI só sorteia. */
export const PHRASES = {
  greeting: [
    'Você voltou! Trouxe algum petisco para mim?',
    'Obrigada por visitar meu mundinho.',
    'Bem-vinda ao meu território. Limpe as patas.',
  ],
  idle: [
    'Eu não estava dormindo. Estava carregando minha energia.',
    'Humana, você não tem nada melhor para fazer?',
    'Essa caixa agora é minha propriedade.',
    'Estou observando. Sempre.',
  ],
  pet: ['Prrrr… pode continuar.', 'Aceito carinho. Por enquanto.', 'Isso. Bem aí.'],
  annoyed: ['Chega. Eu disse CHEGA.', 'Você está testando minha paciência.', 'Miau. Com ênfase.'],
  sleepy: ['Agora preciso tirar uma soneca.', 'Zzz… não me acorde sem petisco.'],
  reward: ['Moedas! Eu aceito em petiscos também.', 'Isso vale pelo menos um sachê.'],
  purchase: ['Ótima escolha. Eu teria escolhido igual.', 'Novo! É meu agora.'],
  heartLost: ['Ai! Isso doeu na minha dignidade.', 'Hmpf.', 'Eu vi o que você fez.'],
  gameOver: [
    'Fim de jogo. Vou fingir que não vi.',
    'Tente de novo. Eu acredito em você. Mais ou menos.',
  ],
  easterEgg: ['Você encontrou meu esconderijo!', 'Segredo descoberto. Não conte para ninguém.'],
} as const;

export type PhraseKey = keyof typeof PHRASES;

export function pickPhrase(key: PhraseKey, random: () => number = Math.random): string {
  const list = PHRASES[key];
  return list[Math.floor(random() * list.length)] ?? list[0];
}
