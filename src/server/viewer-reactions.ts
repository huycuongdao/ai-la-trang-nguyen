import { containsBanned } from '../live/utils/banned-words';
import { detectWish, GiftThanker, makePicker, OncePerPerson, RecentPeople, WishLimiter } from '../live/utils/chatter';
import { speakableName } from '../live/utils/names';
import { NameBatcher } from '../live/utils/scoreboard';
import { GAME } from '../game/config';
import { loaiCmt, Treu } from '../game/engine/banter';
import type { ChatEvent, GiftEvent, UserEvent } from '../live/types';
import type { VoiceOut } from './voice-out';

// ['An', 'Bình', 'Chi'] -> 'An, Bình và Chi'
export const joinNames = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}` : names[0] ?? '';

// Tên an toàn để hiện/đọc: tên có từ cấm thì dùng username
export const safeName = (nickname: string, username: string) => (containsBanned(nickname) ? username : nickname);

export interface ReactionDeps {
  voice: VoiceOut;
  rand: () => number;
  channelName: () => string;
  /** Banter lines that replace the shared ones for this mode (some shared lines mention rules of another mode) */
  /** Lines that replace the general teasing lines (a function so a theme change is picked up) */
  treu?: () => Partial<typeof GAME.loi.treu>;
}

/**
 * What the host says back to viewers in every game mode: greetings, thanks for gifts and follows, wishes, and
 * short banter in quiet moments. Mode-specific speech lives in each mode's director.
 */
export class ViewerReactions {
  readonly pick: ReturnType<typeof makePicker>;
  /** Short comments ("khó quá", "chào"...) waiting for a quiet moment; the exam director also queues "sai ba câu liền" here */
  readonly banter = new Treu();
  private greeter: NameBatcher;
  private gifts = new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins);
  private follows = new OncePerPerson();
  private wishes = new WishLimiter(GAME.wishPerUserMs, GAME.wishGlobalMs);
  private recent = new RecentPeople();

  constructor(private d: ReactionDeps) {
    this.pick = makePicker(d.rand);
    const voice = d.voice;
    this.greeter = new NameBatcher(
      GAME.greetEveryMs,
      GAME.namesPerGreeting,
      (names) => voice.say(GAME.greeting(joinNames(names))),
      () => voice.waiting >= 1,
    );
  }

  /** A chat line: remember the person, queue banter, answer a wish. Returns the name that is safe to show. */
  chat(e: ChatEvent, now: number) {
    const name = safeName(e.nickname, e.username);
    this.recent.note(e.username, speakableName(name));
    const loai = containsBanned(e.comment) ? null : loaiCmt(e.comment);
    if (loai) this.banter.them(e.username, name, loai, now);
    const topic = containsBanned(e.comment) ? null : detectWish(e.comment);
    const reply = topic && this.pick(GAME.wishReplies[topic] ?? []);
    if (reply && this.wishes.allow(e.username)) this.d.voice.say(reply(speakableName(name)));
    return name;
  }

  /** Thank for a gift (the game decides what the gift does). Returns the safe name and the coin value. */
  gift(e: GiftEvent) {
    const { voice } = this.d;
    const name = safeName(e.nickname, e.username);
    const coins = e.diamondCount * e.repeatCount;
    // combo 1 lần / 30 giây, quà to luôn cảm ơn
    if (this.gifts.shouldThank(e.username, coins, voice.waitingPriority)) {
      // quà mức nào (xu 1 món) thì ông đồ đáp lời mức đó; quà lạ dưới 1 xu thì cảm ơn chung
      const muc = [...GAME.giftMenu].reverse().find((m) => e.diamondCount >= m.xu);
      const loi = muc && this.pick(muc.cam)?.(speakableName(name));
      voice.say(loi ?? GAME.thankGift(speakableName(name), e.giftName, this.d.channelName()), true);
      if (!loi) {
        const wish = this.pick(GAME.giftWishes);
        if (wish) voice.say(wish, true);
      }
    }
    return { name, coins };
  }

  member(e: UserEvent) {
    const spoken = speakableName(safeName(e.nickname, e.username));
    if (spoken !== 'bạn') this.greeter.add(e.username, spoken);
  }

  follow(e: UserEvent) {
    if (this.follows.first(e.username)) {
      this.d.voice.say(GAME.thankFollow(speakableName(safeName(e.nickname, e.username)), this.d.channelName()));
    }
  }

  /** Quiet moment and the voice is free: say one queued banter line. `label` names the round for lines that mention it. */
  quiet(now: number, label: () => string) {
    const x = this.banter.lay(now);
    const line = x && this.pick(this.d.treu?.()[x.loai] ?? GAME.loi.treu[x.loai])?.(speakableName(x.name), label());
    if (line) this.d.voice.say(line);
  }
}
