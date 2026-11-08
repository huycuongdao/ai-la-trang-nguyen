import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import { KyThi, parseMc, type McQ, type RoomSnapshot } from '../game/engine/exam';
import type { GameMode, ModeRunner, SavedRound } from './hosted-mode';
import { extraRunners } from './mode-runners';
import { LOAI } from '../game/elimination-config';
import { ROOT } from './store';
import { DEFAULT_THEME, THEMES, isThemeId, type ThemeId } from '../game/themes';
import { loadRoom, saveRoom } from './room-store';
import { SpeechDirector } from './speech-director';
import { SpokenQueue } from './spoken-queue';
import { addToWeekly, loadUsedQuestions, saveUsedQuestions, weeklyTop } from './weekly-board';

export interface HostDeps {
  bank: McQ[];
  now: () => number;
  /** Random numbers for the game engine (question order, shuffles) */
  rand: () => number;
  /** Random numbers for choosing what to say */
  speechRand: () => number;
  /** Send an event to every browser page */
  emit: (event: string, data: unknown) => void;
  /** How many stage pages are connected (the ones that play audio) */
  stageCount: () => number;
  channelName: () => string;
  used: Record<string, number>;
  saveUsed: (used: Record<string, number>) => void;
  addWeekly: ConstructorParameters<typeof SpeechDirector>[0]['addWeekly'];
  weeklyTop: () => ReturnType<typeof weeklyTop>;
  loadRoom: (now: number) => SavedRound | null;
  saveRoom: (snap: SavedRound) => void;
  /** Mode and player cap the operator chose last time; used when there is no round to resume */
  initialMode?: GameMode;
  initialMaxNguoi?: number;
  /** Called when the operator changes the mode or the player cap, so it is remembered after a restart */
  saveMode?: (mode: GameMode) => void;
  saveMaxNguoi?: (n: number) => void;
  /** Theme the operator chose last time, how to load a theme's question bank, and how to remember a change */
  initialTheme?: ThemeId;
  loadBank?: (theme: ThemeId) => McQ[];
  saveTheme?: (theme: ThemeId) => void;
}

const SAVE_EVERY_MS = 5000;

/** Runs the game on the server: the engine, the master of ceremonies, round saving. Pages only draw and play audio. */
export class GameHost {
  /** The exam engine (also what tests and weekly scores use) */
  readonly room: KyThi;
  readonly voice: SpokenQueue;
  private runners = new Map<GameMode, ModeRunner>();
  private activeName: GameMode = 'exam';
  private lastView: unknown = null;
  private lastSave = 0;
  private savedPhase = '';
  private maxNguoi: number;
  private themeId: ThemeId;

  constructor(private d: HostDeps) {
    this.maxNguoi = d.initialMaxNguoi ?? LOAI.maxNguoi;
    this.themeId = d.initialTheme ?? DEFAULT_THEME;
    this.room = new KyThi(d.bank, d.used, d.rand);
    this.voice = new SpokenQueue(d.emit, d.stageCount, d.now);
    const director = new SpeechDirector({
      room: this.room,
      voice: this.voice,
      rand: d.speechRand,
      now: d.now,
      channelName: d.channelName,
      addWeekly: d.addWeekly,
      saveUsed: () => d.saveUsed(this.room.used),
    });
    this.runners.set('exam', {
      name: 'exam',
      engine: this.room,
      director,
      restore: (saved) => {
        if (!this.room.restore(saved as RoomSnapshot)) return false;
        if (this.room.phase === 'doc') {
          // the voice that was reading the question is gone: read it again, the answer timer starts after
          const cau = this.room.cau;
          this.voice.say(this.room.docText(this.room.cauSo - 1) ?? '', true, () => this.room.cau === cau && this.room.docXong(this.d.now()));
        }
        return true;
      },
    });
    const ctx = {
      bank: d.bank,
      now: d.now,
      rand: d.rand,
      speechRand: d.speechRand,
      voice: this.voice,
      channelName: d.channelName,
      used: d.used,
      saveUsed: () => d.saveUsed(d.used),
    };
    for (const make of extraRunners) {
      const r = make(ctx);
      this.runners.set(r.name, r);
    }
  }

  private get active() {
    return this.runners.get(this.activeName)!;
  }

  get mode() {
    return this.activeName;
  }

  get theme() {
    return this.themeId;
  }

  /** Switch theme: the questions come from that theme's pack. Only while the active mode is waiting for a game (or with `force`). */
  setTheme(theme: ThemeId, force = false) {
    if (theme === this.themeId) return true;
    if (!force && this.active.engine.phase !== 'cho') return false;
    if (this.d.loadBank) {
      const bank = this.d.loadBank(theme);
      for (const r of this.runners.values()) r.engine.setBank(bank);
    }
    this.themeId = theme;
    this.d.saveTheme?.(theme);
    return true;
  }

  /** Player cap of the elimination mode */
  get cap() {
    return this.maxNguoi;
  }

  /** Resume the saved round if it is fresh, otherwise wait for a new one */
  start() {
    const now = this.d.now();
    this.room.tuan = this.d.weeklyTop();
    for (const r of this.runners.values()) r.director.warmUp(now);
    if (this.d.initialMaxNguoi) this.runners.get('elimination')?.director.command('custom', `cap:${this.d.initialMaxNguoi}`, now);
    const saved = this.d.loadRoom(now);
    const runner = this.runners.get(saved?.mode ?? 'exam');
    if (saved && runner && runner.restore(saved, now)) this.activeName = runner.name;
    else {
      // nothing to resume: wait for a game in the mode the operator used last
      if (this.d.initialMode && this.runners.has(this.d.initialMode)) this.activeName = this.d.initialMode;
      this.active.engine.cho(now);
    }
  }

  /** Switch mode. Only while the active mode is waiting for a game (or with `force`); the new mode starts waiting. */
  setMode(mode: GameMode, force = false) {
    const next = this.runners.get(mode);
    if (!next) return false;
    if (mode === this.activeName) return true;
    if (!force && this.active.engine.phase !== 'cho') return false;
    const now = this.d.now();
    this.voice.stop();
    this.activeName = mode;
    next.engine.cho(now);
    this.d.saveMode?.(mode);
    return true;
  }

  tick() {
    const now = this.d.now();
    const { engine, director } = this.active;
    engine.tick(now);
    director.afterTick(now);
    this.voice.sweep();
    const view = { ...engine.view(now), mode: this.activeName };
    this.lastView = view;
    this.d.emit('view', view);
    const phase = engine.phase;
    if (phase !== this.savedPhase || (phase !== 'cho' && now - this.lastSave >= SAVE_EVERY_MS)) {
      this.savedPhase = phase;
      this.lastSave = now;
      try {
        this.d.saveRoom(engine.snapshot(now));
      } catch (err) {
        console.error('Không lưu được data/room.json:', err);
      }
    }
  }

  /** Latest picture of the game, for a page that just opened */
  currentView() {
    return this.lastView;
  }

  /** Events from TikTok (or the test emitter) */
  onLiveEvent(type: string, data: any) {
    const now = this.d.now();
    const dir = this.active.director;
    if (type === 'chat') dir.onChat(data, now);
    else if (type === 'gift') dir.onGift(data, now);
    else if (type === 'member') dir.onMember(data);
    else if (type === 'follow') dir.onFollow(data);
    else if (type === 'like') dir.onLike(data);
  }

  command(action: string, text?: string) {
    if (action === 'custom' && text?.startsWith('mode:')) {
      const mode = text.slice(5);
      if (mode === 'exam' || mode === 'elimination') this.setMode(mode);
      return;
    }
    if (action === 'custom' && text?.startsWith('theme:')) {
      const theme = text.slice(6);
      if (isThemeId(theme)) this.setTheme(theme);
      return;
    }
    if (action === 'custom' && text?.startsWith('cap:')) {
      const n = Number(text.slice(4));
      if (Number.isInteger(n) && n >= 2 && n <= 500) {
        this.maxNguoi = n;
        this.d.saveMaxNguoi?.(n);
      }
    }
    this.active.director.command(action, text, this.d.now());
  }

  spoken(id: number) {
    return this.voice.ack(id);
  }
}

/** Every .txt file directly inside `dir`, in file name order (a missing folder gives nothing) */
function readPack(dir: string): McQ[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .flatMap((f) => parseMc(fs.readFileSync(path.join(dir, f), 'utf8')));
}

/**
 * The question bank for a theme: its own pack (src/game/questions/<questionPack>/*.txt) when the theme names one
 * and the folder has questions, otherwise the general bank (src/game/questions/*.txt).
 */
export function loadBank(theme: ThemeId = DEFAULT_THEME): McQ[] {
  const root = path.join(ROOT, 'src', 'game', 'questions');
  const pack = (THEMES[theme] as { questionPack?: string }).questionPack;
  if (pack) {
    const own = readPack(path.join(root, pack));
    if (own.length) return own;
    console.warn(`Chủ đề "${theme}": thư mục câu hỏi "${pack}" chưa có câu nào, dùng bộ câu hỏi chung.`);
  }
  return readPack(root);
}

export interface HostWiring {
  broadcast: (event: string, data: unknown) => void;
  stageCount: () => number;
  channelName: () => string;
  initialMode?: GameMode;
  initialMaxNguoi?: number;
  initialTheme?: ThemeId;
  saveMode?: (mode: GameMode) => void;
  saveMaxNguoi?: (n: number) => void;
  saveTheme?: (theme: ThemeId) => void;
}

export function registerGameHost(app: Express, w: HostWiring) {
  const host = new GameHost({
    bank: loadBank(w.initialTheme),
    loadBank,
    initialTheme: w.initialTheme,
    saveTheme: w.saveTheme,
    now: Date.now,
    rand: Math.random,
    speechRand: Math.random,
    emit: w.broadcast,
    stageCount: w.stageCount,
    channelName: w.channelName,
    used: loadUsedQuestions(),
    saveUsed: (used) => {
      try {
        saveUsedQuestions(used);
      } catch (err) {
        console.error('Không lưu được data/used-questions.json:', err);
      }
    },
    addWeekly: (ds) => addToWeekly(ds),
    weeklyTop: () => weeklyTop(),
    loadRoom,
    saveRoom: (snap) => saveRoom(snap),
    initialMode: w.initialMode,
    initialMaxNguoi: w.initialMaxNguoi,
    saveMode: w.saveMode,
    saveMaxNguoi: w.saveMaxNguoi,
  });
  host.start();
  setInterval(() => host.tick(), 250);

  // Which mode is running, for the control page
  app.get('/api/game/mode', (_req, res) => res.json({ mode: host.mode, maxNguoi: host.cap, theme: host.theme }));

  // The stage page tells us a line has been played (or failed to play)
  app.post('/api/game/spoken', (req, res) => {
    const id = Number(req.body?.id);
    res.json({ success: Number.isInteger(id) && host.spoken(id) });
  });
  return host;
}

