import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function VideoWaveCut() {
  const videoRef = useRef(null);
  const waveRef = useRef(null);
  const waveSurferRef = useRef(null);
  const ffmpegRef = useRef(new FFmpeg());
  const activeRegionRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [region, setRegion] = useState({ start: 0, end: 10 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [statusLog, setStatusLog] = useState("");
  // Thêm state để quản lý phần trăm
  const [progress, setProgress] = useState(0);

  // 1. Khởi tạo FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
        const ffmpeg = ffmpegRef.current;
        
        ffmpeg.on("log", ({ message }) => setStatusLog(message));
        
        // Lắng nghe sự kiện progress để cập nhật phần trăm
        ffmpeg.on("progress", ({ progress }) => {
            // Kiểm tra nếu progress hợp lệ (từ 0 đến 1)
            if (progress >= 0 && progress <= 1) {
                const percent = Math.round(progress * 100);
                setProgress(percent);
                setStatusLog(`Đang xử lý: ${percent}%`);
            } else {
                // Nếu giá trị trả về âm hoặc bất thường, hiển thị một trạng thái chờ thay vì số sai
                setStatusLog(`Đang tính toán dữ liệu...`);
            }
            });

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        });
        setLoaded(true);
      } catch (err) { setStatusLog("Lỗi nạp thư viện."); }
    };
    loadFFmpeg();
  }, []);

  // 2. Khởi tạo WaveSurfer khi có Video (Giữ nguyên logic cũ)
  useEffect(() => {
    if (!videoUrl) return;
    if (waveSurferRef.current) waveSurferRef.current.destroy();

    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor: "#d1d5db",
      progressColor: "#3b82f6",
      height: 100,
      cursorColor: "#ff4d4f",
    });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    waveSurferRef.current = ws;
    ws.load(videoUrl);

    ws.on("ready", () => {
      wsRegions.clearRegions();
      const reg = wsRegions.addRegion({
        start: 0,
        end: ws.getDuration() > 10 ? 10 : ws.getDuration(),
        color: "rgba(59, 130, 246, 0.3)",
        drag: true,
        resize: true,
      });
      activeRegionRef.current = reg;
      setRegion({ start: reg.start, end: reg.end });
    });

    wsRegions.on("region-updated", (reg) => {
      setRegion({ start: reg.start, end: reg.end });
      if (videoRef.current) videoRef.current.currentTime = reg.start;
    });

    ws.on("interaction", (newTime) => {
      if (videoRef.current) videoRef.current.currentTime = newTime;
    });

    return () => ws.destroy();
  }, [videoUrl]);

  // 3. Logic giới hạn phát trong vùng chọn (Giữ nguyên)
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < region.start || video.currentTime >= region.end) {
        video.currentTime = region.start;
        waveSurferRef.current.setTime(region.start);
      }
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= region.end) {
      video.pause();
      video.currentTime = region.start;
      setIsPlaying(false);
    }
    if (waveSurferRef.current && video) {
        waveSurferRef.current.setTime(video.currentTime);
    }
  };

  const handleCutVideo = async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    setProgress(0); // Reset phần trăm về 0
    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile("input.mp4", await fetchFile(file));
      await ffmpeg.exec([
        // 1. Tìm vị trí cắt nhanh
        "-ss", region.start.toString(),
        
        // 2. Đầu vào
        "-i", "input.mp4",
        
        // 3. Thời lượng đoạn cắt
        "-t", (region.end - region.start).toString(),
        
        // 4. VIDEO: Copy nguyên bản (để giữ tốc độ siêu nhanh)
        "-c:v", "copy",
        
        // 5. AUDIO: Ép buộc Encode lại sang AAC (để fix lỗi mất tiếng/lệch tiếng)
        "-c:a", "aac",
        "-b:a", "128k", // Chất lượng âm thanh chuẩn
        
        // 6. Fix lỗi mốc thời gian
        "-map", "0",
        "-avoid_negative_ts", "make_zero",
        "-disposition:a", "default", // Đảm bảo luồng âm thanh được chọn làm mặc định
        
        // 7. Đầu ra
        "output.mp4"
        ]);
      const data = await ffmpeg.readFile("output.mp4");
      const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
      let a
      if(typeof document !== 'undefined'){
        document.createElement("a");
      }
      a.href = url;
      a.download = `cut_${file.name}`;
      a.click();
      setStatusLog("Tải xuống hoàn tất!");
    } catch (error) { setStatusLog("Lỗi xử lý."); }
    finally { 
      setIsProcessing(false); 
      setProgress(0);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial' }}>
      <div style={uploadBoxStyle}>
        {!loaded ? <span>Đang nạp hệ thống...</span> : <input type="file" accept="video/*" onChange={(e) => {
            const f = e.target.files[0];
            setFile(f);
            setVideoUrl(URL.createObjectURL(f));
        }} />}
      </div>

      {videoUrl && (
        <div style={editorContainerStyle}>
          <video 
            ref={videoRef} 
            src={videoUrl} 
            width="100%" 
            onTimeUpdate={onTimeUpdate}
            style={{ borderRadius: 8, backgroundColor: "#000" }} 
          />
          
          <div ref={waveRef} style={{ marginTop: 20, background: "#f3f4f6", borderRadius: 8 }} />

          <div style={infoStyle}>
            Vùng cắt: <span>{region.start.toFixed(2)}s</span> → <span>{region.end.toFixed(2)}s</span>
          </div>

          <div style={actionStyle}>
            <button onClick={handlePlayPause} style={btnStyle}>
              {isPlaying ? '⏸ Tạm dừng' : '▶ Xem đoạn chọn'}
            </button>
            
            <button 
              onClick={handleCutVideo} 
              disabled={isProcessing} 
              style={{ 
                ...btnStyle, 
                backgroundColor: isProcessing ? '#666' : '#10b981',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Hiển thị text kèm % trên nút */}
              {isProcessing ? `Đang xử lý ${progress}%` : "💾 Cắt & Tải Video"}
              
              {/* Thanh progress chạy ngầm dưới nút (tùy chọn) */}
              {isProcessing && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '4px',
                  backgroundColor: '#fff',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease'
                }} />
              )}
            </button>
          </div>
          
        </div>
      )}
      <div style={terminalStyle}>{"> "} {statusLog || "Sẵn sàng..."}</div>
    </div>
  );
}

// Styles (Giữ nguyên như cũ)
const terminalStyle = { background: "#1e293b", color: "#38bdf8", marginTop: "15px", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 15, fontFamily: "monospace" };
const uploadBoxStyle = { border: "2px dashed #cbd5e1", padding: 30, textAlign: "center", borderRadius: 8, marginBottom: 20 };
const editorContainerStyle = { background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" };
const infoStyle = { marginTop: 15, textAlign: "center", fontWeight: "bold", color: "#1e293b" };
const actionStyle = { marginTop: 20, display: "flex", gap: 12, justifyContent: "center" };
const btnStyle = { padding: "12px 25px", cursor: "pointer", border: "none", borderRadius: 6, backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", transition: "all 0.3s" };