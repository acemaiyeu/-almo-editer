// src/Root.jsx
import { Composition } from 'remotion';
import { MyVideoComposition } from './MyVideoComposition';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MyComp" // ID này sẽ dùng trong câu lệnh terminal
        component={MyVideoComposition}
        durationInFrames={1200} // Ví dụ: 40 giây * 30fps
        fps={30}
        width={1280}
        height={720}
        // Truyền dữ liệu mặc định để render
        defaultProps={{
          audioUrl: "https://www.your-site.com/audio.mp3", // Link nhạc thực tế
          lyrics: [
             { word: "Chào", start: 1000, end: 2000 },
             { word: "Bạn", start: 2100, end: 3000 }
          ],
          selectedEffect: "neon"
        }}
      />
    </>
  );
};