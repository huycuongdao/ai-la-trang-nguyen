import { speakableName } from '../live/utils/names';
import { GAME } from '../game/config';
import { LOAI } from '../game/elimination-config';
import { LoaiTru, type ElimEv } from '../game/engine/elimination';
import type { ChatEvent, GiftEvent, LikeEvent, UserEvent } from '../live/types';
import type { ModeDirector, ModeRunner, RunnerContext } from './hosted-mode';
import type { VoiceOut } from './voice-out';
import { joinNames, safeName, ViewerReactions } from './viewer-reactions';

/** While the next game waits for hearts, remind the viewers this rarely (the first ask comes with the waiting room) */
const NHAC_TIM_MS = 45_000;

export interface EliminationDirectorDeps {
  engine: LoaiTru;
  voice: VoiceOut;
  rand: () => number;
  now: () => number;
  channelName: () => string;
  saveUsed: () => void;
}

/** "5,2" for 5200 ms: how the host reads an average time */
const giay = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',');

/**
 * The master of ceremonies of the elimination mode: turns game events and viewer events into spoken lines.
 * Wording lives in game/elimination-config.ts; this only decides WHAT to say and WHEN.
 */
export class EliminationDirector implements ModeDirector {
  private reactions: ViewerReactions;
  private pick: ViewerReactions['pick'];
  private lastShare = 0;
  private lastTimAsk = 0;

  constructor(private d: EliminationDirectorDeps) {
    this.reactions = new ViewerReactions({ voice: d.voice, rand: d.rand, channelName: d.channelName, treu: () => LOAI.loi.treu });
    this.pick = this.reactions.pick;
  }

  /** Lines said often or at a tense moment: have the voice ready before they are needed */
  warmUp(now: number) {
    this.lastShare = now;
    const L = LOAI.loi;
    [...L.chot, ...L.khongAiDung, ...L.conHai, ...L.tim, ...L.cho, ...L.chuaDu, ...L.moDangKy].forEach((t) => this.d.voice.prefetch(t));
  }

  private speak(ev: ElimEv) {
    const { engine, voice } = this.d;
    const pick = this.pick;
    const L = LOAI.loi;
    switch (ev.t) {
      case 'cho':
        // right after a game the waiting room first asks for hearts; the first waiting room just invites people to sign up
        if (engine.view(this.d.now()).cong) {
          this.lastTimAsk = this.d.now();
          return voice.say(pick(L.tim) ?? '', true);
        }
        return voice.say(pick(L.cho) ?? '', true);
      case 'moDangKy':
        return voice.say(pick(L.moDangKy) ?? '', true);
      case 'chuaDu':
        return voice.say(pick(L.chuaDu) ?? '', true);
      case 'batDau':
        this.d.saveUsed(); // the game just picked its questions: remember them so the next game prefers others
        return voice.say(pick(L.batDau)?.(ev.soNguoi) ?? '', true);
      case 'doc': {
        const text = ev.text;
        voice.prefetch(engine.dapAnText()); // have the answer announcement ready while people answer
        // The 4 answers appear and the 5 s clock starts only when the question has been read
        return voice.say(text, true, () => engine.docText() === text && engine.docXong(this.d.now()));
      }
      case 'chot':
        return voice.say(pick(L.chot) ?? '', true);
      case 'dapAn': {
        // "B, chim sẻ!" first, then who is out
        voice.say(engine.dapAnText(), true);
        const ten = ev.tenLoai.map(speakableName);
        const them =
          ev.khongAiDung ? pick(L.khongAiDung)
          : ev.loai === 0 ? pick(L.conNguyen)?.(ev.conLai)
          : ev.loai <= LOAI.tenNguoiLoaiToiDa ? pick(L.loaiTen)?.(joinNames(ten), ev.conLai)
          : pick(L.loai)?.(ev.loai, ev.conLai);
        const nhanh = !ev.khongAiDung && ev.nhanh ? pick(L.nhanhNhat)?.(speakableName(ev.nhanh)) : '';
        voice.say(`${them ?? ''} ${nhanh ?? ''}`.trim(), true);
        return;
      }
      case 'topNam':
        return voice.say((LOAI.veVote ? pick(L.topNam) : pick(L.topNamKhongVote))?.(ev.n) ?? '', true);
      case 'conHai':
        return voice.say(pick(L.conHai) ?? '', true);
      case 'vinhDanh':
        voice.say(pick(L.vinhDanh)?.(speakableName(ev.name), ev.avgMs === null ? undefined : giay(ev.avgMs)) ?? '', true);
        if (ev.yeuNhat) voice.say(pick(L.yeuNhat)?.(speakableName(ev.yeuNhat)) ?? '', true);
        return;
      case 'khongAiThi':
        return voice.say(L.khongAiThi, true);
    }
  }

  onChat(e: ChatEvent, now: number) {
    const name = safeName(e.nickname, e.username);
    this.d.engine.chat({ id: e.username, name, avatar: e.avatar, comment: e.comment, createTime: e.createTime }, now);
    this.reactions.chat(e, now);
  }

  onGift(e: GiftEvent, now: number) {
    const { name, coins } = this.reactions.gift(e);
    this.d.engine.tangQua({ id: e.username, name, avatar: e.avatar, gift: e.giftName, count: e.repeatCount, coins, big: coins >= GAME.bigGiftCoins }, now);
  }

  onMember(e: UserEvent) {
    this.reactions.member(e);
  }

  onFollow(e: UserEvent) {
    this.reactions.follow(e);
  }

  /** Hearts open the next game (only counted while the waiting room waits for them) */
  onLike(e: LikeEvent) {
    this.d.engine.tim(e.likeCount);
  }

  /** Commands from the control page: speak, reset, start now, skip the question, player cap */
  command(action: string, text: string | undefined, now: number) {
    const { engine, voice } = this.d;
    if (action === 'speak' && text) voice.say(text, true);
    if (action === 'reset') {
      voice.stop();
      engine.cho(now);
    }
    if (action !== 'custom') return;
    if (text === 'batdau' && engine.phase === 'cho' && engine.nguoi.size >= LOAI.toiThieu) {
      voice.stop();
      engine.batDau(now);
    }
    if (text === 'bocau') {
      engine.boCau(now);
      this.d.saveUsed(); // remember the skipped question, a restart still will not ask it
    }
    if (text === 'cap:50' || text === 'cap:100') engine.datMaxNguoi(Number(text.slice(4)));
  }

  /** Called every game tick, after the engine ticked */
  afterTick(now: number) {
    const { engine, voice } = this.d;
    engine.lay().forEach((ev) => this.speak(ev));
    // waiting for hearts: remind now and then
    if (engine.phase === 'cho' && now - this.lastTimAsk >= NHAC_TIM_MS && !voice.busy && engine.view(now).cong) {
      this.lastTimAsk = now;
      voice.say(this.pick(LOAI.loi.tim) ?? '');
    }
    // quiet moments: the waiting room and the reveal pause (the 5 s answer window has no room for banter)
    if ((engine.phase === 'cho' || engine.phase === 'dapAn') && !voice.busy) this.reactions.quiet(now, () => 'vòng loại');
    if (now - this.lastShare >= GAME.shareReminderEveryMs) {
      this.lastShare = now;
      const line = this.pick(GAME.shareLines);
      if (line) voice.say(line);
    }
  }
}

export function createEliminationRunner(ctx: RunnerContext): ModeRunner {
  const engine = new LoaiTru(ctx.bank, ctx.used, ctx.rand);
  const director = new EliminationDirector({
    engine,
    voice: ctx.voice,
    rand: ctx.speechRand,
    now: ctx.now,
    channelName: ctx.channelName,
    saveUsed: ctx.saveUsed,
  });
  return {
    name: 'elimination',
    engine,
    director,
    restore: (saved) => {
      if (!engine.restore(saved)) return false;
      if (engine.phase === 'doc') {
        // the voice that was reading the question is gone: read it again, the answer timer starts after
        const text = engine.docText();
        ctx.voice.say(text, true, () => engine.docText() === text && engine.docXong(ctx.now()));
      }
      return true;
    },
  };
}
