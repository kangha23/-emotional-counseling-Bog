# 💗 JinXuan - Trợ Lý Tư Vấn Tình Cảm

Trang web chatbot AI tư vấn tình cảm, xây dựng bằng HTML/CSS/JS thuần + Google Gemini API.

## Cách chạy

1. Mở file `index.html` bằng trình duyệt (double click), hoặc
2. Dùng VS Code + extension **Live Server** để chạy local.

## Lấy API key miễn phí (Google Gemini)

1. Truy cập: https://aistudio.google.com/apikey
2. Đăng nhập bằng tài khoản Google.
3. Bấm **Create API key** → copy key.
4. Mở trang web, dán key vào ô cài đặt (⚙️) → bấm **Lưu & Bắt đầu chat**.

Key được lưu trong `localStorage` của trình duyệt trên máy bạn, không bị gửi đi đâu khác.

## Cấu trúc

| File         | Mô tả                                    |
| ------------ | ---------------------------------------- |
| `index.html` | Giao diện khung chat                     |
| `style.css`  | Style chủ đề hồng tình cảm, responsive   |
| `app.js`     | Logic chat, gọi Gemini API, lưu lịch sử  |

## Tính năng

- 💬 Chat realtime với bot "JinXuan" (nhân vật tư vấn tình cảm tiếng Việt)
- 🧠 Bot nhớ ngữ cảnh cuộc trò chuyện trong phiên
- ⌨️ Chip gợi ý câu hỏi nhanh khi mới vào
- ⚙️ Nhập/quản lý API key ngay trên web
- 📱 Responsive, dùng tốt trên điện thoại
- 😎 3 nhân vật tư vấn: Bạn thân thẳng thắn / Chuyên gia tâm lý / Chị đại sắc sảo (đổi ở dropdown trên header)
- 😊 Nhận diện cảm xúc tin nhắn → hiện reaction emoji + bot điều chỉnh tone theo cảm xúc
- 🎤 Chat giọng nói: bấm mic để nói, bấm loa 🔊 để bot đọc phản hồi tiếng Việt
- ☀️ Check-in hằng ngày + nhật ký tâm trạng với biểu đồ tuần/tháng và tổng kết tuần

## Lưu ý bảo mật

Cách này phù hợp để học và dùng cá nhân vì API key nằm trên máy bạn. Nếu muốn **deploy công khai** cho nhiều người dùng, hãy viết thêm một backend nhỏ (proxy) để giấu API key, tránh lộ key trên client.
