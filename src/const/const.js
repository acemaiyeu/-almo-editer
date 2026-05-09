const isDevHost = window.location.hostname.startsWith("localhost") || window.location.hostname.startsWith("192.168")

export const API_URL = isDevHost ? "http://192.168.31.81:8000" : "https://almobe.io.vn"
// export const API_URL = "https://almobe.io.vn"

export const exportClientSide = async () => {
  try {
    // Yêu cầu người dùng chọn cửa sổ/tab để quay (chọn đúng cái tab đang chạy)
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "never" },
      audio: true
    });

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
       const blob = new Blob(chunks, { type: 'video/webm' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = 'render-result.webm';
       a.click();
    };

    recorder.start();
    playerRef.current.seekTo(0);
    playerRef.current.play();

    // Tự động dừng dựa trên duration
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(track => track.stop()); // Tắt luồng quay
      playerRef.current.pause();
    }, duration * 1000);

  } catch (err) {
    console.error("Lỗi quay màn hình:", err);
  }
};