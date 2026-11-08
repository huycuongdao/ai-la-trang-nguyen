import { useState } from 'react';
import { voice, speakableName } from '../../live/utils/voice';
import { containsBanned } from '../../live/utils/banned-words';
import { NameBatcher } from '../../live/utils/scoreboard';
import { GiftThanker, makePicker, OncePerPerson, RecentPeople, WishLimiter } from '../../live/utils/chatter';
import { GAME } from '../config';
import { Treu } from '../engine/banter';
import type { Ev, KyThi } from '../engine/exam';
import { post } from '../utils/stage-api';

export const pick = makePicker();
export const TEN_MIEN = { bac: 'miền Bắc', trung: 'miền Trung', nam: 'miền Nam' } as const;
const GOI_MIEN = { bac: 'Bắc', trung: 'Trung', nam: 'Nam' } as const;

// ['An', 'Bình', 'Chi'] -> 'An, Bình và Chi'
function joinNames(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}` : names[0] ?? '';
}

/** Speech side of the stage: the people-talk helpers and the mapping from game events to spoken lines. */
export function useStageAudio(room: KyThi, channelName: string) {
  const [talk] = useState(() => ({
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
  }));
  const [kenh] = useState(() => ({ current: GAME.defaultChannelName }));
  kenh.current = channelName;

  // Tên an toàn để hiện/đọc: tên có từ cấm thì dùng username
  const safeName = (nickname: string, username: string) => (containsBanned(nickname) ? username : nickname);

  // Quan chủ khảo đọc theo sự kiện của game. Câu của game đi làn ưu tiên để không bị lời chào chen trước.
  const speak = (ev: Ev) => {
    const L = GAME.loi;
    switch (ev.t) {
      case 'cho': {
        const dau = room.tuan[0];
        // thỉnh thoảng nhắc người dẫn đầu bảng vàng tuần, để người chơi có lý do quay lại
        const them = dau && Math.random() < 0.5 ? ` ${pick(L.tuanDau)?.(speakableName(dau.name))}` : '';
        return voice.say((pick(L.cho) ?? '') + them, true);
      }
      case 'vong':
        if (ev.vong === 0 && voice.speaker) void post('/api/da-hoi', room.used); // ván mới vừa bốc câu: lưu lại để lần sau ưu tiên câu khác
        return voice.say(pick(L.vong[ev.vong] ?? []) ?? '', true);
      case 'doc': {
        const cau = room.cau;
        voice.prefetch(room.dapAnText()); // tạo sẵn giọng công bố đáp án trong lúc mọi người trả lời
        // Đọc xong đề mới hiện 4 đáp án và tính giờ
        return voice.say(ev.text, true, () => room.cau === cau && room.docXong(Date.now()));
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
        return talk.treu.them(ev.id, ev.name, 'sai', Date.now());
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
        // không ai đúng: thở dài trước rồi mới đọc đáp án
        // "B, chim sẻ!" đã tạo sẵn nên nói ngay lúc ô nhấp nháy; lời bình đọc tiếp theo
        voice.say(room.dapAnText(), true);
        voice.say(`${them ?? ''} ${khen ?? ''}`.trim(), true);
        const sau = room.docText(room.cauSo); // đề câu kế: tạo sẵn giọng
        if (sau) voice.prefetch(sau);
        return;
      }
      case 'bangVang':
        voice.say(ev.dau ? pick(L.bangVang)!(ev.vong, speakableName(ev.dau)) : L.bangVangTrong(ev.vong), true);
        if (ev.dau && Math.random() < 0.6) voice.say(pick(L.coVuSau) ?? '', true);
        return;
      case 'vinhQuy': {
        // cộng điểm ván này vào bảng vàng tuần
        const ds = [...room.siTu.values()].filter((s) => s.diem > 0).map(({ id, name, avatar, diem }) => ({ id, name, avatar, diem }));
        if (ds.length && voice.speaker) void loadWeekly(post('/api/bang-tuan', { ds }));
        const [tn, bn, th] = ev.top.map(speakableName);
        voice.say(tn ? L.vinhQuy(tn, bn, th) : L.khongAiThi, true);
        if (ev.mien) voice.say(L.mienThang(TEN_MIEN[ev.mien.mien], ev.mien.diem), true);
        return;
      }
    }
  };

  // Đọc bảng vàng tuần server trả về, gắn vào game để hiện lúc chờ ván mới
  async function loadWeekly(r: Promise<Response | void>) {
    try {
      const res = await r;
      if (res) room.tuan = (await res.json()).top ?? [];
    } catch {
      // server chưa bật: bỏ qua
    }
  }

  return { talk, kenh, safeName, speak, loadWeekly };
}

export type StageAudio = ReturnType<typeof useStageAudio>;
