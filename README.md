# Kéo

Ứng dụng web tải video và âm thanh từ liên kết YouTube. Người dùng có thể dán đường dẫn, chọn MP4 hoặc MP3, chọn chất lượng và nhận file thật qua API trung gian.

## Tính năng

- Hỗ trợ liên kết `youtube.com`, `youtu.be` và YouTube Shorts.
- Kiểm tra liên kết trước khi xử lý.
- Đọc tiêu đề, kênh và ảnh thu nhỏ của video qua YouTube oEmbed.
- Có phương án dự phòng khi không lấy được metadata.
- Chọn tải video MP4 với chất lượng từ 240p đến 720p trên gói dùng thử miễn phí.
- Tải âm thanh MP3 320 kbps.
- Khóa API chỉ tồn tại trong Cloudflare Worker, không được đưa vào bundle frontend.
- Xử lý riêng các lỗi hết lượt miễn phí, quá giới hạn, video riêng tư hoặc dịch vụ tạm gián đoạn.
- Có đầy đủ trạng thái trống, đang xử lý, lỗi và sẵn sàng.
- Hỗ trợ giao diện sáng, tối và thiết bị di động.
- Hỗ trợ thao tác bàn phím, focus state và reduced motion.

## Trạng thái dự án

Frontend và API serverless đã được nối hoàn chỉnh. Endpoint `POST /api/download` chạy trong Cloudflare Worker, gọi Tunelio để tạo đường dẫn tải có thời hạn rồi chuyển trình duyệt tới file MP4/MP3.

Production chỉ tải được file sau khi Worker có secret `TUNELIO_API_KEY`. Xem phần cấu hình bên dưới.

## Website production

Ứng dụng đang được deploy trên Cloudflare Workers:

<https://keo-media.alexnguyena47.workers.dev>

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite 8
- Cloudflare Workers
- Tunelio Download API
- Motion
- Phosphor Icons
- CSS thuần với hệ thống biến màu cho light mode và dark mode
- Oxlint

## Yêu cầu môi trường

- Node.js `^20.19.0` hoặc `>=22.12.0`
- npm
- Tài khoản Tunelio để lấy API key

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

Để thử cả endpoint Worker ở local, sao chép `.dev.vars.example` thành `.dev.vars`, điền API key rồi chạy:

```bash
npm run build
npx wrangler dev
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
├── worker/
│   └── index.ts
├── .dev.vars.example
├── index.html
├── package.json
├── wrangler.jsonc
└── vite.config.ts
```

## Cấu hình API tải xuống

Tunelio yêu cầu API key ở phía server. Tạo tài khoản tại <https://tunelio.dev>, lấy key có tiền tố `tnl_`, sau đó lưu key thành secret của Worker:

```bash
npx wrangler secret put TUNELIO_API_KEY
```

Wrangler sẽ yêu cầu nhập giá trị; dán API key rồi nhấn Enter. Không ghi key thật vào `.env`, `wrangler.jsonc` hoặc source code.

Gói Trial hiện cấp 100 credit một lần, không cần thẻ. Mỗi lần gọi `/create` tốn 10 credit, tương đương khoảng 10 lượt tải để thử. Gói này hỗ trợ MP4 tối đa 720p và MP3 320 kbps. Đây là hạn mức dùng thử, không phải hạ tầng miễn phí vô hạn.

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

## API nội bộ

Frontend gửi request cùng origin tới Worker:

```http
POST /api/download
Content-Type: application/json
```

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "mediaType": "video",
  "quality": "720p"
}
```

Worker kiểm tra domain và video ID, giới hạn định dạng/chất lượng hợp lệ, gọi Tunelio bằng secret rồi chỉ trả về URL tải HTTPS có thời hạn. File đi thẳng từ dịch vụ tới trình duyệt, không chạy xuyên qua Worker.

## Kiểm tra trước khi đóng góp

```bash
npm run lint
npm run build
```

## Lưu ý sử dụng

Chỉ tải nội dung bạn sở hữu hoặc được chủ sở hữu cho phép. Người sử dụng có trách nhiệm tuân thủ điều khoản của nền tảng và quy định bản quyền áp dụng tại nơi mình sinh sống.
