import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";

const uri_base_all = 'orders' //get all
const uri_base_local = 'order' //create update delete
const label_notification = 'đơn hàng' //get all


export const getOrderClientALl = async (params = {},page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.product_name){
           params_text += `product_name=${params.product_name}&`
        }
        if(params?.unit_shipping){
           params_text += `unit_shipping=${params.unit_shipping}&`
        }
        if(params?.created_at){
           params_text += `created_at=${params.created_at}&`
        }
        if(params?.shipping_code){
           params_text += `shipping_code=${params.shipping_code}&`
        }
        const res = await axiosClient.get(`${uri_base_all}?${params_text}page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
        throw error; 
    }
}
export const getOrderALl = async (params = [], page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.product_name){
           params_text += `product_name=${params.product_name}`
        }
        if(params?.unit_shipping){
           params_text += `unit_shipping=${params.unit_shipping}`
        }
        if(params?.created_at){
           params_text += `created_at=${params.created_at}`
        }
        if(params?.shipping_code){
           params_text += `shipping_code=${params.shipping_code}`
        }
        const res = await axiosAdmin.get(`${uri_base_all}?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}
export const getOrderClientDetail = async (slug) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`${uri_base_local}/${slug}`);
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi lấy chi tiết ${label_notification}:`, error);
        // throw error; 
    }
}
export const createOrder = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.post(`order`, {
            ...params
        });
        showDynamic(dispatch, `Tạo ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi tạo ${label_notification}:`, error);
        // throw error; 
    }
}
export const updateOrder = async (dispatch, params) => {
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
export const deleteOrder = async (dispatch, code) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`Order/${code}`).then(() => {
            showDynamic(dispatch, `Đã xóa ${label_notification} thành công!`)
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi xóa ${label_notification}:`, error);
        // throw error; 
    }
}
