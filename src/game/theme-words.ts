import { GAME } from './config';
import { LOAI } from './elimination-config';
import { DEFAULT_THEME, type ThemeId } from './themes';

/**
 * What a theme calls things and what its host says. The base wording (in config.ts and elimination-config.ts) is the
 * exam game's: ông đồ, sĩ tử, kỳ thi. A theme that talks differently lists only what it changes here; the rest stays.
 * `applyThemeWords(theme)` swaps the wording in place; the server calls it when the theme changes, and so does each page.
 */
export interface ThemeWords {
  /** Replaces these top-level fields of GAME (names, texts, gift captions, thank-you lines...) */
  game?: Partial<Omit<typeof GAME, 'loi'>>;
  /** Replaces these groups of the host's spoken lines (GAME.loi) */
  loi?: Partial<typeof GAME.loi>;
  /** Elimination mode: its title and its spoken lines (LOAI.loi) */
  elim?: { title?: string; loi?: Partial<typeof LOAI.loi> };
}

// The exam wording as written in the config files, kept to restore it
const BASE = { game: { ...GAME }, loi: { ...GAME.loi }, elim: { ...LOAI }, elimLoi: { ...LOAI.loi } };

/** "Vua Khán Đài" (football): the host is the MC, people are fans in the stands, the exam rounds are match rounds */
const FOOTBALL: ThemeWords = {
  game: {
    title: 'Vua Khán Đài',
    tieuDeMacDinh: 'VUA KHÁN ĐÀI',
    tenOngDoMacDinh: 'MC',
    vong: [
      { ...GAME.vong[0], ten: 'Vòng loại', nhan: 'VÒNG LOẠI' },
      { ...GAME.vong[1], ten: 'Vòng bảng', nhan: 'VÒNG BẢNG' },
      { ...GAME.vong[2], ten: 'Bán kết', nhan: 'BÁN KẾT' },
      { ...GAME.vong[3], ten: 'Chung kết', nhan: 'CHUNG KẾT' },
    ],
    danhHieu: (hang: number) =>
      hang === 1 ? 'Vua Khán Đài'
      : hang === 2 ? 'Á vương'
      : hang === 3 ? 'Hạng Ba'
      : hang <= 10 ? 'Cổ động viên cứng'
      : hang <= 15 ? 'Fan nhiệt tình'
      : hang <= 20 ? 'Fan mới'
      : 'Khán giả',
    greeting: (names: string) => `Chào ${names} vào khán đài.`,
    soGhe: 45, // chỗ ngồi trên khán đài (9 hàng x 5 ghế)
    text: {
      ...GAME.text,
      player: 'khán giả',
      hostReading: 'Nghe MC đọc đề…',
      thanks: 'MC cảm ơn nhé!',
      thanksBig: 'MC xin cảm ơn tấm lòng!',
      round: 'Vòng',
      intro: '4 vòng · 20 câu · gõ A, B, C, D · gõ Bắc, Trung, Nam để cổ vũ 3 miền',
      board: 'BẢNG XẾP HẠNG',
      boardWeek: 'BẢNG XẾP HẠNG TUẦN',
      boardAfter: (vong: string) => `BẢNG XẾP HẠNG SAU ${vong.toUpperCase()}`,
      boardEmpty: 'Chưa ai vào khán đài. Gõ đáp án để ngồi vào!',
      finalTitle: 'Ai sẽ là Vua Khán Đài hôm nay?',
      lateJoin: 'Người mới vào vẫn kịp chơi vòng sau!',
      noPlayers: 'Ván này chưa có khán giả nào',
      seatEmpty: 'Khán đài còn trống',
      seatJoin: 'Gõ A, B, C hoặc D để ngồi vào',
      seatJoinOne: 'Gõ 1 chữ cái để ngồi vào',
      elimJoinTitle: (con: number) => `Vào khán đài · còn ${con} giây`,
      elimJoinHow: 'Gõ A, B, C hoặc D để ngồi vào khán đài',
      elimVote: 'Gõ số trên huy hiệu để chọn khán giả, rồi tặng hoa 🌹 hoặc bóng bay 🎈',
    },
    giftMenu: [
      {
        xu: 1, icon: '🌹', ten: 'Hoa hồng', viec: 'Tặng MC bông hoa',
        cam: [
          (n: string) => `${n} tặng MC bông hồng. [cười] MC cài lên áo ngay đây.`,
          (n: string) => `Hoa của ${n} thơm quá, MC dẫn chương trình bao năm mới được tặng hoa đấy.`,
        ],
      },
      {
        xu: 5, icon: '🫰', ten: 'Bắn tim', viec: 'Bắn tim cho MC',
        cam: [
          (n: string) => `Ối, ${n} bắn trúng tim MC rồi! [cười] Run hơn cả đá phạt đền.`,
          (n: string) => `${n} bắn tim cho MC, MC nhận nhé. Chơi tiếp cho vui nào!`,
        ],
      },
      {
        xu: 10, icon: '🐷', ten: 'Chú heo may mắn', viec: 'Góp heo đất cổ vũ',
        cam: [
          (n: string) => `${n} góp heo đất cho khán đài. MC chúc ${n} xem trận nào cũng vui!`,
          (n: string) => `[cười] Chú heo của ${n} béo tròn thế này, cả khán đài được lộc rồi.`,
        ],
      },
      {
        xu: 100, icon: '🎆', ten: 'Thả tim', viec: 'Đốt pháo mừng khán giả',
        cam: [
          (n: string) => `${n} đốt pháo mừng cả khán đài! MC xin cảm ơn tấm lòng.`,
          (n: string) => `Pháo của ${n} nổ vang cả sân rồi. [cười] Khán giả nào cũng được ăn mừng ké nhé!`,
        ],
      },
    ],
    giftWishes: ['Chúc bạn đội nào cũng thắng.', 'Chúc bạn một ngày thật vui.', 'Chúc bạn làm gì cũng suôn sẻ nha.'],
    shareLines: [
      'Ai thấy vui thì bấm chia sẻ live, rủ bạn bè vào khán đài cùng chơi nha.',
      'Rủ thêm bạn vào cổ vũ cho đông, bấm chia sẻ live giúp kênh nhé.',
    ],
    wishReplies: {
      ...GAME.wishReplies,
      exam: [
        (name: string) => `Chúc ${name} thi đấu thật bình tĩnh, sút đâu vào đó.`,
        (name: string) => `Chúc ${name} đá đâu thắng đó, thi đâu đỗ đó.`,
      ],
    },
  },
  loi: {
    cho: [
      '[hắng giọng] Khán đài sắp mở cửa! Ai muốn lên ngôi Vua Khán Đài thì khởi động đi, gõ A, B, C hoặc D vào bình luận.',
      'Ván mới sắp bắt đầu rồi đây. Đúng càng nhanh điểm càng cao, mà sai là bị trừ điểm đấy nhé. [cười]',
      'Ai vừa vào thì nghe MC dặn này: gõ A, B, C hoặc D là có chỗ ngồi trên khán đài luôn, không cần mua vé. [cười]',
    ],
    vong: [
      [
        '[hắng giọng] Vòng loại bắt đầu! Năm câu khởi động thôi, mười giây một câu, gõ A, B, C hoặc D nhé.',
        'Vào vòng loại nào. Câu dễ như đá bóng với trẻ con, ai sai thì xuống ghế dự bị. [cười]',
      ],
      [
        'Qua vòng loại rồi, giờ vào vòng bảng! Câu khó hơn, mười lăm giây một câu.',
        '[hắng giọng] Vòng bảng bắt đầu! Từ đây là bắt đầu phân loại đội hình rồi đấy.',
      ],
      [
        'Vào bán kết! Sai một câu là mất ba trăm điểm như chơi, nghĩ kỹ rồi hãy gõ.',
        '[hắng giọng] Bán kết đây. Câu bắt đầu khó, đừng có sút bừa mà mất điểm oan nhé.',
      ],
      [
        '[hắng giọng] Chung kết! Năm câu cuối, mỗi câu năm trăm điểm. Vua Khán Đài hôm nay là ai, sắp biết rồi!',
        'Đây là chung kết rồi. Ai đang thua thì vẫn lật được kèo, chỉ cần trả lời nhanh và đúng. Bắt đầu!',
      ],
    ],
    hetGio: ['Hết giờ! Đáp án đúng là...', 'Hết giờ rồi! Và đáp án chính xác là...', 'Trọng tài thổi còi! Đáp án đúng là...'],
    nhac: [
      'Nhanh chân lên các khán giả!',
      'Ai chưa chốt đáp án thì gõ đi nào!',
      'Thời gian không chờ đợi ai đâu nhé!',
      '[cười] Nghĩ kỹ chưa đấy?',
      'Cố lên các khán giả, sai thì câu sau gỡ lại!',
      'Không chắc thì loại dần đáp án sai đi, còn kịp đấy!',
      'Cả khán đài cố lên nào, MC đang nhìn đây!',
      '[cười] Ai đang phân vân thì nhắm mắt chọn đại cũng được, nhưng sai là trừ điểm đấy nhé.',
    ],
    thach: [
      'Câu này mà ai đúng thì MC xin bái phục!',
      '[cười] Câu tiếp theo hơi xoắn não đấy, tập trung vào!',
      'Khán giả nào tự nhận là fan cứng thì chứng minh ở câu này đi!',
      'MC đoán câu này cả khán đài sẽ chia làm bốn phe. Thử xem nào!',
      'Ai trả lời đúng câu này nhanh nhất, MC khen cả buổi!',
      '[hắng giọng] Câu này phân biệt fan cứng với fan xem ké đây!',
      'Nghe kỹ nhé, câu này MC ra để thử bản lĩnh.',
      'Câu này dễ hay khó là tùy người đấy. [cười] MC thì thấy dễ.',
    ],
    dauBang: [
      (n: string) => `${n} vừa vượt lên dẫn đầu! Ai muốn giành lại thì nhanh chân lên!`,
      (n: string) => `[cười] Ngôi đầu đổi chủ rồi, giờ là ${n}! Bảng xếp hạng gay cấn quá.`,
      (n: string) => `${n} lên đỉnh bảng rồi. Có ai dám thách đấu không?`,
      (n: string) => `Cả khán đài ơi, ${n} đang ngồi hàng ghế đầu. Kéo xuống đi chứ!`,
    ],
    mienKem: [
      (m: string, goi: string) => `Phe ${m} đang bị bỏ lại phía sau, cố lên nào! Ai chưa chọn phe thì gõ ${goi}.`,
      (m: string, goi: string) => `Cổ động viên ${m} đâu cả rồi? Gõ ${goi} vào phe, kéo điểm lên đi!`,
      (m: string) => `[cười] ${m} ơi, điểm thấp nhất khán đài rồi đấy. Gỡ lại đi chứ!`,
    ],
    coVuSau: [
      'Ai đang xếp sau đừng nản, câu phía sau điểm cao lắm!',
      'Còn cơ hội lật kèo, cố lên các khán giả!',
      'Bảng xếp hạng còn đổi chỗ dài dài, chưa ai chắc ngôi đâu.',
    ],
    deQua: [
      (n: number, name: string) => `[cười] Dễ quá phải không! ${n} người đúng, nhanh nhất là ${name}.`,
      (n: number, name: string) => `Cả khán đài đúng gần hết! Nhanh chân nhất là ${name}.`,
    ],
    dungNhieu: [
      (n: number, name: string) => `${n} người trả lời đúng, nhanh nhất là ${name}.`,
      (n: number, name: string) => `Có ${n} người đúng. ${name} chốt nhanh nhất câu này, giỏi!`,
    ],
    itDung: [
      (n: number, name: string) => `Ối giời ơi, câu này lừa được cả khối người! Chỉ ${n} người đúng, nhanh nhất là ${name}.`,
      (n: number, name: string) => `[cười] Câu này đánh gục khối khán giả nhé. Có ${n} người đúng thôi, đứng đầu là ${name}.`,
    ],
    dungMot: [
      (name: string) => `Cả khán đài chỉ mình ${name} đúng! [cười] Siêu sao đây chứ đâu.`,
      (name: string) => `Một mình ${name} trả lời đúng, MC phải khen mới được.`,
    ],
    khongAi: [
      '[thở dài] Không ai đúng câu nào. Khán giả bây giờ lười xem bóng đá quá.',
      '[thở dài] Câu này MC hỏi cả khán đài mà không ai trả lời được. Thôi, sang câu khác.',
    ],
    thanDong: [
      (name: string) => `${name} mới nhìn đề đã trả lời, đúng là thần đồng!`,
      (name: string) => `[cười] ${name} nhanh như chớp, MC còn chưa kịp thở.`,
    ],
    bangVang: [
      (vong: string, name: string) => `Hết ${vong}. Đứng đầu bảng xếp hạng lúc này là ${name}. Ai muốn giật ngôi thì cố lên!`,
      (vong: string, name: string) => `Xong ${vong}. ${name} đang dẫn đầu, [cười] nhưng chưa lên ngôi đâu, đừng vội mừng.`,
    ],
    bangVangTrong: (vong: string) => `Hết ${vong}. Bảng xếp hạng vẫn trống, ai vào chơi đi chứ!`,
    vinhQuy: (tn: string, bn?: string, th?: string) =>
      `[cười] Xin chúc mừng ${tn} đã lên ngôi Vua Khán Đài!` +
      (bn ? ` Á vương là ${bn}.` : '') +
      (th ? ` Hạng Ba là ${th}.` : '') +
      ' Cả khán đài đứng lên vỗ tay nào!',
    tuanDau: [
      (name: string) => `Tuần này ${name} đang đứng đầu bảng xếp hạng, ai muốn vượt thì vào chơi đi!`,
      (name: string) => `Bảng xếp hạng tuần vẫn gọi tên ${name}. [cười] Có ai dám tranh ngôi không?`,
    ],
    latKeo: [
      '[hắng giọng] Câu cuối cùng, câu lật kèo! Điểm nhân đôi, ai đang thua vẫn còn cơ hội đấy!',
      'Đây là câu lật kèo! Đúng được gấp đôi điểm, sai cũng mất gấp đôi. Cẩn thận nhé!',
    ],
    cuuTro: [
      '[cười] Cả khán đài thả tim đủ rồi! MC bỏ giúp hai đáp án sai nhé.',
      'Tim đầy rồi! MC ra tay, loại bớt hai đáp án sai cho cả phòng.',
    ],
    treu: {
      kho: [
        (n: string, vong: string) => `${n} than khó à? Mới ${vong} thôi đấy, lên chung kết còn khó nữa cơ. [cười]`,
        (n: string) => `${n} kêu khó, MC nghe thấy rồi nhé. Xem nhiều biết nhiều, đừng nản!`,
      ],
      de: [
        (n: string) => `${n} chê dễ hả? Được, câu sau MC cho khó hơn. [cười]`,
        (n: string) => `Dễ thì ${n} trả lời nhanh lên cho MC xem nào!`,
      ],
      chao: [
        (n: string) => `Chào ${n}! Vào khán đài luôn đi, gõ A, B, C hoặc D là được.`,
        (n: string) => `À ${n} đến rồi. Khởi động đi, sắp có câu hỏi đấy.`,
      ],
      goiY: [
        (n: string) => `${n} xin gợi ý à? [cười] Khán đài không có xem lén bảng điểm đâu nhé!`,
        (n: string) => `MC không nhắc bài đâu ${n}. Đến chung kết thả tim thì cả phòng được cứu trợ.`,
      ],
      cuoi: [
        (n: string) => `${n} cười gì đấy? Trả lời đúng chưa mà cười. [cười]`,
        (n: string) => `Nghe ${n} cười là biết vừa trả lời đúng rồi.`,
      ],
      yeu: [
        (n: string) => `Cảm ơn ${n} nhé, MC vui lắm. [cười]`,
        (n: string) => `${n} khen thế thì MC phải ra câu hay hơn mới được.`,
      ],
      sai: [
        (n: string) => `[thở dài] ${n} sai ba câu liền rồi. Bình tĩnh, đọc kỹ đề rồi hãy gõ nhé.`,
        (n: string) => `${n} ơi, ba câu liền chưa trúng câu nào. [cười] Câu sau phải gỡ lại đấy!`,
      ],
    },
    khongAiThi: '[thở dài] Ván này khán đài vắng tanh. Ván sau mọi người vào chơi cho vui nhé.',
  },
  elim: {
    title: 'Loại trực tiếp',
    loi: {
      treu: {
        kho: [
          (n: string) => `${n} than khó à? Càng về sau càng khó nữa cơ. [cười]`,
          (n: string) => `${n} kêu khó, MC nghe thấy rồi nhé. Ai còn ở lại là cao thủ đấy!`,
        ],
        goiY: [
          (n: string) => `${n} xin gợi ý à? [cười] Khán đài không có xem lén bảng điểm đâu nhé!`,
          (n: string) => `MC không nhắc bài đâu ${n}. Năm giây thôi, tin vào bản thân đi!`,
        ],
      },
      cho: [
        '[hắng giọng] Khán đài loại trực tiếp sắp mở cửa! Gõ A, B, C hoặc D vào bình luận để ngồi vào. Sai một câu là bị đuổi khỏi khán đài.',
        'Ai muốn thử gan thì vào ngồi đi nào. Mỗi câu chỉ có năm giây, không trả lời cũng bị loại đấy. [cười]',
      ],
      chuaDu: ['Còn chưa đủ khán giả, MC chờ thêm chút nữa. Ai đang xem thì gõ A, B, C hoặc D để ngồi vào khán đài nhé.'],
      moDangKy: ['Cả khán đài thả tim đủ rồi, MC mở cửa đây! Gõ A, B, C hoặc D để ngồi vào khán đài.'],
      tim: ['Muốn chơi ván nữa thì cả khán đài thả tim cho MC nhé. Đủ tim là MC mở ván mới ngay!'],
      batDau: [
        (n: number) => `[hắng giọng] Có ${n} khán giả trên khán đài! Mỗi câu năm giây, sai hoặc không trả lời là bị loại. Bắt đầu!`,
        (n: number) => `${n} người vào chơi, chỉ một người ở lại cuối cùng. Chuẩn bị nào! [cười]`,
      ],
      chot: ['Hết giờ! Đáp án đúng là...', 'Trọng tài thổi còi! Đáp án đúng là...'],
      loai: [
        (n: number, con: number) => `${n} người bị loại. Còn lại ${con} khán giả.`,
        (n: number, con: number) => `[cười] Có ${n} người phải rời khán đài. Còn ${con} người trụ lại.`,
      ],
      loaiTen: [
        (ten: string, con: number) => `${ten} phải rời khán đài. Còn lại ${con} khán giả.`,
        (ten: string, con: number) => `[cười] Tiếc quá, ${ten} bị loại. Còn ${con} người ở lại.`,
      ],
      khongAiDung: [
        '[thở dài] Không ai trả lời đúng câu này, nên MC tha cho cả khán đài. Sang câu sau!',
        'Cả khán đài đều trật câu này. Hôm nay MC rộng lượng, không ai bị loại. [cười]',
      ],
      nhanhNhat: [(name: string) => `Nhanh nhất câu này là ${name}.`],
      conNguyen: [(con: number) => `[cười] Cả khán đài đều đúng, vẫn còn ${con} khán giả.`],
      topNam: [
        (n: number) => `[hắng giọng] Chỉ còn ${n} người! Ai muốn ủng hộ khán giả nào thì gõ số của họ, rồi tặng hoa hoặc bóng bay nếu thích nhé.`,
      ],
      topNamKhongVote: [(n: number) => `[hắng giọng] Chỉ còn ${n} người! Xem ai nhanh chân nhất nào.`],
      conHai: ['[hắng giọng] Chỉ còn hai người! Câu này quyết định ai là người ở lại cuối cùng.'],
      vinhDanh: [
        (ten: string, avg?: string) =>
          `[cười] Xin chúc mừng ${ten}, người đứng vững cuối cùng!${avg ? ` Thời gian trả lời trung bình ${avg} giây.` : ''} Cả khán đài vỗ tay nào!`,
      ],
      yeuNhat: [(ten: string) => `Được cả khán đài yêu quý nhất là ${ten}.`],
      khongAiThi: '[thở dài] Khán đài vắng tanh, chẳng có ai vào ngồi. Hẹn ván sau nhé.',
    },
  },
};

const WORDS: Partial<Record<ThemeId, ThemeWords>> = { 'vua-khan-dai': FOOTBALL };

let applied: ThemeId | null = null;

/** Switch the wording to this theme's (or back to the exam wording). Cheap when the theme has not changed. */
export function applyThemeWords(theme: ThemeId = DEFAULT_THEME) {
  if (applied === theme) return;
  applied = theme;
  const w = WORDS[theme];
  Object.assign(GAME, BASE.game, w?.game);
  GAME.loi = { ...BASE.loi, ...w?.loi };
  Object.assign(LOAI, BASE.elim, w?.elim && { title: w.elim.title ?? BASE.elim.title });
  LOAI.loi = { ...BASE.elimLoi, ...w?.elim?.loi };
}
