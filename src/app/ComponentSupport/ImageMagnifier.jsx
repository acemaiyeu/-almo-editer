import React, { useState } from 'react';
import '../../style/ImageMagnifier.css'

// Các props truyền vào:
// src: URL hình ảnh gốc
// width, height: Kích thước hiển thị của ảnh gốc trên trang web
// magnifierHeight, magnifierWidth: Kích thước của "vùng kính lúp" phóng to
// zoomLevel: Độ phóng to (ví dụ: 2 là phóng to gấp đôi)
const ImageMagnifier = ({
  src,
  width = "100%",
  height = "auto",
  magnifierHeight = 150,
  magnifierWidth = 150,
  zoomLevel = 2.5,
}) => {
  const [[x, y], setXY] = useState([0, 0]);
  const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
  const [showMagnifier, setShowMagnifier] = useState(false);

  const handleMouseEnter = (e) => {
    const elem = e.currentTarget;
    const { width, height } = elem.getBoundingClientRect();
    setSize([width, height]);
    setShowMagnifier(true);
  };

  const handleMouseMove = (e) => {
    const elem = e.currentTarget;
    const { top, left } = elem.getBoundingClientRect();

    // Tính toán tọa độ chuột
    const x = e.pageX - left - window.pageXOffset;
    const y = e.pageY - top - window.pageYOffset;
    setXY([x, y]);
  };

  return (
    <div className="magnifier-container" style={{ height, width }}>
      <img
        src={src}
        className="magnifier-image"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowMagnifier(false)}
        alt="Magnifier Target"
        style={{ width: "100%", height: "100%" }}
      />

      <div
        className={`magnifier-lens ${showMagnifier ? 'visible' : ''}`}
        style={{
          height: `${magnifierHeight}px`,
          width: `${magnifierWidth}px`,
          top: `${y - magnifierHeight / 2}px`,
          left: `${x - magnifierWidth / 2}px`,
          backgroundImage: `url('${src}')`,
          backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
          backgroundPosition: `${-x * zoomLevel + magnifierWidth / 2}px ${-y * zoomLevel + magnifierHeight / 2}px`,
        }}
      />
    </div>
  );
};

export default ImageMagnifier;