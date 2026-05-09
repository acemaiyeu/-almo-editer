import { showDynamic } from "../app/ComponentSupport/functions";
import axiosClient from "./axiosClient";

let lastSubmitTime = 0; // Lưu mốc thời gian bên ngoài hàm
// Service cho Comment
export const getCommentsByProduct = async (productId, page = 1) => {
    try {
        const res = await axiosClient.get(`products/${productId}/comments?page=${page}`);
        return res; // Trả về data từ Transformer
    } catch (error) {
        console.error("Lỗi lấy bình luận:", error);
    }
}

// export const postComment = async (dispatch, params) => {
//     try {
//         const res = await axiosClient.post(`comments`, params);
//         showDynamic(dispatch, "Gửi bình luận thành công!");
//         return res.data;
//     } catch (error) {
//         showDynamic(dispatch, "Lỗi khi gửi bình luận!");
//     }
// }
export const postComment = async (dispatch, params) => {
    const currentTime = Date.now();
    const cooldownPeriod = 10000; // 10 giây (tính bằng miliseconds)

    // Kiểm tra nếu thời gian trôi qua chưa đủ 10 giây
    if (currentTime - lastSubmitTime < cooldownPeriod) {
        const timeLeft = Math.ceil((cooldownPeriod - (currentTime - lastSubmitTime)) / 1000);
        showDynamic(dispatch, `Vui lòng đợi ${timeLeft} giây nữa để tiếp tục bình luận!`);
        return null;
    }

    try {
        const res = await axiosClient.post(`comments`, params);
        
        // Cập nhật lại mốc thời gian sau khi gửi THÀNH CÔNG
        lastSubmitTime = Date.now(); 
        
        // showDynamic(dispatch, "Gửi bình luận thành công!");
        return res.data;
    } catch (error) {
        // showDynamic(dispatch, "Lỗi khi gửi bình luận!");
        lastSubmitTime = 0;
        // Nếu lỗi, bạn có thể chọn reset lastSubmitTime = 0 
        // để họ có thể thử lại ngay lập tức nếu muốn.
    }
}