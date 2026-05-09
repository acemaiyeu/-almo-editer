import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";

const uri_base_all = 'feedback-products' //get all
const uri_base_local = 'feedback-product' //create update delete
const label_notification = ' góp ý sản phẩm' //get all


export const getFeedbackProductALl = async (params = [], page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.length > 0){

        }
        const res = await axiosAdmin.get(`${uri_base_all}?${params_text}&sort[created_at]=desc&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}

export const createFeedbackProduct = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.post(uri_base_local, {
            ...params
        });
        showDynamic(dispatch, `Gửi ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi tạo ${label_notification}:`, error);
        // throw error; 
    }
}
export const deleteFeedbackProduct = async (dispatch, id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`${uri_base_local}/${id}`).then(() => {
            showDynamic(dispatch, `Đã xóa ${label_notification} thành công!`)
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi xóa ${label_notification}:`, error);
        // throw error; 
    }
}
