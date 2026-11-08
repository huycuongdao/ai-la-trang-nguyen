import { GAME } from '../../../config';
import { useSkin } from '../skin';

/** The gift board next to the scene: gift icons and what they are for. Only invites; promises no advantage. */
export function GiftBoard() {
  const s = useSkin();
  const { x, y, w } = s.layout.gift;
  return (
    <div className="absolute rounded-[16px] border-[3px] px-2 py-2" style={{ left: x, top: y, width: w, zIndex: 1600, borderColor: s.colors.gold, background: s.colors.panel, color: s.colors.cream }}>
      <div className="whitespace-nowrap text-center text-[20px] font-extrabold leading-tight" style={{ color: '#ffd977' }}>🎁 Quà tri ân</div>
      {GAME.giftMenu.map((m) => (
        <div key={m.xu} className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[30px] leading-none">{m.icon}</span>
          <span className="text-[15px] font-semibold leading-tight opacity-90">{m.viec}</span>
        </div>
      ))}
    </div>
  );
}
