import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";

const uri_base_all = 'roles' //get all
const uri_base_local = 'role' //create update delete
const label_notification = 'Loại tài khoản' //get all


export const getRoleClientALl = async ( page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`${uri_base_all}?page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
        throw error; 
    }
}
export const getRoleALl = async (params = [], page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.length > 0){

        }
        const res = await axiosAdmin.get(`${uri_base_all}?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}
export const getRoleClientDetail = async (slug) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`${uri_base_local}/${slug}`);
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi lấy chi tiết ${label_notification}:`, error);
        // throw error; 
    }
}
export const createRole = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.post(`role`, {
            ...params
        });
        showDynamic(dispatch, `Tạo ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi tạo ${label_notification}:`, error);
        // throw error; 
    }
}
export const updateRole = async (dispatch, params) => {
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
export const deleteRole = async (dispatch, code) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`role/${code}`).then(() => {
            showDynamic(dispatch, `Đã xóa ${label_notification} thành công!`)
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi xóa ${label_notification}:`, error);
        // throw error; 
    }
}
