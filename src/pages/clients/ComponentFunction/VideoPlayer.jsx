import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause, Expand, Shrink, Monitor } from 'lucide-react';
import { setValueTimeline } from '../../../app/features/timelineSlice';
import TimeFormatter from './TimeFormatter';

// Hợp phần xử lý phát Audio riêng biệt cho từng item trên Timeline
const AudioStream = ({ src, startTime, globalTime, isPlaying, duration }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    const targetTime = globalTime - startTime;

    if (isPlaying && targetTime >= 0 && targetTime <= duration) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    const targetTime = globalTime - startTime;

    if (targetTime < 0) {
      if (audioRef.current.currentTime !== 0) {
        audioRef.current.currentTime = 0;
      }
      audioRef.current.pause();
      return;
    }
    if (targetTime > duration) {
      audioRef.current.pause();
      return;
    }

    if (Math.abs(audioRef.current.currentTime - targetTime) > 0.1) {
      audioRef.current.currentTime = targetTime;
    }
  }, [globalTime, startTime, duration]);

  return <audio ref={audioRef} src={src} preload="auto" style={{ display: 'none' }} />;
};

const VideoPlayer = () => {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const { currentTime, tracks, pixelsPerSecond, isPlaying } = useSelector((state) => state.timeline);
  const { listScreen, effectGlobal } = useSelector((state) => state.public);
  const currentTimeSec = currentTime / pixelsPerSecond;

  // Khung hình mặc định
  const defaultScreen = listScreen?.find(s => s.code === 'hd (16:9)') || listScreen?.[2] || { width: 1280, height: 720, code: 'hd (16:9)' };
  const [selectedScreen, setSelectedScreen] = useState(defaultScreen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScreenMenu, setShowScreenMenu] = useState(false);

  // Tính toán tỷ lệ khung hình (width / height)
  const aspectRatio = selectedScreen.width / selectedScreen.height;
    const getRandomValue = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
  const { activeVideo, activeTexts, activeAudios } = useMemo(() => {
    let v = null, t = [], a = [], r = [];
    tracks.forEach((track) => {
      track.items.forEach((item, ind) => {
        if (currentTimeSec >= item.start && currentTimeSec <= item.start + item.duration) {
          if (item.type === 'video') v = item;
          else if (item.type === 'text' && (item.typeEffect === "random" || effectGlobal === "random") && r.findIndex((i) => i.id === ind) === -1) {
            r.push({id: ind})
            t.push({...item, randomEffect: {
                x: getRandomValue(-1000,1000),
                y: getRandomValue(-700,700)
              }});
          } 
          else if (item.type === 'text' && (item.typeEffect !== "random"  && effectGlobal !== "random")) t.push(item); 
          else if (item.type === 'audio') a.push(item);
        }
      });
    });
    return { activeVideo: v, activeTexts: t, activeAudios: a };
  }, [tracks, currentTimeSec]);

  useEffect(() => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current || !activeVideo) return;
    const targetTime = currentTimeSec - activeVideo.start;
    if (targetTime >= 0 && targetTime <= activeVideo.duration) {
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.1) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [currentTimeSec, activeVideo]);

  const toggleFullscreen = useCallback(() => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleClick = () => setShowScreenMenu(false);
    if (showScreenMenu) {
      setTimeout(() => window.addEventListener('click', handleClick), 0);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [showScreenMenu]);

  return (
    <div ref={playerContainerRef} style={styles.container(isFullscreen)}>
      {/* Vùng canvas mô phỏng khung hình CapCut */}
      <div style={styles.canvasWrapper(isFullscreen)}>
        <div style={styles.videoArea(aspectRatio)}>
          {activeVideo ? (
            <video
              ref={videoRef}
              src={activeVideo.url}
              style={{
                width: '100%',     // Ép video luôn rộng bằng khung đen
                height: 'auto',    // Chiều cao tự nhảy theo tỉ lệ video
                maxHeight: '100%', // Không cho phép vượt quá chiều cao khung đen
                objectFit: 'contain' // Giữ nguyên nội dung không bị cắt mất
              }}
              playsInline
            />
          ) : (
            <div style={{ color: '#444', fontSize: '16px' }}></div>
          )}

          {/* Render Text Overlay */}
          <div style={styles.textOverlay}>
            {activeTexts.map(txt => {
              if (txt.lyrics && txt.lyrics.length > 0) {
                const itemTime = currentTimeSec - txt.start;
                const activeLyric = txt.lyrics.find(l => itemTime >= l.start && itemTime <= l.end);
                const upcomingLyrics = txt.lyrics.filter(l => l.start > itemTime).slice(0, 2);
                return (
                  <div key={txt.id} style={{ textAlign: 'center' }}>
                    {activeLyric && (
                      <div style={{ ...styles.textItem, color: 'var(--color-main)', fontSize: 'clamp(20px, 4vw, 32px)' }}>
                        {activeLyric.word}
                      </div>
                    )}
                    {upcomingLyrics.length > 0 && (
                      <div style={{ ...styles.textItem, opacity: 0.5, fontSize: 'clamp(12px, 2vw, 18px)', marginTop: '4px' }}>
                        {upcomingLyrics.map(l => l.word).join(' ')}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                
                <div 
                    key={txt.id}
                    style={{
                      // ...styles.textItem,
                      // ...txt.style,
                      // Ưu tiên chạy animation
                      animation: `${txt.textEffect || effectGlobal} 0.3s linear`,
                      
                      // Kiểm tra kỹ giá trị transform
                      transform: (effectGlobal == "random" || txt.textEffect == "random")
                        ? `translate(${txt.randomEffect.x}%, ${txt.randomEffect.y}%)` // Thêm % ở đây nếu x, y chỉ là số
                        : "none"
                    }}
                    className="text-effect"
                    id="text-effect"
                  >
                    {txt.name}
                  </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio Streams */}
      {activeAudios.map(audio => (
        <AudioStream
          key={audio.id}
          src={audio.url}
          startTime={audio.start}
          globalTime={currentTimeSec}
          isPlaying={isPlaying}
          duration={audio.duration}
        />
      ))}

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowScreenMenu(!showScreenMenu); }}
            style={styles.screenButton}
            title="Chọn khung hình"
          >
            <Monitor size={16} />
            <span style={{ fontSize: '12px' }}>{selectedScreen.code}</span>
          </button>

          {showScreenMenu && (
            <div style={styles.screenMenu}>
              <div style={styles.screenMenuHeader}>Chọn khung hình</div>
              {listScreen?.map((screen) => (
                <div
                  key={screen.code}
                  onClick={() => { setSelectedScreen(screen); setShowScreenMenu(false); }}
                  style={{
                    ...styles.screenMenuItem,
                    background: selectedScreen.code === screen.code ? 'rgba(255, 9, 154, 0.15)' : 'transparent',
                    color: selectedScreen.code === screen.code ? 'var(--color-main)' : '#eee',
                  }}
                >
                  <span>{screen.code}</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{screen.width}×{screen.height}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ color: 'var(--color-main)', fontSize: '14px', fontWeight: '500' }}>
          <TimeFormatter seconds={currentTimeSec.toFixed(2)} />
        </div>

        <div
          onClick={() => dispatch(setValueTimeline({ isPlaying: !isPlaying }))}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {isPlaying ? (
            <Pause fill="white" size={30} color="white" />
          ) : (
            <Play fill="white" size={30} color="white" />
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          style={styles.iconButton}
          title={isFullscreen ? 'Thoát fullscreen' : 'Toàn màn hình'}
        >
          {isFullscreen ? <Shrink size={20} color="var(--color-main)" /> : <Expand size={20} color="#666" />}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: (isFullscreen) => ({
    width: '100%',
    maxWidth: isFullscreen ? '100vw' : '850px',
    background: '#151515',
    borderRadius: isFullscreen ? '0' : '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: isFullscreen ? '100vh' : 'auto',
    margin: '0 auto',
  }),
  // Lớp bọc ngoài để tạo không gian cho video thay đổi tỷ lệ
  canvasWrapper: (isFullscreen) => ({
    flex: 1,
    background: '#0a0a0a', // Màu nền tối hơn để làm nổi bật khung hình
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    // Tăng chiều cao vùng hiển thị để màn hình đứng có không gian "giãn" ra
    height: isFullscreen ? 'calc(100vh - 70px)' : '500px', 
    overflow: 'hidden',
  }),
  // Đây là phần quan trọng nhất: Tỷ lệ thay đổi dựa trên screen chọn
  videoArea: (aspectRatio) => {
    const isPortrait = aspectRatio < 1; // Kiểm tra xem có phải màn hình đứng (9:16, 3:4) không
    
    return {
      position: 'relative',
      aspectRatio: aspectRatio,
      background: '#000',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      
      // Logic quan trọng ở đây:
      height: isPortrait ? '100%' : 'auto', 
      width: isPortrait ? 'auto' : '100%',
      
      // Đảm bảo không bao giờ tràn ra khỏi vùng chứa
      maxWidth: '100%',
      maxHeight: '100%',
    };
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain', // Giúp video gốc ko bị méo khi tỷ lệ khung hình khác video nguồn
  },
  textOverlay: {
    position: 'absolute',
    pointerEvents: 'none',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  textItem: {
    color: 'white',
    fontSize: 'clamp(16px, 3vw, 24px)',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
    textAlign: 'center',
  },
  controlsBar: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    minHeight: '56px',
    background: '#151515',
  },
  screenButton: {
    background: '#222',
    border: '1px solid #444',
    color: '#ccc',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  screenMenu: {
    position: 'absolute',
    bottom: '45px',
    left: 0,
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: '8px',
    width: '200px',
    zIndex: 200,
  },
  screenMenuHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid #333',
    fontSize: '12px',
    color: '#999',
  },
  screenMenuItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
  },
};

export default VideoPlayer;