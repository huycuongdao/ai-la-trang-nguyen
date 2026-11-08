// =====================================================
//  CẤU HÌNH CHẾ ĐỘ "LOẠI TRỰC TIẾP" (X50 / X100): sai hoặc không trả lời là bị loại, người cuối cùng thắng.
//  Số liệu ở đây; lời ông đồ cũng ở đây (phần `loi`), cùng kiểu với GAME.loi.
// =====================================================
import type { Level } from './config';

export const LOAI = {
  title: 'Loại trực tiếp',
  maxNguoi: 50, // 50 hoặc 100: chọn ở trang điều khiển
  toiThieu: 2, // ít hơn chừng này người đăng ký thì chờ thêm
  giay: 5, // thời gian trả lời mỗi câu (tính sau khi ông đồ đọc xong)
  choSec: 45, // phòng chờ đăng ký, đếm ngược
  choThemSec: 15, // chưa đủ người: chờ thêm chừng này giây rồi kiểm tra lại
  docMaxSec: 25, // giọng đọc đề hỏng thì tối đa chừng này giây là tự hiện đáp án
  chotSec: 2.6, // "Hết giờ!" + trống dồn trước khi công bố
  dapAnSec: 6, // công bố đáp án + người bị loại biến mất
  vinhDanhSec: 20,
  maxCau: 30, // hết chừng này câu mà còn nhiều người thì xếp theo thời gian trả lời trung bình
  topN: 5, // còn từng này người trở xuống thì hiện bảng top + cho bình chọn
  // Độ khó theo số thứ tự câu (1 = câu đầu): [tới hết câu, nhóm]; sau đó xen kẽ `cuoi`
  bac: [[5, 'de'], [10, 'vua'], [15, 'kho']] as [number, Level][],
  cuoi: ['dinh', 'meo'] as Level[],
  chamNhapSauCau: null as number | null, // null = vào lúc nào cũng được; số N = không nhận người mới từ câu N + 1
  // Bình chọn bằng quà (chỉ chế độ này): người xem gõ 1-5 chọn người, quà "hoa" / "bóng bay" sau đó tính cho số đó.
  veVote: true,
  quaBinhChon: ['rose', 'hoa hồng', 'hoa hong', 'balloon', 'bong bóng', 'bong bong', 'bóng bay'], // so sánh chữ thường; sửa theo tên quà thật khi diễn tập
  veTuongDuongMs: 300, // hết số câu tối đa: hai người cách nhau chưa tới chừng này thì số phiếu quyết định
  // Cổng chơi ván mới: cần đủ tim (miễn phí) hoặc hết thời gian chờ tối đa
  timTiepTuc: 200,
  choToiDaSec: 120,
  // Từ đăng ký vào phòng chờ: gõ A-D hoặc một trong các từ này
  tuThamGia: ['thamgia', 'choi', 'vaochoi', 'toichoi', 'minhchoi', 'join', 'play'],
  /** Mỗi người bị loại hiện bao nhiêu tên trong lời ông đồ (nhiều hơn thì chỉ nói số lượng) */
  tenNguoiLoaiToiDa: 3,

  // ---------- Lời ông đồ (thẻ [cười] [thở dài] [hắng giọng] của giọng VieNeu) ----------
  loi: {
    // thay cho các câu trêu chung trong GAME.loi.treu khi câu đó nhắc luật của chế độ thi
    treu: {
      kho: [
        (n: string) => `${n} than khó à? Càng về sau càng khó nữa cơ. [cười]`,
        (n: string) => `${n} kêu khó, ông nghe thấy rồi nhé. Ai còn ở lại là người giỏi đấy!`,
      ],
      goiY: [
        (n: string) => `${n} xin gợi ý à? [cười] Trường thi không có quay cóp đâu nhé!`,
        (n: string) => `Ông không nhắc bài đâu ${n}. Năm giây thôi, tin vào bản thân đi!`,
      ],
    },
    cho: [
      '[hắng giọng] Trường thi loại trực tiếp sắp mở cửa! Gõ A, B, C hoặc D vào bình luận để ghi tên. Sai một câu là ra khỏi chiếu.',
      'Ai muốn thử gan thì ghi tên đi nào. Mỗi câu chỉ có năm giây, không trả lời cũng bị loại đấy. [cười]',
    ],
    chuaDu: ['Còn chưa đủ sĩ tử, ông chờ thêm chút nữa. Ai đang xem thì gõ A, B, C hoặc D để vào chiếu nhé.'],
    moDangKy: ['Cả trường thả tim đủ rồi, ông mở cửa ghi tên đây! Gõ A, B, C hoặc D để vào chiếu.'],
    tim: ['Muốn chơi ván nữa thì cả trường thả tim cho ông nhé. Đủ tim là ông mở ván mới ngay!'],
    batDau: [
      (n: number) => `[hắng giọng] Có ${n} sĩ tử trên chiếu! Mỗi câu năm giây, sai hoặc không trả lời là bị loại. Bắt đầu!`,
      (n: number) => `${n} người vào thi, chỉ một người ở lại cuối cùng. Chuẩn bị nào! [cười]`,
    ],
    chot: ['Hết giờ! Đáp án đúng là...', 'Dừng bút! Đáp án đúng là...'],
    loai: [
      (n: number, con: number) => `${n} người bị loại. Còn lại ${con} sĩ tử.`,
      (n: number, con: number) => `[cười] Có ${n} người phải rời chiếu. Còn ${con} người trụ lại.`,
    ],
    loaiTen: [
      (ten: string, con: number) => `${ten} phải rời chiếu. Còn lại ${con} sĩ tử.`,
      (ten: string, con: number) => `[cười] Tiếc quá, ${ten} bị loại. Còn ${con} người ở lại.`,
    ],
    khongAiDung: [
      '[thở dài] Không ai trả lời đúng câu này, nên ông tha cho cả chiếu. Sang câu sau!',
      'Cả chiếu đều trật câu này. Hôm nay ông rộng lượng, không ai bị loại. [cười]',
    ],
    nhanhNhat: [(name: string) => `Nhanh nhất câu này là ${name}.`],
    conNguyen: [(con: number) => `[cười] Cả chiếu đều đúng, vẫn còn ${con} sĩ tử.`],
    // mời bình chọn: chỉ mời, không bắt buộc, không hứa phần thưởng
    topNam: [
      (n: number) => `[hắng giọng] Chỉ còn ${n} người! Ai muốn ủng hộ sĩ tử nào thì gõ số của họ, rồi tặng hoa hoặc bóng bay nếu thích nhé.`,
    ],
    topNamKhongVote: [(n: number) => `[hắng giọng] Chỉ còn ${n} người! Xem ai nhanh tay nhất nào.`],
    conHai: ['[hắng giọng] Chỉ còn hai người! Câu này quyết định ai là người ở lại cuối cùng.'],
    vinhDanh: [
      (ten: string, avg?: string) =>
        `[cười] Xin chúc mừng ${ten}, người đứng vững cuối cùng!${avg ? ` Thời gian trả lời trung bình ${avg} giây.` : ''} Cả trường vỗ tay nào!`,
    ],
    yeuNhat: [(ten: string) => `Được cả trường yêu quý nhất là ${ten}.`],
    khongAiThi: '[thở dài] Trường thi vắng tanh, chẳng có ai ghi tên. Hẹn ván sau nhé.',
  },
};

/** Nhóm câu hỏi cho câu thứ i (1 = câu đầu) */
export function nhomCau(i: number): Level {
  for (const [den, level] of LOAI.bac) if (i <= den) return level;
  const cuoiBat = LOAI.bac.length ? LOAI.bac[LOAI.bac.length - 1][0] : 0;
  return LOAI.cuoi[(i - cuoiBat - 1) % LOAI.cuoi.length];
}
