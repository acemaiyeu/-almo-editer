import { useSelector } from 'react-redux';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  interpolate,
  Sequence,
  Video
} from 'remotion';

export const MyVideoComposition = ({ lyrics, audioUrl, videoUrl, selectedEffect }) => {
  const { fps } = useVideoConfig();
  
  // Lưu ý: Trong Remotion, 'frame' vẫn là biến chạy chính của timeline
  const frame = useCurrentFrame(); 
  const currentTime = frame / fps; 

  if (!audioUrl) return null;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* 1. Nền Video */}
      {videoUrl && (
        <AbsoluteFill>
          <Video 
            src={videoUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </AbsoluteFill>
      )}

      {/* 2. Âm thanh */}
      <Audio src={audioUrl} />

      {/* 3. Lớp Lyrics */}
      <AbsoluteFill style={{ 
        justifyContent: 'center', 
        alignItems: 'center', 
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap', 
        padding: '0 50px'
      }}>
        {lyrics && lyrics.map((item, index) => {
          // VÌ REDUX ĐÃ LÀ GIÂY: Lấy trực tiếp item.start và item.end
          const start = Number(item.start); 
          const end = Number(item.end);

          // Chuyển sang frame để Sequence của Remotion hiểu vị trí đặt
          const startFrame = Math.round(start * fps);
          const durationInFrames = Math.round((end - start) * fps);

          if (durationInFrames <= 0) return null;

          return (
            <Sequence
              key={`${index}-${start}`}
              from={startFrame}
              durationInFrames={durationInFrames}
              layout="none"
            >
              <WordEffect 
                word={item.word} 
                effect={selectedEffect} 
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Component xử lý hiệu ứng
const WordEffect = ({ word, effect }) => {
  const frame = useCurrentFrame(); // Bắt đầu từ 0 khi chữ xuất hiện
  const { fps } = useVideoConfig();

  // Hiệu ứng xuất hiện trong 0.25 giây đầu tiên
  const animIn = 0.25 * fps;

  const opacity = interpolate(frame, [0, animIn], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, animIn], [0.8, 1], { extrapolateRight: 'clamp' });

  const styles = {
    'zoom-in': { transform: `scale(${scale})`, opacity, color: 'yellow', fontSize: '80px' },
    'fade-in': { opacity, color: 'white', fontSize: '80px' },
    'neon': {
        color: '#fff',
        textShadow: '0 0 10px #00d1b2, 0 0 20px #00d1b2',
        fontSize: '80px',
        opacity
    }
  };

  const currentStyle = styles[effect] || { color: 'white', fontSize: '70px', opacity };

  return (
    <div style={{ 
      margin: '0 12px', 
      fontWeight: 'bold',
      transition: 'none', // Remotion quản lý frame nên không dùng CSS transition
      ...currentStyle 
    }}>
      {word}
    </div>
  );
};