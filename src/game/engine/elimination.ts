// Lõi chế độ "Loại trực tiếp" (X50 / X100): không React, thời gian truyền vào (now) để test được.
// Sai hoặc không trả lời là bị loại, người cuối cùng thắng. Không ai đúng thì không ai bị loại.
import { GAME } from '../config';
import { LOAI, nhomCau } from '../elimination-config';
import { choiceOf, plain, shuffle, type McQ } from './exam';
import { GiftBanner, type Qua } from './gift-banner';
import type { SavedRound } from '../../server/hosted-mode';

export type ElimPhase = 'cho' | 'doc' | 'hoi' | 'chot' | 'dapAn' | 'vinhDanh';

export interface NguoiChoi {
  id: string;
  name: string;
  avatar: string;
  alive: boolean;
  vaoLuc: number;
  msDung: number; // tổng thời gian các câu đúng
  soDung: number;
}

export interface KetQua {
  soDung: number;
  soNop: number;
  nhanh: { name: string; ms: number }[];
}

interface Cau {
  q: McQ;
  opts: string[];
  ans: number;
}

export type ElimEv =
  | { t: 'cho' } // phòng chờ mở
  | { t: 'moDangKy' } // đủ tim (hoặc hết thời gian chờ): bắt đầu đếm ngược đăng ký
  | { t: 'chuaDu'; soNguoi: number } // hết giờ chờ mà chưa đủ người
  | { t: 'batDau'; soNguoi: number }
  | { t: 'doc'; text: string }
  | { t: 'chot' }
  | {
      t: 'dapAn';
      chu: string;
      dap: string;
      soDung: number;
      soNop: number;
      conLai: number;
      loai: number;
      tenLoai: string[]; // tên những người vừa bị loại (cắt ở LOAI.tenNguoiLoaiToiDa)
      khongAiDung: boolean;
      nhanh?: string;
      msNhanh?: number;
    }
  | { t: 'topNam'; n: number } // lần đầu còn từ topN người trở xuống
  | { t: 'conHai' }
  | { t: 'vinhDanh'; id: string; name: string; avgMs: number | null; soNguoi: number; yeuNhat?: string }
  | { t: 'khongAiThi' };

/** Vote / top board entry. `so` is the number viewers type (fixed when the top board first opens). */
export interface UngVien {
  so: number;
  id: string;
  name: string;
  avatar: string;
  alive: boolean;
  avgMs: number | null;
  phieu: number;
}

export interface ElimSnapshot extends SavedRound {
  mode: 'elimination';
  phase: ElimPhase;
  endsAt: number;
  shownAt: number;
  idx: number;
  maxNguoi: number;
  cau: { id: string; opts: string[]; math?: McQ } | null;
  daHoi: string[];
  answers: [string, { chon: number; ms: number }][];
  recent: string[];
  ketQua: KetQua | null;
  skew: number;
  skewN: number;
  events: ElimEv[];
  nguoi: [string, NguoiChoi][];
  loaiVuaRoi: string[];
  topBao: boolean;
  conHaiBao: boolean;
  soHieu: [string, number][];
  chon: [string, number][];
  phieu: [string, number][];
  khoa: { tim: number; den: number } | null;
  thang: string | null;
  quaCho: Qua[];
  qua: GiftBanner['hien'];
  khongAiDung: boolean;
}

/** "tham gia", "chơi", "vào chơi"... -> true */
export const lenhThamGia = (comment: string) => LOAI.tuThamGia.includes(plain(comment));

export class LoaiTru {
  phase: ElimPhase = 'cho';
  endsAt = 0;
  maxNguoi = LOAI.maxNguoi;
  nguoi = new Map<string, NguoiChoi>();
  private idx = 0;
  private shownAt = 0;
  private cau: Cau | null = null;
  private daHoi = new Set<string>();
  private answers = new Map<string, { chon: number; ms: number }>();
  private recent: string[] = [];
  private ketQua: KetQua | null = null;
  private skew = 0;
  private skewN = 0;
  private events: ElimEv[] = [];
  private loaiVuaRoi: string[] = []; // người bị loại ở lần công bố gần nhất (để màn hình cho họ biến mất)
  private topBao = false;
  private conHaiBao = false;
  private soHieu = new Map<string, number>(); // id -> số 1..topN, cố định từ lúc mở bảng top
  private chon = new Map<string, number>(); // người xem -> số họ chọn
  private phieu = new Map<string, number>(); // id ứng viên -> số phiếu (quà)
  private khoa: { tim: number; den: number } | null = null; // chờ đủ tim trước khi mở ván mới
  private thang: string | null = null;
  private khongAiDung = false;
  private banner = new GiftBanner();

  constructor(
    private bank: McQ[],
    /** id câu -> lúc hỏi gần nhất; game ưu tiên câu lâu chưa hỏi */
    public used: Record<string, number> = {},
    private rand: () => number = Math.random,
  ) {}

  /** Use another question bank from the next question on (the operator changed the theme while waiting for a game) */
  setBank(bank: McQ[]) {
    this.bank = bank;
  }

  // ---------- phòng chờ ----------

  /** Mở phòng chờ. `choTim` = ván trước vừa xong: chờ đủ tim rồi mới đếm ngược đăng ký. */
  cho(now: number, choTim = false) {
    this.phase = 'cho';
    this.nguoi.clear();
    this.cau = null;
    this.answers.clear();
    this.idx = 0;
    this.thang = null;
    this.loaiVuaRoi = [];
    this.ketQua = null;
    this.topBao = false;
    this.conHaiBao = false;
    this.soHieu.clear();
    this.chon.clear();
    this.phieu.clear();
    this.recent = [];
    this.daHoi.clear();
    if (choTim) {
      this.khoa = { tim: 0, den: now + LOAI.choToiDaSec * 1000 };
      this.endsAt = this.khoa.den;
    } else {
      this.khoa = null;
      this.endsAt = now + LOAI.choSec * 1000;
    }
    this.events.push({ t: 'cho' });
  }

  /** Đổi số người tối đa (50 / 100); có hiệu lực từ ván sau nếu đang chơi */
  datMaxNguoi(n: number) {
    if (Number.isInteger(n) && n >= LOAI.toiThieu) this.maxNguoi = n;
  }

  /** Cả phòng thả tim. Chỉ có tác dụng lúc chờ đủ tim để mở ván mới. */
  tim(n: number) {
    if (this.phase === 'cho' && this.khoa) this.khoa.tim += n;
  }

  /** Người xem tặng quà. Trả về true nếu được tính là phiếu bình chọn. */
  tangQua(q: Omit<Qua, 'at'>, now: number) {
    this.banner.tang(q, now);
    if (!LOAI.veVote || !this.moBinhChon) return false;
    if (!LOAI.quaBinhChon.includes(q.gift.trim().toLowerCase())) return false;
    const so = this.chon.get(q.id);
    const ung = so === undefined ? undefined : [...this.soHieu].find(([, s]) => s === so)?.[0];
    if (!ung || !this.nguoi.get(ung)?.alive) return false;
    this.phieu.set(ung, (this.phieu.get(ung) ?? 0) + Math.max(1, q.count));
    return true;
  }

  /** Bảng top và bình chọn đang mở (còn từ topN người trở xuống) */
  get moBinhChon() {
    return this.soHieu.size > 0 && this.phase !== 'cho';
  }

  private dangKy(e: { id: string; name: string; avatar: string }, now: number) {
    const cu = this.nguoi.get(e.id);
    if (cu) {
      cu.name = e.name;
      cu.avatar = e.avatar || cu.avatar;
      return cu.alive;
    }
    if (this.nguoi.size >= this.maxNguoi) return false;
    this.nguoi.set(e.id, { id: e.id, name: e.name, avatar: e.avatar, alive: true, vaoLuc: now, msDung: 0, soDung: 0 });
    return true;
  }

  // ---------- ván chơi ----------

  get soConLai() {
    let n = 0;
    for (const p of this.nguoi.values()) if (p.alive) n++;
    return n;
  }

  private conLai() {
    return [...this.nguoi.values()].filter((p) => p.alive);
  }

  batDau(now: number) {
    this.khoa = null;
    this.idx = 0;
    this.daHoi.clear();
    this.events.push({ t: 'batDau', soNguoi: this.nguoi.size });
    this.moCau(now);
  }

  /** Lấy các sự kiện cần đọc từ lần gọi trước */
  lay(): ElimEv[] {
    return this.events.splice(0);
  }

  get cauSo() {
    return this.idx + 1;
  }

  /** Câu lâu chưa hỏi nhất trong nhóm của câu này; nhóm hết thì lấy nhóm khác */
  private rutCau(now: number): Cau {
    const level = nhomCau(this.idx + 1);
    const lay = (cung: boolean) =>
      shuffle(this.bank.filter((q) => (cung ? q.level === level : true) && !this.daHoi.has(q.id)), this.rand)
        .sort((a, b) => (this.used[a.id] ?? 0) - (this.used[b.id] ?? 0));
    let pool = lay(true);
    if (!pool.length) pool = lay(false);
    if (!pool.length) {
      this.daHoi.clear(); // hết sạch câu: hỏi lại từ đầu
      pool = lay(true);
    }
    const q = pool[0];
    this.daHoi.add(q.id);
    this.used[q.id] = now;
    const opts = shuffle([q.right, ...q.wrong], this.rand);
    return { q, opts, ans: opts.indexOf(q.right) };
  }

  private moCau(now: number) {
    this.cau = this.rutCau(now);
    this.phase = 'doc';
    this.endsAt = now + LOAI.docMaxSec * 1000;
    this.answers.clear();
    this.recent = [];
    this.ketQua = null;
    this.khongAiDung = false;
    this.loaiVuaRoi = [];
    // còn ít người: mở bảng top và gán số cố định cho từng người (người xem gõ số để bình chọn)
    if (!this.soHieu.size && this.soConLai <= LOAI.topN) this.moTop();
    this.events.push({ t: 'doc', text: this.docText() });
  }

  private moTop() {
    const ds = this.conLai().sort((a, b) => this.tb(a) - this.tb(b) || a.vaoLuc - b.vaoLuc);
    ds.forEach((p, i) => this.soHieu.set(p.id, i + 1));
    if (!this.topBao) {
      this.topBao = true;
      this.events.push({ t: 'topNam', n: ds.length });
    }
  }

  /** Thời gian trả lời đúng trung bình (ms); chưa đúng câu nào thì rất lớn để xếp cuối */
  private tb(p: NguoiChoi) {
    return p.soDung ? p.msDung / p.soDung : Number.POSITIVE_INFINITY;
  }

  /** Lời đọc đề câu đang hỏi */
  docText() {
    const c = this.cau;
    if (!c) return '';
    const opts = c.opts.map((o, k) => `${'ABCD'[k]}, ${o}.`).join(' ');
    return `Câu ${this.idx + 1}. ${c.q.q} ${opts}`;
  }

  /** Lời công bố đáp án câu đang hỏi (tạo giọng sẵn trong lúc mọi người trả lời) */
  dapAnText() {
    const c = this.cau;
    return c ? `${'ABCD'[c.ans]}, ${c.opts[c.ans]}!` : '';
  }

  /** Giọng đọc xong đề: hiện 4 đáp án, bắt đầu tính giờ */
  docXong(now: number) {
    if (this.phase !== 'doc') return;
    this.phase = 'hoi';
    this.shownAt = now;
    this.endsAt = now + LOAI.giay * 1000;
  }

  /** Bỏ câu đang hỏi (câu lỗi): không ai bị loại, hỏi câu khác thay vào */
  boCau(now: number) {
    if (this.phase !== 'doc' && this.phase !== 'hoi') return;
    const id = this.cau?.q.id;
    if (id) this.used[id] = Number.MAX_SAFE_INTEGER;
    this.moCau(now);
  }

  /** 1 bình luận. Trả về true nếu được tính (đăng ký ở phòng chờ, hoặc bài nộp). */
  chat(e: { id: string; name: string; avatar: string; comment: string; createTime?: number }, now: number) {
    if (e.createTime) {
      const d = now - e.createTime;
      this.skew = this.skewN ? Math.min(this.skew + 5, d) : d;
      this.skewN++;
    }
    const chon = choiceOf(e.comment);
    // gõ số 1..topN: chọn người để bình chọn bằng quà
    const so = /^[1-9]$/.test(e.comment.trim()) ? Number(e.comment.trim()) : null;
    if (so !== null) {
      if (this.moBinhChon && so <= LOAI.topN) this.chon.set(e.id, so);
      return false;
    }
    if (this.phase === 'cho') {
      if (chon === null && !lenhThamGia(e.comment)) return false;
      return this.dangKy(e, now);
    }
    if (this.phase !== 'hoi' || chon === null || this.answers.has(e.id)) return false;
    const sentAt = e.createTime && this.skewN > 1 ? e.createTime + this.skew : now;
    if (sentAt < this.shownAt - GAME.earlySendGraceMs) return false; // gửi lúc đáp án chưa hiện: không tính, không mất lượt
    const cu = this.nguoi.get(e.id);
    if (cu && !cu.alive) return false; // đã bị loại
    if (!cu) {
      if (LOAI.chamNhapSauCau !== null && this.idx >= LOAI.chamNhapSauCau) return false;
      if (!this.dangKy(e, now)) return false; // phòng đã đầy
    } else {
      cu.name = e.name;
      cu.avatar = e.avatar || cu.avatar;
    }
    const total = LOAI.giay * 1000;
    this.answers.set(e.id, { chon, ms: Math.max(0, Math.min(total, sentAt - this.shownAt)) });
    this.recent = [e.name, ...this.recent.filter((n) => n !== e.name)].slice(0, 5);
    return true;
  }

  tick(now: number) {
    this.banner.chay(now);
    // đủ tim thì mở đăng ký ngay, không chờ hết thời gian chờ tối đa
    if (this.phase === 'cho' && this.khoa && this.khoa.tim >= LOAI.timTiepTuc) return this.hetCho(now);
    if (now < this.endsAt) return;
    switch (this.phase) {
      case 'cho':
        return this.hetCho(now);
      case 'doc':
        return this.docXong(now);
      case 'hoi':
        // hết giờ: khoá bài, trống dồn hồi hộp rồi mới công bố
        this.phase = 'chot';
        this.endsAt = now + LOAI.chotSec * 1000;
        this.events.push({ t: 'chot' });
        return;
      case 'chot':
        return this.chamCau(now);
      case 'dapAn':
        return this.sauDapAn(now);
      case 'vinhDanh':
        return this.cho(now, true);
    }
  }

  private hetCho(now: number) {
    if (this.khoa) {
      // đủ tim hoặc hết thời gian chờ tối đa: mở đăng ký, đếm ngược
      this.khoa = null;
      this.endsAt = now + LOAI.choSec * 1000;
      this.events.push({ t: 'moDangKy' });
      return;
    }
    if (this.nguoi.size < LOAI.toiThieu) {
      this.endsAt = now + LOAI.choThemSec * 1000;
      this.events.push({ t: 'chuaDu', soNguoi: this.nguoi.size });
      return;
    }
    this.batDau(now);
  }

  private chamCau(now: number) {
    const c = this.cau!;
    const nhanh: { name: string; ms: number }[] = [];
    const sai: NguoiChoi[] = [];
    for (const p of this.conLai()) {
      const a = this.answers.get(p.id);
      if (a && a.chon === c.ans) {
        p.soDung++;
        p.msDung += a.ms;
        nhanh.push({ name: p.name, ms: a.ms });
      } else sai.push(p);
    }
    nhanh.sort((a, b) => a.ms - b.ms);
    // không ai đúng thì không ai bị loại
    this.khongAiDung = nhanh.length === 0;
    this.loaiVuaRoi = [];
    if (!this.khongAiDung) {
      for (const p of sai) {
        p.alive = false;
        this.loaiVuaRoi.push(p.id);
      }
    }
    const soNop = this.answers.size;
    this.ketQua = { soDung: nhanh.length, soNop, nhanh: nhanh.slice(0, 3) };
    this.phase = 'dapAn';
    this.endsAt = now + LOAI.dapAnSec * 1000;
    this.events.push({
      t: 'dapAn', chu: 'ABCD'[c.ans], dap: c.opts[c.ans], soDung: nhanh.length, soNop, conLai: this.soConLai,
      loai: this.loaiVuaRoi.length,
      tenLoai: this.loaiVuaRoi.slice(0, LOAI.tenNguoiLoaiToiDa).map((id) => this.nguoi.get(id)!.name),
      khongAiDung: this.khongAiDung, nhanh: nhanh[0]?.name, msNhanh: nhanh[0]?.ms,
    });
  }

  private sauDapAn(now: number) {
    this.idx++;
    const con = this.soConLai;
    if (con <= 1) return this.moVinhDanh(now);
    if (this.idx >= LOAI.maxCau) return this.moVinhDanh(now);
    if (con === 2 && !this.conHaiBao) {
      this.conHaiBao = true;
      this.events.push({ t: 'conHai' });
    }
    this.moCau(now);
  }

  /** Người thắng: người cuối cùng; hết số câu mà còn nhiều người thì thời gian trung bình ngắn nhất (gần nhau thì số phiếu quyết định) */
  private chonNguoiThang(): NguoiChoi | null {
    const ds = this.conLai().sort((a, b) => this.tb(a) - this.tb(b) || a.vaoLuc - b.vaoLuc);
    if (ds.length <= 1) return ds[0] ?? null;
    const dau = ds[0];
    if (!LOAI.veVote) return dau;
    const gan = ds.filter((p) => this.tb(p) - this.tb(dau) <= LOAI.veTuongDuongMs);
    return gan.sort((a, b) => (this.phieu.get(b.id) ?? 0) - (this.phieu.get(a.id) ?? 0) || this.tb(a) - this.tb(b))[0];
  }

  /** Người được nhiều phiếu nhất (phải có ít nhất 1 phiếu) */
  yeuNhat(): { id: string; name: string; phieu: number } | null {
    let best: { id: string; phieu: number } | null = null;
    for (const [id, phieu] of this.phieu) if (!best || phieu > best.phieu) best = { id, phieu };
    const p = best && this.nguoi.get(best.id);
    return best && p && best.phieu > 0 ? { id: best.id, name: p.name, phieu: best.phieu } : null;
  }

  private moVinhDanh(now: number) {
    const w = this.chonNguoiThang();
    this.phase = 'vinhDanh';
    this.endsAt = now + LOAI.vinhDanhSec * 1000;
    this.thang = w?.id ?? null;
    if (!w) {
      this.events.push({ t: 'khongAiThi' });
      return;
    }
    this.events.push({ t: 'vinhDanh', id: w.id, name: w.name, avgMs: w.soDung ? w.msDung / w.soDung : null, soNguoi: this.nguoi.size, yeuNhat: this.yeuNhat()?.name });
  }

  /** Bảng top (còn từ topN người trở xuống), xếp theo thời gian trả lời trung bình */
  top(): UngVien[] {
    if (!this.soHieu.size) return [];
    return [...this.soHieu]
      .map(([id, so]) => ({ p: this.nguoi.get(id)!, so }))
      .filter((x) => x.p && x.p.alive)
      .sort((a, b) => this.tb(a.p) - this.tb(b.p) || a.so - b.so)
      .map(({ p, so }) => ({ so, id: p.id, name: p.name, avatar: p.avatar, alive: p.alive, avgMs: p.soDung ? Math.round(p.msDung / p.soDung) : null, phieu: this.phieu.get(p.id) ?? 0 }));
  }

  /** Ảnh chụp cho màn hình (gửi cả sang trang điều khiển) */
  view(now: number) {
    const c = this.cau;
    const lo = this.phase === 'dapAn';
    const ghe = [...this.nguoi.values()]
      .filter((p) => p.alive || (lo && this.loaiVuaRoi.includes(p.id)))
      .sort((a, b) => a.vaoLuc - b.vaoLuc)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, alive: p.alive, dung: lo && !!c && this.answers.get(p.id)?.chon === c.ans }));
    const thang = this.thang ? this.nguoi.get(this.thang) : undefined;
    return {
      phase: this.phase,
      cauSo: this.idx + 1,
      tongCau: LOAI.maxCau,
      nhom: nhomCau(this.idx + 1),
      q: c?.q.q ?? '',
      opts: this.phase === 'hoi' || this.phase === 'chot' || lo ? c?.opts ?? [] : [],
      con: Math.max(0, Math.ceil((this.endsAt - now) / 1000)),
      tongGiay: LOAI.giay,
      soNop: this.answers.size,
      dung: lo ? c?.ans ?? -1 : -1,
      ketQua: lo ? this.ketQua : null,
      khongAiDung: lo && this.khongAiDung,
      recent: this.recent,
      soNguoi: this.nguoi.size,
      conLai: this.soConLai,
      maxNguoi: this.maxNguoi,
      ghe,
      top: this.top(),
      binhChon: LOAI.veVote && this.moBinhChon,
      yeuNhat: this.yeuNhat(),
      cong: this.khoa && this.phase === 'cho' ? { tim: Math.min(this.khoa.tim, LOAI.timTiepTuc), can: LOAI.timTiepTuc, con: Math.max(0, Math.ceil((this.endsAt - now) / 1000)) } : null,
      thang: thang
        ? { id: thang.id, name: thang.name, avatar: thang.avatar, avgMs: thang.soDung ? Math.round(thang.msDung / thang.soDung) : null }
        : null,
      qua: this.banner.view(),
    };
  }

  // ---------- lưu / khôi phục ván ----------

  snapshot(now: number): ElimSnapshot {
    const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
    return copy({
      version: 1 as const,
      mode: 'elimination' as const,
      savedAt: now,
      phase: this.phase,
      endsAt: this.endsAt,
      shownAt: this.shownAt,
      idx: this.idx,
      maxNguoi: this.maxNguoi,
      cau: this.cau ? { id: this.cau.q.id, opts: this.cau.opts, math: this.cau.q.id.startsWith('toan:') ? this.cau.q : undefined } : null,
      daHoi: [...this.daHoi],
      answers: [...this.answers],
      recent: this.recent,
      ketQua: this.ketQua,
      skew: this.skew,
      skewN: this.skewN,
      events: this.events,
      nguoi: [...this.nguoi],
      loaiVuaRoi: this.loaiVuaRoi,
      topBao: this.topBao,
      conHaiBao: this.conHaiBao,
      soHieu: [...this.soHieu],
      chon: [...this.chon],
      phieu: [...this.phieu],
      khoa: this.khoa,
      thang: this.thang,
      quaCho: this.banner.cho,
      qua: this.banner.hien,
      khongAiDung: this.khongAiDung,
    });
  }

  /** Put a snapshot back. Returns false (and changes nothing) when it is from another version or names a question the bank no longer has. */
  restore(data: SavedRound): boolean {
    const s = data as ElimSnapshot;
    if (!s || s.version !== 1 || s.mode !== 'elimination') return false;
    let cau: Cau | null = null;
    if (s.cau) {
      const q = s.cau.math ?? this.bank.find((x) => x.id === s.cau!.id);
      const ans = q ? s.cau.opts.indexOf(q.right) : -1;
      if (!q || ans < 0 || s.cau.opts.length !== 4) return false;
      cau = { q, opts: s.cau.opts, ans };
    }
    const d = JSON.parse(JSON.stringify(s)) as ElimSnapshot;
    this.cau = cau;
    this.phase = d.phase;
    this.endsAt = d.endsAt;
    this.shownAt = d.shownAt;
    this.idx = d.idx;
    this.maxNguoi = d.maxNguoi;
    this.daHoi = new Set(d.daHoi);
    this.answers = new Map(d.answers);
    this.recent = d.recent;
    this.ketQua = d.ketQua;
    this.skew = d.skew;
    this.skewN = d.skewN;
    this.events = d.events;
    this.nguoi = new Map(d.nguoi);
    this.loaiVuaRoi = d.loaiVuaRoi;
    this.topBao = d.topBao;
    this.conHaiBao = d.conHaiBao;
    this.soHieu = new Map(d.soHieu);
    this.chon = new Map(d.chon);
    this.phieu = new Map(d.phieu);
    this.khoa = d.khoa;
    this.thang = d.thang;
    this.banner.cho = d.quaCho;
    this.banner.hien = d.qua;
    this.khongAiDung = d.khongAiDung;
    return true;
  }
}

export type ElimView = ReturnType<LoaiTru['view']> & { mode?: 'elimination'; audio?: boolean };
