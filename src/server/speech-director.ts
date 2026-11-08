import { speakableName } from '../live/utils/names';
import { GAME } from '../game/config';
import type { Ev, KyThi } from '../game/engine/exam';
import type { ChatEvent, GiftEvent, LikeEvent, UserEvent } from '../live/types';
import type { VoiceOut } from './voice-out';
import { safeName, ViewerReactions } from './viewer-reactions';

export interface DirectorDeps {
  room: KyThi;
  voice: VoiceOut;
  rand: () => number;
  now: () => number;
  channelName: () => string;
  /** Add this round's scores to the weekly board; returns the new top */
  addWeekly: (ds: { id: string; name: string; avatar: string; diem: number }[]) => { id?: string; name: string; avatar: string; diem: number }[];
  saveUsed: () => void;
}

export const TEN_MIEN = { bac: 'miền Bắc', trung: 'miền Trung', nam: 'miền Nam' } as const;
const GOI_MIEN = { bac: 'Bắc', trung: 'Trung', nam: 'Nam' } as const;

/**
 * The master of ceremonies: turns game events and viewer events into spoken lines.
 * Wording lives in game/config.ts; this only decides WHAT to say and WHEN.
 */
export class SpeechDirector {
  private reactions: ViewerReactions;
  private pick: ViewerReactions['pick'];
  private lastShare = 0;

  constructor(private d: DirectorDeps) {
    this.reactions = new ViewerReactions({ voice: d.voice, rand: d.rand, channelName: d.channelName });
    this.pick = this.reactions.pick;
  }

  /** Lines said often: have the voice ready before they are needed */
  warmUp(now: number) {
    this.lastShare = now;
    const L = GAME.loi;
    [...L.hetGio, ...L.nhac, ...L.latKeo, ...L.cuuTro, ...L.thach, ...L.coVuSau].forEach((t) => this.d.voice.prefetch(t));
  }

  /** Quan chủ khảo đọc theo sự kiện của game. Câu của game đi làn ưu tiên để không bị lời chào chen trước. */
  speak(ev: Ev) {
    const { room, voice, rand } = this.d;
    const pick = this.pick;
    const L = GAME.loi;
    switch (ev.t) {
      case 'cho': {
        const dau = room.tuan[0];
        // thỉnh thoảng nhắc người dẫn đầu bảng vàng tuần, để người chơi có lý do quay lại
        const them = dau && rand() < 0.5 ? ` ${pick(L.tuanDau)?.(speakableName(dau.name))}` : '';
        return voice.say((pick(L.cho) ?? '') + them, true);
      }
      case 'vong':
        if (ev.vong === 0) this.d.saveUsed(); // ván mới vừa bốc câu: lưu lại để lần sau ưu tiên câu khác
        return voice.say(pick(L.vong[ev.vong] ?? []) ?? '', true);
      case 'doc': {
        const cau = room.cau;
        voice.prefetch(room.dapAnText()); // tạo sẵn giọng công bố đáp án trong lúc mọi người trả lời
        // Đọc xong đề mới hiện 4 đáp án và tính giờ
        return voice.say(ev.text, true, () => room.cau === cau && room.docXong(this.d.now()));
      }
      case 'chot':
        return voice.say(pick(L.hetGio) ?? '', true);
      case 'nhac':
        return voice.say(pick(L.nhac) ?? '');
      case 'latKeo':
        return voice.say(pick(L.latKeo) ?? '', true);
      case 'thach':
        return voice.say(pick(L.thach) ?? '', true);
      case 'dauBang':
        return voice.say(pick(L.dauBang)?.(speakableName(ev.name)) ?? '', true);
      case 'mienKem':
        return voice.say(pick(L.mienKem)?.(TEN_MIEN[ev.mien], GOI_MIEN[ev.mien]) ?? '');
      case 'saiLien':
        return this.reactions.banter.them(ev.id, ev.name, 'sai', this.d.now());
      case 'cuuTro':
        return voice.say(pick(L.cuuTro) ?? '', true);
      case 'dapAn': {
        const nhanh = ev.nhanh ? speakableName(ev.nhanh) : 'bạn';
        // Cảm xúc theo tỉ lệ đúng: gần hết đúng thì cười, ít đúng thì trêu, không ai đúng thì thở dài
        const tile = ev.soNop ? ev.soDung / ev.soNop : 0;
        const nhom = tile >= 0.75 ? L.deQua : tile < 0.3 ? L.itDung : L.dungNhieu;
        const them =
          ev.soDung === 0 ? pick(L.khongAi)
          : ev.soDung === 1 ? pick(L.dungMot)?.(nhanh)
          : pick(nhom)?.(ev.soDung, nhanh);
        const khen = ev.soDung > 0 && (ev.msNhanh ?? 9e9) < 2000 ? pick(L.thanDong)?.(nhanh) : '';
        // "B, chim sẻ!" đã tạo sẵn nên nói ngay lúc ô nhấp nháy; lời bình đọc tiếp theo
        voice.say(room.dapAnText(), true);
        voice.say(`${them ?? ''} ${khen ?? ''}`.trim(), true);
        const sau = room.docText(room.cauSo); // đề câu kế: tạo sẵn giọng
        if (sau) voice.prefetch(sau);
        return;
      }
      case 'bangVang':
        voice.say(ev.dau ? pick(L.bangVang)!(ev.vong, speakableName(ev.dau)) : L.bangVangTrong(ev.vong), true);
        if (ev.dau && rand() < 0.6) voice.say(pick(L.coVuSau) ?? '', true);
        return;
      case 'vinhQuy': {
        // cộng điểm ván này vào bảng vàng tuần
        const ds = [...room.siTu.values()].filter((s) => s.diem > 0).map(({ id, name, avatar, diem }) => ({ id, name, avatar, diem }));
        if (ds.length) room.tuan = this.d.addWeekly(ds);
        const [tn, bn, th] = ev.top.map(speakableName);
        voice.say(tn ? L.vinhQuy(tn, bn, th) : L.khongAiThi, true);
        if (ev.mien) voice.say(L.mienThang(TEN_MIEN[ev.mien.mien], ev.mien.diem), true);
        return;
      }
    }
  }

  onChat(e: ChatEvent, now: number) {
    const name = safeName(e.nickname, e.username);
    this.d.room.chat({ id: e.username, name, avatar: e.avatar, comment: e.comment, createTime: e.createTime }, now);
    this.reactions.chat(e, now);
  }

  onGift(e: GiftEvent, now: number) {
    const { room } = this.d;
    const name = safeName(e.nickname, e.username);
    const coins = e.diamondCount * e.repeatCount;
    // băng rôn cảm ơn trên màn hình (người tặng thấy mình); quà KHÔNG cho lợi thế trong game
    room.tangQua({ id: e.username, name, avatar: e.avatar, gift: e.giftName, count: e.repeatCount, coins, big: coins >= GAME.bigGiftCoins }, now);
    this.reactions.gift(e);
  }

  onMember(e: UserEvent) {
    this.reactions.member(e);
  }

  /** Tim: Thi Đình đủ tim thì cứu trợ cả phòng (loại 2 đáp án sai) */
  onLike(e: LikeEvent) {
    this.d.room.tim(e.likeCount);
  }

  onFollow(e: UserEvent) {
    this.reactions.follow(e);
  }

  /** Commands from the control page: speak, reset, start now, skip the question */
  command(action: string, text: string | undefined, now: number) {
    const { room, voice } = this.d;
    if (action === 'speak' && text) voice.say(text, true);
    if (action === 'reset') {
      voice.stop();
      room.cho(now);
    }
    if (action === 'custom' && text === 'batdau') {
      voice.stop();
      room.batDau(now);
    }
    if (action === 'custom' && text === 'bocau') {
      room.boCau(now);
      this.d.saveUsed(); // nhớ câu bị bỏ, tắt bật lại vẫn không hỏi
    }
  }

  /** Called every game tick, after the engine ticked */
  afterTick(now: number) {
    const { room, voice } = this.d;
    room.lay().forEach((ev) => this.speak(ev));
    // khoảng lặng: đang chờ trả lời (còn hơn 6 giây) hoặc chờ ván / bảng vàng, giọng đang rảnh -> trêu 1 câu
    const lang = (room.phase === 'hoi' && room.endsAt - now > 6000) || room.phase === 'cho' || room.phase === 'bangVang';
    if (lang && !voice.busy) this.reactions.quiet(now, () => room.view(now).vongTen);
    if (now - this.lastShare >= GAME.shareReminderEveryMs) {
      this.lastShare = now;
      const line = this.pick(GAME.shareLines);
      if (line) voice.say(line);
    }
  }
}
