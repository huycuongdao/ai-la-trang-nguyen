# Checklist lên live trên Windows

Dành cho người chạy game trên máy Windows. Hướng dẫn chi tiết từng bước nằm ở [README.md](../README.md), mục "Cài đặt từng bước".

## 1. Chuẩn bị (làm một lần)

- [ ] Máy chạy Windows 10 hoặc 11, có mạng.
- [ ] Đã cài Node.js bản LTS (từ 20 trở lên) từ nodejs.org, giữ mặc định, khởi động lại máy.
- [ ] Đã cài TikTok LIVE Studio, tài khoản được phép phát trực tiếp.
- [ ] Đã tải game về (Download ZIP hoặc git clone) và giải nén vào thư mục có đường dẫn ngắn, không dấu, ví dụ `D:\ai-la-trang-nguyen`.

## 2. Khởi động game

- [ ] Bấm đúp `start-live.bat` trong thư mục game.
- [ ] Lần đầu chờ 1 đến 3 phút để máy tự cài thư viện.
- [ ] Khoảng 8 giây sau, trình duyệt mở trang điều khiển `http://localhost:3007`.
- [ ] Giữ cửa sổ đen mở suốt buổi live. Đóng cửa sổ là tắt game.
- [ ] Nếu báo cổng 3007 đang bận: đóng hết cửa sổ start-live cũ rồi mở lại.

## 3. Thêm nguồn vào TikTok LIVE Studio

- [ ] Chọn bố cục dọc.
- [ ] Add source, chọn Link (hoặc Trình duyệt).
- [ ] Dán đúng địa chỉ: `http://lvh.me:3007/?view=stage` (dùng `lvh.me`, không dùng `localhost`).
- [ ] Đặt kích thước 1080 × 1920 và kéo kín khung hình.
- [ ] Chỉ mở một trang stage. Nếu mở thêm trang stage khác, chỉ trang mở sau cùng có tiếng.

## 4. Lên live

- [ ] Bấm Phát trực tiếp trong LIVE Studio trước.
- [ ] Trên trang điều khiển, nhập tên TikTok (phần sau chữ @), bấm Kết nối.
- [ ] Thấy chữ "Đã kết nối" là xong. Game tự đếm ngược và bắt đầu ván.
- [ ] Chưa kết nối được: kiểm tra đã Phát trực tiếp chưa. Server tự thử lại sau 15 giây, 30 giây, 1 phút, tối đa 2 phút một lần.

## 5. Trong lúc live

- [ ] Gặp câu sai hoặc câu gây tranh cãi: bấm "Bỏ câu này". Câu đó không bao giờ được hỏi lại.
- [ ] Muốn ông đồ đọc thông báo (ví dụ giờ live sau): dùng "Đọc ngay".
- [ ] Muốn ván mới ngay: bấm "Bắt đầu ván mới ngay".
- [ ] Mất kết nối TikTok: game tự kết nối lại, không cần làm gì.
- [ ] Lỡ tắt bật server hoặc tải lại trang stage trong vòng 10 phút: ván đang chơi được chơi tiếp.

## 6. Giọng đọc (tuỳ chọn)

- [ ] Mặc định game dùng giọng Edge, cần có mạng, không phải cài gì thêm.
- [ ] Muốn giọng VieNeu "Adam bựa": cài VieNeu-TTS, mở `start-live.bat` bằng Notepad, sửa dòng `set VIENEU_DIR=...` thành thư mục đã cài, lưu lại.
- [ ] Khi đang live, không tắt cửa sổ "Giọng VieNeu". Nếu VieNeu lỗi, game tự chuyển sang giọng Edge.

## 7. Thử trước (không cần live)

- [ ] Trên trang điều khiển, bấm "Giả lập 60 người" để xem game chạy khi 4 đáp án hiện lên. Trang điều khiển không phát tiếng.

## 8. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| Không nghe tiếng ông đồ khi mở bằng Chrome | Bấm vào trang một lần. Trong LIVE Studio thì không bị chặn. |
| Nghe hai giọng chồng nhau | Đóng bớt trang stage, chỉ giữ một trang. |
| Thấy câm | Kiểm tra có trang stage nào mở sau không, đóng trang đó. |
| Cổng 3007 đang bận | Đóng hết cửa sổ start-live cũ rồi mở lại. |
| Không kết nối được TikTok | Bấm Phát trực tiếp trong LIVE Studio trước, rồi bấm Kết nối lại. |

## 9. Kết thúc buổi live

- [ ] Đóng cửa sổ start-live để tắt game.
