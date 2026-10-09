import React, { useState, useRef, useEffect } from 'react';

const LyricMaker = ({ onExportJson }) => {
  const [mediaSrc, setMediaSrc] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [lyrics, setLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepState, setStepState] = useState('IDLE'); // 'IDLE' | 'RECORDING'

  const mediaRef = useRef(null);

  // Khi nhập xong text, chuyển thành danh sách câu
  const handleParseText = () => {
    const lines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    setLyrics(lines.map((text, id) => ({ id, text, startTime: null, endTime: null })));
    setCurrentIndex(0);
    setStepState('IDLE');
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaSrc(URL.createObjectURL(file));
    }
  };

  // Lắng nghe sự kiện phím Spacebar để sync time
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'Space' || !isSyncing || currentIndex >= lyrics.length) return;
      e.preventDefault(); // Tránh cuộn trang khi bấm Space

      const currentTime = mediaRef.current ? mediaRef.current.currentTime : 0;

      if (stepState === 'IDLE') {
        // Bấm Space lần 1: Đặt thời gian bắt đầu câu
        setLyrics(prev => prev.map((item, idx) => 
          idx === currentIndex ? { ...item, startTime: Number(currentTime.toFixed(2)) } : item
        ));
        setStepState('RECORDING');
      } else if (stepState === 'RECORDING') {
        // Bấm Space lần 2: Đặt thời gian kết thúc câu & chuyển sang câu kế
        setLyrics(prev => prev.map((item, idx) => 
          idx === currentIndex ? { ...item, endTime: Number(currentTime.toFixed(2)) } : item
        ));
        setStepState('IDLE');
        setCurrentIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSyncing, currentIndex, stepState, lyrics.length]);

  const exportJSON = () => {
    const jsonString = JSON.stringify(lyrics, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'karaoke_lyrics.json';
    a.click();
    if (onExportJson) onExportJson(lyrics);
  };

  return (
    <div style={{ padding: 20, background: '#18122B', color: '#fff', borderRadius: 12, marginTop: 20 }}>
      <h3>🛠️ TOOL TẠO LỜI KARAOKE (SPACE SYNC)</h3>
      
      <div style={{ marginBottom: 15 }}>
        <label>1. Nạp File Audio / Video: </label>
        <input type="file" accept="audio/*,video/*" onChange={handleMediaUpload} />
      </div>

      {mediaSrc && (
        <div style={{ marginBottom: 15 }}>
          <video ref={mediaRef} src={mediaSrc} controls style={{ width: '100%', maxHeight: 250, borderRadius: 8 }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h4>Dán lời bài hát vào đây (Mỗi dòng 1 câu):</h4>
          <textarea 
            rows={10} 
            value={rawText} 
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Ví dụ:&#10;Nắng ấm xa dần&#10;Rồi từng giọt mưa rơi&#10;Mây mù giăng lối..."
            style={{ width: '100%', background: '#393053', color: '#fff', border: 'none', padding: 10, borderRadius: 8 }}
          />
          <button onClick={handleParseText} style={{ marginTop: 10, padding: '8px 16px', cursor: 'pointer' }}>
            Nạp danh sách câu
          </button>
        </div>

        <div>
          <h4>Quy trình Sync (Bấm SPACE):</h4>
          <p style={{ fontSize: 13, color: '#aaa' }}>
            * <b>Space lần 1:</b> Lưu thời gian bắt đầu câu.<br/>
            * <b>Space lần 2:</b> Lưu thời gian kết thúc câu & nhảy sang câu sau.
          </p>

          <button 
            onClick={() => setIsSyncing(!isSyncing)} 
            style={{ 
              padding: '10px 20px', 
              background: isSyncing ? '#e74c3c' : '#2ecc71', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {isSyncing ? '⏸ Tắt Chế Độ Sync' : '▶ Bật Chế Độ Sync'}
          </button>

          <div style={{ marginTop: 15, maxHeight: 200, overflowY: 'auto', background: '#221551', padding: 10, borderRadius: 8 }}>
            {lyrics.map((item, idx) => (
              <div 
                key={item.id} 
                style={{ 
                  padding: 5, 
                  background: idx === currentIndex ? '#635985' : 'transparent',
                  borderRadius: 4,
                  fontWeight: idx === currentIndex ? 'bold' : 'normal'
                }}
              >
                {idx + 1}. {item.text} 
                <span style={{ fontSize: 12, color: '#00ffcc', marginLeft: 10 }}>
                  [{item.startTime ?? '--'}s - {item.endTime ?? '--'}s]
                </span>
                {idx === currentIndex && stepState === 'RECORDING' && <span style={{ color: '#ff4757', marginLeft: 8 }}>● Đang ghi...</span>}
              </div>
            ))}
          </div>

          <button 
            onClick={exportJSON} 
            disabled={lyrics.length === 0} 
            style={{ marginTop: 15, padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            📥 Xuất File JSON Lời
          </button>
        </div>
      </div>
    </div>
  );
};

export default LyricMaker;