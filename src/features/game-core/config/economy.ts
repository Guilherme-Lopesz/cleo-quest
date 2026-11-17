/** Parâmetros centrais da economia (Mestre §5.2). Um único lugar, sem números mágicos na UI. */
export const ECONOMY = {
  welcomeBonus: 50,
  achievementDefaultReward: 50,
  chapterExplorationReward: 10,
  easterEggReward: 20,
  /** Teto absoluto de qualquer concessão, independente da origem. */
  absoluteMaxGrant: 500,
} as const;
