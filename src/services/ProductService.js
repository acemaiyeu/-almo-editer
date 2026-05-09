import { useDispatch } from "react-redux";
import { checkTimeCache, getCache, setCache, showDynamic } from "../app/ComponentSupport/functions";
import axiosAdmin from "./axiosAdmin";
import axiosClient from "./axiosClient";


export const getProductClientALl = async (params = {}, page = 1, limit = 10) => {
    try {
        // 1. Tạo query string
        let params_text = "";
        if (params?.category_name) params_text += `&category_name=${params.category_name}`;
        if (params?.product_name) params_text += `&name=${params.product_name}`;
        if (params?.sort === "price-down") params_text += `&sort[price]=desc`;
        if (params?.sort === "price-up") params_text += `&sort[price]=asc`;
        if (params?.sort === "new-product") params_text += `&sort[created_at]=desc`;
        const product_version = localStorage.getItem("product_version") || 0;
        const cacheKey = `products?page=${page}&limit=${limit}${params_text}&version=${product_version}`;
        
        

        
        // 2. Kiểm tra Cache trước
        

        // 3. Gọi API nếu không có cache
        const res = await axiosClient.get(cacheKey);
        if(res.version){
            const cachedData = await getCache("products");
            if(!params.category_name && !params.product_name){
                if (cachedData) {
                    return cachedData.data;
                }
            }
        }
        if(res?.data[0]?.version){
            localStorage.setItem("product_version", res.data[0].version);
        }
        

        

        // 4. Lưu vào cache cho lần sau
        if(!params.category_name && !params.product_name){
         await setCache("products", res); 
        }

        return res;
    } catch (error) {
        // console.error("Lỗi:", error);
        return null;
    }
}
export const getProductALl = async (params = [], page = 1, limit = 10) => {
    try {
        // Thêm return ở đầu dòng này
        let params_text = "";
        if(params?.product_name){
           params_text += `name=${params.product_name}`
        }
        const res = await axiosAdmin.get(`products?${params_text}&page=${page}&limit=${limit}`);
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy sản phẩm:", error);
        // throw error; 
    }
}
export const getProductClientDetail = async (slug) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosClient.get(`product/${slug}`);
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
        // throw error; 
    }
}
export const createProduct = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.post(`product`, {
            ...params
        });
        showDynamic(dispatch, "Tạo sản phẩm thành công!")
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi tạo sản phẩm:", error);
        // throw error; 
    }
}
export const updateProduct = async (dispatch, params) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.put(`product/${params.id}`, {
            ...params
        });
        showDynamic(dispatch, "Cập nhật sản phẩm thành công!")
        return res.data; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi cập nhật sản phẩm:", error);
        // throw error; 
    }
}
export const deleteProduct = async (dispatch, product_id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`product/${product_id}`).then((res) => {
            showDynamic(dispatch, "Đã xóa sản phẩm thành công!")
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi xóa sản phẩm:", error);
        // throw error; 
    }
}
export const exportLuckyUsers = async (dispatch, product_id) => {
    try {
        // Thêm return ở đầu dòng này
        const res = await axiosAdmin.delete(`export-lucky-users-data/${product_id}`).then(() => {
            showDynamic(dispatch, "Đang chờ tải file")
        }).catch()
        return res; // Trả về dữ liệu từ API
    } catch (error) {
        // console.error("Lỗi khi xóa sản phẩm:", error);
        // throw error; 
    }
}
