// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   optimizeDeps: {
//     // Ép Vite không được đụng vào FFmpeg
//     exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'onnxruntime-web']
//   },
//   server: {
//     host: true, // Cho phép lắng nghe IP trong mạng LAN
//     port: 5173,
//     open: false,
//     strictPort: true, // Nếu cổng 5173 bị chiếm, nó sẽ báo lỗi chứ không tự đổi sang cổng khác
//     watch: {
//       usePolling: true, // Windows 11 đôi khi cần cái này để nhận diện file thay đổi trên ổ đĩa
//     },
//     headers: {
//     "X-Content-Type-Options": "nosniff",
//     "X-Frame-Options": "SAMEORIGIN",
//     "Cross-Origin-Opener-Policy": "same-origin",
//     "Cross-Origin-Embedder-Policy": "require-corp",
//     "Content-Security-Policy": 
//       "default-src 'self'; " +
//       // Quan trọng: Phải có 'blob:' trong script-src vì FFmpeg nạp worker qua blob
//       "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://cdnjs.cloudflare.com; " + 
//       "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " + 
//       "font-src 'self' https://cdn.jsdelivr.net; " + 
//       "img-src 'self' data: https: blob:; " + 
//       "connect-src 'self' * ws: http: https: data: blob:; " + 
//       "media-src 'self' data: blob: *; " +
//       // THÊM DÒNG NÀY: Cho phép chạy Web Worker từ blob
//       "worker-src 'self' blob:;"
// },
//   },
//   build: {
//     sourcemap: false, // Tắt hoàn toàn bản đồ nguồn
//     minify: 'terser', // Sử dụng terser để nén code cực mạnh
//     terserOptions: {
//       compress: {
//         drop_console: true, // Tự động xóa sạch console.log khi build production
//         drop_debugger: true,
//       },
//     },
//   },
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Content-Type", "value": "application/octet-stream" },
        { "key": "Cross-Origin-Resource-Policy", "value": "cross-origin" }
      ]
    }
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'onnxruntime-web']
  },
  // Thêm phần này để đảm bảo Vite xử lý các file tài nguyên tĩnh đúng cách
  assetsInclude: ['**/*.onnx', '**/*.wasm'], 
  server: {
    // ... giữ nguyên các cấu hình port/host của bạn
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    // Tăng giới hạn kích thước asset để tránh file onnx bị biến thành base64 inline
    assetsInlineLimit: 0, 
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})