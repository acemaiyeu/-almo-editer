import { useState, useEffect } from 'react';

// Đây là "cỗ máy" dùng chung cho mọi loại API
export const useFetch = (apiFunc, params = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiFunc(params);
        setData(result?.data);
      } catch (error) {
        console.error("Lỗi API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]); // Chỉ gọi lại nếu params thay đổi

  return { data, loading };
};