import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { resetDynamic } from '../../app/features/dynamicIslandSlice'; // Đường dẫn tới file slice của bạn
import '../../style/DynamicIsland.css';

const DynamicIsland = () => {
  const dispatch = useDispatch();
  const { content, notifi, time_show, title } = useSelector((state) => state.dynamic);
  const [isActive, setIsActive] = useState(false);
  const audio = document.getElementById("audio");
  const setting = useSelector((state) => state.setting);
  const [showTime, setShowTime] = useState(5000)
  useEffect(() => {
    if (content !== "") {
      setIsActive(true);
      
      if(setting && setting?.soundnotifiIsland === "on"){
        audio.play()
      }
      
      // Sau 3 giây thì bắt đầu thu nhỏ lại
      const timer = setTimeout(() => {
        setIsActive(false);
        
        // Chờ hiệu ứng CSS thu nhỏ xong (500ms) rồi mới xóa hẳn data trong Redux
        setTimeout(() => {
          dispatch(resetDynamic());
        }, 500);
      }, (time_show) ?? 5000);
     
      return () => clearTimeout(timer);
    }else{
      setTimeout(() => {
          setIsActive(false)
        }, 500);
    }
  }, [content, dispatch]);

  useEffect(() => {
     setShowTime(time_show)
  }, [time_show])

  const formatMsToMinutesAndSeconds = (ms) => {
  // 1 giây = 1000ms, 1 phút = 60 giây = 60000ms
  const totalSeconds = Math.floor(ms / 1000);
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Dùng padStart để chuyển thành định dạng 2 chữ số (ví dụ: 02:05)
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

useEffect(() => {
  let id = null;

  if (isActive) {
    id = setInterval(() => {
      // Dùng hàm cập nhật dựa trên giá trị trước đó (prev) để tránh lỗi closure
      setShowTime((prevShowTime) => {
        // time_show > 5000: kiểm tra điều kiện của bạn 
        // (Nếu time_show phụ thuộc vào showTime, bạn có thể kiểm tra trực tiếp qua prevShowTime)
        if (time_show > 5000) {
          return prevShowTime - 1000;
        }
        
        // Nếu không thỏa mãn điều kiện thì giữ nguyên giá trị, không trừ nữa
        return prevShowTime; 
      });
    }, 1000);
  }

  // Hàm cleanup: Tự động dọn dẹp interval cũ khi component bị hủy,
  // hoặc khi isActive / time_show thay đổi để tránh sinh ra nhiều interval chạy ngầm
  return () => {
    if (id) clearInterval(id);
  };
}, [isActive, time_show]); // Lắng nghe sự thay đổi của hai biến này

  return (

    <div className="di-wrapper">
      {/* Chỉ Render CSS class dựa trên biến isActive */}
      <div className={`di-island ${isActive ? 'di-active' : 'di-hidden'}`}>
        {isActive ? (
          <>
          <div className="di-content">
            <div className="di-icon-bg">
              {/* <span>{notifi ? '🔔' : '✨'}</span> */}
              <span><img style={{width: "100%", height: "100%;", overflow: "hidden"}} src='https://media.tenor.com/_vIwBPEGs4QAAAAj/music-gif.gif'/></span>
            </div>
            <div className="di-text-stack">
              {/* {notifi && <small className="di-title">{notifi}</small>} */}
              <p className="di-text" style={{
                animation: content.length > 20 ? 'marquee-move 10s linear infinite' : '',
                 paddingLeft: "100%"
              }}>Đang phát: <span style={{color: "var(--color-main)"}}>{content}</span></p>
            </div>
          </div>
          <div className="time"> {formatMsToMinutesAndSeconds(showTime)} </div>
          </>
          
        ) : 
         <div className="di-content">
            <div className="di-text-stack">
              <p className="di-text" ><span>
                {title}
                </span></p> 
            </div>
          </div>
          }
      </div>
    </div>
  );
};

export default DynamicIsland;