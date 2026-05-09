import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteCookie, showDynamic } from './functions';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const ClearCache = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [status, setStatus] = useState("Đang dọn dẹp bộ nhớ tạm, vui lòng chờ...")
    useEffect(() => {
        // Xóa localStorage
        setTimeout(() => {
                 localStorage.removeItem("sks-ksk");
        
        // Xóa Cookie (Giả sử hàm deleteCookie của bạn đã được import)
            deleteCookie('sk');

        // Thông báo hoặc log (tùy chọn)
        console.log("Cache đã được dọn dẹp!");
            showDynamic(dispatch, "Cache đã được dọn dẹp!")
            setStatus("Cache đã được dọn dẹp!")
        }, 5000);
       

        // Chuyển hướng người dùng về trang login hoặc admin sau khi xóa xong
    }, [navigate]);

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>{status}</p>
        </div>
    );
};

export default ClearCache;