import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";

const uri_base_all = 'history-discounts' //get all
const uri_base_local = 'history-discount' //create update delete
const label_notification = 'lịch sử vòng quay' //get all


export const getHistoryDiscountClientALl = async (params = {},page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.product_name){
            params_text += `product_name=${params.product_name}`
        }
        const res = await axiosClient.get(`${uri_base_all}?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
        throw error; 
    }
}
export const getHistoryDiscountALl = async (params = {}, page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.product_id){
            params_text += `product_id=${params.product_id}`
        }
        const res = await axiosAdmin.get(`${uri_base_all}?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}
export const getHistoryDiscountClientDetail = async (slug) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`${uri_base_local}/${slug}`);
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi lấy chi tiết ${label_notification}:`, error);
        // throw error; 
    }
}
export const createHistoryDiscount = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.post(`HistoryDiscount`, {
            ...params
        });
        showDynamic(dispatch, `Tạo ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi tạo ${label_notification}:`, error);
        // throw error; 
    }
}
export const updateHistoryDiscount = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.put(`${uri_base_local}/${params.code}`, {
            ...params
        });
        showDynamic(dispatch, `Cập nhật ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi cập nhật ${label_notification}:`, error);
        // throw error; 
    }
}
export const deleteHistoryDiscount = async (dispatch, code) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`HistoryDiscount/${code}`).then(() => {
            showDynamic(dispatch, `Đã xóa ${label_notification} thành công!`)
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi xóa ${label_notification}:`, error);
        // throw error; 
    }
}
