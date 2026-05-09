import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../const/const';

const axiosAdmin = axios.create({
  baseURL: `${API_URL}/api/admin/`,
  headers: {
    'Content-Type': 'application/json',
    // 1. Định danh riêng cho Admin App để khớp với Middleware Laravel
    'X-App-Source': 'almobe-admin-internal',
  },
  timeout: 15000, // Admin xử lý dữ liệu nặng nên cho timeout dài hơn một chút (15s)
});

const forwardToLogin = () => {
  // Xóa sạch dấu vết khi bị đá ra ngoài
  localStorage.removeItem('access_token_admin');
  setTimeout(() => {
    window.location.href = "/admin/login";
  }, 1500);
};

// 2. Request Interceptor
axiosAdmin.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token_admin');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Chống thay đổi URL gọi API ngầm (Security check)
    if (!config.baseURL.includes('almobe.io.vn') && !config.baseURL.includes('192.168.')) {
        return Promise.reject(new Error('Domain không được phép!'));
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor
axiosAdmin.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || 'Lỗi hệ thống';
      
      // Lưu lại trang cuối để sau khi login quay lại cho đúng
      localStorage.setItem('last-page-admin', window.location.pathname ?? "/");

      switch (status) {
        case 401:
          toast.error('Phiên làm việc hết hạn, vui lòng đăng nhập lại!');
          forwardToLogin();
          break;
        case 403:
          toast.error('Bạn không có quyền thực hiện hành động này!');
          // Không nhất thiết phải forwardToLogin nếu họ chỉ bị cấm 1 tính năng nhỏ
          forwardToLogin();
          break;
        case 422:
          // Lấy danh sách lỗi
          const validationErrors = data?.errors;

          // Kiểm tra nếu là mảng và có ít nhất 1 phần tử
          if (Array.isArray(validationErrors) && validationErrors.length > 0) {
            // Chỉ bắn thông báo cho lỗi đầu tiên
            toast.error(validationErrors[0]);
          } else if (typeof validationErrors === 'string') {
            // Trường hợp lỗi trả về là một chuỗi đơn thuần
            toast.error(validationErrors);
          } else {
            // Trường hợp mặc định nếu không lấy được mảng lỗi cụ thể
            toast.error(message || "Dữ liệu không hợp lệ.");
          }
          break;
        case 429:
          toast.error('Bạn đang thao tác quá nhanh! Hãy thử lại sau 1 phút.');
          break;
        case 500:
          toast.error('Máy chủ Admin đang bảo trì hoặc gặp lỗi nghiêm trọng!');
          break;
        default:
          toast.error(`Lỗi [${status}]: ${message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Kết nối quá tải (Timeout), vui lòng kiểm tra mạng!');
    } else {
      toast.error('Không thể kết nối tới máy chủ Admin (CSP hoặc Network)!');
    }
    
    return Promise.reject(error);
  }
);

export default axiosAdmin;