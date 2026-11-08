import type { NextFunction, Request, Response } from 'express';

// Chặn DNS rebinding: trang web lạ trỏ tên miền của nó về 127.0.0.1 thì Host/Origin sẽ khác các tên dưới đây
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'lvh.me']);
const hostOk = (h?: string) => !!h && LOCAL_HOSTS.has(h.replace(/:\d+$/, '').toLowerCase());

export function httpGuard(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!hostOk(req.headers.host) || (origin && !hostOk(origin.replace(/^https?:\/\//, '')))) return res.status(403).end();
  next();
}
