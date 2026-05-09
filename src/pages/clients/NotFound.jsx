import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import '../../style/NotFound.scss';
import illustration from '../../assets/img/404.jpg';
const NotFound = () => {
  // Logic tạo hiệu ứng Parallax nhẹ khi di chuyển chuột (chỉ hoạt động trên Desktop)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Ánh xạ tọa độ chuột sang độ dịch chuyển của ảnh (ví dụ: tối đa 15px)
  const moveX = useTransform(x, [-300, 300], [-15, 15]);
  const moveY = useTransform(y, [-300, 300], [-15, 15]);

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    // Tính toán vị trí chuột so với trung tâm của container
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    // Đưa ảnh về vị trí ban đầu khi chuột rời đi
    x.set(0);
    y.set(0);
  }

  // Animation cho các layer trôi nổi tự động
  const floatingAnimation = {
    animate: {
      y: [0, -20, 0],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div 
      className="v2-error-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="v2-error-wrapper">
        
        {/* KHU VỰC HÌNH ẢNH (BẮT MẮT) */}
        <div className="v2-image-section">
          {/* Layer 1: Background Blur */}
          <div className="bg-blur-circle"></div>

          {/* Layer 2: Main Illustration với Parallax */}
          <motion.div 
            className="main-illustration"
            style={{ x: moveX, y: moveY }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.6, 0.05, -0.01, 0.9] }}
          >
            <img src={illustration} alt="404 - Trang không tìm thấy" />
          </motion.div>

          {/* Layer 3: Các phần tử trang trí trôi nổi */}
          <motion.div 
            className="decor-element star-1" 
            variants={floatingAnimation} 
            animate="animate"
          />
          <motion.div 
            className="decor-element dot-1"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div className="decor-element circle-1" />
        </div>

        {/* KHU VỰC NỘI DUNG */}
        <motion.div 
          className="v2-text-section"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
        >
          <div className="code-label">404 LỖI</div>
          <h2>Bạn đã lạc vào <br /> hư không</h2>
          <p>
            Trang bạn đang cố truy cập không tồn tại hoặc đã bị di dời.
            Hãy quay về nơi bạn bắt đầu hoặc khám phá các danh mục khác nhé.
          </p>

          <div className="v2-actions">
            <Link to="/" className="btn-v2-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Quay lại trang chủ
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default NotFound;