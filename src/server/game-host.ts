import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import { KyThi, parseMc, type McQ, type RoomSnapshot } from '../game/engine/exam';
import { ROOT } from './store';
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
  loadRoom: (now: number) => RoomSnapshot | null;
  saveRoom: (snap: RoomSnapshot) => void;
}

const SAVE_EVERY_MS = 5000;

/** Runs the game on the server: the engine, the master of ceremonies, round saving. Pages only draw and play audio. */
export class GameHost {
  readonly room: KyThi;
  readonly voice: SpokenQueue;
  private director: SpeechDirector;
  private lastView: unknown = null;
  private lastSave = 0;
  private savedPhase = '';

  constructor(private d: HostDeps) {
    this.room = new KyThi(d.bank, d.used, d.rand);
    this.voice = new SpokenQueue(d.emit, d.stageCount, d.now);
    this.director = new SpeechDirector({
      room: this.room,
      voice: this.voice,
      rand: d.speechRand,
      now: d.now,
      channelName: d.channelName,
      addWeekly: d.addWeekly,
      saveUsed: () => d.saveUsed(this.room.used),
    });
  }

  /** Resume the saved round if it is fresh, otherwise wait for a new one */
  start() {
    const now = this.d.now();
    this.room.tuan = this.d.weeklyTop();
    this.director.warmUp(now);
    const saved = this.d.loadRoom(now);
    if (saved && this.room.restore(saved)) {
      if (this.room.phase === 'doc') {
        // the voice that was reading the question is gone: read it again, the answer timer starts after
        const cau = this.room.cau;
        this.voice.say(this.room.docText(this.room.cauSo - 1) ?? '', true, () => this.room.cau === cau && this.room.docXong(this.d.now()));
      }
    } else this.room.cho(now);
  }

  tick() {
    const now = this.d.now();
    this.room.tick(now);
    this.director.afterTick(now);
    this.voice.sweep();
    const view = this.room.view(now);
    this.lastView = view;
    this.d.emit('view', view);
    if (view.phase !== this.savedPhase || (view.phase !== 'cho' && now - this.lastSave >= SAVE_EVERY_MS)) {
      this.savedPhase = view.phase;
      this.lastSave = now;
      try {
        this.d.saveRoom(this.room.snapshot(now));
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
    if (type === 'chat') this.director.onChat(data, now);
    else if (type === 'gift') this.director.onGift(data, now);
    else if (type === 'member') this.director.onMember(data);
    else if (type === 'follow') this.director.onFollow(data);
    else if (type === 'like') this.director.onLike(data);
  }

  command(action: string, text?: string) {
    this.director.command(action, text, this.d.now());
  }

  spoken(id: number) {
    return this.voice.ack(id);
  }
}

/** The question bank: every src/game/questions/*.txt in file name order */
export function loadBank(): McQ[] {
  const dir = path.join(ROOT, 'src', 'game', 'questions');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .flatMap((f) => parseMc(fs.readFileSync(path.join(dir, f), 'utf8')));
}

export interface HostWiring {
  broadcast: (event: string, data: unknown) => void;
  stageCount: () => number;
  channelName: () => string;
}

export function registerGameHost(app: Express, w: HostWiring) {
  const host = new GameHost({
    bank: loadBank(),
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
  });
  host.start();
  setInterval(() => host.tick(), 250);

  // The stage page tells us a line has been played (or failed to play)
  app.post('/api/game/spoken', (req, res) => {
    const id = Number(req.body?.id);
    res.json({ success: Number.isInteger(id) && host.spoken(id) });
  });
  return host;
}

