import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import { X, Play, Pause, Music, Upload, FastForward, Info, Clock } from 'lucide-react';

const LyricsSubMarker = ({ isOpen, onClose, onApply }) => {
  // Lấy audioUrl từ Redux hoặc local file
  const reduxAudioUrl = useSelector((state) => state.textEffect.audioUrl);
  const [localAudioUrl, setLocalAudioUrl] = useState(null);
  const audioUrl = reduxAudioUrl || localAudioUrl;

  const containerRef = useRef();
  const waveSurferRef = useRef(null);
  const fileInputRef = useRef();

  const [rawLyrics, setRawLyrics] = useState("");
  const [words, setWords] = useState([]);
  const [markedLyrics, setMarkedLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isTrackingWord, setIsTrackingWord] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [mode, setMode] = useState('input'); // 'input' | 'marking' | 'edit'

  const mainColor = 'var(--color-main, #7c3aed)';

  // Hàm format thời gian (00:00.00)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${millis < 10 ? '0' : ''}${millis}`;
  };

  // Khởi tạo WaveSurfer
  useEffect(() => {
    if (!isOpen || !containerRef.current || !audioUrl) return;

    if (waveSurferRef.current) waveSurferRef.current.destroy();

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#444',
      progressColor: mainColor,
      cursorColor: '#fff',
      cursorWidth: 2,
      height: 100, // Tăng chiều cao để soi sóng nhạc dễ hơn
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      responsive: true,
      normalize: true,
    });

    waveSurferRef.current = ws;
    ws.load(audioUrl);
    ws.setPlaybackRate(playbackRate);

    // Cập nhật thời gian thực tế khi nhạc chạy
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));

    return () => ws.destroy();
  }, [isOpen, audioUrl]);

  // Xử lý phím Space để bắt điểm sub
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isStarted || mode !== 'marking') return;
      if (e.code === 'Space') {
        e.preventDefault();
        const time = waveSurferRef.current.getCurrentTime();
        if (!isTrackingWord) {
          if (currentIndex < words.length) {
            setMarkedLyrics(prev => [...prev, { ...words[currentIndex], start: time, end: time + 0.1 }]);
            setIsTrackingWord(true);
          }
        } else {
          setMarkedLyrics(prev => {
            const updated = [...prev];
            if (updated[currentIndex]) updated[currentIndex].end = time;
            return updated;
          });
          setIsTrackingWord(false);
          setCurrentIndex(prev => prev + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isTrackingWord, currentIndex, words, mode]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalAudioUrl(url);
    }
  };

  const handleStartMarking = () => {
    if (!audioUrl) return alert("Vui lòng tải nhạc lên trước!");
    if (!rawLyrics.trim()) return alert("Vui lòng nhập lyrics!");
    
    const splitWords = rawLyrics.trim().split(/\s+/).map(w => ({ word: w, start: 0, end: 0 }));
    setWords(splitWords);
    setMarkedLyrics([]);
    setCurrentIndex(0);
    setIsTrackingWord(false);
    setIsStarted(true);
    setMode('marking');
    waveSurferRef.current.seekTo(0);
    waveSurferRef.current.play();
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: '600' }}>
            <Music size={18} color={mainColor} />
            Lyric Marker Pro
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {/* Audio Waveform Section */}
        <div style={audioSlotStyle}>
          {!audioUrl ? (
            <div style={uploadPlaceholderStyle} onClick={() => fileInputRef.current.click()}>
              <Upload size={24} />
              <span>Chưa có nhạc. Nhấn để tải file (.mp3, .wav)</span>
            </div>
          ) : (
            <div style={{ width: '100%', position: 'relative' }}>
              <div ref={containerRef} style={{ cursor: 'pointer' }} />
              <div style={timeIndicatorStyle}>
                <Clock size={12} /> {formatTime(currentTime)}
              </div>
            </div>
          )}
          <input type="file" ref={fileInputRef} hidden accept="audio/*" onChange={handleFileUpload} />
        </div>

        {/* Toolbar: Speed Slider & Tabs */}
        <div style={toolbarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <button onClick={() => waveSurferRef.current?.playPause()} style={playBtnStyle}>
              <Play size={14} fill="currentColor" />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '220px' }}>
              <FastForward size={14} color="#888" />
              <span style={{ fontSize: '11px', color: '#fff', minWidth: '35px' }}>{playbackRate.toFixed(2)}x</span>
              <input 
                type="range" min="0.1" max="2.0" step="0.05"
                value={playbackRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPlaybackRate(val);
                  waveSurferRef.current?.setPlaybackRate(val);
                }}
                style={sliderStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {['input', 'marking', 'edit'].map((m) => (
              <button 
                key={m} onClick={() => setMode(m)}
                style={modeTabStyle(mode === m, mainColor)}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div style={bodyStyle}>
          {mode === 'input' && (
            <textarea
              placeholder="Dán lời bài hát vào đây..."
              style={textareaStyle}
              value={rawLyrics}
              onChange={(e) => setRawLyrics(e.target.value)}
            />
          )}

          {mode === 'marking' && (
            <div style={{ textAlign: 'center' }}>
              <div style={tipStyle}>
                <Info size={12} /> Nhấn <b>Space</b> để bắt đầu/kết thúc từ. Click vào sóng nhạc để tua.
              </div>
              <div style={wordsGridStyle}>
                {words.map((item, idx) => (
                  <span key={idx} style={wordItemStyle(idx, currentIndex, isTrackingWord, mainColor)}>
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <div style={editGridStyle}>
              {markedLyrics.map((item, idx) => (
                <div key={idx} style={editCardStyle}>
                  <div style={{ fontSize: '13px', color: mainColor, fontWeight: '600', marginBottom: '5px' }}>{item.word}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input 
                      type="number" step="0.01" value={item.start.toFixed(3)}
                      onChange={(e) => {
                        const updated = [...markedLyrics];
                        updated[idx].start = parseFloat(e.target.value);
                        setMarkedLyrics(updated);
                      }}
                      style={editInputStyle} 
                    />
                    <input 
                      type="number" step="0.01" value={item.end.toFixed(3)}
                      onChange={(e) => {
                        const updated = [...markedLyrics];
                        updated[idx].end = parseFloat(e.target.value);
                        setMarkedLyrics(updated);
                      }}
                      style={editInputStyle} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Đóng</button>
          <button 
            onClick={mode === 'input' ? handleStartMarking : () => onApply(markedLyrics)} 
            style={applyBtnStyle(mainColor)}
          >
            {mode === 'input' ? 'Bắt đầu ghi' : 'Áp dụng dữ liệu'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px' };
const modalContentStyle = { background: '#121212', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', border: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const headerStyle = { padding: '14px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const audioSlotStyle = { padding: '30px 20px 20px 20px', background: '#000', minHeight: '150px', display: 'flex', alignItems: 'center' };
const uploadPlaceholderStyle = { color: '#555', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', border: '2px dashed #222', width: '100%', padding: '30px', borderRadius: '8px' };
const timeIndicatorStyle = { position: 'absolute', top: '-25px', right: 0, color: '#888', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px' };
const toolbarStyle = { padding: '10px 20px', background: '#181818', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sliderStyle = { flex: 1, cursor: 'pointer', accentColor: '#7c3aed' };
const bodyStyle = { flex: 1, overflow: 'auto', padding: '20px', minHeight: '300px' };
const textareaStyle = { width: '100%', height: '250px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '15px', fontSize: '14px', outline: 'none', resize: 'none' };
const tipStyle = { color: '#666', fontSize: '11px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' };
const wordsGridStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center' };
const editGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' };
const editCardStyle = { background: '#1a1a1a', padding: '10px', borderRadius: '6px', border: '1px solid #222' };
const editInputStyle = { width: '100%', background: '#000', border: '1px solid #333', color: '#00ff00', fontSize: '11px', padding: '4px', borderRadius: '3px', fontFamily: 'monospace' };
const footerStyle = { padding: '15px 20px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'flex-end', gap: '10px' };

const wordItemStyle = (idx, current, isTracking, color) => ({
  fontSize: '18px',
  color: idx < current ? color : idx === current ? '#fff' : '#333',
  fontWeight: idx === current ? '700' : '400',
  textDecoration: idx === current && isTracking ? `underline 2px ${color}` : 'none',
  padding: '4px 8px',
  transition: 'all 0.1s ease'
});

const modeTabStyle = (active, color) => ({
  background: active ? color : 'transparent',
  color: active ? '#fff' : '#555',
  border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
});

const playBtnStyle = { background: '#7c3aed', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' };
const closeBtnStyle = { background: 'none', border: 'none', color: '#555', cursor: 'pointer' };
const btnBase = { padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: 'none', fontWeight: '600' };
const cancelBtnStyle = { ...btnBase, background: '#222', color: '#888' };
const applyBtnStyle = (color) => ({ ...btnBase, background: color, color: '#fff' });

export default LyricsSubMarker;