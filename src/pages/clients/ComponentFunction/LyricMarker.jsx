import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';

const LyricMarker = () => {
  const audioUrl = useSelector((state) => state.textEffect.audioUrl);
  const containerRef = useRef();
  const waveSurferRef = useRef(null);
  const fps = useSelector((state) => state.public.frame || 30);

  const [rawLyrics, setRawLyrics] = useState("");
  const [words, setWords] = useState([]);
  const [markedLyrics, setMarkedLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isTrackingWord, setIsTrackingWord] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a4a4a',
      progressColor: '#00d1b2',
      height: 80,
      responsive: true,
    });
    waveSurferRef.current = ws;
    ws.load(audioUrl);
    return () => ws.destroy();
  }, [audioUrl]);

  const handleLyricsChange = (e) => {
    const text = e.target.value;
    setRawLyrics(text);
    const splitWords = text.trim().split(/\s+/).map(w => ({ word: w, start: 0, end: 0 }));
    setWords(splitWords);
    setMarkedLyrics([]);
    setCurrentIndex(0);
    setIsStarted(false);
    setShowEditor(false);
  };

  useEffect(() => {
    const ws = waveSurferRef.current;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && isStarted && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const currentTimeFrame = ws.getCurrentTime();
        if (!isTrackingWord) {
          if (currentIndex < words.length) {
            const newWord = { ...words[currentIndex], start: currentTimeFrame };
            setMarkedLyrics(prev => [...prev, newWord]);
            setIsTrackingWord(true);
          }
        } else {
          setMarkedLyrics(prev => {
            const updated = [...prev];
            if (updated[currentIndex]) {
              updated[currentIndex].end = currentTimeFrame;
            }
            return updated;
          });
          setIsTrackingWord(false);
          setCurrentIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isTrackingWord, currentIndex, words, fps]);

  const startMarking = () => {
    if (words.length === 0) return alert("Vui lòng nhập lyrics!");
    setIsStarted(true);
    setCurrentIndex(0);
    setMarkedLyrics([]);
    setIsTrackingWord(false);
    setShowEditor(false);
    waveSurferRef.current.play();
  };

  const stopMusic = () => {
    waveSurferRef.current.stop();
    setIsStarted(false);
  };

  const changeSpeed = (speed) => {
    setPlaybackRate(speed);
    waveSurferRef.current.setPlaybackRate(speed);
  };

  const handleExport = () => {
    setShowEditor(true);
    console.log("Exported Data:", markedLyrics);
  };

  const updateMarkedWord = (index, field, value) => {
    const updated = [...markedLyrics];
    updated[index][field] = Number(value);
    setMarkedLyrics(updated);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h2>Lyric Marker Pro</h2>
      
      <textarea
        placeholder="Dán lời bài hát vào đây..."
        style={{ width: '100%', height: '80px', marginBottom: '10px', padding: '10px', borderRadius: '4px' }}
        value={rawLyrics}
        onChange={handleLyricsChange}
        disabled={isStarted}
      />

      <div ref={containerRef} style={{ marginBottom: '15px', background: '#000', borderRadius: '8px' }} />

      {/* Điều khiển tốc độ và nhạc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', background: '#222', padding: '10px', borderRadius: '8px' }}>
        <span>Tốc độ: <strong>{playbackRate}x</strong></span>
        <input 
          type="range" min="0.5" max="2" step="0.1" 
          value={playbackRate} 
          onChange={(e) => changeSpeed(parseFloat(e.target.value))} 
        />
        <button onClick={() => waveSurferRef.current.playPause()} style={btnStyle}>Play/Pause</button>
        <button onClick={stopMusic} style={{...btnStyle, backgroundColor: '#ff3860'}}>Stop</button>
      </div>

      <div style={{ padding: '15px', background: '#333', marginBottom: '20px', borderRadius: '8px' }}>
        <p style={{ color: isStarted ? '#48c774' : '#ffdd57', marginTop: 0 }}>
           Trạng thái: <strong>{isStarted ? (isTrackingWord ? "ĐANG CHỜ NHẤN END..." : "ĐANG CHỜ NHẤN START...") : "SẴN SÀNG"}</strong>
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {words.map((item, idx) => (
            <span key={idx} style={{ 
                color: idx < currentIndex ? '#00d1b2' : idx === currentIndex ? '#ffdd57' : '#666',
                fontWeight: idx === currentIndex ? 'bold' : 'normal',
                textDecoration: idx === currentIndex && isTrackingWord ? 'underline' : 'none'
            }}>
              {item.word}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {!isStarted ? (
          <button onClick={startMarking} style={{...btnStyle, backgroundColor: '#00d1b2'}}>Bắt đầu ghi (Space)</button>
        ) : (
          <button onClick={() => setIsStarted(false)} style={{...btnStyle, backgroundColor: '#f14668'}}>Tạm dừng ghi</button>
        )}
        <button onClick={handleExport} style={{...btnStyle, backgroundColor: '#48c774'}}>Export & Edit</button>
      </div>

      {/* Bảng chỉnh sửa sau khi Export */}
      {showEditor && (
        <div style={{ marginTop: '30px', borderTop: '1px solid #444', paddingTop: '20px' }}>
          <h3>Danh sách chữ và Thời gian (Frames)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {markedLyrics.map((item, idx) => (
              <div key={idx} style={{ background: '#2c2c2c', padding: '10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <strong style={{ color: '#00d1b2' }}>{item.word}</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label size="small">S:</label>
                  <input 
                    type="number" 
                    value={item.start} 
                    onChange={(e) => updateMarkedWord(idx, 'start', e.target.value)}
                    style={inputStyle}
                  />
                  <label size="small">E:</label>
                  <input 
                    type="number" 
                    value={item.end} 
                    onChange={(e) => updateMarkedWord(idx, 'end', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => console.log("Final Data:", markedLyrics)} 
            style={{...btnStyle, backgroundColor: '#209cee', marginTop: '20px'}}
          >
            Log Dữ liệu cuối cùng
          </button>
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  padding: '8px 16px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 'bold',
  color: '#fff',
  backgroundColor: '#4a4a4a'
};

const inputStyle = {
  width: '60px',
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: '3px',
  padding: '2px 5px'
};

export default LyricMarker;