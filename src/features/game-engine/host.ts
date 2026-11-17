import type { GameCore } from '@core/application/game-core';
import type {
  DomainError,
  GameContext,
  GameModule,
  GameResultInput,
  GameSession,
  GameUiEvent,
  MinigameDefinition,
  Result,
} from '@core/contracts';
import { gameConfig } from '@core/config/games';
import { pickPhrase } from '@/content/phrases';
import { loadPreferences, prefersReducedMotion } from '@/features/preferences/preferences';
import { audio } from '@/features/audio/audio-manager';

export type HostPhase =
  'intro' | 'loading' | 'playing' | 'paused' | 'finishing' | 'result' | 'error';

export interface HostElements {
  root: HTMLElement;
  stage: HTMLElement;
  hearts: HTMLElement;
  score: HTMLElement;
  timer: HTMLElement;
  hint: HTMLElement;
  overlay: HTMLElement;
}

export interface HostCallbacks {
  onUiEvent?(event: GameUiEvent): void;
  onPhase?(phase: HostPhase): void;
}

const describeError = (e: DomainError): string => {
  switch (e.code) {
    case 'PERSISTENCE_FAILURE':
      return 'Não foi possível salvar o resultado. Verifique o espaço do navegador e tente de novo.';
    case 'VALIDATION_FAILURE':
      return 'Os dados salvos parecem corrompidos. Você pode apagar o progresso no rodapé.';
    default:
      return e.message;
  }
};

/**
 * Host de minigame (SAD §8.2): controla o lifecycle NotLoaded → Loading →
 * Ready → Playing → Paused → Finishing → Result, monta HUD, traduz eventos da
 * engine em comandos do Core e garante `destroy()` ao sair da página.
 */
export class GameHost {
  private module: GameModule | null = null;
  private session: GameSession | null = null;
  private phase: HostPhase = 'intro';
  private startedAt = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  private lastScore = 0;
  private lastResult: GameResultInput | null = null;
  private unsubscribes: (() => void)[] = [];
  private pendingHeart: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly core: GameCore,
    private readonly def: MinigameDefinition,
    private readonly el: HostElements,
    private readonly cb: HostCallbacks = {},
  ) {}

  mount(): void {
    this.renderHearts(
      gameConfig(this.def.id)?.maxHearts ?? 5,
      gameConfig(this.def.id)?.maxHearts ?? 5,
    );
    this.setScore(0);
    this.showIntro();
    const onVisibility = () => {
      if (document.hidden && this.phase === 'playing') this.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.unsubscribes.push(() => document.removeEventListener('visibilitychange', onVisibility));
    this.unsubscribes.push(
      this.core.bus.on('HeartLost', (e) => {
        if (e.sessionId === this.session?.id)
          this.renderHearts(e.remaining, this.session.maxHearts);
      }),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.phase === 'playing') this.pause();
      else if (e.key === 'Escape' && this.phase === 'paused') this.resume();
    };
    document.addEventListener('keydown', onKey);
    this.unsubscribes.push(() => document.removeEventListener('keydown', onKey));
    window.addEventListener('pagehide', this.handlePageHide);
    this.unsubscribes.push(() => window.removeEventListener('pagehide', this.handlePageHide));
  }

  private handlePageHide = () => {
    void this.destroy();
  };

  private setPhase(p: HostPhase): void {
    this.phase = p;
    this.el.root.dataset['phase'] = p;
    this.cb.onPhase?.(p);
  }

  private overlay(
    html: string,
    actions: { label: string; onClick: () => void; primary?: boolean }[] = [],
  ): void {
    const { overlay } = this.el;
    overlay.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'game-overlay__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = html;
    const row = document.createElement('div');
    row.className = 'cluster game-overlay__actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.primary ? 'btn' : 'btn btn--secondary';
      b.textContent = a.label;
      b.addEventListener('click', a.onClick);
      row.appendChild(b);
    }
    panel.appendChild(row);
    overlay.appendChild(panel);
    overlay.hidden = false;
    row.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private hideOverlay(): void {
    this.el.overlay.hidden = true;
    this.el.overlay.innerHTML = '';
  }

  private showIntro(): void {
    this.setPhase('intro');
    const list = this.def.instructions.map((i) => `<li>${i}</li>`).join('');
    this.overlay(
      `<p class="eyebrow">${this.def.icon} Como jogar</p><h2>${this.def.title}</h2><ul class="game-overlay__list">${list}</ul>`,
      [{ label: 'Começar', onClick: () => void this.start(), primary: true }],
    );
  }

  async start(): Promise<void> {
    this.setPhase('loading');
    this.overlay('<p class="eyebrow">Carregando</p><p>A Cleo está se espreguiçando…</p>');
    try {
      const started = await this.core.sessions.start(this.def.id);
      if (!started.ok) {
        this.showError(describeError(started.error), () => void this.start());
        return;
      }
      this.session = started.value;
      this.renderHearts(this.session.hearts, this.session.maxHearts);
      this.setScore(0);
      this.lastResult = null;
      if (!this.module) this.module = await this.def.load();
      this.el.stage.innerHTML = '';
      await this.module.mount(this.el.stage, this.context());
      this.hideOverlay();
      this.startedAt = performance.now();
      this.pausedTotal = 0;
      this.setPhase('playing');
      this.el.hint.textContent = pickPhrase('greeting');
    } catch (e) {
      console.error('[game-host] falha ao iniciar', e);
      this.showError(
        'Não foi possível carregar o jogo. Verifique sua conexão e tente novamente.',
        () => void this.start(),
      );
    }
  }

  private context(): GameContext {
    const session = this.session!;
    return {
      sessionId: session.id,
      gameId: this.def.id,
      maxHearts: session.maxHearts,
      assetBase: import.meta.env.BASE_URL.replace(/\/$/, ''),
      reducedMotion: prefersReducedMotion(loadPreferences()),
      reportHeartLost: () => this.reportHeartLost(),
      submitResult: (r) => this.submitResult(r),
      emitUiEvent: (e) => this.onUiEvent(e),
    };
  }

  private onUiEvent(e: GameUiEvent): void {
    switch (e.type) {
      case 'SCORE':
        this.setScore(e.score);
        break;
      case 'TIMER':
        this.el.timer.textContent = `${Math.ceil(e.remainingMs / 1000)}s`;
        break;
      case 'SHOW_HINT':
        this.el.hint.textContent = e.message;
        break;
      case 'PLAY_FEEDBACK':
        audio().play(e.sound);
        break;
      default:
        break;
    }
    this.cb.onUiEvent?.(e);
  }

  private async reportHeartLost(): Promise<Result<GameSession, DomainError>> {
    if (!this.session || this.phase !== 'playing') {
      return {
        ok: false,
        error: { code: 'SESSION_NOT_ACTIVE', message: 'Partida não está em andamento.' },
      };
    }
    // serializa perdas de coração para não ultrapassar o zero em eventos simultâneos
    const run = this.pendingHeart.then(() => this.core.sessions.loseHeart(this.session!.id));
    this.pendingHeart = run.catch(() => undefined);
    const result = await run;
    if (result.ok) {
      this.session = result.value;
      this.el.hint.textContent = pickPhrase('heartLost');
      this.cb.onUiEvent?.({ type: 'CAT_REACTION', reaction: 'ANGRY' });
    }
    return result;
  }

  private async submitResult(input: GameResultInput): Promise<Result<GameSession, DomainError>> {
    if (!this.session)
      return { ok: false, error: { code: 'SESSION_NOT_FOUND', message: 'Sem partida.' } };
    await this.pendingHeart;
    const durationMs = Math.round(performance.now() - this.startedAt - this.pausedTotal);
    const result: GameResultInput = {
      ...input,
      durationMs: input.durationMs > 0 ? input.durationMs : durationMs,
    };
    this.lastResult = result;
    this.lastScore = result.score;
    this.setPhase('finishing');
    this.overlay('<p class="eyebrow">Salvando</p><p>Contando os novelos…</p>');
    const r = await this.core.sessions.complete(this.session.id, result);
    if (r.ok) {
      this.session = r.value;
      await this.showResult(r.value);
    } else {
      this.showError(describeError(r.error), () => void this.retrySubmit());
    }
    return r;
  }

  /** Tentar novamente a gravação é idempotente: o Core não paga duas vezes. */
  private async retrySubmit(): Promise<void> {
    if (!this.session || !this.lastResult) return;
    this.setPhase('finishing');
    const r = await this.core.sessions.complete(this.session.id, this.lastResult);
    if (r.ok) await this.showResult(r.value);
    else this.showError(describeError(r.error), () => void this.retrySubmit());
  }

  private async showResult(session: GameSession): Promise<void> {
    await this.module?.destroy();
    this.module = null;
    this.el.stage.innerHTML = '';
    this.setPhase('result');
    const balance = await this.core.economy.getBalance();
    const reward = session.rewardGranted ?? 0;
    const won = session.outcome === 'WIN';
    const phrase = won ? pickPhrase('reward') : pickPhrase('gameOver');
    if (won) setTimeout(() => audio().play('meow'), 550);
    const base = import.meta.env.BASE_URL;
    this.overlay(
      `<p class="eyebrow">${won ? 'Vitória' : 'Fim de jogo'}</p>
       <h2>${this.def.title}</h2>
       <dl class="game-result">
         <div><dt>Pontos</dt><dd>${session.score}</dd></div>
         <div><dt>Corações</dt><dd>${'❤'.repeat(session.hearts)}${'♡'.repeat(Math.max(0, session.maxHearts - session.hearts))}</dd></div>
         <div><dt>Recompensa</dt><dd class="coin">🪙 ${reward}</dd></div>
         <div><dt>Saldo</dt><dd class="coin">🪙 ${balance}</dd></div>
       </dl>
       <p class="game-result__phrase">“${phrase}”</p>
       ${reward === 0 && session.score > 0 ? '<p class="muted">Resultado fora dos limites esperados: sem recompensa desta vez.</p>' : ''}`,
      [
        { label: 'Jogar de novo', onClick: () => void this.start(), primary: true },
        { label: 'Ir para a loja', onClick: () => location.assign(`${base}loja/`) },
        { label: 'Voltar ao parque', onClick: () => location.assign(`${base}parque/`) },
      ],
    );
    document.dispatchEvent(
      new CustomEvent('cleo:game-result', { detail: { session, reward, balance } }),
    );
  }

  private showError(message: string, retry: () => void): void {
    this.setPhase('error');
    this.overlay(`<p class="eyebrow">Ops</p><p>${message}</p>`, [
      { label: 'Tentar novamente', onClick: retry, primary: true },
      {
        label: 'Voltar ao parque',
        onClick: () => location.assign(`${import.meta.env.BASE_URL}parque/`),
      },
    ]);
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.module?.pause();
    this.pausedAt = performance.now();
    this.setPhase('paused');
    this.overlay('<p class="eyebrow">Pausado</p><p>A Cleo aproveitou para lamber a pata.</p>', [
      { label: 'Continuar', onClick: () => this.resume(), primary: true },
      { label: 'Desistir', onClick: () => void this.abandon() },
    ]);
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.pausedTotal += performance.now() - this.pausedAt;
    this.hideOverlay();
    this.setPhase('playing');
    this.module?.resume();
  }

  async abandon(): Promise<void> {
    if (this.session) await this.core.sessions.abandon(this.session.id);
    await this.module?.destroy();
    this.module = null;
    this.el.stage.innerHTML = '';
    this.session = null;
    this.showIntro();
  }

  private renderHearts(current: number, max: number): void {
    const full = '❤'.repeat(Math.max(0, current));
    const empty = '♡'.repeat(Math.max(0, max - current));
    this.el.hearts.innerHTML = `<span aria-hidden="true">${full}${empty}</span><span class="visually-hidden">${current} de ${max} corações</span>`;
    this.el.hearts.classList.toggle('is-low', current <= 1);
  }

  private setScore(n: number): void {
    this.lastScore = n;
    this.el.score.textContent = String(n);
  }

  get currentScore(): number {
    return this.lastScore;
  }

  async destroy(): Promise<void> {
    for (const u of this.unsubscribes) u();
    this.unsubscribes = [];
    if (this.session?.status === 'ACTIVE')
      await this.core.sessions.abandon(this.session.id).catch(() => undefined);
    await this.module?.destroy().catch(() => undefined);
    this.module = null;
    audio().stopAll();
  }
}
