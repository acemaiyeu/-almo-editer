import React, { useState } from 'react';
import '../../style/ZoomableImage.scss'
const ZoomableImageWithModal = ({ imageUrl, altText = 'Zoomable image' }) => {
  // Trạng thái để kiểm soát Modal có đang mở hay không
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hàm mở Modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Hàm đóng Modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="image-zoom-component">
      {/* 1. Hình ảnh bình thường */}
      <div className="image-thumbnail-container" onClick={openModal}>
        <img 
          src={imageUrl} 
          alt={altText} 
          className="image-thumbnail" 
        />
        {/* Hiệu ứng khung và icon khi hover */}
        <div className="hover-overlay">
          <span className="zoom-icon">&#128269;</span> {/* Biểu tượng kính lúp */}
        </div>
      </div>

      {/* 2. Modal/Popup phóng to (chỉ hiển thị khi isModalOpen là true) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Nút đóng */}
            <button className="close-button" onClick={closeModal}>&times;</button>
            {/* Hình ảnh phóng to */}
            <img src={imageUrl} alt={`${altText} zoomed`} className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomableImageWithModal;