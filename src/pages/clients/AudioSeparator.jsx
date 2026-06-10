import React, { useState, useRef, useEffect } from 'react';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor } from 'demucs-web';
import { useDispatch, useSelector } from 'react-redux';
import '../../style/AudioSeparator.scss';
import { showDynamic } from '../../app/ComponentSupport/functions';
import icon_default from '../../assets/img/logo.png'
import icon_music from '../../assets/img/music.gif'
import JSZip from 'jszip';
import { updateDynamic } from '../../app/features/dynamicIslandSlice';

const AudioSeparator = () => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null); // Lưu file đã chọn
  const [isDragging, setIsDragging] = useState(false); // Trạng thái hover kéo file
  const [status, setStatus] = useState("")
  const [audioUrls, setAudioUrls] = useState({
    vocal: null,
    drums: null,
    bass: null,
    other: null,
  });
  const {content} = useSelector(state => state.dynamic)

  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const projectInputRef = useRef(null);  
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
  const handleFileChange = async (file) => {
    setStatus("Đang kiểm tra...")
    if (file && file.type.startsWith('audio/')) {
     

      setSelectedFile(file);
      // Reset kết quả cũ khi chọn file mới
      setAudioUrls({ vocal: null, drums: null, bass: null, other: null });
      setSelectedTracks([]);
      processAudio(file)
      
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
    let favicon = document.getElementById('web-icon');
    if (isPlayingAll) {
      activeRefs.forEach(audio => audio.pause());
      setIsPlayingAll(false);
      document.title = `ALMO EDITOR`
      favicon.href = icon_default
      showDynamic(dispatch, `ALMO - EDITOR`, 100)
    } else {
      activeRefs.forEach(audio => {
        audio.currentTime = 0;
        audio.play();
      document.title = `Đang phát ${selectedFile.name}`
      showDynamic(dispatch, `${selectedFile.name.replaceAll(".mp3_ALMO_EDITOR_separated","")}`, (audio.duration * 1000) - (audio.currentTime * 1000))
      favicon.href = icon_music
      });
      setIsPlayingAll(true);
    }
  };

  // =========================
  // PROCESS AI (Kích hoạt khi bấm nút "Tạo bài hát")
  // =========================
  const processAudio = async (selectedFile) => {
    if(!selectedFile) return;

    // if(window.location.hostname !== "localhost" && window.location.hostname !== "192.168.31.81"){
    //   showDynamic(dispatch, "Chức năng đang phát triển không chạy công khai!")
    //   return;
    // }
    ort.env.wasm.wasmPaths = {
        'ort-wasm-simd-threaded.jsep.mjs': '/ort-wasm-simd-threaded.jsep.mjs',
        'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm',
        'ort-wasm-simd-threaded.jsep.wasm': '/ort-wasm-simd-threaded.jsep.wasm',
        'ort-wasm-simd-threaded.mjs': '/ort-wasm-simd-threaded.mjs'
    };

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
            document.title = "Đang xử lý " + Math.round(d) + "%"
            showDynamic(dispatch, "", undefined,  "Đang xử lý: " + Math.round(d) + "%")
            if(d >= 99.9){
              document.title = "ALMO - EDITOR"
              showDynamic(dispatch, "", undefined,  "")
            }
          }
        }
      });

      await processor.loadModel('/models/htdemucs_embedded.onnx');

      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // =========================================================================
      // CODE THÊM MỚI: KIỂM TRA VÀ CẮT AUDIO NẾU QUÁ 30 PHÚT (1800 giây)
      // =========================================================================
      const MAX_SECONDS = 600; 
      let targetAudioBuffer = audioBuffer;

      if (audioBuffer.duration > MAX_SECONDS) {
        // showDynamic(dispatch, "Kích thước file đã quá 10 phút!")
        setStatus("Kích thước file đã quá 10 phút! Vui lòng cắt ngắn hoặc chọn audio khác!")
        // setSelectedFile(null);
        // return;
        //Phần cut audio
        // const maxSamples = MAX_SECONDS * audioBuffer.sampleRate;
        // targetAudioBuffer = audioCtx.createBuffer(
        //   audioBuffer.numberOfChannels,
        //   maxSamples,
        //   audioBuffer.sampleRate
        // );

        // for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        //   targetAudioBuffer.copyToChannel(
        //     audioBuffer.getChannelData(i).slice(0, maxSamples),
        //     i
        //   );
        // }
      }
      // =========================================================================
      setStatus("AI đang phân tách các track, vui lòng đợi...")
      // Dùng targetAudioBuffer (đã cắt nếu quá 30p) để lấy left và right
      const left = targetAudioBuffer.getChannelData(0);
      const right = targetAudioBuffer.numberOfChannels > 1 ? targetAudioBuffer.getChannelData(1) : left;

      const result = await processor.separate(left, right);
      const tracks = ['vocals', 'drums', 'bass', 'other'];
      const urls = {};

      for (const track of tracks) {
        const buffer = createAudioBuffer(
          audioCtx,
          result[track].left,
          result[track].right,
          targetAudioBuffer.sampleRate
        );
        const blob = bufferToWave(buffer);
        const stateKey = track === 'vocals' ? 'vocal' : track;
        urls[stateKey] = URL.createObjectURL(blob);
      }

      setAudioUrls(urls);
      setStatus("")
    } catch (err) {
      console.error(err);
      showDynamic(dispatch,'Lỗi AI separator');
    }
    setIsProcessing(false);
  };

  const downloadAllTracks = async () => {
  const zip = new JSZip();
  showDynamic(dispatch, undefined, 1, "Đang kiểm tra file")
  try{
    for (const [key, url] of Object.entries(audioUrls)) {
      if (!url) continue;
      showDynamic(dispatch, undefined, 1, "Đang xử lý " + key)
      const response = await fetch(url);
      const blob = await response.blob();

      zip.file(`${key}.wav`, blob);
    }
  }catch (err) {
    console.log("Lỗi xuất file",err)
  }
  showDynamic(dispatch, undefined, 1, "Đang xuất file")
  // thêm metadata
  zip.file(
    'project.json',
    JSON.stringify({
      fileName: selectedFile?.name || 'unknown',
      createdAt: Date.now()
    })
  );

  const content = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${selectedFile.name}_ALMO_EDITOR_separated.zip`;
  link.click();
  showDynamic(dispatch, undefined, 1, "")
};

const loadSeparatedProject = async (file) => {
  try {
    const zip = await JSZip.loadAsync(file);

    const urls = {};

    const tracks = ['vocal', 'drums', 'bass', 'other'];

    for (const track of tracks) {
      const zipFile = zip.file(`${track}.wav`);

      if (zipFile) {
        const blob = await zipFile.async('blob');

        urls[track] = URL.createObjectURL(blob);
      }
    }

    setAudioUrls(urls);

    setSelectedFile({
      name: file.name.replace('.zip', '')
    });

  } catch (err) {
    console.error(err);
    showDynamic(dispatch,'File project không hợp lệ');
  }
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
//  useState(() => {
//     document.title = "Đang xử lý " + progress +"%"
//     console.log("progress", progress)
//  }, [progress])
  return (
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '1200px', marginLeft: "auto", marginRight: "auto" }}>
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
              {(selectedFile.size / (1024 * 1024)).toFixed(2) != "NaN" && <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
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
        <div>
          <input
  type="file"
  hidden
  ref={projectInputRef}
  accept=".zip"
  onChange={(e) => loadSeparatedProject(e.target.files[0])}
/>

<button
  onClick={() => projectInputRef.current.click()}
  style={{
    marginLeft: 10,
    marginBottom: 10,
    padding: '10px 20px'
  }}
>
  📂 Load Track Đã Tách
</button>
        </div>
      {/* NÚT TẠO BÀI HÁT MỚI */}
      {/* {selectedFile && !isProcessing && !audioUrls.vocal && (
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
      )} */}

      {isProcessing && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: "var(--color-main)", fontWeight: 'bold' }}>{status}</p>
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

        {audioUrls.vocal && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={downloadAllTracks}
            style={{
              padding: '12px 30px',
              background: 'green',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            ⬇ Tải toàn bộ track
          </button>
        </div>
      )}
      </div>
      {audioUrls["vocal"] && (
        <div style={{ 
          margin: '30px auto', 
          width: "100%",
          borderRadius: '15px',
          backgroundColor: 'transparent',
          textAlign: 'center',
        }}>
          <h4 style={{ color: "var(--color-main)", marginTop: 0 }}>
            {/* Chế độ nghe kết hợp ({selectedTracks.length} track) */}
          </h4>
          <button 
            onClick={() => {
              handleCheckTrack("vocal")
              handleCheckTrack("drums")
              handleCheckTrack("bass")
              handleCheckTrack("other")
            }}
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {selectedTracks.length > 0 ? "Bỏ " : "Chọn "} tất cả
          </button>
        </div>
      )}
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
            {/* Chế độ nghe kết hợp ({selectedTracks.length} track) */}
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