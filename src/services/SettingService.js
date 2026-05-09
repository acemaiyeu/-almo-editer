import { toast } from "react-toastify"
import { getCookie, showDynamic } from "../app/ComponentSupport/functions"
import { updateSetting } from "../app/features/settingSlice"

export const setNotifiIsland = (dispatch, value) => {
    dispatch(updateSetting({
        notifiIsland: value
    }))
}
export const getNotifiIsland = (dispatch) => {
    setNotifiIsland(dispatch, getCookie("notifiisland"))
}
export const setNotifiEamil = (dispatch, value) => {

    dispatch(updateSetting({
        notifiEmail: value
    }))
    // showDynamic(dispatch, "Tính năng đang cập nhật!")
    // toast.warn("Tính năng đang cập nhật!")
}
export const getNotifiEmail = async (dispatch) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`${uri_base_local}/${slug}`);
        setNotifiEamil(dispatch, res.data)
    } catch (error) {
        // console.error(`Lỗi khi lấy chi tiết ${label_notification}:`, error);
        // throw error; 
    }
}