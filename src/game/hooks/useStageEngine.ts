import { useEffect } from 'react';
import { useLiveEvents } from '../../live/hooks/useLiveEvents';
import { voice, speakableName } from '../../live/utils/voice';
import { containsBanned } from '../../live/utils/banned-words';
import { detectWish } from '../../live/utils/chatter';
import type { Role } from '../../live/context/RoleContext';
import { sfx } from '../audio/sfx';
import { GAME } from '../config';
import type { KyThi, View } from '../engine/exam';
import { loaiCmt } from '../engine/banter';
import { post } from '../utils/stage-api';
import { pick, type StageAudio } from './useStageAudio';
import type { GameViewState } from './useGameView';

/**
 * Transitional: the stage page still runs the game engine in the browser.
 * Event wiring and the game loop live here until the engine moves to the server.
 */
export function useStageEngine(room: KyThi, audio: StageAudio, role: Role, v: GameViewState) {
  const { talk, kenh, safeName, speak, loadWeekly } = audio;
  const isStage = role.role === 'stage';
  const layTuan = loadWeekly;
  const muted = role.muted;

  useLiveEvents({
    onStatus: v.setStatus,
    onGameState: (s) => !isStage && v.setView(s),
    onCaiDat: v.setCaiDat,

    onChat: (e) => {
      if (!isStage) return;
      const name = safeName(e.nickname, e.username);
      room.chat({ id: e.username, name, avatar: e.avatar, comment: e.comment, createTime: e.createTime }, Date.now());
      talk.recent.note(e.username, speakableName(name));
      // Bình luận kiểu "khó quá", "dễ", "chào", "haha"... -> xếp hàng để ông đồ trêu lại vào khoảng lặng
      const loai = containsBanned(e.comment) ? null : loaiCmt(e.comment);
      if (loai) talk.treu.them(e.username, name, loai, Date.now());
      // Comment có lời cầu chúc -> đọc 1 câu chúc soạn sẵn (không bao giờ đọc nguyên văn comment)
      const topic = containsBanned(e.comment) ? null : detectWish(e.comment);
      const reply = topic && pick(GAME.wishReplies[topic] ?? []);
      if (reply && talk.wishes.allow(e.username)) voice.say(reply(speakableName(name)));
    },

    onGift: (e) => {
      if (!isStage) return;
      const name = safeName(e.nickname, e.username);
      const coins = e.diamondCount * e.repeatCount;
      // băng rôn cảm ơn trên màn hình (người tặng thấy mình); quà KHÔNG cho lợi thế trong game
      room.tangQua({ id: e.username, name, avatar: e.avatar, gift: e.giftName, count: e.repeatCount, coins, big: coins >= GAME.bigGiftCoins }, Date.now());
      // Quà không cho lợi thế trong game, chỉ cảm ơn (combo 1 lần / 30 giây, quà to luôn cảm ơn)
      if (talk.gifts.shouldThank(e.username, coins, voice.waitingPriority)) {
        // quà mức nào (xu 1 món) thì ông đồ đáp lời mức đó; quà lạ dưới 1 xu thì cảm ơn chung
        const muc = [...GAME.giftMenu].reverse().find((m) => e.diamondCount >= m.xu);
        const loi = muc && pick(muc.cam)?.(speakableName(name));
        voice.say(loi ?? GAME.thankGift(speakableName(name), e.giftName, kenh.current), true);
        if (!loi) {
          const wish = pick(GAME.giftWishes);
          if (wish) voice.say(wish, true);
        }
      }
    },

    onMember: (e) => {
      if (!isStage) return;
      const spoken = speakableName(safeName(e.nickname, e.username));
      if (spoken !== 'bạn') talk.greeter.add(e.username, spoken);
    },

    // Tim: Thi Đình đủ tim thì cứu trợ cả phòng (loại 2 đáp án sai)
    onLike: (e) => {
      if (isStage) room.tim(e.likeCount);
    },

    onFollow: (e) => {
      if (!isStage) return;
      if (talk.follows.first(e.username)) voice.say(GAME.thankFollow(speakableName(safeName(e.nickname, e.username)), kenh.current));
    },

    onControl: (c) => {
      if (c.action === 'setName' && c.text) v.setChannelName(c.text);
      if (!isStage) return; // chỉ trang stage làm theo lệnh, tránh 2 giọng
      const now = Date.now();
      if (c.action === 'speak' && c.text) voice.say(c.text, true);
      if (c.action === 'setRate' && c.text) voice.rate = Number(c.text) || 1;
      if (c.action === 'reset') {
        voice.stop();
        room.cho(now);
      }
      if (c.action === 'custom' && c.text === 'batdau') {
        voice.stop();
        room.batDau(now);
      }
      if (c.action === 'custom' && c.text === 'bocau') {
        room.boCau(now);
        void post('/api/da-hoi', room.used); // nhớ câu bị bỏ, tắt bật lại vẫn không hỏi
      }
    },
  }, { stageId: role.stageId });

  // Vòng chạy game trên trang stage
  useEffect(() => {
    if (!isStage) return;
    let ready = false;
    let lastPost = 0;
    let prev: View | null = null;
    void layTuan(fetch('/api/bang-tuan'));
    // câu chung đọc nhiều lần: tạo giọng sẵn ngay từ đầu
    [...GAME.loi.hetGio, ...GAME.loi.nhac, ...GAME.loi.latKeo, ...GAME.loi.cuuTro, ...GAME.loi.thach, ...GAME.loi.coVuSau].forEach((t) => voice.prefetch(t));
    if (muted) sfx.volume = sfx.musicVolume = 0;
    sfx.loadFiles();
    fetch('/api/da-hoi')
      .then((r) => r.json())
      .then((u) => Object.assign(room.used, u))
      .catch(() => {})
      .finally(() => {
        if (!room.endsAt) room.cho(Date.now()); // chủ kênh đã bấm "Bắt đầu ngay" trong lúc chờ thì thôi
        ready = true;
      });
    const id = setInterval(() => {
      if (!ready) return;
      const now = Date.now();
      room.tick(now);
      room.lay().forEach(speak);
      // khoảng lặng: đang chờ trả lời (còn hơn 6 giây) hoặc chờ ván / bảng vàng, giọng đang rảnh -> trêu 1 câu
      const lang = (room.phase === 'hoi' && room.endsAt - now > 6000) || room.phase === 'cho' || room.phase === 'bangVang';
      if (lang && !voice.busy) {
        const x = talk.treu.lay(now);
        const line = x && pick(GAME.loi.treu[x.loai])?.(speakableName(x.name), room.view(now).vongTen);
        if (line) voice.say(line);
      }
      const snap = room.view(now);
      v.setView(snap);
      if (voice.speaker) sfx.watch(prev, snap, voice.busy);
      else sfx.music('tat', false); // trang phụ: tắt nhạc
      prev = snap;
      if (voice.speaker && now - lastPost >= 500) {
        lastPost = now;
        void post('/api/game/state', snap);
      }
    }, 250);
    const share = setInterval(() => {
      const line = pick(GAME.shareLines);
      if (line) voice.say(line);
    }, GAME.shareReminderEveryMs);
    return () => {
      clearInterval(id);
      clearInterval(share);
    };
  }, []);
}
