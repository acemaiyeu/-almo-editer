import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../../style/Mp4ToMp3Converter.scss';

// ============================================================
// WAV Blob → MP3 Blob (dùng lamejs CDN)
// ============================================================
async function wavBlobToMp3(wavBlob, bitrate = 192, logger) {
  logger?.('info', `[MP3] Bắt đầu encode @ ${bitrate} kbps...`);
  const t0 = performance.now();

  // Load lamejs từ CDN qua <script> tag — bypass Vite bundler
  if (!window.lamejs) {
    logger?.('debug', '[MP3] Đang tải lamejs từ CDN...');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Không tải được lamejs từ CDN'));
      document.head.appendChild(s);
    });
    logger?.('debug', '[MP3] ✅ Đã tải lamejs');
  }

  const Mp3Encoder = window.lamejs?.Mp3Encoder;
  if (!Mp3Encoder) throw new Error('window.lamejs.Mp3Encoder không tồn tại');

  const arrayBuffer = await wavBlob.arrayBuffer();
  const dataView = new DataView(arrayBuffer);

  const numChannels = dataView.getUint16(22, true);
  const sampleRate = dataView.getUint32(24, true);
  const bitsPerSample = dataView.getUint16(34, true);
  const dataOffset = 44;
  const numSamples = (arrayBuffer.byteLength - dataOffset) / (numChannels * (bitsPerSample / 8));

  logger?.('debug', `[MP3] WAV: ${numChannels}ch ${sampleRate}Hz ${bitsPerSample}bit — ${numSamples} samples`);

  const left = new Int16Array(numSamples);
  const right = numChannels > 1 ? new Int16Array(numSamples) : null;

  let p = dataOffset;
  for (let i = 0; i < numSamples; i++) {
    left[i] = dataView.getInt16(p, true); p += 2;
    if (numChannels > 1) {
      right[i] = dataView.getInt16(p, true); p += 2;
    }
  }

  const encoder = new Mp3Encoder(numChannels, sampleRate, bitrate);
  const blockSize = 1152;
  const mp3Data = [];

  for (let i = 0; i < numSamples; i += blockSize) {
    const lChunk = left.subarray(i, i + blockSize);
    const rChunk = right ? right.subarray(i, i + blockSize) : null;
    const buf = numChannels > 1
      ? encoder.encodeBuffer(lChunk, rChunk)
      : encoder.encodeBuffer(lChunk);
    if (buf.length > 0) mp3Data.push(new Int8Array(buf));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(new Int8Array(end));

  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  logger?.('success', `[MP3] ✅ Xong ${(blob.size / 1024).toFixed(0)} KB trong ${(performance.now() - t0).toFixed(0)}ms`);
  return blob;
}

// ============================================================
// Float32 stereo → WAV Blob
// ============================================================
function stereoToWav(left, right, sampleRate) {
  const numOfChan = 2;
  const length = left.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let pos = 0;

  const setUint16 = (d) => { view.setUint16(pos, d, true); pos += 2; };
  const setUint32 = (d) => { view.setUint32(pos, d, true); pos += 4; };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  let offset = 0;
  while (pos < length) {
    let sL = Math.max(-1, Math.min(1, left[offset]));
    let sR = Math.max(-1, Math.min(1, right[offset]));
    sL = sL < 0 ? sL * 32768 : sL * 32767;
    sR = sR < 0 ? sR * 32768 : sR * 32767;
    view.setInt16(pos, sL, true); pos += 2;
    view.setInt16(pos, sR, true); pos += 2;
    offset++;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// ============================================================
// COMPONENT
// ============================================================
const Mp4ToMp3Converter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Kết quả
  const [mp3Url, setMp3Url] = useState(null);
  const [mp3Blob, setMp3Blob] = useState(null);

  // Log
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const fileInputRef = useRef(null);
  const abortRef = useRef(false);

  const log = useCallback((level, message) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs(prev => {
      const next = [...prev, { time, level, message, id: prev.length + Math.random() }];
      return next.length > 500 ? next.slice(-500) : next;
    });
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${time}] [${level.toUpperCase()}]`, message);
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    return () => {
      if (mp3Url) URL.revokeObjectURL(mp3Url);
    };
  }, [mp3Url]);

  const handleFileChange = async (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4');
    if (!isVideo) {
      log('error', `File không hợp lệ: ${file.name}`);
      alert('Vui lòng chọn file video MP4 hợp lệ!');
      return;
    }

    setSelectedFile(file);
    setMp3Url(null);
    setMp3Blob(null);
    setProgress(0);
    setIsProcessing(true);
    abortRef.current = false;

    log('info', '════════════════════════════════════════');
    log('info', `▶ Bắt đầu: ${file.name}`);
    log('info', `  Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    try {
      // ===== BƯỚC 1: Decode MP4 → PCM =====
      setStatus('Đang trích xuất âm thanh...');
      log('info', '[1/3] Decode MP4 → PCM...');

      const t0 = performance.now();
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

      log('success', `[1/3] ✅ Decode xong: ${audioBuffer.duration.toFixed(1)}s | ` +
        `${audioBuffer.numberOfChannels}ch | ${audioBuffer.sampleRate}Hz | ` +
        `${(performance.now() - t0).toFixed(0)}ms`);

      const totalSamples = audioBuffer.length;
      const leftFull = new Float32Array(totalSamples);
      const rightFull = new Float32Array(totalSamples);
      leftFull.set(audioBuffer.getChannelData(0));
      rightFull.set(
        audioBuffer.numberOfChannels > 1
          ? audioBuffer.getChannelData(1)
          : audioBuffer.getChannelData(0)
      );
      await audioCtx.close();

      if (abortRef.current) throw new Error('Đã huỷ bởi người dùng');

      // ===== BƯỚC 2: Float32 → WAV =====
      setStatus('Đang đóng gói WAV...');
      log('info', '[2/3] Float32 → WAV...');
      setProgress(50);

      const wavBlob = stereoToWav(leftFull, rightFull, audioBuffer.sampleRate);
      log('success', `[2/3] ✅ WAV: ${(wavBlob.size / 1024 / 1024).toFixed(2)} MB`);

      if (abortRef.current) throw new Error('Đã huỷ bởi người dùng');

      // ===== BƯỚC 3: WAV → MP3 =====
      setStatus('Đang mã hoá MP3...');
      log('info', '[3/3] WAV → MP3...');
      setProgress(70);

      const mp3 = await wavBlobToMp3(wavBlob, 192, log);
      setProgress(100);

      setMp3Blob(mp3);
      setMp3Url(URL.createObjectURL(mp3));

      setStatus('Hoàn tất!');
      document.title = 'ALMO - EDITOR';
      log('success', '════════════════════════════════════════');
      log('success', `🎉 HOÀN TẤT! MP3 ${(mp3.size / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.error(err);
      setStatus('Lỗi: ' + err.message);
      log('error', `❌ ${err.message}`);
      if (err.stack) log('debug', err.stack.split('\n').slice(0, 3).join(' | '));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  const downloadMp3 = () => {
    if (!mp3Blob) return;
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    const baseName = (selectedFile?.name || 'audio').replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${baseName}.mp3`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    log('info', `⬇ Đã tải: ${baseName}.mp3`);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="mp4-to-mp3" style={{ padding: 20, fontFamily: 'Arial', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-main)', textAlign: 'center' }}>
        CHUYỂN MP4 → MP3
      </h2>

      {/* DROP ZONE */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isProcessing && fileInputRef.current.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-main)' : '#ccc'}`,
          borderRadius: 15,
          padding: 40,
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          transition: 'all .3s ease',
          marginBottom: 20,
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="video/mp4,video/*"
          onChange={(e) => handleFileChange(e.target.files[0])}
          disabled={isProcessing}
        />

        {!selectedFile ? (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
            <p>Kéo thả file <b>MP4</b> vào đây hoặc <b>Click để chọn file</b></p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎞️</div>
            <p style={{ fontWeight: 'bold', color: 'var(--color-main)' }}>{selectedFile.name}</p>
            <div style={{ fontSize: 12, color: '#666' }}>
              <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            {!isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setMp3Url(null);
                  setMp3Blob(null);
                  log('info', '↺ Đã reset');
                }}
                style={{
                  background: 'none', border: 'none', color: 'red',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Chọn lại
              </button>
            )}
          </div>
        )}
      </div>

      {/* PROGRESS */}
      {isProcessing && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-main)', fontWeight: 'bold' }}>{status}</p>
          <div style={{ width: '100%', height: 20, borderRadius: 10, backgroundColor: '#e9ecef', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--color-main)',
                height: 20,
                transition: 'width .2s',
                color: '#fff',
                fontSize: 12,
                lineHeight: '20px',
              }}
            >
              {progress}%
            </div>
          </div>
        </div>
      )}

      {/* KẾT QUẢ */}
      {mp3Url && (
        <div className="result-item" style={{ marginTop: 30 }}>
          <h4>🎵 MP3</h4>
          <audio src={mp3Url} controls style={{ width: '100%' }} />
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button onClick={downloadMp3} className="download-btn primary">
              ⬇ Tải về {(mp3Blob?.size / 1024).toFixed(0)} KB
            </button>
          </div>
        </div>
      )}

      {/* LOG PANEL */}
      <div style={{
        marginTop: 30,
        border: '1px solid #333',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#1e1e1e',
        fontFamily: 'Consolas, "Courier New", monospace',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', background: '#252526', borderBottom: '1px solid #333',
          color: '#ccc', fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#4ec9b0', fontWeight: 'bold' }}>▶ Console Log</span>
            <span style={{ color: '#888', fontSize: 12 }}>({logs.length} dòng)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#aaa', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ marginRight: 4 }}
              />
              Auto-scroll
            </label>
            <button
              onClick={clearLogs}
              style={{
                background: '#3c3c3c', color: '#ccc', border: '1px solid #555',
                padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}
            >
              🗑 Xoá log
            </button>
          </div>
        </div>

        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
            if (!atBottom && autoScroll) setAutoScroll(false);
          }}
          style={{
            height: 320, overflowY: 'auto', padding: '10px 14px',
            color: '#d4d4d4', fontSize: 12.5, lineHeight: 1.5,
            background: '#1e1e1e',
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Chưa có log. Chọn 1 file MP4 để bắt đầu...
            </div>
          ) : (
            logs.map((entry) => {
              const color =
                entry.level === 'error' ? '#f48771' :
                entry.level === 'warn' ? '#dcdcaa' :
                entry.level === 'success' ? '#4ec9b0' :
                entry.level === 'debug' ? '#9cdcfe' : '#d4d4d4';
              return (
                <div key={entry.id} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <span style={{ color: '#666' }}>[{entry.time}]</span>{' '}
                  {entry.message}
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default Mp4ToMp3Converter;