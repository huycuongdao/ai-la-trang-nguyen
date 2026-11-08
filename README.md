# Ai Là Trạng Nguyên

Game show đố vui cho **TikTok LIVE**, lấy cảm hứng từ khoa cử ngày xưa. Ông đồ cầm mic đọc câu hỏi và 4 đáp án, người xem gõ **A, B, C hoặc D** vào bình luận. Mỗi ván 20 câu qua 4 kỳ thi: khảo hạch trường làng, thi Hương, thi Hội, thi Đình. Hết ván, ba người điểm cao nhất đỗ Trạng Nguyên, Bảng Nhãn, Thám Hoa và được vinh danh trên màn hình.

Game chạy trên máy tính của bạn, gắn vào TikTok LIVE Studio như một nguồn Link. Không cần biết lập trình, chỉ cần làm theo các bước bên dưới.

## Game có gì

- **Gần 5.000 câu hỏi tiếng Việt** chia 14 chủ đề: lịch sử Việt Nam, địa lý, văn học, ca dao tục ngữ, khoa học, sức khoẻ, động thực vật, văn hoá ẩm thực, thế giới, phát minh, nghệ thuật, thể thao, khoa cử và danh nhân, đố mẹo. Câu khó dần theo kỳ thi. Mỗi kỳ có thêm một câu toán nhẩm máy tự ra nên không bao giờ hết.
- **Điểm theo tốc độ**: đúng càng nhanh điểm càng cao, sai bị trừ. Tốc độ tính theo giờ TikTok ghi lúc người xem bấm gửi, không phụ thuộc mạng chậm hay nhanh. Câu cuối ván điểm nhân đôi.
- **Thi đua 3 miền**: gõ Bắc, Trung hoặc Nam để vào phe, điểm cả phe cộng dồn.
- **Cứu trợ bằng tim**: ở thi Đình, cả phòng thả đủ tim thì ông đồ loại 2 đáp án sai.
- **Bảng vàng** sau mỗi kỳ, **bảng vàng tuần** cộng điểm nhiều ván, dấu 🏆 🎓 🔥 cạnh tên người chơi giỏi.
- **Ông đồ biết nói chuyện**: đọc đề, công bố đáp án có cười có thở dài, trêu người than khó, hô tên người vừa vượt lên dẫn đầu, cảm ơn quà theo từng món. Ông **không bao giờ đọc nguyên văn bình luận**, chỉ dùng câu soạn sẵn có chèn tên, nên không ai bắt ông nói bậy được.
- **Quà**: băng rôn có avatar và tên người tặng, quà từ 99 xu có pháo giấy. Quà **không cho lợi thế gì trong game**, đúng quy định TikTok.
- **Âm thanh tự tạo**: nhạc nền đàn tranh, trống dồn lúc hết giờ, chiêng lúc công bố, pháo lúc vinh quy. Không dùng nhạc có bản quyền.
- **Sân thi đầu làng**: câu hỏi viết phấn lên bảng đen dưới mái tranh. Ai nộp bài thì được ngồi một bàn, tên hiện trên đầu, điểm cao ngồi các hàng giữa. Ai chưa có ghế thì tên hiện trên đám trẻ con chạy lên chạy xuống lối giữa. Hai bên sân có các cụ ngồi xem, cây đa đung đưa, lá rơi lác đác. Chữ trên mái tranh và tên ông đồ đổi được ở trang điều khiển.
- **Chế độ thứ hai: Loại trực tiếp (X50 / X100)**: 50 hoặc 100 người cùng chơi, mỗi câu 5 giây, sai hoặc không trả lời là bị loại, người cuối cùng thắng. Chọn chế độ ở trang điều khiển. Xem mục "Chế độ loại trực tiếp" bên dưới.
- **Chạy cả buổi**: hết ván tự sang ván mới; mất kết nối TikTok thì tự kết nối lại.

## Chạy nhanh (cho dev)

Bản đủ bước nằm ở các mục bên dưới. Nếu bạn đã quen code, làm thế này:

1. Cài **Node.js 20+**, giải nén hoặc `git clone` game vào thư mục có đường dẫn ngắn, không dấu.
2. Bấm đúp **`start-live.bat`** (Windows). Lần đầu nó tự chạy `npm install`, vài giây sau mở trình duyệt ở `http://localhost:3007` (trang điều khiển).
3. Trang stage để đưa vào TikTok LIVE Studio: `http://lvh.me:3007/?view=stage` (1080 × 1920).
4. Phát trực tiếp trong LIVE Studio trước, rồi nhập tên TikTok ở trang điều khiển và bấm **Kết nối**.
5. Giữ cửa sổ đen của start-live mở suốt buổi. Đóng cửa sổ là tắt game.

Máy Mac hoặc Linux không có `.bat`: chạy `npm install`, rồi `PORT=3007 LIVE_MODE=1 npm run dev`.

Trước khi sửa code chạy `npm test` và `npm run lint`, cả hai phải qua. Muốn thử không cần live thì bấm **Giả lập 60 người** trên trang điều khiển.

Lưu ý khi chạy lần đầu trên máy mới:

- Chưa cài VieNeu-TTS cũng không sao, game dùng giọng Edge (cần mạng). Muốn dùng VieNeu thì sửa dòng `set VIENEU_DIR=...` trong `start-live.bat`.
- Game chạy trên server. Tắt bật server hoặc tải lại trang stage trong 10 phút thì ván đang chơi được chơi tiếp (`data/room.json`). Muốn bắt đầu sạch thì bấm **Bắt đầu ván mới ngay** hoặc xoá `data/room.json` khi server đang tắt.
- Mở nhiều trang stage thì chỉ trang mở sau cùng có tiếng. Thấy câm thì kiểm tra xem có trang stage nào mở sau không.
- Cổng 3007 bận thì đóng bản game cũ, đừng đổi cổng.

## Cần chuẩn bị

1. Máy tính **Windows 10 hoặc 11**, có mạng.
2. **TikTok LIVE Studio** và tài khoản được phép phát trực tiếp.
3. **Node.js** bản LTS (bản 20 trở lên). Chỉ cài một lần.

## Cài đặt từng bước

### Bước 1: Cài Node.js

1. Vào [nodejs.org](https://nodejs.org), bấm nút tải bản **LTS**.
2. Mở file vừa tải, bấm Next tới hết, giữ nguyên các lựa chọn mặc định.
3. Cài xong thì khởi động lại máy cho chắc.

### Bước 2: Tải game về máy

Cách dễ nhất:

1. Trên trang GitHub này, bấm nút xanh **Code**, chọn **Download ZIP**.
2. Giải nén file ZIP ra một thư mục, ví dụ `D:\ai-la-trang-nguyen`. Đường dẫn nên ngắn và không có dấu tiếng Việt.

Nếu bạn đã dùng Git:

```bash
git clone https://github.com/workaipvlinh-byte/ai-la-trang-nguyen.git
```

### Bước 3: Chạy game

1. Mở thư mục game, **bấm đúp `start-live.bat`**.
2. **Lần đầu** máy sẽ tự cài thư viện, mất khoảng 1 đến 3 phút tuỳ mạng. Các lần sau mở ngay.
3. Khoảng 8 giây sau, trình duyệt tự mở **trang điều khiển** ở `http://localhost:3007`.
4. **Để cửa sổ đen của start-live mở suốt buổi live.** Đóng cửa sổ đó là tắt game.

### Bước 4: Gắn game vào TikTok LIVE Studio

1. Mở TikTok LIVE Studio, chọn bố cục **dọc**.
2. Thêm nguồn (Add source), chọn **Link** (hoặc Trình duyệt).
3. Dán địa chỉ: `http://lvh.me:3007/?view=stage`
4. Đặt kích thước **1080 × 1920**, kéo cho kín khung hình.

Phải dùng `lvh.me` chứ không dùng `localhost`, vì LIVE Studio không nhận chữ localhost. `lvh.me` vẫn trỏ về chính máy bạn.

### Bước 5: Lên live và kết nối

1. Bấm **Phát trực tiếp** trong LIVE Studio trước.
2. Trên trang điều khiển, nhập **tên TikTok** của bạn (phần sau chữ @), bấm **Kết nối**.
3. Thấy chữ "Đã kết nối" là xong. Game tự đếm ngược và bắt đầu ván đầu tiên.

Server nhớ tài khoản này. Lần sau mở start-live là nó tự kết nối lại. Muốn đổi tài khoản thì bấm **Ngắt** rồi nhập tên mới.

### Chưa live mà muốn thử

Trên trang điều khiển có các nút **Giả lập 1 người / 60 người / 500 người**. Bấm lúc màn hình đang hiện 4 đáp án để xem game chạy thế nào. Trang điều khiển có ô xem trước, không phát tiếng.

## Người xem gõ gì

| Gõ vào bình luận | Tác dụng |
|---|---|
| `A`, `b`, `C.`, `đáp án d`, `chọn a` | Trả lời câu hỏi. Chỉ tính lần gõ đầu tiên của mỗi câu, chữ hoa chữ thường đều được |
| `Bắc`, `Trung`, `Nam` (hoặc `miền Bắc`, `nam bộ`) | Vào phe thi đua 3 miền |
| `trai`, `gái` (hoặc `con trai`, `con gái`, `nữ`) | Chọn nhân vật nam hay nữ khi đỗ tam khôi. Không gõ thì game tự đoán theo tên |
| Thả tim | Ở thi Đình, đủ 200 tim trong một câu thì loại 2 đáp án sai |
| `khó quá`, `dễ quá`, `chào ông đồ`, `haha`... | Ông đồ có thể trêu lại vào lúc rảnh |

Đáp án gõ **lúc ông đồ còn đang đọc đề** (4 ô chưa hiện) thì không tính. Người chơi không mất lượt, gõ lại sau khi 4 ô hiện ra là được.

## Chế độ loại trực tiếp

Một chế độ chơi khác, chọn ở trang điều khiển (đổi chế độ sẽ kết thúc ván đang chơi, game nhớ lựa chọn cho lần bật sau).

- **Ghi tên**: trong phòng chờ, người xem gõ A, B, C, D hoặc "tham gia". Tối đa 50 hoặc 100 người (chọn ở trang điều khiển).
- **Mỗi câu 5 giây** sau khi ông đồ đọc xong đề. Trả lời sai hoặc không trả lời là bị loại. Nếu cả phòng không ai đúng thì không ai bị loại. Vào chơi lúc nào cũng được.
- **Còn 5 người trở xuống**: hiện bảng top kèm thời gian trả lời trung bình. Người xem gõ số 1 đến 5 để chọn người ủng hộ, rồi tặng hoa hoặc bóng bay để bình chọn. Phiếu chỉ quyết định khi hết số câu tối đa mà hai người sát nhau.
- **Người cuối cùng** thắng, được vinh danh. Muốn chơi ván mới thì cả phòng thả tim (miễn phí); quá 2 phút game tự mở ván mới.

Số liệu (số người, thời gian, độ khó, số tim, tên quà tính phiếu) nằm ở `src/game/elimination-config.ts`; xem `CLAUDE.md` để biết đầy đủ.

## Nút trên trang điều khiển

- **Bắt đầu ván mới ngay**: bỏ qua phần đếm ngược.
- **Bỏ câu này**: gặp câu sai hoặc câu gây cãi thì bấm. Câu đó bị bỏ qua và không bao giờ được hỏi lại.
- **Đọc ngay**: gõ một câu để ông đồ đọc (ví dụ thông báo giờ live sau).
- **Tốc độ giọng**, **Tên kênh**: tuỳ chỉnh giọng đọc và tên kênh ông đồ nhắc tới.

## Giọng đọc

**Mặc định** game dùng giọng nam **Edge (NamMinh)**: miễn phí, chỉ cần có mạng, không phải cài gì thêm. Edge lỗi thì game tự chuyển sang giọng Google.

**Muốn giọng "Adam bựa" có cười, thở dài** như bản của tác giả, bạn cài thêm [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS), bộ đọc tiếng Việt mã nguồn mở chạy ngay trên máy:

1. Cài VieNeu-TTS theo hướng dẫn trong repo của họ. Máy có card NVIDIA sẽ đọc nhanh; máy chỉ có CPU vẫn chạy được nhưng chậm hơn.
2. Mở `start-live.bat` bằng Notepad, sửa dòng `set VIENEU_DIR=E:\02_AI\VieNeu-TTS` thành thư mục bạn đã cài.
3. Lưu lại, bấm đúp start-live như bình thường. Nó sẽ tự mở thêm cửa sổ "Giọng VieNeu". Đang live thì đừng tắt cửa sổ đó.

VieNeu tắt hoặc lỗi giữa chừng thì game tự quay về giọng Edge, ông đồ không bị câm.

## Tự chỉnh game

Các file bạn hay sửa nhất đều mở được bằng Notepad. Sửa xong thì làm mới trang stage trong LIVE Studio (chuột phải vào nguồn, chọn Làm mới).

- **Câu hỏi**: `src/game/questions/*.txt`, mỗi chủ đề một file. Mỗi dòng một câu:
  ```
  câu hỏi | ĐÁP ÁN ĐÚNG | sai | sai | sai
  ```
  Đáp án đúng luôn để ở vị trí thứ hai, game tự xáo A B C D. Dòng `[de]`, `[vua]`, `[kho]`, `[dinh]`, `[meo]` là nhóm độ khó (khảo hạch, thi Hương, thi Hội, thi Đình, đố mẹo). Quy tắc viết câu có ở `src/game/questions/writing-guide.md`. Viết xong chạy `node tools/check-questions.mjs` để soát lỗi.
- **Lời ông đồ, số liệu luật chơi**: `src/game/config.ts`. Mọi câu ông đồ nói, thời gian từng kỳ, điểm, số tim cứu trợ... đều ở đây.
- **Ảnh**: nền ở `public/assets/background/village-yard.jpg` (1080 × 1920). Ảnh gốc (ông đồ, tam khôi, sĩ tử, trẻ con, các cụ, nền) để trong `art-source/village-yard/` (mỗi chủ đề một thư mục), ảnh đã tách nền dùng trong game ở `public/assets/characters/`. Thay ảnh gốc xong thì chạy `node tools/remove-background.mjs` (ông đồ, tam khôi) hoặc `node tools/cut-characters.mjs` (nhân vật sân thi) để tách nền trắng.
- **Chủ đề giao diện**: chọn ở trang điều khiển (mặc định "Đình làng"; có thêm "Sân thi đầu làng" và "Vua Khán Đài" bóng đá). Mỗi chủ đề có ảnh, từ ngữ và (nếu muốn) bộ câu hỏi riêng. Thêm chủ đề mới: xem mục "Chủ đề giao diện" trong `CLAUDE.md`. Xem thử một chủ đề không đổi cài đặt: thêm `&theme=<chủ đề>` vào link stage.

## Gặp lỗi thì sao

- **Không nghe tiếng ông đồ**: nếu mở trang stage bằng Chrome để thử, bấm vào trang một lần (Chrome chặn tự phát tiếng tới lúc bạn bấm). Trong LIVE Studio thì không bị chặn.
- **Nghe hai giọng chồng nhau**: bạn đang mở trang stage ở hai chỗ. Game chỉ cho trang mở sau cùng phát tiếng, nhưng tốt nhất chỉ mở trong LIVE Studio.
- **Không kết nối được TikTok**: phải bấm Phát trực tiếp trong LIVE Studio trước rồi mới kết nối. Server sẽ tự thử lại 15 giây, 30 giây, 1 phút, tối đa 2 phút một lần.
- **Cửa sổ start-live báo cổng 3007 đang bận**: đang có một bản game khác chạy. Đóng hết cửa sổ start-live cũ rồi mở lại.
- **Gặp câu hỏi sai**: bấm "Bỏ câu này" ở trang điều khiển. Bộ câu do AI viết rồi soát lại, gần 5.000 câu nên khó tránh sót vài câu.

## Cho người biết code

- Node.js + TypeScript. Server Express chia theo việc trong `src/server/` (`server.ts` chỉ khởi động); game chạy hẳn trên server (`src/server/game-host.ts`), trang stage và trang điều khiển chỉ vẽ lại, trang stage còn phát tiếng, giao diện React 19 + Vite + Tailwind 4, hiệu ứng `motion`, kết nối TikTok bằng `tiktok-live-connector` 2.x.
- Lõi luật chơi (không phụ thuộc React): `src/game/engine/exam.ts`. Màn hình 1080 × 1920: `src/game/components/GameStage.tsx`. Âm thanh tự tạo bằng Web Audio: `src/game/audio/sfx.ts`.
- Thư mục `src/game`: `components/` (giao diện), `hooks/` (vẽ màn hình, đọc lời ông đồ do server gửi), `engine/` (luật chơi và test), `audio/`, `utils/`, `questions/` (bộ câu hỏi). Thư mục `src/live`: `components/`, `hooks/`, `context/` (vai trò trang stage hay điều khiển), `utils/`.
- Kiểm tra: `npm test` chạy luật chơi, ván chơi mẫu có hạt giống cố định (so với `src/game/engine/fixtures/golden-run.json`), ghi file an toàn, danh sách API, chuyển file dữ liệu, bộ câu hỏi và đường dẫn ảnh. `npm run lint` kiểm tra kiểu.
- Dữ liệu chạy lúc live nằm ở `data/` (`used-questions.json`, `weekly-board.json`), tên kênh ở `settings.json`; cả hai không đưa lên git.
- Server chỉ nghe `127.0.0.1`, người cùng mạng Wi-Fi không điều khiển được.
- Cổng 3007, đổi được bằng biến `PORT`.

## Giấy phép

Mã nguồn dùng giấy phép [MIT](LICENSE). Ảnh ông đồ, ảnh tam khôi và ảnh nền (`public/assets/`, `art-source/`) thuộc về tác giả. Muốn dùng cho kênh của mình thì nên thay bằng ảnh riêng.

Game lấy cảm hứng từ các game show đố vui trên truyền hình nhưng không dùng tên, giao diện, nhạc hay câu thoại của chương trình nào.
