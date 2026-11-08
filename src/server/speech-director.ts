import { containsBanned } from '../live/utils/banned-words';
import { detectWish, GiftThanker, makePicker, OncePerPerson, RecentPeople, WishLimiter } from '../live/utils/chatter';
import { speakableName } from '../live/utils/names';
import { NameBatcher } from '../live/utils/scoreboard';
import { GAME } from '../game/config';
import { loaiCmt, Treu } from '../game/engine/banter';
import type { Ev, KyThi } from '../game/engine/exam';
import type { ChatEvent, GiftEvent, LikeEvent, UserEvent } from '../live/types';

/** What the director needs from the voice: lines go to the stage page, which plays them and reports back. */
export interface VoiceOut {
  say(text: string, priority?: boolean, done?: () => void): void;
  prefetch(text: string): void;
  stop(): void;
  readonly busy: boolean;
  readonly waiting: number;
  readonly waitingPriority: number;
}

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

// ['An', 'Bình', 'Chi'] -> 'An, Bình và Chi'
const joinNames = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}` : names[0] ?? '';

// Tên an toàn để hiện/đọc: tên có từ cấm thì dùng username
const safeName = (nickname: string, username: string) => (containsBanned(nickname) ? username : nickname);

/**
 * The master of ceremonies: turns game events and viewer events into spoken lines.
 * Wording lives in game/config.ts; this only decides WHAT to say and WHEN.
 */
export class SpeechDirector {
  private pick: ReturnType<typeof makePicker>;
  private talk;
  private lastShare = 0;

  constructor(private d: DirectorDeps) {
    this.pick = makePicker(d.rand);
    const voice = d.voice;
    this.talk = {
      greeter: new NameBatcher(
        GAME.greetEveryMs,
        GAME.namesPerGreeting,
        (names) => voice.say(GAME.greeting(joinNames(names))),
        () => voice.waiting >= 1,
      ),
      gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
      follows: new OncePerPerson(),
      wishes: new WishLimiter(GAME.wishPerUserMs, GAME.wishGlobalMs),
      recent: new RecentPeople(),
      treu: new Treu(),
    };
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
        return this.talk.treu.them(ev.id, ev.name, 'sai', this.d.now());
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
    const { room, voice } = this.d;
    const name = safeName(e.nickname, e.username);
    room.chat({ id: e.username, name, avatar: e.avatar, comment: e.comment, createTime: e.createTime }, now);
    this.talk.recent.note(e.username, speakableName(name));
    // Bình luận kiểu "khó quá", "dễ", "chào", "haha"... -> xếp hàng để ông đồ trêu lại vào khoảng lặng
    const loai = containsBanned(e.comment) ? null : loaiCmt(e.comment);
    if (loai) this.talk.treu.them(e.username, name, loai, now);
    // Comment có lời cầu chúc -> đọc 1 câu chúc soạn sẵn (không bao giờ đọc nguyên văn comment)
    const topic = containsBanned(e.comment) ? null : detectWish(e.comment);
    const reply = topic && this.pick(GAME.wishReplies[topic] ?? []);
    if (reply && this.talk.wishes.allow(e.username)) voice.say(reply(speakableName(name)));
  }

  onGift(e: GiftEvent, now: number) {
    const { room, voice } = this.d;
    const name = safeName(e.nickname, e.username);
    const coins = e.diamondCount * e.repeatCount;
    // băng rôn cảm ơn trên màn hình (người tặng thấy mình); quà KHÔNG cho lợi thế trong game
    room.tangQua({ id: e.username, name, avatar: e.avatar, gift: e.giftName, count: e.repeatCount, coins, big: coins >= GAME.bigGiftCoins }, now);
    // Quà không cho lợi thế trong game, chỉ cảm ơn (combo 1 lần / 30 giây, quà to luôn cảm ơn)
    if (this.talk.gifts.shouldThank(e.username, coins, voice.waitingPriority)) {
      // quà mức nào (xu 1 món) thì ông đồ đáp lời mức đó; quà lạ dưới 1 xu thì cảm ơn chung
      const muc = [...GAME.giftMenu].reverse().find((m) => e.diamondCount >= m.xu);
      const loi = muc && this.pick(muc.cam)?.(speakableName(name));
      voice.say(loi ?? GAME.thankGift(speakableName(name), e.giftName, this.d.channelName()), true);
      if (!loi) {
        const wish = this.pick(GAME.giftWishes);
        if (wish) voice.say(wish, true);
      }
    }
  }

  onMember(e: UserEvent) {
    const spoken = speakableName(safeName(e.nickname, e.username));
    if (spoken !== 'bạn') this.talk.greeter.add(e.username, spoken);
  }

  /** Tim: Thi Đình đủ tim thì cứu trợ cả phòng (loại 2 đáp án sai) */
  onLike(e: LikeEvent) {
    this.d.room.tim(e.likeCount);
  }

  onFollow(e: UserEvent) {
    if (this.talk.follows.first(e.username)) {
      this.d.voice.say(GAME.thankFollow(speakableName(safeName(e.nickname, e.username)), this.d.channelName()));
    }
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
    if (lang && !voice.busy) {
      const x = this.talk.treu.lay(now);
      const line = x && this.pick(GAME.loi.treu[x.loai])?.(speakableName(x.name), room.view(now).vongTen);
      if (line) voice.say(line);
    }
    if (now - this.lastShare >= GAME.shareReminderEveryMs) {
      this.lastShare = now;
      const line = this.pick(GAME.shareLines);
      if (line) voice.say(line);
    }
  }
}
