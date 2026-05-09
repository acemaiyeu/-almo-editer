import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ startTime, endTime }) => {
  const [displayData, setDisplayData] = useState({
    status: 'IDLE',
    timeLeft: null
  });

  useEffect(() => {
    const calculateStatus = () => {
      const now = new Date().getTime();
      // Chuyển đổi format date để tương thích tốt hơn trên các trình duyệt
      const start = new Date(startTime.replace(' ', 'T')).getTime();
      const end = new Date(endTime.replace(' ', 'T')).getTime();

      if (now > end) {
        return { status: 'EXPIRED', timeLeft: null };
      }

      if (now >= start && now <= end) {
        return { status: 'RUNNING', timeLeft: null };
      }

      const diff = start - now;
      
      // LOGIC MỚI: Tách thêm đơn vị Ngày (days)
      return {
        status: 'COUNTING',
        timeLeft: {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        }
      };
    };

    setDisplayData(calculateStatus());
    const timer = setInterval(() => setDisplayData(calculateStatus()), 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  const containerStyle = {
    color: '#f7175a',
    fontWeight: 'bold',
    padding: '10px 15px',
    borderRadius: '6px',
    display: 'inline-block',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  if (displayData.status === 'RUNNING') return null;

  if (displayData.status === 'EXPIRED') {
    return (
      <div style={{ ...containerStyle, opacity: 0.7, color: '#666' }}>
        Sự kiện đã kết thúc
      </div>
    );
  }

  // Render logic linh hoạt
  const { days, hours, minutes, seconds } = displayData.timeLeft || {};

  return (
    <div style={containerStyle}>
      Sự kiện sẽ bắt đầu sau{' '}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {/* Chỉ hiện "Ngày" nếu days > 0 */}
        {days > 0 && `${days} ngày `}
        {hours} giờ {minutes} phút {seconds} giây
      </span>
    </div>
  );
};

export default CountdownTimer;