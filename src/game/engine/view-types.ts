import type { ElimView } from './elimination';
import type { View } from './exam';

/** The picture of the game the server sends: exam mode or elimination mode (the host sets `mode`) */
export type AnyView = View | ElimView;

export const isElimView = (v: AnyView): v is ElimView => v.mode === 'elimination';
