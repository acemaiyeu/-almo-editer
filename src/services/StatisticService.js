import { showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";

const uri_base_all = 'statistic' //get all



export const getStatisticALl = async () => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.get(`${uri_base_all}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}
