import type { ReactNode } from 'react';
import { useSkin } from '../skin';

/** Small paper sign (a name plate drawn bigger): question number, exam name, number of players... */
export function PlateBox({ side, gold, children }: { side: 'left' | 'right'; gold?: boolean; children: ReactNode }) {
  const s = useSkin();
  const { w } = s.layout.sideSigns;
  const { x, y } = s.layout.sideSigns[side];
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: (w * s.size.namePlate[1]) / s.size.namePlate[0], zIndex: 30 }}>
      <img src={s.art.namePlate} className="absolute inset-0 h-full w-full" style={{ filter: gold ? 'hue-rotate(-8deg) saturate(1.8) brightness(1.1) drop-shadow(0 0 12px rgba(255,211,77,.9))' : 'drop-shadow(0 4px 5px rgba(0,0,0,.4))' }} draggable={false} />
      <div className="absolute inset-0 flex items-center justify-center px-3">{children}</div>
    </div>
  );
}
