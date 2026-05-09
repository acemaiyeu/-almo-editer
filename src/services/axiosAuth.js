import axios from 'axios';
import { toast } from 'react-toastify';
import { updateProfile } from '../app/features/profileSlice';
import { API_URL } from '../const/const';
import { store } from '../app/store';

const axiosAuth = axios.create({
  baseURL: `${API_URL}/api/`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 1. Hàm dọn dẹp bộ nhớ và state khi hết hạn hoặc logout
const clearAuthData = (isAdmin) => {
  if (isAdmin) {
    localStorage.removeItem('access_token_admin');
    localStorage.removeItem('expires_at_admin');
  } else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('expires_at');
  }
  
  // Reset thông tin user trong Redux
  store.dispatch(updateProfile({
    email: '',
    name: '',
    avatar: ''
  }));
};

// 2. Interceptor cho Request: Kiểm tra Token trước khi gửi
axiosAuth.interceptors.request.use(
  (config) => {
    const isAdminPage = window.location.pathname.startsWith('/admin');
    const tokenKey = isAdminPage ? 'access_token_admin' : 'access_token';
    const expireKey = isAdminPage ? 'expires_at_admin' : 'expires_at';
    
    const token = localStorage.getItem(tokenKey);
    const expiresAt = localStorage.getItem(expireKey);

    // Kiểm tra nếu có thời gian hết hạn và đã quá giờ
    if (expiresAt && Date.now() > Number(expiresAt)) {
      clearAuthData(isAdminPage);
      
      // Hủy request ngay lập tức bằng AbortController
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort();
      
      toast.error("Phiên làm việc đã kết thúc!");
      window.location.href = isAdminPage ? '/admin/login' : '/login';
      return config;
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptor cho Response: Xử lý lỗi trả về từ Server
axiosAuth.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isAdminPage = window.location.pathname.startsWith('/admin');
    
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || 'Đã xảy ra lỗi';

      switch (status) {
        case 401:
          // Nếu lỗi 401 xảy ra không phải tại trang login -> Token chết thực sự
          if (!window.location.pathname.includes('/login')) {
            toast.error("Phiên đăng nhập hết hạn!");
            clearAuthData(isAdminPage);
            
            // Đợi 1 chút cho user nhìn thấy thông báo rồi chuyển trang
            setTimeout(() => {
              window.location.href = isAdminPage ? '/admin/login' : '/login';
            }, 1000);
          } else {
            // Lỗi 401 ngay tại trang login
            toast.error("Tài khoản hoặc mật khẩu không chính xác!");
          }
          break;

        case 403:
          toast.error("Bạn không có quyền truy cập!");
          break;

        case 404:
          toast.error('Máy chủ không tìm thấy tài nguyên (404)');
          break;

        case 422:
          // Xử lý lỗi validate dữ liệu nếu có
          const firstError = data?.errors ? Object.values(data.errors)[0] : message;
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
          break;

        case 500:
          toast.error('Lỗi hệ thống máy chủ!');
          break;

        default:
          toast.error(message);
      }
    } else if (error.code === 'ERR_CANCELED') {
      // Request bị chặn bởi AbortController ở phía trên, không cần báo lỗi thêm
      console.log('Request canceled: Token expired');
    } else if (error.request) {
      toast.error("Mất kết nối server, vui lòng kiểm tra internet.");
    } else {
      toast.error(`Lỗi: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

export default axiosAuth;