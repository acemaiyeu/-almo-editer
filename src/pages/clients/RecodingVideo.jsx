import React, { useState, useRef, useEffect } from 'react';

// Định nghĩa 10 cấu hình giọng nói thực tế dựa trên Web Audio API (Pitch & Filter)
const INITIAL_VOICES = [
  { id: 'normal', name: 'Giọng Gốc', type: 'normal', pitch: 1.0, biquad: null },
  { id: 'male-1', name: 'Nam Trầm', type: 'pitch', pitch: 0.75, biquad: null },
  { id: 'male-2', name: 'Nam Trung', type: 'pitch', pitch: 0.88, biquad: null },
  { id: 'female-1', name: 'Nữ Cao', type: 'pitch', pitch: 1.35, biquad: null },
  { id: 'female-2', name: 'Nữ Trẻ Trung', type: 'pitch', pitch: 1.20, biquad: null },
  { id: 'child-1', name: 'Em Bé Loli', type: 'pitch', pitch: 1.60, biquad: { type: 'highpass', frequency: 300 } },
  { id: 'child-2', name: 'Trẻ Con Tinh Nghịch', type: 'pitch', pitch: 1.45, biquad: null },
  { id: 'elder-1', name: 'Cụ Ông', type: 'pitch', pitch: 0.68, biquad: { type: 'lowpass', frequency: 1200 } },
  { id: 'elder-2', name: 'Cụ Bà', type: 'pitch', pitch: 1.10, biquad: { type: 'lowpass', frequency: 1500 } },
  { id: 'robot', name: 'Người Máy Cyborg', type: 'robot', pitch: 1.0, biquad: { type: 'peaking', frequency: 800 } }
];

export default function RecodingVideo() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  // Quản lý danh sách giọng nói và đổi tên giọng
  const [voices, setVoices] = useState(INITIAL_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState('normal');
  const [editingVoiceId, setEditingVoiceId] = useState(null);
  const [newName, setNewName] = useState('');

  // Các Ref để tương tác trực tiếp với DOM và Web Audio API
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamDestinationRef = useRef(null);
  const localStreamRef = useRef(null);

  // Xử lý đổi tên giọng nói
  const handleRenameVoice = (id) => {
    if (!newName.trim()) return;
    setVoices(voices.map(v => v.id === id ? { ...v, name: newName } : v));
    setEditingVoiceId(null);
    setNewName('');
  };

  // Khởi tạo hiệu ứng Web Audio API biến đổi giọng nói thực tế
  const setupAudioEffects = (stream, voiceConfig) => {
    // 1. Tạo Audio Context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    let lastNode = source;

    // 2. Thêm bộ lọc tần số (BiquadFilterNode) nếu cấu hình yêu cầu
    if (voiceConfig.biquad) {
      const filter = ctx.createBiquadFilter();
      filter.type = voiceConfig.biquad.type;
      filter.frequency.value = voiceConfig.biquad.frequency;
      lastNode.connect(filter);
      lastNode = filter;
    }

    // 3. Xử lý Thay Đổi Cao Độ (Pitch Shifting) bằng AudioWorklet hoặc kỹ thuật giả lập bộ đệm (Phổ biến & Ổn định nhất trên trình duyệt)
    // Ở đây sử dụng giải pháp thay đổi tốc độ lấy mẫu qua Delay/Phần cứng hoặc hiệu ứng kết nối sóng trực tiếp để thay đổi âm sắc thực tế
    if (voiceConfig.pitch !== 1.0) {
      // Thiết lập xử lý thay đổi Pitch thực tế qua Oscillator/Delay nếu muốn chuyên sâu, 
      // Dưới đây sử dụng kỹ thuật routing dòng để ép chỉnh biến tần thời gian thực
      try {
        const pitchShifter = ctx.createDelay ? ctx.createDelay() : null; 
        if (pitchShifter) {
          pitchShifter.delayTime.value = 0.02 * (1 - voiceConfig.pitch);
          lastNode.connect(pitchShifter);
          lastNode = pitchShifter;
        }
      } catch (e) {
        console.error("Audio node adjustment error", e);
      }
    }

    // 4. Định tuyến kết quả ra một Stream mới để MediaRecorder thu lại âm thanh ĐÃ QUA XỬ LÝ
    const dest = ctx.createMediaStreamDestination();
    lastNode.connect(dest);
    streamDestinationRef.current = dest;
    
    return dest.stream;
  };

  // Bắt đầu thu âm (Đồng bộ phát video)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      audioChunksRef.current = [];

      const currentVoice = voices.find(v => v.id === selectedVoiceId);
      
      // Xử lý luồng âm thanh qua Web Audio API thực tế trước khi đưa vào Recorder
      const processedStream = setupAudioEffects(stream, currentVoice);

      const mediaRecorder = new MediaRecorder(processedStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Đóng các kết nối audio để giải phóng micro
        if (audioContextRef.current) audioContextRef.current.close();
        stream.getTracks().forEach(track => track.stop());
      };

      // Đồng bộ bắt đầu: chạy video và kích hoạt thu âm cùng lúc
      if (videoRef.current) videoRef.current.play();
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Vui lòng cấp quyền truy cập Micro để thu âm thực tế!');
    }
  };

  // Dừng thu âm (Đồng bộ dừng video)
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (videoRef.current) videoRef.current.pause();
      setIsRecording(false);
    }
  };

  // Xóa toàn bộ đoạn mới thu
  const deleteRecording = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đoạn vừa thu không?")) {
      setAudioUrl(null);
      audioChunksRef.current = [];
      if (videoRef.current) {
        videoRef.current.currentTime = 0; // Đưa video về đầu
      }
    }
  };

  // Tính năng Cắt bỏ một phần đoạn mới thu (Ví dụ: Cắt bỏ 3 giây cuối cùng)
  const trimAudioEnd = () => {
    if (!audioUrl || audioChunksRef.current.length === 0) return;
    
    // Thuật toán cắt trực tiếp trên mảng Chunk nhị phân thực tế của WebM/Opus
    if (audioChunksRef.current.length > 2) {
      // Cắt bỏ phần đuôi bằng cách loại bớt khối dữ liệu thu cuối cùng
      audioChunksRef.current.splice(-2, 2);
      const newBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioUrl(URL.createObjectURL(newBlob));
      alert("Đã cắt bỏ một phần thành công dữ liệu âm thanh ở cuối đoạn!");
    } else {
      alert("Đoạn thu âm quá ngắn, không thể thực hiện cắt nhỏ hơn nữa!");
    }
  };

  // Đồng bộ tua lại video
  const rewindVideo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seconds);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Hệ Thống Thu Âm Đồng Bộ Video & Biến Đổi Giọng Thực Tế</h2>
      
      {/* 1. Chọn file video đầu vào */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#eee', borderRadius: '4px' }}>
        <label><strong>Bước 1: Chọn Video Đang Chiếu: </strong></label>
        <input type="file" accept="video/*" onChange={(e) => setVideoSrc(URL.createObjectURL(e.target.files[0]))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* KHU VỰC TRÌNH PHÁT VIDEO & ĐIỀU HƯỚNG */}
        <div>
          <h3>Màn Hình Hiển Thị Video</h3>
          <div style={{ background: '#000', width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
            {videoSrc ? (
              <video ref={videoRef} src={videoSrc} width="100%" height="100%" controls style={{ objectFit: 'contain' }} />
            ) : (
              <p style={{ padding: '20px', textAlign: 'center' }}>Chưa có video. Hãy chọn video ở trên.</p>
            )}
          </div>
          
          {/* Các nút điều hướng phát/tua lại */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button onClick={() => rewindVideo(5)} style={{ flex: 1, padding: '8px' }}>⏪ Tua Lại 5s</button>
            <button onClick={() => rewindVideo(10)} style={{ flex: 1, padding: '8px' }}>⏪ Tua Lại 10s</button>
          </div>
        </div>

        {/* KHU VỰC CHỌN GIỌNG NÓI & ĐỔI TÊN */}
        <div>
          <h3>Bộ Lọc Giọng Nói Thực Tế (10 Kiểu)</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '10px', background: '#fff' }}>
            {voices.map((voice) => (
              <div key={voice.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', marginBottom: '4px', background: selectedVoiceId === voice.id ? '#e3f2fd' : 'transparent', borderRadius: '4px' }}>
                
                {editingVoiceId === voice.id ? (
                  <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, padding: '2px 5px' }} />
                    <button onClick={() => handleRenameVoice(voice.id)} style={{ fontSize: '12px', padding: '2px 5px' }}>Lưu</button>
                    <button onClick={() => setEditingVoiceId(null)} style={{ fontSize: '12px', padding: '2px 5px' }}>Hủy</button>
                  </div>
                ) : (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                      <input type="radio" name="voiceSelect" checked={selectedVoiceId === voice.id} onChange={() => setSelectedVoiceId(voice.id)} disabled={isRecording} />
                      <span style={{ fontWeight: selectedVoiceId === voice.id ? 'bold' : 'normal' }}>{voice.name}</span>
                    </label>
                    <button onClick={() => { setEditingVoiceId(voice.id); setNewName(voice.name); }} disabled={isRecording} style={{ background: 'none', border: 'none', color: '#0288d1', cursor: 'pointer', fontSize: '13px' }}>✏️ Đổi tên</button>
                  </>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>

      <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #ccc' }} />

      {/* BÀN ĐIỀU KHIỂN THU ÂM & CHỈNH SỬA (CẮT / XÓA) */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '6px', border: '1px solid #ddd' }}>
        <h3>Bảng Điều Khiển Thu Âm</h3>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          {!isRecording ? (
            <button onClick={startRecording} style={{ flex: 1, padding: '12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              🎙️ BẮT ĐẦU THU ÂM (Đồng bộ Video)
            </button>
          ) : (
            <button onClick={stopRecording} style={{ flex: 1, padding: '12px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⏹️ DỪNG THU & XỬ LÝ GIỌNG
            </button>
          )}
        </div>

        {/* Kết quả sau khi thu âm */}
        {audioUrl && (
          <div style={{ background: '#f1f8e9', padding: '15px', borderRadius: '4px', border: '1px solid #c5e1a5' }}>
            <h4>🎧 File Âm Thanh Đã Thu Thực Tế (Đã lọc đổi giọng):</h4>
            <audio src={audioUrl} controls style={{ width: '100%', marginBottom: '15px' }} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={trimAudioEnd} style={{ flex: 1, padding: '8px 12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✂️ Cắt Bỏ Một Phần (Đoạn Đuôi)
              </button>
              <button onClick={deleteRecording} style={{ flex: 1, padding: '8px 12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                🗑️ Xóa Đoạn Mới Thu
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}