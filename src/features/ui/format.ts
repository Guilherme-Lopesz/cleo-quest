export const formatCoins = (n: number): string => `${n.toLocaleString('pt-BR')} 🪙`;

export function itemImage(base: string, image: string): string {
  return `${base}/pixel-art/items/${image}.png`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Alimentação',
  TOY: 'Brinquedos',
  BOWL: 'Potes',
  DECORATION: 'Ambiente',
  OUTFIT: 'Moda',
  SPECIAL: 'Especiais',
};

export const KIND_LABELS: Record<string, string> = {
  COSMETIC: 'roupa',
  TOY: 'brinquedo',
  CONSUMABLE: 'consumível',
  FURNITURE: 'móvel',
  COLLECTIBLE: 'coleção',
};

export const SLOT_LABELS: Record<string, string> = {
  BODY: 'corpo',
  HEAD: 'cabeça',
  NECK: 'pescoço',
  SCENE: 'cenário',
};
