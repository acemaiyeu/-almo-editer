import React, { useState, useRef, useEffect } from 'react';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor } from 'demucs-web';
import { useDispatch, useSelector } from 'react-redux';
import '../../style/AudioSeparator.scss';
import { showDynamic } from '../../app/ComponentSupport/functions';
import icon_default from '../../assets/img/logo.png';
import icon_music from '../../assets/img/music.gif';
import JSZip from 'jszip';
import { updateDynamic } from '../../app/features/dynamicIslandSlice';
import LyricMaker from './LyricMaker';
import ZingMp3KaraokePlayer from './ZingMp3KaraokePlayer';

// ===== Load lamejs từ CDN =====
let lamejsPromise = null;
const loadLamejs = () => {
  if (lamejsPromise) return lamejsPromise;
  lamejsPromise = new Promise((resolve, reject) => {
    if (window.lamejs) return resolve(window.lamejs);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    script.onload = () => {
      if (window.lamejs) resolve(window.lamejs);
      else reject(new Error('Không load được lamejs từ CDN'));
    };
    script.onerror = () => reject(new Error('Không load được lamejs từ CDN'));
    document.head.appendChild(script);
  });
  return lamejsPromise;
};

const AudioSeparator = () => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoop, setIsLoop] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('almo-audio-theme') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    try { localStorage.setItem('almo-audio-theme', theme); } catch {}
  }, [theme]);

  // mode: null | 'mp3-preview' | 'separated'
  const [mode, setMode] = useState(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
  const [mp3Volume, setMp3Volume] = useState(2);

  const [volumes, setVolumes] = useState({ vocal: 2, drums: 2, bass: 2, other: 2 });
  const [audioUrls, setAudioUrls] = useState({ vocal: null, drums: null, bass: null, other: null });

  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const projectInputRef = useRef(null);
  const mp3InputRef = useRef(null);
  const fileInputRef = useRef(null);

  const audioRefs = {
    vocal: useRef(null),
    drums: useRef(null),
    bass: useRef(null),
    other: useRef(null),
  };

  const audioCtxRef = useRef(null);
  const gainNodesRef = useRef({ vocal: null, drums: null, bass: null, other: null });
  const sourcesRef = useRef({ vocal: null, drums: null, bass: null, other: null });

  // Web Audio cho file gốc (để boost > 100%)
  const mp3AudioRef = useRef(null);
  const mp3SourceRef = useRef(null);
  const mp3GainRef = useRef(null);
  const mp3BoundElRef = useRef(null);

  // Cleanup khi đổi URL
  useEffect(() => {
    return () => {
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    };
  }, [originalAudioUrl]);

  // Bind gain node cho các track đã tách
  useEffect(() => {
    Object.keys(audioUrls).forEach((track) => {
      const audioEl = audioRefs[track].current;
      if (audioUrls[track] && audioEl && !sourcesRef.current[track]) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        try {
          const source = audioCtxRef.current.createMediaElementSource(audioEl);
          const gainNode = audioCtxRef.current.createGain();
          gainNode.gain.value = volumes[track];
          source.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          sourcesRef.current[track] = source;
          gainNodesRef.current[track] = gainNode;
        } catch (e) {
          console.warn("MediaElementSource rebind bypassed:", e);
        }
      }
    });
  }, [audioUrls]);

  // Bind gain node cho file gốc (mp3-preview)
  useEffect(() => {
    if (mode !== 'mp3-preview') return;
    const el = mp3AudioRef.current;
    if (!el || !originalAudioUrl) return;
    if (mp3BoundElRef.current === el) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    try {
      const source = audioCtxRef.current.createMediaElementSource(el);
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = mp3Volume;
      source.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      mp3SourceRef.current = source;
      mp3GainRef.current = gain;
      mp3BoundElRef.current = el;
    } catch (e) {
      console.warn('Cannot bind original audio source:', e);
    }
  }, [mode, originalAudioUrl]);

  const handleVolumeChange = (track, value) => {
    const val = parseFloat(value);
    setVolumes((prev) => ({ ...prev, [track]: val }));
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (gainNodesRef.current[track]) {
      gainNodesRef.current[track].gain.value = val;
    }
  };

  const handleMp3VolumeChange = (value) => {
    const val = parseFloat(value);
    setMp3Volume(val);
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (mp3GainRef.current) mp3GainRef.current.gain.value = val;
  };

  const isAudioFile = (file) =>
    file && (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(file.name));

  const resetSeparatedData = () => {
    setAudioUrls({ vocal: null, drums: null, bass: null, other: null });
    setSelectedTracks([]);
    setIsPlayingAll(false);
    sourcesRef.current = { vocal: null, drums: null, bass: null, other: null };
    gainNodesRef.current = { vocal: null, drums: null, bass: null, other: null };
  };

  const clearAll = () => {
    if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    setOriginalAudioUrl(null);
    setSelectedFile(null);
    setMode(null);
    resetSeparatedData();
    setStatus("");
    setProgress(0);
    mp3SourceRef.current = null;
    mp3GainRef.current = null;
    mp3BoundElRef.current = null;
  };

  // =========================
  // DROPZONE (mặc định tách luôn)
  // =========================
  const handleFileChange = (file) => {
    setStatus("");
    if (!isAudioFile(file)) {
      alert("Vui lòng chọn định dạng âm thanh hợp lệ (MP3/WAV/M4A/OGG/FLAC)!");
      return;
    }
    if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    setOriginalAudioUrl(null);
    mp3BoundElRef.current = null;
    resetSeparatedData();
    setSelectedFile(file);
    setMode(null);
    // Tách luôn
    processAudio(file);
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => { setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // =========================
  // NÚT "LOAD MP3" (chỉ preview, chưa tách)
  // =========================
  const handleLoadMp3 = (file) => {
    setStatus("");
    if (!isAudioFile(file)) {
      alert("Vui lòng chọn định dạng âm thanh hợp lệ!");
      return;
    }
    if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    resetSeparatedData();
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setOriginalAudioUrl(url);
    setMode('mp3-preview');
    mp3BoundElRef.current = null;
    mp3SourceRef.current = null;
    mp3GainRef.current = null;
  };

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

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) channels.push(audioBuffer.getChannelData(i));

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

  const handleCheckTrack = (track) => {
    setSelectedTracks(prev =>
      prev.includes(track) ? prev.filter(t => t !== track) : [...prev, track]
    );
  };

  const togglePlaySync = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    const activeRefs = selectedTracks.map(t => audioRefs[t].current).filter(Boolean);
    let favicon = document.getElementById('web-icon');

    if (isPlayingAll) {
      activeRefs.forEach(audio => audio.pause());
      setIsPlayingAll(false);
      document.title = `ALMO EDITOR`;
      if (favicon) favicon.href = icon_default;
      showDynamic(dispatch, `ALMO - EDITOR`, 100);
    } else {
      activeRefs.forEach(audio => {
        audio.currentTime = 0;
        audio.play();
        showDynamic(dispatch, `${selectedFile?.name.replaceAll(".mp3_ALMO_EDITOR_separated","")}`, (audio.duration * 1000) - (audio.currentTime * 1000));
        if (favicon) favicon.href = icon_music;
      });
      setIsPlayingAll(true);
    }
  };

  // =========================
  // TÁCH NHẠC
  // =========================
  const processAudio = async (fileToProcess) => {
    const file = fileToProcess || selectedFile;
    if (!file) return;

    ort.env.wasm.wasmPaths = {
      'ort-wasm-simd-threaded.jsep.mjs': '/ort-wasm-simd-threaded.jsep.mjs',
      'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm',
      'ort-wasm-simd-threaded.jsep.wasm': '/ort-wasm-simd-threaded.jsep.wasm',
      'ort-wasm-simd-threaded.mjs': '/ort-wasm-simd-threaded.mjs'
    };

    setIsProcessing(true);
    setProgress(0);
    setStatus("Đang khởi tạo model AI...");

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
            document.title = "Đang xử lý " + Math.round(d) + "%";
            showDynamic(dispatch, "", undefined, "Đang xử lý: " + Math.round(d) + "%");
            if (d >= 99.9) {
              document.title = "ALMO - EDITOR";
              showDynamic(dispatch, "", undefined, "");
            }
          }
        }
      });

      await processor.loadModel('/models/htdemucs_embedded.onnx');

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const MAX_SECONDS = 2400;
      let targetAudioBuffer = audioBuffer;
      if (audioBuffer.duration > MAX_SECONDS) {
        setStatus("File quá lớn! Tiến hành cắt xuống 59 phút!");
        const maxSamples = MAX_SECONDS * audioBuffer.sampleRate;
        targetAudioBuffer = audioCtx.createBuffer(
          audioBuffer.numberOfChannels,
          maxSamples,
          audioBuffer.sampleRate
        );
        showDynamic(dispatch, "", undefined, "Đang cắt bớt âm thanh");
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
          targetAudioBuffer.copyToChannel(
            audioBuffer.getChannelData(i).slice(0, maxSamples),
            i
          );
        }
        showDynamic(dispatch, "", undefined, "Đã cắt xong âm thanh");
      }

      setStatus("AI đang phân tách các track, vui lòng đợi...");
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
      setMode('separated');
      setStatus("");
      // Giải phóng URL file gốc sau khi tách xong
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
      setOriginalAudioUrl(null);
      mp3BoundElRef.current = null;
      mp3SourceRef.current = null;
      mp3GainRef.current = null;
      showDynamic(dispatch, "Đã tách nhạc xong!");
    } catch (err) {
      console.error(err);
      showDynamic(dispatch, 'Lỗi AI separator');
      setStatus("Có lỗi xảy ra khi tách nhạc!");
    }
    setIsProcessing(false);
  };

  const downloadAllTracks = async () => {
    const zip = new JSZip();
    showDynamic(dispatch, undefined, 1, "Đang kiểm tra file");
    try {
      for (const [key, url] of Object.entries(audioUrls)) {
        if (!url) continue;
        showDynamic(dispatch, undefined, 1, "Đang xử lý " + key);
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(`${key}.wav`, blob);
      }
    } catch (err) {
      console.log("Lỗi xuất file", err);
    }
    showDynamic(dispatch, undefined, 1, "Đang xuất file");
    zip.file(
      'project.json',
      JSON.stringify({ fileName: selectedFile?.name || 'unknown', createdAt: Date.now() })
    );

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${selectedFile.name}_ALMO_EDITOR_separated.zip`;
    link.click();
    showDynamic(dispatch, undefined, 1, "");
  };

  const encodeMP3 = async (audioBuffer, onProgress) => {
    const lamejs = await loadLamejs();

    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 192;
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

    const blockSize = 1152;
    const left = audioBuffer.getChannelData(0);
    const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

    const leftInt = new Int16Array(left.length);
    const rightInt = new Int16Array(right.length);
    for (let i = 0; i < left.length; i++) {
      const l = Math.max(-1, Math.min(1, left[i]));
      const r = Math.max(-1, Math.min(1, right[i]));
      leftInt[i] = l < 0 ? l * 32768 : l * 32767;
      rightInt[i] = r < 0 ? r * 32768 : r * 32767;
    }

    const mp3Data = [];
    const totalBlocks = Math.ceil(left.length / blockSize);
    let block = 0;
    for (let i = 0; i < left.length; i += blockSize, block++) {
      const l = leftInt.subarray(i, i + blockSize);
      const r = rightInt.subarray(i, i + blockSize);
      const buf = encoder.encodeBuffer(l, r);
      if (buf.length > 0) mp3Data.push(new Int8Array(buf));
      if (onProgress && block % 200 === 0) {
        onProgress(block / totalBlocks);
      }
      if (block % 500 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const end = encoder.flush();
    if (end.length > 0) mp3Data.push(new Int8Array(end));
    if (onProgress) onProgress(1);

    return new Blob(mp3Data, { type: 'audio/mpeg' });
  };

  const downloadMixedTracks = async (format) => {
    if (selectedTracks.length === 0) return;
    try {
      showDynamic(dispatch, undefined, 1, "Đang chuẩn bị mix...");
      const audioCtx = new AudioContext();
      const buffers = {};

      for (const track of selectedTracks) {
        showDynamic(dispatch, undefined, 1, `Đang tải ${track}...`);
        const res = await fetch(audioUrls[track]);
        const ab = await res.arrayBuffer();
        buffers[track] = await audioCtx.decodeAudioData(ab);
      }

      const sampleRate = buffers[selectedTracks[0]].sampleRate;
      const maxLen = Math.max(...selectedTracks.map(t => buffers[t].length));
      const offline = new OfflineAudioContext(2, maxLen, sampleRate);

      for (const track of selectedTracks) {
        const src = offline.createBufferSource();
        src.buffer = buffers[track];
        const g = offline.createGain();
        g.gain.value = volumes[track];
        src.connect(g);
        g.connect(offline.destination);
        src.start(0);
      }

      showDynamic(dispatch, undefined, 1, "Đang mix các track...");
      const mixed = await offline.startRendering();

      let blob;
      let ext;
      if (format === 'mp3') {
        showDynamic(dispatch, undefined, 1, "Đang mã hóa MP3: 0%");
        blob = await encodeMP3(mixed, (p) => {
          showDynamic(dispatch, undefined, 1, `Đang mã hóa MP3: ${Math.round(p * 100)}%`);
        });
        ext = 'mp3';
      } else {
        showDynamic(dispatch, undefined, 1, "Đang xuất WAV...");
        blob = bufferToWave(mixed);
        ext = 'wav';
      }

      const baseName = (selectedFile?.name || 'mixed').replace(/\.[^.]+$/, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${baseName}_${selectedTracks.join('_')}.${ext}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);

      showDynamic(dispatch, undefined, 1, "");
      showDynamic(dispatch, `Đã xuất ${ext.toUpperCase()} thành công`);
      try { audioCtx.close(); } catch (_) {}
    } catch (err) {
      console.error(err);
      showDynamic(dispatch, err?.message || "Lỗi khi xuất file!");
    }
  };

  const loadSeparatedProject = async (file) => {
    if (!file) return;
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

      resetSeparatedData();
      setAudioUrls(urls);
      setSelectedFile({ name: file.name.replace('.zip', '') });
      setMode('separated');
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
      setOriginalAudioUrl(null);
      mp3BoundElRef.current = null;
    } catch (err) {
      console.error(err);
      showDynamic(dispatch, 'File project không hợp lệ');
    }
  };

  const renderAudioItem = (type, label) => {
    const url = audioUrls[type];
    if (!url) return null;

    return (
      <div className="audio-item lg-glass" key={type}>
        <div className="track-info">
          <input
            type="checkbox"
            className="track-checkbox"
            checked={selectedTracks.includes(type)}
            onChange={() => handleCheckTrack(type)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="track-label">{label}</span>
        </div>

        <div className="audio-player">
          <audio
            ref={audioRefs[type]}
            src={url}
            controls
            onPlay={() => {
              if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
              }
            }}
            onEnded={() => {
              if (isLoop) togglePlaySync();
              else setIsPlayingAll(false);
            }}
          />
        </div>

        <div className="volume-booster">
          <span className="vol-label">🔊 {Math.round(volumes[type] * 100)}%</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={volumes[type]}
            onChange={(e) => handleVolumeChange(type, e.target.value)}
            className="vol-slider"
          />
        </div>

        <a
          href={url}
          download={`${type}.wav`}
          className="download-btn lg-btn lg-btn-sm"
          title={`Tải ${label}`}
        >
          ⬇ Tải
        </a>
      </div>
    );
  };

  const isLight = theme === 'light';

  return (
    <div className={`lg-container ${isLight ? 'lg-light' : 'lg-dark'}`}>
      <style>{`
        @keyframes lg-float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-50px) scale(1.15); } }
        @keyframes lg-float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,40px) scale(1.08); } }
        @keyframes lg-float3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,60px) scale(0.95); } }
        @keyframes lg-shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes lg-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lg-pulse-glow {
          0%,100% { box-shadow: 0 0 30px rgba(167,139,250,0.55), inset 0 1px 0 rgba(255,255,255,0.6); }
          50% { box-shadow: 0 0 55px rgba(236,72,153,0.7), inset 0 1px 0 rgba(255,255,255,0.8); }
        }

        .lg-container {
          position: relative;
          min-height: 100vh;
          padding: 30px 20px 60px;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          transition: background 0.5s ease, color 0.4s ease;
        }

        .lg-container.lg-dark {
          --c-text: #ffffff;
          --c-text-dim: rgba(255,255,255,0.68);
          --c-glass-bg: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.045));
          --c-glass-border: rgba(255,255,255,0.22);
          --c-glass-inner-top: rgba(255,255,255,0.55);
          --c-glass-inner-bot: rgba(255,255,255,0.08);
          --c-glass-shadow: 0 10px 40px rgba(0,0,0,0.35);
          --c-btn-bg: linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08));
          --c-btn-bg-hover: linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.14));
          --c-btn-border: rgba(255,255,255,0.4);
          --c-input-bg: rgba(255,255,255,0.10);
          --c-input-border: rgba(255,255,255,0.28);
          --c-input-placeholder: rgba(255,255,255,0.55);
          --c-dropzone-bg: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03));
          --c-dropzone-border: rgba(255,255,255,0.35);
          --c-progress-bg: rgba(255,255,255,0.12);
          --c-progress-border: rgba(255,255,255,0.2);
          --c-accent: #a78bfa;
          --c-accent2: #ec4899;
          --c-title-glow: 0 2px 20px rgba(167,139,250,0.85), 0 0 40px rgba(236,72,153,0.4);
          --c-text-shadow: 0 1px 8px rgba(0,0,0,0.5);
          --c-track-pill: rgba(255,255,255,0.15);
          --c-track-pill-border: rgba(255,255,255,0.3);
        }

        .lg-container.lg-light {
          --c-text: #1e1b4b;
          --c-text-dim: rgba(30,27,75,0.68);
          --c-glass-bg: linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.48));
          --c-glass-border: rgba(255,255,255,0.95);
          --c-glass-inner-top: rgba(255,255,255,0.98);
          --c-glass-inner-bot: rgba(255,255,255,0.4);
          --c-glass-shadow: 0 10px 40px rgba(99,102,241,0.20);
          --c-btn-bg: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.65));
          --c-btn-bg-hover: linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.85));
          --c-btn-border: rgba(30,27,75,0.14);
          --c-input-bg: rgba(255,255,255,0.8);
          --c-input-border: rgba(30,27,75,0.16);
          --c-input-placeholder: rgba(30,27,75,0.45);
          --c-dropzone-bg: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4));
          --c-dropzone-border: rgba(30,27,75,0.22);
          --c-progress-bg: rgba(30,27,75,0.08);
          --c-progress-border: rgba(30,27,75,0.15);
          --c-accent: #7c3aed;
          --c-accent2: #db2777;
          --c-title-glow: 0 2px 18px rgba(124,58,237,0.35), 0 0 30px rgba(219,39,119,0.18);
          --c-text-shadow: 0 1px 2px rgba(255,255,255,0.7);
          --c-track-pill: rgba(124,58,237,0.12);
          --c-track-pill-border: rgba(124,58,237,0.25);
        }

        .lg-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          transition: background 0.6s ease;
          pointer-events: none;
        }
        .lg-dark .lg-bg {
          background:
            radial-gradient(1200px 600px at 15% 10%, #4c1d95 0%, transparent 55%),
            radial-gradient(1000px 700px at 85% 90%, #0ea5e9 0%, transparent 55%),
            linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%);
        }
        .lg-light .lg-bg {
          background:
            radial-gradient(1200px 600px at 15% 10%, #ddd6fe 0%, transparent 60%),
            radial-gradient(1000px 700px at 85% 90%, #bae6fd 0%, transparent 60%),
            linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 50%, #fce7f3 100%);
        }

        .lg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .lg-dark .lg-orb { opacity: 0.55; }
        .lg-light .lg-orb { opacity: 0.45; mix-blend-mode: multiply; filter: blur(70px); }

        .lg-wrap { position: relative; z-index: 2; max-width: 1180px; margin: 0 auto; }

        .lg-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 18px 24px; margin-bottom: 22px;
          animation: lg-fade-up 0.6s ease both;
        }
        .lg-header-left { display: flex; flex-direction: column; }
        .lg-title {
          color: var(--c-text); font-weight: 800; letter-spacing: 2.5px;
          font-size: 22px; margin: 0; text-shadow: var(--c-title-glow);
        }
        .lg-subtitle {
          color: var(--c-text-dim); font-size: 11.5px; margin: 4px 0 0;
          letter-spacing: 2.5px; text-transform: uppercase;
        }
        .lg-theme-toggle { display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 13px; font-weight: 700; }

        .lg-glass {
          background: var(--c-glass-bg);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border: 1px solid var(--c-glass-border);
          border-radius: 22px;
          box-shadow: var(--c-glass-shadow), inset 0 1px 0 var(--c-glass-inner-top), inset 0 -1px 0 var(--c-glass-inner-bot);
          position: relative;
          overflow: hidden;
          color: var(--c-text);
        }
        .lg-glass::after {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.02) 55%, transparent 70%);
          background-size: 250% 100%;
          animation: lg-shine 9s linear infinite;
          pointer-events: none;
          opacity: 0.9;
        }
        .lg-light .lg-glass::after { opacity: 0.5; }

        .lg-btn {
          background: var(--c-btn-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--c-btn-border);
          border-radius: 14px;
          padding: 12px 22px;
          color: var(--c-text);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(.2,.7,.2,1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.18), inset 0 1px 0 var(--c-glass-inner-top);
          position: relative; overflow: hidden; letter-spacing: 0.3px;
          font-family: inherit; font-size: 14px;
        }
        .lg-btn:hover {
          transform: translateY(-2px);
          background: var(--c-btn-bg-hover);
          box-shadow: 0 10px 30px rgba(0,0,0,0.22), 0 0 36px rgba(167,139,250,0.4), inset 0 1px 0 var(--c-glass-inner-top);
        }
        .lg-btn:active { transform: translateY(0) scale(0.98); }
        .lg-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .lg-btn-sm { padding: 8px 14px; font-size: 12.5px; border-radius: 12px; }

        .lg-btn-primary {
          background: linear-gradient(135deg, rgba(167,139,250,0.65), rgba(236,72,153,0.45));
          border-color: rgba(255,255,255,0.55);
          color: #fff;
          text-shadow: 0 1px 6px rgba(0,0,0,0.35);
        }
        .lg-light .lg-btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border-color: rgba(255,255,255,0.7);
        }
        .lg-btn-primary:hover {
          background: linear-gradient(135deg, rgba(167,139,250,0.85), rgba(236,72,153,0.6));
        }
        .lg-light .lg-btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed, #db2777);
        }

        .lg-btn-glow { animation: lg-pulse-glow 3s ease-in-out infinite; }

        .lg-dropzone {
          border: 2px dashed var(--c-dropzone-border);
          border-radius: 24px;
          padding: 40px 28px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--c-dropzone-bg);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          box-shadow: var(--c-glass-shadow), inset 0 1px 0 var(--c-glass-inner-top);
          position: relative; overflow: hidden;
          color: var(--c-text);
          animation: lg-fade-up 0.65s ease both;
        }
        .lg-dropzone::after {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(600px 200px at 50% 0%, rgba(167,139,250,0.28), transparent 70%);
          pointer-events: none;
        }
        .lg-dropzone:hover {
          border-color: var(--c-accent);
          box-shadow: 0 14px 50px rgba(0,0,0,0.25), 0 0 60px rgba(167,139,250,0.35), inset 0 1px 0 var(--c-glass-inner-top);
          transform: translateY(-2px);
        }
        .lg-dropzone.lg-drag {
          border-color: var(--c-accent2);
          box-shadow: 0 0 0 4px rgba(236,72,153,0.35), 0 0 80px rgba(236,72,153,0.55), inset 0 1px 0 var(--c-glass-inner-top);
          transform: scale(1.01);
        }

        .audio-item {
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 14px; padding: 14px 18px;
          animation: lg-fade-up 0.4s ease both;
        }
        .track-info { display: flex; align-items: center; gap: 10px; min-width: 120px; }
        .track-checkbox { width: 18px; height: 18px; accent-color: var(--c-accent); cursor: pointer; flex-shrink: 0; }
        .track-label { font-weight: 700; color: var(--c-text); text-shadow: var(--c-text-shadow); }
        .audio-player { flex-grow: 1; min-width: 0; }
        .audio-player audio {
          width: 100%; border-radius: 12px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));
        }
        .volume-booster { display: flex; align-items: center; gap: 8px; min-width: 170px; }
        .vol-label { font-size: 12px; font-weight: 700; width: 55px; color: var(--c-text); text-shadow: var(--c-text-shadow); }
        .vol-slider { cursor: pointer; flex-grow: 1; accent-color: var(--c-accent); }

        .lg-progress {
          width: 100%; height: 22px; border-radius: 12px; overflow: hidden;
          background: var(--c-progress-bg); border: 1px solid var(--c-progress-border);
          backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.25);
        }
        .lg-progress-bar {
          height: 100%; border-radius: 12px;
          background: linear-gradient(90deg, #a78bfa, #ec4899, #a78bfa);
          background-size: 200% 100%; animation: lg-shine 2.5s linear infinite;
          color: #fff; font-weight: 700; font-size: 12px;
          display: flex; align-items: center; justify-content: center;
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
          transition: width 0.25s ease;
          box-shadow: 0 0 24px rgba(167,139,250,0.7);
        }

        .lg-track-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 14px; }
        .lg-track-pill {
          padding: 5px 12px; border-radius: 999px;
          background: var(--c-track-pill); border: 1px solid var(--c-track-pill-border);
          font-size: 12px; font-weight: 700; color: var(--c-text); letter-spacing: 0.3px;
        }

        .lg-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 24px; }

        .lg-section-title {
          font-size: 12px; font-weight: 700; letter-spacing: 2px;
          color: var(--c-text-dim); text-transform: uppercase;
          text-align: center; padding: 14px 18px;
        }

        .lg-load-row {
          display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px;
        }

        @media (max-width: 720px) {
          .audio-item { flex-wrap: wrap; }
          .track-info { min-width: auto; }
          .volume-booster { min-width: 0; flex: 1 1 100%; }
          .lg-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="lg-bg" />

      <div className="lg-orb" style={{ width: 420, height: 420, top: -80, left: -80, background: 'radial-gradient(circle, #a78bfa, transparent 70%)', animation: 'lg-float1 14s ease-in-out infinite' }} />
      <div className="lg-orb" style={{ width: 380, height: 380, top: '30%', right: -100, background: 'radial-gradient(circle, #0ea5e9, transparent 70%)', animation: 'lg-float2 18s ease-in-out infinite' }} />
      <div className="lg-orb" style={{ width: 340, height: 340, bottom: -80, left: '35%', background: 'radial-gradient(circle, #ec4899, transparent 70%)', animation: 'lg-float3 16s ease-in-out infinite' }} />

      <div className="lg-wrap">
        {/* HEADER */}
        <div className="lg-header lg-glass">
          <div className="lg-header-left">
            <h2 className="lg-title">ALMO · SEPARATOR</h2>
            <p className="lg-subtitle">AI tách nhạc · Liquid Glass Edition</p>
          </div>
          <button
            className="lg-btn lg-theme-toggle"
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            title="Đổi giao diện sáng / tối"
          >
            {isLight ? '🌙 Tối' : '☀️ Sáng'}
          </button>
        </div>

        {/* DROPZONE (auto tách) */}
        <div
          className={`lg-dropzone ${isDragging ? 'lg-drag' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current.click()}
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
              <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.8))' }}>📁</div>
              <p style={{ color: 'var(--c-text)', fontSize: 15, margin: 0 }}>
                Kéo thả file âm thanh vào đây hoặc{' '}
                <b style={{ color: 'var(--c-accent)' }}>Click để chọn file</b>
              </p>
              <p style={{ color: 'var(--c-text-dim)', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                File sẽ được <b>tự động tách nhạc</b> ngay sau khi load · Hỗ trợ MP3 · WAV · M4A · OGG · FLAC
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(236,72,153,0.8))' }}>🎵</div>
              <p style={{ fontWeight: 700, color: 'var(--c-text)', textShadow: 'var(--c-text-shadow)', margin: 0, wordBreak: 'break-all' }}>
                {selectedFile.name}
              </p>
              {selectedFile.size && !isNaN(selectedFile.size / (1024 * 1024)) && (
                <p style={{ fontSize: 12, color: 'var(--c-text-dim)', marginTop: 6, marginBottom: 0 }}>
                  {selectedFile.size > 1024 * 1024
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                </p>
              )}
              <button
                className="lg-btn lg-btn-sm"
                style={{ marginTop: 12 }}
                onClick={(e) => { e.stopPropagation(); clearAll(); }}
              >
                Chọn lại
              </button>
            </div>
          )}
        </div>

        {/* HIDDEN INPUTS + NÚT LOAD */}
        <div className="lg-load-row">
          <input
            type="file"
            hidden
            ref={projectInputRef}
            accept=".zip"
            onChange={(e) => loadSeparatedProject(e.target.files[0])}
          />
          <button className="lg-btn" onClick={() => projectInputRef.current.click()}>
            📂 Load Project (.zip)
          </button>

          <input
            type="file"
            hidden
            ref={mp3InputRef}
            accept="audio/*"
            onChange={(e) => handleLoadMp3(e.target.files[0])}
          />
          <button className="lg-btn" onClick={() => mp3InputRef.current.click()}>
            🎵 Load MP3/WAV (nghe trước)
          </button>
        </div>

        {/* PROGRESS */}
        {isProcessing && (
          <div className="lg-glass" style={{ marginTop: 22, padding: 22, textAlign: 'center' }}>
            <p style={{ color: 'var(--c-text)', fontWeight: 700, textShadow: 'var(--c-text-shadow)', marginTop: 0 }}>
              {status}
            </p>
            <div className="lg-progress" style={{ marginTop: 10 }}>
              <div className="lg-progress-bar" style={{ width: `${progress}%` }}>
                {progress}%
              </div>
            </div>
          </div>
        )}

        {/* MP3 PREVIEW: 1 form giống form Other, có nút Tách nhạc */}
        {mode === 'mp3-preview' && originalAudioUrl && (
          <div style={{ marginTop: 26, animation: 'lg-fade-up 0.5s ease both' }}>
            {/* <div className="lg-glass lg-section-title">
              File gốc · Nghe thử trước khi tách
            </div> */}

            <div className="audio-item lg-glass">
              <div className="track-info">
                <span className="track-label" style={{ marginLeft: 4 }}>🎵 Original</span>
              </div>

              <div className="audio-player">
                <audio
                  ref={mp3AudioRef}
                  src={originalAudioUrl}
                  controls
                  onPlay={() => {
                    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                      audioCtxRef.current.resume();
                    }
                  }}
                />
              </div>

              <div className="volume-booster">
                <span className="vol-label">🔊 {Math.round(mp3Volume * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={mp3Volume}
                  onChange={(e) => handleMp3VolumeChange(e.target.value)}
                  className="vol-slider"
                />
              </div>

              <button
                className="lg-btn lg-btn-primary lg-btn-glow lg-btn-sm"
                disabled={isProcessing}
                onClick={() => processAudio(selectedFile)}
                title="Chạy AI tách thành 4 track"
              >
                ✨ Tách nhạc
              </button>
            </div>
          </div>
        )}

        {/* SEPARATED MODE */}
        {mode === 'separated' && (
          <div style={{ marginTop: 26, animation: 'lg-fade-up 0.5s ease both' }}>
            <div className="lg-glass lg-section-title">
              Kết quả tách nhạc · 4 track
            </div>

            {renderAudioItem('vocal', 'Vocals')}
            {renderAudioItem('drums', 'Drums')}
            {renderAudioItem('bass', 'Bass')}
            {renderAudioItem('other', 'Other')}

            {audioUrls.vocal && (
              <div className="lg-actions" style={{ marginTop: 24 }}>
                <button className="lg-btn lg-btn-primary" onClick={downloadAllTracks}>
                  📦 Tải toàn bộ track (.zip)
                </button>
                <button
                  className="lg-btn"
                  onClick={() => {
                    if (selectedTracks.length > 0) setSelectedTracks([]);
                    else setSelectedTracks(['vocal', 'drums', 'bass', 'other']);
                  }}
                >
                  {selectedTracks.length > 0 ? '✖ Bỏ chọn tất cả' : '✓ Chọn tất cả'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* SELECTED TRACKS ACTIONS */}
        {mode === 'separated' && selectedTracks.length > 0 && (
          <div
            className="lg-glass"
            style={{ margin: '24px auto 0', width: '100%', padding: 24, textAlign: 'center', animation: 'lg-fade-up 0.35s ease both' }}
          >
            <div className="lg-track-pills">
              {selectedTracks.map(t => (
                <span key={t} className="lg-track-pill">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <button className="lg-btn lg-btn-primary" onClick={togglePlaySync}>
                {isPlayingAll ? '⏸ DỪNG TẤT CẢ' : '▶ PHÁT ĐỒNG BỘ'}
              </button>
              <label style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--c-text)', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isLoop}
                  onChange={() => setIsLoop(!isLoop)}
                  style={{ accentColor: 'var(--c-accent)', marginRight: 6, verticalAlign: 'middle' }}
                />
                Lặp lại
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="lg-btn" onClick={() => downloadMixedTracks('wav')} title="Mix các track đã chọn thành WAV">
                ⬇ Tải WAV ({selectedTracks.length})
              </button>
              <button className="lg-btn" onClick={() => downloadMixedTracks('mp3')} title="Mix các track đã chọn thành MP3 192kbps">
                ⬇ Tải MP3 ({selectedTracks.length})
              </button>
            </div>
          </div>
        )}

        {mode === 'separated' && audioUrls.vocal && (
          <>
            {/* <ZingMp3KaraokePlayer audioUrls={audioUrls} artist={artirstName} songTitle={songName}/>
            <LyricMaker /> */}
          </>
        )}
      </div>
    </div>
  );
};

export default AudioSeparator;