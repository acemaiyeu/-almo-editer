import React, { useState, useRef, useEffect } from 'react';

const Mp4KaraokePlayer = () => {
  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'maker'
  const [videoSrc, setVideoSrc] = useState(null);
  const [lyricsData, setLyricsData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef(null);

  // Nạp Video MP4
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };

  // Nạp File JSON Lời
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) setLyricsData(parsed);
        } catch (err) {
          alert('File JSON không hợp lệ!');
        }
      };
      reader.readAsText(file);
    }
  };

  // Xuất file JSON
  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lyricsData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "karaoke_lyrics.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={containerStyle}>
      {/* Thanh điều hướng Chức năng */}
      <div style={navTabStyle}>
        <button 
          style={{ ...tabButtonStyle, backgroundColor: activeTab === 'player' ? '#ff0055' : '#333' }}
          onClick={() => setActiveTab('player')}
        >
          🎤 Màn Hình Hát Karaoke
        </button>
        <button 
          style={{ ...tabButtonStyle, backgroundColor: activeTab === 'maker' ? '#ff0055' : '#333' }}
          onClick={() => setActiveTab('maker')}
        >
          🛠️ Tool Làm Lời & Timing
        </button>
      </div>

      {/* Control Nạp Media */}
      <div style={toolbarStyle}>
        <label style={buttonStyle}>
          📹 Tải Video MP4
          <input type="file" accept="video/mp4" hidden onChange={handleVideoUpload} />
        </label>
        <label style={buttonStyle}>
          📂 Tải JSON Lời
          <input type="file" accept=".json" hidden onChange={handleJsonUpload} />
        </label>
        {lyricsData.length > 0 && (
          <button style={{ ...buttonStyle, backgroundColor: '#28a745' }} onClick={exportJson}>
            💾 Tải JSON Về
          </button>
        )}
      </div>

      {/* TAB 1: PLAYER */}
      {activeTab === 'player' && (
        <KaraokePlayer 
          videoSrc={videoSrc}
          lyricsData={lyricsData}
          videoRef={videoRef}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      )}

      {/* TAB 2: TOOL LÀM LỜI */}
      {activeTab === 'maker' && (
        <LyricMaker 
          videoSrc={videoSrc}
          lyricsData={lyricsData}
          setLyricsData={setLyricsData}
          videoRef={videoRef}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
        />
      )}
    </div>
  );
};

/* ==========================================
   1. COMPONENT PLAYER (HIỂN THỊ KHI HÁT)
   ========================================== */
const KaraokePlayer = ({ videoSrc, lyricsData, videoRef, currentTime, setCurrentTime, isPlaying, setIsPlaying }) => {
  const [countdown, setCountdown] = useState(null);

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  // Xác định câu hiện tại
  const activeIndex = lyricsData.findIndex(
    (item) => currentTime >= item.start && currentTime <= item.end
  );

  let line1 = null;
  let line2 = null;

  if (activeIndex !== -1) {
    if (activeIndex % 2 === 0) {
      line1 = { ...lyricsData[activeIndex], isActive: true };
      line2 = lyricsData[activeIndex + 1] ? { ...lyricsData[activeIndex + 1], isActive: false } : null;
    } else {
      line1 = lyricsData[activeIndex - 1] ? { ...lyricsData[activeIndex - 1], isActive: false } : null;
      line2 = { ...lyricsData[activeIndex], isActive: true };
    }
  } else {
    const nextIndex = lyricsData.findIndex((item) => item.start > currentTime);
    if (nextIndex !== -1) {
      if (nextIndex % 2 === 0) {
        line1 = { ...lyricsData[nextIndex], isActive: false };
        line2 = lyricsData[nextIndex + 1] ? { ...lyricsData[nextIndex + 1], isActive: false } : null;
      } else {
        line1 = lyricsData[nextIndex - 1] ? { ...lyricsData[nextIndex - 1], isActive: false } : null;
        line2 = { ...lyricsData[nextIndex], isActive: false };
      }
    }
  }

  // Đếm ngược 4s
  useEffect(() => {
    if (lyricsData.length === 0) return;
    const nextLyric = lyricsData.find((item) => item.start > currentTime);
    if (nextLyric) {
      const timeDiff = nextLyric.start - currentTime;
      if (timeDiff <= 4 && timeDiff > 0) {
        setCountdown(Math.ceil(timeDiff));
      } else {
        setCountdown(null);
      }
    } else {
      setCountdown(null);
    }
  }, [currentTime, lyricsData]);

  return (
    <div style={playerContainerStyle}>
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onTimeUpdate={handleTimeUpdate}
          onClick={() => {
            if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
            else { videoRef.current.play(); setIsPlaying(true); }
          }}
        />
      ) : (
        <div style={emptyVideoStyle}>Vui lòng nạp Video MP4 ở trên</div>
      )}

      {/* Đếm ngược */}
      {countdown && (
        <div style={countdownStyle}>
          {[1, 2, 3, 4].map((dot) => (
            <div key={dot} style={{
              ...dotStyle,
              backgroundColor: dot <= countdown ? '#ff0055' : 'rgba(255,255,255,0.3)',
              boxShadow: dot <= countdown ? '0 0 12px #ff0055' : 'none'
            }} />
          ))}
        </div>
      )}

      {/* Chữ Karaoke 2 dòng */}
      <div style={overlayLyricsStyle}>
        <div style={{ textAlign: 'left', width: '100%' }}>
          {line1 && <KaraokeLine line={line1} currentTime={currentTime} align="left" />}
        </div>
        <div style={{ textAlign: 'right', width: '100%' }}>
          {line2 && <KaraokeLine line={line2} currentTime={currentTime} align="right" />}
        </div>
      </div>
    </div>
  );
};

// Component vẽ câu chữ và quét màu theo từng từ + giới tính
const KaraokeLine = ({ line, currentTime, align }) => {
  const getActiveColor = (gender) => {
    if (gender === 'nam') return '#00d2ff'; // Xanh dương
    if (gender === 'nu') return '#ff2a75';  // Đỏ hồng
    return '#ffcc00';                       // Vàng (mặc định/song ca)
  };

  const activeColor = getActiveColor(line.gender);

  return (
    <div style={{ display: 'inline-block', textAlign: align }}>
      {line.words && line.words.length > 0 ? (
        line.words.map((w, idx) => {
          let fillPercent = 0;
          if (currentTime >= w.end) fillPercent = 100;
          else if (currentTime > w.start && currentTime < w.end) {
            fillPercent = ((currentTime - w.start) / (w.end - w.start)) * 100;
          }

          return (
            <span
              key={idx}
              style={{
                display: 'inline-block',
                fontSize: '34px',
                fontWeight: '900',
                marginRight: '8px',
                textTransform: 'uppercase',
                WebkitTextStroke: '1.5px #000',
                textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                backgroundImage: `linear-gradient(to right, ${activeColor} ${fillPercent}%, #ffffff ${fillPercent}%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {w.word}
            </span>
          );
        })
      ) : (
        <span style={{
          fontSize: '34px', fontWeight: '900', textTransform: 'uppercase',
          WebkitTextStroke: '1.5px #000', color: line.isActive ? activeColor : '#fff'
        }}>
          {line.text}
        </span>
      )}
    </div>
  );
};

/* ==========================================
   2. COMPONENT TOOL LÀM LỜI & TIMING
   ========================================== */
const LyricMaker = ({ videoSrc, lyricsData, setLyricsData, videoRef, currentTime, setCurrentTime }) => {
  const [rawText, setRawText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const [startTimeTemp, setStartTimeTemp] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Nhập văn bản thô
  const handleParseRawText = () => {
    const lines = rawText.split('\n').filter(l => l.trim() !== '');
    const formatted = lines.map((line, idx) => ({
      id: idx,
      text: line.trim(),
      start: 0,
      end: 0,
      gender: 'nam',
      words: line.trim().split(/\s+/).map(w => ({ word: w, start: 0, end: 0 }))
    }));
    setLyricsData(formatted);
    setCurrentIndex(0);
  };

  // Đổi tốc độ phát video
  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Logic Bấm Space 2 Lần để lưu mốc câu & chia sub từng từ
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (lyricsData.length === 0 || currentIndex >= lyricsData.length) return;

        const now = videoRef.current ? videoRef.current.currentTime : currentTime;

        if (!isMarking) {
          // Bấm Lần 1: Lưu mốc bắt đầu câu
          setStartTimeTemp(now);
          setIsMarking(true);
        } else {
          // Bấm Lần 2: Lưu mốc kết thúc câu -> Tự chia đều cho từng từ -> Lưu & Chuyển câu tiếp
          const endTime = now;
          const updated = [...lyricsData];
          const item = { ...updated[currentIndex] };
          item.start = startTimeTemp;
          item.end = endTime;

          const duration = endTime - startTimeTemp;
          const wordCount = item.words.length;
          const step = duration > 0 && wordCount > 0 ? duration / wordCount : 0;

          item.words = item.words.map((w, idx) => ({
            ...w,
            start: startTimeTemp + idx * step,
            end: startTimeTemp + (idx + 1) * step
          }));

          updated[currentIndex] = item;
          setLyricsData(updated);
          setIsMarking(false);
          setCurrentIndex(prev => prev + 1); // Tự động nhảy sang câu kế tiếp
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMarking, currentIndex, lyricsData, startTimeTemp, currentTime]);

  const updateLineProps = (index, key, value) => {
    const updated = [...lyricsData];
    updated[index][key] = value;
    setLyricsData(updated);
  };

  const updateWordProps = (lineIndex, wordIndex, key, value) => {
    const updated = [...lyricsData];
    updated[lineIndex].words[wordIndex][key] = parseFloat(value) || 0;
    setLyricsData(updated);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
      {/* Cột trái: Player + Điều khiển Tốc độ + Bảng Space */}
      <div>
        <div style={{ ...playerContainerStyle, height: '300px' }}>
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            />
          ) : (
            <div style={emptyVideoStyle}>Vui lòng nạp Video MP4</div>
          )}
        </div>

        {/* Bảng chỉnh tốc độ video */}
        <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚡ Tốc độ phát:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                style={{
                  ...buttonStyle,
                  backgroundColor: playbackRate === speed ? '#ff0055' : '#333',
                  padding: '4px 10px'
                }}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Trạng thái Bấm Space */}
        <div style={panelStyle}>
          <h3>🎹 Canh Timing bằng Space (2 Lần/Câu)</h3>
          <p>Trạng thái: <b>{isMarking ? '🔴 Đang trong câu (Bấm Space lần 2 để DỪNG & LƯU)' : '⚪ Chờ (Bấm Space lần 1 để BẮT ĐẦU)'}</b></p>
          <p>Câu đang chọn ({currentIndex + 1}/{lyricsData.length}):</p>
          <div style={highlightBoxStyle}>
            {lyricsData[currentIndex] ? lyricsData[currentIndex].text : 'Đã hoàn thành tất cả các câu!'}
          </div>
        </div>

        {/* Nhập văn bản thô ban đầu */}
        <div style={panelStyle}>
          <h4>📝 Nhập văn bản bài hát (Mỗi câu 1 dòng):</h4>
          <textarea
            rows="5"
            style={{ width: '100%', backgroundColor: '#222', color: '#fff', padding: '8px' }}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Dán lời bài hát vào đây..."
          />
          <button style={{ ...buttonStyle, marginTop: '8px' }} onClick={handleParseRawText}>
            Tạo danh sách câu
          </button>
        </div>
      </div>

      {/* Cột phải: Danh sách câu & Chi tiết từ */}
      <div style={{ ...panelStyle, maxHeight: '680px', overflowY: 'auto' }}>
        <h3>⚙️ Danh Sách Câu & Chỉnh Chi Tiết Từng Chữ</h3>
        {lyricsData.map((item, lIdx) => (
          <div 
            key={item.id} 
            style={{ 
              ...lineCardStyle, 
              borderColor: lIdx === currentIndex ? '#ff0055' : '#444',
              backgroundColor: lIdx === currentIndex ? '#2f1a24' : '#252525'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Câu {lIdx + 1}: {item.text}</strong>
              <select
                value={item.gender || 'nam'}
                onChange={(e) => updateLineProps(lIdx, 'gender', e.target.value)}
                style={selectStyle}
              >
                <option value="nam">👦 Nam (Xanh)</option>
                <option value="nu">👧 Nữ (Đỏ)</option>
                <option value="duet">👩‍❤️‍👨 Song ca (Vàng)</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
              Thời gian câu: {item.start.toFixed(2)}s ➔ {item.end.toFixed(2)}s
            </div>

            {/* Chỉnh mốc thời gian từng từ */}
            <details style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
              <summary style={{ cursor: 'pointer', color: '#00d2ff', fontSize: '13px' }}>
                ✏️ Chi tiết từng từ ({item.words.length} từ)
              </summary>
              <div style={{ marginTop: '8px' }}>
                {item.words.map((w, wIdx) => (
                  <div key={wIdx} style={wordRowStyle}>
                    <span style={{ width: '70px', fontWeight: 'bold' }}>{w.word}</span>
                    <label>Start: </label>
                    <input
                      type="number"
                      step="0.05"
                      style={numberInputStyle}
                      value={w.start}
                      onChange={(e) => updateWordProps(lIdx, wIdx, 'start', e.target.value)}
                    />
                    <label>End: </label>
                    <input
                      type="number"
                      step="0.05"
                      style={numberInputStyle}
                      value={w.end}
                      onChange={(e) => updateWordProps(lIdx, wIdx, 'end', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================
   3. STYLES (GIAO DIỆN)
   ========================================== */
const containerStyle = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '15px',
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#121212',
  color: '#fff',
  minHeight: '100vh'
};

const navTabStyle = {
  display: 'flex',
  gap: '10px',
  marginBottom: '15px'
};

const tabButtonStyle = {
  padding: '10px 20px',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const toolbarStyle = {
  display: 'flex',
  gap: '10px',
  marginBottom: '15px',
  backgroundColor: '#1e1e1e',
  padding: '10px',
  borderRadius: '8px'
};

const buttonStyle = {
  background: '#333',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  border: '1px solid #555'
};

const playerContainerStyle = {
  position: 'relative',
  width: '100%',
  height: '480px',
  backgroundColor: '#000',
  borderRadius: '12px',
  overflow: 'hidden'
};

const emptyVideoStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#666'
};

const countdownStyle = {
  position: 'absolute',
  top: '25%',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '15px',
  zIndex: 5
};

const dotStyle = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  transition: 'all 0.2s ease'
};

const overlayLyricsStyle = {
  position: 'absolute',
  bottom: '30px',
  left: '30px',
  right: '30px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  zIndex: 5,
  pointerEvents: 'none'
};

const panelStyle = {
  backgroundColor: '#1e1e1e',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '15px'
};

const highlightBoxStyle = {
  backgroundColor: '#2a2a2a',
  padding: '12px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#ffcc00',
  borderRadius: '6px'
};

const lineCardStyle = {
  border: '1px solid #444',
  padding: '10px',
  borderRadius: '6px',
  marginBottom: '10px',
  transition: 'all 0.2s ease'
};

const wordRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '5px',
  fontSize: '12px'
};

const numberInputStyle = {
  width: '65px',
  backgroundColor: '#333',
  color: '#fff',
  border: '1px solid #555',
  padding: '3px',
  borderRadius: '4px'
};

const selectStyle = {
  backgroundColor: '#333',
  color: '#fff',
  border: '1px solid #555',
  padding: '4px 8px',
  borderRadius: '4px'
};

export default Mp4KaraokePlayer;