import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ targetNumber, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    // Tính toán số bước nhảy dựa trên thời gian (duration)
    // targetNumber càng lớn, mỗi bước nhảy sẽ lớn hơn để kịp thời gian
    const increment = targetNumber / (duration / 16); 

    const handleCounter = () => {
      start += increment;
      if (start < targetNumber) {
        setCount(Math.floor(start));
        requestAnimationFrame(handleCounter);
      } else {
        setCount(targetNumber); // Đảm bảo số cuối cùng khớp chính xác
      }
    };

    handleCounter();

    // Cleanup nếu component bị unmount
    return () => cancelAnimationFrame(handleCounter);
  }, [targetNumber, duration]);

  return (
    <span className="counter-text">
      {count.toLocaleString()}
    </span>
  );
};

export default AnimatedCounter;