import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosAuth from "./axiosAuth";
import axiosClient from "./axiosClient";

const uri_base_all = 'users' //get all
const uri_base_local = 'user' //create update delete
const label_notification = 'tài khoản' //get all


export const getUserALl = async (params = [], page = 1, limit = 7) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.id){
            params_text += `id=${params.id}&`
        }
        if(params?.email){
            params_text += `email=${params.email}&`
        }
        if(params?.phone){
            params_text += `phone=${params.phone}&`
        }
        if(params?.name){
            params_text += `name=${params.name}`
        }
        const res = await axiosAdmin.get(`${uri_base_all}?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}

export const blockUser = async (dispatch, user_id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.put(`${uri_base_local}/block/${user_id}`);
        showDynamic(dispatch, `Cập nhật ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi cập nhật ${label_notification}:`, error);
        // throw error; 
    }
}
export const unBlockUser = async (dispatch, user_id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.put(`${uri_base_local}/unblock/${user_id}`);
        showDynamic(dispatch, `Cập nhật ${label_notification} thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi cập nhật ${label_notification}:`, error);
        // throw error; 
    }
}
export const updateNotification = async (dispatch, staus_notification) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.put(`notification`, {
            notification: staus_notification
        });
        showDynamic(dispatch, `Cập nhật thông báo qua email thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi cập nhật ${label_notification}:`, error);
        // throw error; 
    }
}
export const activePasswordUser = async (dispatch, $password_temp) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.put(`user/active-password/${$password_temp}`);
        showDynamic(dispatch, `Bạn đã kích hoạt mật khẩu thành công!`)
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error(`Lỗi khi cập nhật ${label_notification}:`, error);
        return {
            status: "error"
        }
    }
}
export const createUser = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.post(`user`, {
            ...params
        });
        showDynamic(dispatch, "Tạo tài khoản thành công!")
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi tạo sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}
export const updateUserClient = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.put(`user`, {
            ...params
        });
        showDynamic(dispatch, "Cập nhật tài khoản thành công!")
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi cập nhật sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}
export const updateUser = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.put(`user/${params.id}`, {
            ...params
        });
        showDynamic(dispatch, "Cập nhật tài khoản thành công!")
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi cập nhật sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}
export const deleteUser = async (dispatch, user_id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`user/${user_id}`).then((res) => {
            showDynamic(dispatch, "Đã xóa tài khoản thành công!")
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi xóa sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}
export const logoutUser = async (dispatch) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAuth.post(`/auth/logout`).then(() => {
            showDynamic(dispatch, "Bạn đã đăng xuất thành công!")
            setTimeout(() => {
                window.location.reload();
            },1000)
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi xóa sản phẩm:", error);
        // throw error; 
        return {
            status: "error"
        }
    }
}