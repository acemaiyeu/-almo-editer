
import axiosClient from "./axiosClient";

export const postIP = async (ip) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.post(`ip`, {
            ip: ip
        });

        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi tạo sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}