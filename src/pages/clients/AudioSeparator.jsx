import React, { useState, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor } from 'demucs-web';
import { useDispatch } from 'react-redux';
import '../../style/AudioSeparator.scss';
import { showDynamic } from '../../app/ComponentSupport/functions';

const AudioSeparator = () => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null); // Lưu file đã chọn
  const [isDragging, setIsDragging] = useState(false); // Trạng thái hover kéo file

  const [audioUrls, setAudioUrls] = useState({
    vocal: null,
    drums: null,
    bass: null,
    other: null,
  });

  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  
  const audioRefs = {
    vocal: useRef(null),
    drums: useRef(null),
    bass: useRef(null),
    other: useRef(null),
  };

  const fileInputRef = useRef(null);

  // =========================
  // XỬ LÝ FILE (DRAG & DROP)
  // =========================
  const handleFileChange = (file) => {
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
      // Reset kết quả cũ khi chọn file mới
      setAudioUrls({ vocal: null, drums: null, bass: null, other: null });
      setSelectedTracks([]);
    } else {
      alert("Vui lòng chọn định dạng âm thanh hợp lệ!");
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // =========================
  // AUDIO BUFFER -> WAV
  // =========================
  const bufferToWave = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // RIFF
    setUint32(length - 8);
    setUint32(0x45564157); // WAVE
    setUint32(0x20746d66); // fmt
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // data
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const createAudioBuffer = (audioCtx, left, right, sampleRate) => {
    const buffer = audioCtx.createBuffer(2, left.length, sampleRate);
    buffer.getChannelData(0).set(left);
    buffer.getChannelData(1).set(right);
    return buffer;
  };

  // =========================
  // LOGIC PHÁT ĐỒNG BỘ
  // =========================
  const handleCheckTrack = (track) => {
    setSelectedTracks(prev => 
      prev.includes(track) ? prev.filter(t => t !== track) : [...prev, track]
    );
  };

  const togglePlaySync = () => {
    const activeRefs = selectedTracks.map(t => audioRefs[t].current).filter(Boolean);
    
    if (isPlayingAll) {
      activeRefs.forEach(audio => audio.pause());
      setIsPlayingAll(false);
    } else {
      activeRefs.forEach(audio => {
        audio.currentTime = 0;
        audio.play();
      });
      setIsPlayingAll(true);
    }
  };

  // =========================
  // PROCESS AI (Kích hoạt khi bấm nút "Tạo bài hát")
  // =========================
  const processAudio = async () => {
    if(!selectedFile) return;

    // if(window.location.hostname !== "localhost" && window.location.hostname !== "192.168.31.81"){
    //   showDynamic(dispatch, "Chức năng đang phát triển không chạy công khai!")
    //   return;
    // }

    setIsProcessing(true);
    setProgress(0);

    try {
      const audioCtx = new AudioContext();
      const processor = new DemucsProcessor({
        ort,
        onProgress: (p) => {
          if (typeof p === 'number' && !isNaN(p)) {
            setProgress(Math.floor(p * 100));
          } else {
            let d = p?.progress.toFixed(2) === 1 ? 100 : p?.progress.toFixed(2) * 100;
            setProgress(Math.round(d));
          }
        }
      });

      await processor.loadModel('/models/htdemucs_embedded.onnx');

      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

      const result = await processor.separate(left, right);

      const tracks = ['vocals', 'drums', 'bass', 'other'];
      const urls = {};

      for (const track of tracks) {
        const buffer = createAudioBuffer(
          audioCtx,
          result[track].left,
          result[track].right,
          audioBuffer.sampleRate
        );
        const blob = bufferToWave(buffer);
        const stateKey = track === 'vocals' ? 'vocal' : track;
        urls[stateKey] = URL.createObjectURL(blob);
      }

      setAudioUrls(urls);
    } catch (err) {
      console.error(err);
      alert('Lỗi AI separator');
    }
    setIsProcessing(false);
  };

  const renderAudioItem = (type, label) => {
    const url = audioUrls[type];
    if (!url) return null;

    return (
      <div className='audio-item'>
        <div className="track-info">
          <input 
            type="checkbox" 
            className="track-checkbox"
            checked={selectedTracks.includes(type)}
            onChange={() => handleCheckTrack(type)}
            onClick={(e) => e.stopPropagation()} // Tránh trigger click của row
          />
          <span className="track-label">{label}</span>
        </div>
        
        <div className="audio-player">
          <audio
            ref={audioRefs[type]}
            src={url}
            controls
            onEnded={() => setIsPlayingAll(false)}
          />
        </div>
        
        <a href={url} download={`${type}.wav`} className="download-btn" title={`Tải ${label}`}>
          Tải về ⬇
        </a>
      </div>
    );
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '800px', margin: 'auto' }}>
      <h2 style={{ color: "var(--color-main)", textAlign: 'center' }}>TÁCH BEAT VÀ VOCAL</h2>

      {/* DROP ZONE AREA */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-main)' : '#ccc'}`,
          borderRadius: '15px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '20px'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          accept="audio/*" 
          onChange={(e) => handleFileChange(e.target.files[0])} 
        />
        
        {!selectedFile ? (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <p>Kéo thả file âm thanh vào đây hoặc <b>Click để chọn file</b></p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎵</div>
            <p style={{ fontWeight: 'bold', color: 'var(--color-main)' }}>{selectedFile.name}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Chọn lại
            </button>
          </div>
        )}
      </div>

      {/* NÚT TẠO BÀI HÁT MỚI */}
      {selectedFile && !isProcessing && !audioUrls.vocal && (
        <div style={{ textAlign: 'center' }}>
            <button 
                onClick={processAudio}
                style={{
                    padding: '12px 40px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--color-main)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
            >
                ✨ BẮT ĐẦU
            </button>
        </div>
      )}

      {isProcessing && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: "var(--color-main)", fontWeight: 'bold' }}>AI đang phân tách các track, vui lòng đợi...</p>
          <div className="progress" style={{width: "100%", height: '20px', borderRadius: '10px'}}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ width: `${progress}%`, backgroundColor: "var(--color-main)"}} 
            >
              {progress}%
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        {renderAudioItem('vocal', 'Vocals')}
        {renderAudioItem('drums', 'Drums')}
        {renderAudioItem('bass', 'Bass')}
        {renderAudioItem('other', 'Other')}
      </div>

      {selectedTracks.length > 0 && (
        <div style={{ 
          margin: '30px auto', 
          width: "100%",
          padding: '20px',  
          borderRadius: '15px',
          backgroundColor: '#f8f9fa',
          textAlign: 'center',
          border: '1px solid #eee'
        }}>
          <h4 style={{ color: "var(--color-main)", marginTop: 0 }}>
            Chế độ nghe kết hợp ({selectedTracks.length} track)
          </h4>
          <button 
            onClick={togglePlaySync}
            style={{
              padding: '12px 50px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isPlayingAll ? '#dc3545' : 'var(--color-main)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {isPlayingAll ? '⏸ DỪNG TẤT CẢ' : '▶ PHÁT ĐỒNG BỘ'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioSeparator; 