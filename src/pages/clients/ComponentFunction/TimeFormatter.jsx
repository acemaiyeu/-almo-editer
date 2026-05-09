import React from 'react';

const TimeFormatter = ({ seconds }) => {
  const formatTime = (totalSeconds) => {
    // 1. Làm tròn số giây và xử lý trường hợp số âm
    const total = Math.max(0, Math.floor(totalSeconds));

    // 2. Tính toán phút và giây
    const minutes = Math.floor(total / 60);
    const secs = total % 60;

    // 3. Chuyển sang chuỗi và thêm số 0 ở đầu nếu cần
    const displayMinutes = String(minutes).padStart(2, '0');
    const displaySeconds = String(secs).padStart(2, '0');

    return `${displayMinutes}:${displaySeconds}`;
  };

  return (
    <span className="time-display">
      {formatTime(seconds)}
    </span>
  );
};

export default TimeFormatter;