// Dữ liệu server.ts gửi xuống qua SSE. Dùng chung cho mọi game.

export interface LiveStatus {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
}

export interface ChatEvent {
  username: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
  createTime?: number; // giờ TikTok lúc người xem gửi (ms)
}

export interface GiftEvent {
  username: string;
  nickname: string;
  giftName: string;
  giftId: number;
  diamondCount: number; // xu của 1 món
  repeatCount: number; // số món MỚI trong lần này (server đã trừ phần combo cũ)
  avatar: string;
  timestamp: number;
}

export interface UserEvent {
  username: string;
  nickname: string;
  avatar: string;
  timestamp: number;
}

export interface LikeEvent {
  username: string;
  nickname: string;
  likeCount: number;
  totalLikes: number; // tổng tim cả phòng
}

export interface ControlCommand {
  action: 'speak' | 'setRate' | 'reset' | 'setName' | 'custom';
  text?: string;
}

/** A line for the stage page to speak (or a prefetch / stop order). Answer each `id` with POST /api/game/spoken. */
export type SayEvent =
  | { id: number; text: string; priority: boolean }
  | { prefetch: true; text: string }
  | { stop: true };

export interface LiveHandlers {
  onStatus?: (s: LiveStatus) => void;
  onChat?: (e: ChatEvent) => void;
  onGift?: (e: GiftEvent) => void;
  onMember?: (e: UserEvent) => void; // người mới vào phòng
  onFollow?: (e: UserEvent) => void;
  onShare?: (e: UserEvent) => void;
  onLike?: (e: LikeEvent) => void;
  onViewers?: (count: number) => void;
  onControl?: (c: ControlCommand) => void;
  onView?: (v: any) => void; // ảnh chụp màn hình game do server gửi (4 lần / giây)
  onSay?: (s: SayEvent) => void; // lời ông đồ cần đọc (chỉ trang stage phát)
  onCaiDat?: (c: { tieuDe: string; tenOngDo: string }) => void; // tên game, tên ông đồ (trang điều khiển sửa)
}
