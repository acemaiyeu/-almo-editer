import { useEffect } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/clients/Home'
import { toast, ToastContainer } from 'react-toastify'


function App() {
  useEffect(() => {
  if (window.self !== window.top) {
    // Nếu web đang bị nhúng vào iframe, hãy đẩy nó ra ngoài hoặc xóa nội dung
    window.top.location.href = window.self.location.href;
  }
}, []);
const widthWithoutScroll = document.documentElement.clientWidth;
if(widthWithoutScroll <= 1000){
  toast.warn("Web dùng máy bạn để render, nên khi bạn dùng điện thoại có thể không đáp ứng đúng nhu cầu của bạn. Vui lòng sử dụng Laptop hoặc PC. Cảm ơn")
}


  return (
    <div>
       <ToastContainer position="top-right" style={{ top: "50px" }}/>
      {/* <Header /> */}
      <div>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} /> 
         
          <Route path="*" element={<div >Not found</div>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
