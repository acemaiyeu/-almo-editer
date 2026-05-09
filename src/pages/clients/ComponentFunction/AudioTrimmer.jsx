import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import localforage from 'localforage';
import toWav from 'audiobuffer-to-wav';

const AudioTrimmer = () => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  
  // Khai báo state
  const [region, setRegion] = useState({ start: 0, end: 10 });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Fix lỗi thiếu setIsPlaying

  useEffect(() => {
    // 1. Khởi tạo Wavesurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#d1d5db',
      progressColor: '#3b82f6',
      height: 120,
    });

    // 2. Đăng ký Plugin vùng chọn
    const wsRegions = wavesurfer.current.registerPlugin(RegionsPlugin.create());

    // 3. Sự kiện khi nhạc đã sẵn sàng
    wavesurfer.current.on('ready', () => {
      wsRegions.clearRegions();
      const initialRegion = wsRegions.addRegion({
        start: 0,
        end: 10,
        color: 'rgba(59, 130, 246, 0.3)',
        drag: true,
        resize: true,
      });
      
      setRegion({ start: 0, end: 10 });
      setIsReady(true);
    });

    // 4. Cập nhật state khi kéo vùng chọn
    wsRegions.on('region-updated', (reg) => {
      setRegion({ 
        start: parseFloat(reg.start.toFixed(2)), 
        end: parseFloat(reg.end.toFixed(2)) 
      });
    });

    // 5. Lắng nghe sự kiện Play/Pause để cập nhật icon nút bấm
    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));

    return () => wavesurfer.current.destroy();
  }, []);

  // Logic kiểm tra vị trí phát để giới hạn trong vùng chọn
  useEffect(() => {
    if (!wavesurfer.current) return;

    const handleProcess = () => {
      const ws = wavesurfer.current;
      if (ws.isPlaying()) {
        const currentTime = ws.getCurrentTime();
        // Nếu phát quá điểm kết thúc vùng chọn thì dừng và quay lại điểm đầu
        if (currentTime >= region.end || currentTime < region.start) {
          ws.pause();
          ws.setTime(region.start);
          setIsPlaying(false);
        }
      }
    };

    wavesurfer.current.on('audioprocess', handleProcess);
    return () => wavesurfer.current.un('audioprocess', handleProcess);
  }, [region]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      wavesurfer.current.load(url);
      await localforage.setItem('original_audio', file);
    }
  };

  const handlePlayPause = () => {
    const ws = wavesurfer.current;
    if (!ws.isPlaying()) {
      const currentTime = ws.getCurrentTime();
      // Nếu con trỏ đang nằm ngoài vùng chọn, nhảy về điểm đầu vùng chọn
      if (currentTime < region.start || currentTime >= region.end) {
        ws.setTime(region.start);
      }
      ws.play();
    } else {
      ws.pause();
    }
  };

  const handleCutAndSave = async () => {
    if (!wavesurfer.current) return;

    try {
      const buffer = wavesurfer.current.getDecodedData();
      const sampleRate = buffer.sampleRate;
      const startOffset = region.start * sampleRate;
      const endOffset = region.end * sampleRate;
      const frameCount = endOffset - startOffset;

      const cutBuffer = new AudioContext().createBuffer(
        buffer.numberOfChannels,
        frameCount,
        sampleRate
      );

      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        const cutChannelData = cutBuffer.getChannelData(i);
        cutChannelData.set(channelData.slice(startOffset, endOffset));
      }

      const wavArrayBuffer = toWav(cutBuffer);
      const cutBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

      const handle = await window.showSaveFilePicker({
        suggestedName: `cut_${region.start}s_to_${region.end}s.wav`,
        types: [{ description: 'Audio WAV', accept: { 'audio/wav': ['.wav'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(cutBlob);
      await writable.close();
      alert("Đã lưu vào máy thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial' }}>
      <div style={{ marginBottom: '20px', border: '2px dashed #ccc', padding: '20px', textAlign: 'center' }}>
        <input type="file" accept="audio/*" onChange={handleFileUpload} />
      </div>
      
      <div ref={waveformRef} style={{ margin: '20px 0', border: '1px solid #eee', borderRadius: '8px' }} />

      {isReady && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '15px', fontSize: '18px' }}>
            Đoạn chọn: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{region.start}s</span> 
            đến <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{region.end}s</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={handlePlayPause} style={btnStyle}>
              {isPlaying ? '⏸ Tạm dừng đoạn chọn' : '▶ Phát đoạn chọn'}
            </button>
            
            <button onClick={handleCutAndSave} style={{ ...btnStyle, backgroundColor: 'var(--color-main)' }}>
              💾 Cắt & Lưu ổ D
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  padding: '12px 24px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#3b82f6',
  color: 'white',
  fontWeight: 'bold',
  transition: '0.2s opacity'
};

export default AudioTrimmer;