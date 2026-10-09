import React, { useState, useRef, useEffect } from 'react';

const ZingMp3KaraokePlayer = ({ audioUrls, songTitle = "HÔN LỄ CỦA ANH", artist = "Tuệ Ny", bgImage = "" }) => {
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricsData, setLyricsData] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  // Tham chiếu đến tất cả các track âm thanh
  const vocalRef = useRef(null);
  const drumsRef = useRef(null);
  const bassRef = useRef(null);
  const otherRef = useRef(null);
  
  const lyricContainerRef = useRef(null);

  // Mảng chứa tất cả các audio ref hiện có để thao tác đồng bộ
  const getAllAudioRefs = () => {
    return [vocalRef.current, drumsRef.current, bassRef.current, otherRef.current].filter(Boolean);
  };

  // 1. Nạp File JSON Lời bài hát
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            const formatted = parsed.map((item, idx) => ({
              id: item.id ?? idx,
              text: item.text,
              start: parseFloat(item.startTime ?? item.start ?? 0),
              end: parseFloat(item.endTime ?? item.end ?? 0)
            }));
            setLyricsData(formatted);
            setActiveLyricIndex(-1);
          } else {
            alert('Cấu trúc file JSON không hợp lệ!');
          }
        } catch (err) {
          alert('Lỗi đọc file JSON!');
        }
      };
      reader.readAsText(file);
    }
  };

  // 2. Play / Pause phát đồng bộ TOÀN BỘ các track (Vocal, Drums, Bass, Other)
  const togglePlay = () => {
    const audios = getAllAudioRefs();
    if (audios.length === 0) return;

    if (isPlaying) {
      audios.forEach(a => a.pause());
      setIsPlaying(false);
    } else {
      audios.forEach(a => {
        a.currentTime = currentTime;
        a.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  };

  // 3. Nút Micro Karaoke (Bật/Tắt riêng tiếng Vocal, giữ nguyên Beat + Trống + Bass)
  const toggleKaraokeMode = () => {
    if (vocalRef.current) {
      vocalRef.current.volume = isKaraokeMode ? 1 : 0;
    }
    setIsKaraokeMode(!isKaraokeMode);
  };

  // 4. Logic Active Lời bài hát Realtime
  useEffect(() => {
    if (lyricsData.length === 0) return;

    let index = lyricsData.findIndex(
      (item) => currentTime >= item.start && currentTime <= item.end
    );

    if (index === -1) {
      for (let i = lyricsData.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsData[i].start) {
          index = i;
          break;
        }
      }
    }

    if (index !== -1 && index !== activeLyricIndex) {
      setActiveLyricIndex(index);
      const activeEl = document.getElementById(`lyric-line-${index}`);
      if (activeEl && lyricContainerRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyricsData, activeLyricIndex]);

  // Cập nhật thời gian thực từ 1 track chính
  const handleTimeUpdate = (e) => {
    const time = e.target.currentTime;
    setCurrentTime(time);
    if (!duration && e.target.duration) {
      setDuration(e.target.duration);
    }
  };

  // Tua nhạc qua Slider đồng bộ cho tất cả các track
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    getAllAudioRefs().forEach(a => {
      a.currentTime = seekTime;
    });
  };

  // Format mm:ss
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '420px',
      height: '780px',
      margin: '20px auto',
      borderRadius: '30px',
      overflow: 'hidden',
      backgroundColor: '#1d1229',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Roboto, sans-serif',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Background mờ */}
      {bgImage && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px) brightness(0.4)',
          zIndex: 1
        }} />
      )}

      {/* Tải ĐẦY ĐỦ các Audio Tracks */}
      {audioUrls?.vocal && <audio ref={vocalRef} src={audioUrls.vocal} />}
      {audioUrls?.drums && <audio ref={drumsRef} src={audioUrls.drums} />}
      {audioUrls?.bass && <audio ref={bassRef} src={audioUrls.bass} />}
      
      {/* Track chính dùng để lấy mốc thời gian */}
      <audio 
        ref={otherRef} 
        src={audioUrls?.other || audioUrls?.drums || audioUrls?.vocal} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      />

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
        
        {/* Header ZingMP3 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', cursor: 'pointer', opacity: 0.8 }}>❮ Danh sách</span>
          <label style={{ cursor: 'pointer', fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '12px' }}>
            📂 Nạp JSON
            <input type="file" accept=".json" hidden onChange={handleJsonUpload} />
          </label>
        </div>

        {/* Thông tin Bài hát */}
        <div style={{ textAlign: 'center', marginTop: '25px', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 5px 0', letterSpacing: '0.5px' }}>{songTitle}</h2>
          <p style={{ fontSize: '14px', color: '#b3a7c2', margin: 0 }}>{artist}</p>
        </div>

        {/* Khung hiển thị Lời chạy */}
        <div 
          ref={lyricContainerRef} 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '120px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            scrollbarWidth: 'none'
          }}
        >
          {lyricsData.length > 0 ? (
            lyricsData.map((item, idx) => {
              const isActive = idx === activeLyricIndex;
              return (
                <p
                  key={item.id ?? idx}
                  id={`lyric-line-${idx}`}
                  style={{
                    fontSize: isActive ? '22px' : '17px',
                    fontWeight: isActive ? 'bold' : '500',
                    color: isActive ? '#ffeb3b' : 'rgba(255, 255, 255, 0.45)',
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: '1.4',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    textShadow: isActive ? '0 0 15px rgba(255, 235, 59, 0.8)' : 'none'
                  }}
                >
                  {item.text}
                </p>
              );
            })
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', fontSize: '14px' }}>
              Hãy bấm "Nạp JSON" ở góc trên để nạp lời bài hát!
            </p>
          )}
        </div>

        {/* Thanh Thời gian (Progress bar) */}
        <div style={{ marginTop: 'auto', padding: '0 10px' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              accentColor: '#ffeb3b',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#b3a7c2', marginTop: '5px' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Bảng Điều khiển */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px 10px 20px' }}>
          
          {/* Nút Micro Karaoke */}
          <button
            onClick={toggleKaraokeMode}
            title={isKaraokeMode ? "Đang TẮT tiếng ca sĩ" : "Đang BẬT tiếng ca sĩ"}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: isKaraokeMode ? '#ffeb3b' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s ease',
              filter: isKaraokeMode ? 'drop-shadow(0 0 8px #ffeb3b)' : 'none'
            }}
          >
            🎤
          </button>

          {/* Lùi 10s */}
          <button 
            onClick={() => {
              const newTime = Math.max(0, currentTime - 10);
              setCurrentTime(newTime);
              getAllAudioRefs().forEach(a => a.currentTime = newTime);
            }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
          >
            ⏮
          </button>

          {/* Nút Play / Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#ffeb3b',
              color: '#000',
              fontSize: '22px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(255, 235, 59, 0.4)'
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Tiến 10s */}
          <button 
            onClick={() => {
              const newTime = Math.min(duration, currentTime + 10);
              setCurrentTime(newTime);
              getAllAudioRefs().forEach(a => a.currentTime = newTime);
            }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
          >
            ⏭
          </button>

          <span style={{ opacity: 0 }}>🎤</span>
        </div>

      </div>
    </div>
  );
};

export default ZingMp3KaraokePlayer;