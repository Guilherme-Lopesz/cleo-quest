import type { GameId, SessionId } from './ids';
import type { DomainError } from './result';
import type { Result } from './result';
import type { GameResultInput, GameSession } from './entities';

/** Contrato que o Core entrega a cada minigame (SAD §8.1). */
export interface GameContext {
  sessionId: SessionId;
  gameId: GameId;
  maxHearts: number;
  reportHeartLost(): Promise<Result<GameSession, DomainError>>;
  submitResult(result: GameResultInput): Promise<Result<GameSession, DomainError>>;
  emitUiEvent(event: GameUiEvent): void;
  /** Base URL para assets (respeita o `base` do GitHub Pages). */
  assetBase: string;
  reducedMotion: boolean;
}

export type GameUiEvent =
  | {
      type: 'CAT_REACTION';
      reaction: 'SCRATCH' | 'BLINK' | 'PURR' | 'SURPRISED' | 'ANGRY' | 'HAPPY' | 'SAD';
    }
  | { type: 'SHOW_HINT'; message: string }
  | {
      type: 'PLAY_FEEDBACK';
      sound: 'capture' | 'miss' | 'heart' | 'win' | 'lose' | 'click' | 'chirp' | 'meow';
    }
  | { type: 'SCORE'; score: number }
  | { type: 'TIMER'; remainingMs: number };

export interface GameModule {
  mount(container: HTMLElement, context: GameContext): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): Promise<void>;
}

export type GameEngineKind = 'phaser' | 'dom';

export interface MinigameDefinition {
  id: GameId;
  title: string;
  description: string;
  instructions: string[];
  engine: GameEngineKind;
  icon: string;
  load(): Promise<GameModule>;
}

/** Configuração por jogo (SAD §18). */
export interface GameConfig {
  gameId: GameId;
  maxHearts: number;
  reward: {
    participation: number;
    perScore: number;
    winBonus: number;
    maxPerSession: number;
  };
  limits: {
    minDurationMs: number;
    maxDurationMs: number;
    maxScore: number;
  };
}
