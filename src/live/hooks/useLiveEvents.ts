import { useEffect, useRef } from 'react';
import type { LiveHandlers } from '../types';

/**
 * Nghe sự kiện live từ server. Handler luôn là bản mới nhất (không lo state cũ),
 * tự kết nối lại khi rớt mạng.
 */
export function useLiveEvents(handlers: LiveHandlers, { stage = false }: { stage?: boolean } = {}) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const on = (name: string, fn: (data: any) => void) =>
      source!.addEventListener(name, (e) => {
        try {
          fn(JSON.parse((e as MessageEvent).data));
        } catch (err) {
          console.warn(`Lỗi xử lý sự kiện ${name}:`, err);
        }
      });

    const connect = () => {
      source = new EventSource(stage ? '/api/tiktok/events?role=stage' : '/api/tiktok/events');
      on('status', (d) => ref.current.onStatus?.(d));
      on('chat', (d) => ref.current.onChat?.(d));
      on('gift', (d) => ref.current.onGift?.(d));
      on('member', (d) => ref.current.onMember?.(d));
      on('follow', (d) => ref.current.onFollow?.(d));
      on('share', (d) => ref.current.onShare?.(d));
      on('like', (d) => ref.current.onLike?.(d));
      on('roomUser', (d) => ref.current.onViewers?.(d.viewerCount));
      on('control', (d) => ref.current.onControl?.(d));
      on('view', (d) => ref.current.onView?.(d));
      on('say', (d) => ref.current.onSay?.(d));
      on('caiDat', (d) => ref.current.onCaiDat?.(d));
      source.onerror = () => {
        source?.close();
        if (!closed) retry = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      source?.close();
    };
  }, [stage]);
}
