
import { toast } from "react-toastify";
import axiosAdmin from "../../services/axiosAdmin";
import { updateDynamic } from "../features/dynamicIslandSlice"

export const showDynamic = (dispatch, content) => {
    dispatch(updateDynamic({ title: "", content }));
};
export const uploadImage = async (dispatch, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file); // 'thumbnail' là key sẽ nhận bên Laravel
    formData.append('name', 'Redmi Turbo 4 Pro'); // Gửi kèm các field khác nếu cần

    try {
        const response = await axiosAdmin.post('upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
            showDynamic(dispatch, "Upload thành công!");
        return response.data;
    } catch (error) {
        console.error('Lỗi upload:', error);
    }
}

// Hàm tạo/cập nhật cookie
export const setCookie = (cname, cvalue, exdays) => {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Hàm lấy giá trị cookie
export const getCookie = (cname) => {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
export const deleteCookie = (cname) => {
  document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
export const formatToNumber = (str) => {
    // 1. Kiểm tra nếu đầu vào không có giá trị
    if (!str && str !== 0) return 0;

    // 2. Chuyển sang chuỗi (phòng trường hợp đầu vào đã là số)
    const stringValue = String(str);

    // 3. Loại bỏ tất cả ký tự không phải số bằng Regex \D
    const number = stringValue.replace(/\D/g, "");

    // 4. Trả về số nguyên, mặc định là 0 nếu chuỗi rỗng
    return parseInt(number, 10) || 0;
};
export const formatToCurrency = (num) => {
    // 1. Kiểm tra nếu không phải số hoặc là chuỗi rỗng thì trả về mặc định
    if (num === null || num === undefined || isNaN(num)) {
        return "0 ₫";
    }

    // 2. Chuyển đổi num sang dạng số (phòng trường hợp truyền vào chuỗi "1000")
    const amount = Number(num);

    // 3. Định dạng theo chuẩn vi-VN
    return amount.toLocaleString('vi-VN') + " ₫";
};
import { useState, useEffect } from 'react';

export function useIp() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        // Sử dụng ipify (hoặc icanhazip.com)
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIp(data.ip);
      } catch (error) {
        console.error("Không thể lấy IP:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIp();
  }, []);

  return { ip, loading };
}

const CACHE_NAME = 'my-product-cache';

// Hàm để lưu dữ liệu vào cache
export const setCache = async (key, data) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data));
    setTimeCache(key, data)
    await cache.put(key, response);
  } catch (error) {
    console.error('Lỗi khi lưu vào cache:', error);
  }
};

// Hàm để lấy dữ liệu từ cache
export const getCache = async (key) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(key);
    if (response) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Lỗi khi lấy từ cache:', error);
    return null;
  }
};

export const removeCache = async (key, notifi = false) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const deleted = await cache.delete(key);
    if(deleted){
      if(notifi = true) toast.success("Bạn đã xóa cache thành công. Vui lòng tải lại trang để cập nhật dữ liệu mới!");
    }
    return deleted; // Trả về true nếu xóa thành công, false nếu không tìm thấy key
  } catch (error) {
    console.error('Lỗi khi xóa item trong cache:', error);
    return false;
  }
};

// 2. Hàm xóa sạch toàn bộ kho Cache (CACHE_NAME)
export const clearAllCache = async () => {
  try {
    const success = await caches.delete(CACHE_NAME);
    return success; // Trả về true nếu xóa thành công
  } catch (error) {
    console.error('Lỗi khi xóa toàn bộ cache:', error);
    return false;
  }
};

export const setTimeCache = async (key, data) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Thiết lập thời gian hết hạn: Hiện tại + 1 giờ (tính bằng milliseconds)
    const ONE_HOUR = 60 * 60 * 1000;
    const expireAt = Date.now() + ONE_HOUR;

    const cacheData = {
      data: data,
      expireAt: expireAt
    };

    const response = new Response(JSON.stringify(cacheData));
    await cache.put(key, response);
  } catch (error) {
    console.error('Lỗi khi setTimeCache:', error);
  }
};

export const checkTimeCache = async (key) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(key);

    if (!response) return null; // Không có cache

    const cachedContent = await response.json();
    const currentTime = Date.now();

    // Kiểm tra nếu thời gian hiện tại > thời gian hết hạn
    if (currentTime > cachedContent.expireAt) {
      // console.log(`Cache của key "${key}" đã hết hạn. Đang tiến hành xóa...`);
      await removeCache(key); 
      return null; // Trả về null vì cache đã hỏng/hết hạn
    }

    return cachedContent.data; // Trả về dữ liệu gốc nếu vẫn còn hạn
  } catch (error) {
    console.error('Lỗi khi checkTimeCache:', error);
    return null;
  }
};