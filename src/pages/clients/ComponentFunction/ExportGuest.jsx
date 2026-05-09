import { Player } from '@remotion/player';
import { useEffect, useRef, useState } from 'react';
import { MyVideoComposition } from './MyVideoComposition';
import { staticFile } from 'remotion';
import { useDispatch, useSelector } from 'react-redux';
import { updateTextEffect } from '../../../app/features/textEffectSlice';

const ExportGuest = () => {
  const playerRef = useRef(null);
    const duration = 60;
    const lyrics = useSelector((state) => state.textEffect.lyrics);
    const audio_default = staticFile('audio/gapanhgiualuanhoi.mp3');
    const dispatch = useDispatch();
  const exportClientSide = async () => {
    const video = document.querySelector('video'); // Lấy element video từ Player
    if (!video) return alert("Không tìm thấy video!");

    const stream = video.captureStream();
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); // Trình duyệt hỗ trợ webm tốt nhất
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      let a;
      if(typeof document !== 'undefined'){
        a = document.createElement('a');
      }
      
      a.href = url;
      a.download = 'tiktok-client.webm';
      a.click();
    };

    // Bắt đầu ghi và bắt đầu play video từ đầu
    playerRef.current.seekTo(0);
    recorder.start();
    playerRef.current.play();

    // Tự động dừng khi hết thời lượng (ví dụ 60s)
    setTimeout(() => {
      recorder.stop();
      playerRef.current.pause();
      alert("Đã tải xong video từ máy khách!");
    }, 60000); 
  };

  useEffect(() => {
  const player = playerRef.current;
  if (!player) return;

  // Lắng nghe mỗi khi frame thay đổi (thay thế hoàn hảo cho onTimeUpdate)
  const unsubscribe = player.addEventListener('frameupdate', (e) => {
    const frame = e.detail.frame;
    const fps = 30; // FPS của project
    const currentTime = frame / fps;
    
    // Cập nhật lên Redux
    dispatch(updateTextEffect({ currentTime, timeStyle: 'player' }));
  });

  return () => unsubscribe(); // Hủy lắng nghe khi component unmount
}, []);
  return (
    <div>
      <Player style={{ width: '100%'}}
                      ref={playerRef} // Gán ref để can thiệp
                      component={MyVideoComposition}
                      durationInFrames={duration * 30}
                      fps={30}
                      compositionWidth={1280}
                      compositionHeight={720}
                      controls
                      inputProps={{ audioUrl: audio_default, lyrics: lyrics }}

                  />
      <button onClick={exportClientSide}>Tải về (Máy khách)</button>
    </div>
  );
};
export default ExportGuest;