# Kéo

Frontend tải video và âm thanh từ liên kết YouTube. Người dùng có thể dán đường dẫn, chọn định dạng MP4 hoặc MP3 và chọn chất lượng trước khi tải.

## Tính năng

- Hỗ trợ liên kết `youtube.com`, `youtu.be` và YouTube Shorts.
- Kiểm tra liên kết trước khi xử lý.
- Đọc tiêu đề, kênh và ảnh thu nhỏ của video qua YouTube oEmbed.
- Có phương án dự phòng khi không lấy được metadata.
- Chọn tải video MP4 với chất lượng từ 480p đến 2160p.
- Chọn tải âm thanh MP3 với chất lượng từ 128 kbps đến 320 kbps.
- Có đầy đủ trạng thái trống, đang xử lý, lỗi và sẵn sàng.
- Hỗ trợ giao diện sáng, tối và thiết bị di động.
- Hỗ trợ thao tác bàn phím, focus state và reduced motion.

## Trạng thái dự án

Đây là phần frontend. Giao diện, kiểm tra liên kết, đọc metadata và lựa chọn định dạng đã hoạt động.

Nút tải hiện xác nhận định dạng và chất lượng đã chọn. Để tạo và tải file thật, dự án cần được kết nối với một backend có nhiệm vụ xử lý media.

## Website production

Ứng dụng đang được deploy trên Cloudflare Workers:

<https://keo-media.alexnguyena47.workers.dev>

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite 8
- Motion
- Phosphor Icons
- CSS thuần với hệ thống biến màu cho light mode và dark mode
- Oxlint

## Yêu cầu môi trường

- Node.js `^20.19.0` hoặc `>=22.12.0`
- npm

## Cài đặt

```bash
npm install
```

## Chạy môi trường phát triển

```bash
npm run dev
```

Sau đó mở địa chỉ được Vite hiển thị trong terminal. Mặc định thường là:

```text
http://localhost:5173
```

## Các lệnh chính

| Lệnh | Chức năng |
| --- | --- |
| `npm run dev` | Chạy development server với HMR |
| `npm run build` | Kiểm tra TypeScript và tạo production build |
| `npm run deploy` | Build và deploy production lên Cloudflare Workers |
| `npm run preview` | Xem thử production build trên máy local |
| `npm run lint` | Kiểm tra mã nguồn bằng Oxlint |

## Cấu trúc thư mục

```text
.
├── public/
├── src/
│   ├── assets/
│   │   └── media-convert.png
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── wrangler.jsonc
└── vite.config.ts
```

## Deploy lên Cloudflare

Đăng nhập Wrangler trên máy local:

```bash
npx wrangler login
```

Build và deploy ứng dụng:

```bash
npm run deploy
```

Cloudflare sẽ phục vụ nội dung trong thư mục `dist`. Cấu hình SPA fallback đã được khai báo trong `wrangler.jsonc`.

## Kết nối backend

Có thể thay nội dung của hàm `handleDownload` trong `src/App.tsx` bằng lời gọi đến API xử lý media.

Ví dụ request:

```http
POST /api/download
Content-Type: application/json
```

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "mp4",
  "quality": "1080p"
}
```

Backend có thể trả về URL tải tạm thời hoặc phản hồi dạng file. Frontend nên hiển thị thêm tiến trình xử lý và lỗi từ API khi phần này được tích hợp.

## Kiểm tra trước khi đóng góp

```bash
npm run lint
npm run build
```

## Lưu ý sử dụng

Chỉ tải nội dung bạn sở hữu hoặc được chủ sở hữu cho phép. Người sử dụng có trách nhiệm tuân thủ điều khoản của nền tảng và quy định bản quyền áp dụng tại nơi mình sinh sống.
