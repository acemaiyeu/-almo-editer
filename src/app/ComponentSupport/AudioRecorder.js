import React, { Component } from 'react';

class AudioRecorder extends Component {
  constructor(props) {
    super(props);
    this.state = {
      recording: false,
      recordings: [], // Danh sách các file đã ghi
    };

    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  // Bắt đầu thu âm khi nhấn giữ chuột
  startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const timestamp = new Date().toLocaleString();

        this.setState((prevState) => ({
          recordings: [...prevState.recordings, { url: audioUrl, time: timestamp }],
        }));
        
        // Dừng tất cả tracks để tắt đèn báo micro trên trình duyệt
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.setState({ recording: true });
    } catch (err) {
      console.error("Không thể truy cập micro:", err);
      alert("Vui lòng cho phép quyền truy cập micro!");
    }
  };

  // Dừng thu âm khi buông chuột
  stopRecording = () => {
    if (this.mediaRecorder && this.state.recording) {
      this.mediaRecorder.stop();
      this.setState({ recording: false });
    }
  };

  render() {
    const { recording, recordings } = this.state;

    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2>Bộ Ghi Âm Của Tôi</h2>

        {/* Nút bấm giữ để thu âm */}
        <button
          onMouseDown={this.startRecording}
          onMouseUp={this.stopRecording}
          onMouseLeave={this.stopRecording} // Đề phòng trường hợp rê chuột ra ngoài khi đang nhấn
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: recording ? '#ff4d4d' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: '0.3s'
          }}
        >
          {recording ? '🔴 Đang thu âm... (Buông để dừng)' : '🎤 Nhấn và Giữ để thu âm'}
        </button>

        <hr style={{ margin: '20px 0' }} />

        <h3>Danh sách đoạn ghi âm</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {recordings.length === 0 && <p>Chưa có đoạn ghi âm nào.</p>}
          {recordings.map((rec, index) => (
            <li key={index} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <div><strong>Ghi âm #{index + 1}</strong> - <small>{rec.time}</small></div>
              <audio src={rec.url} controls style={{ marginTop: '5px' }} />
              <br />
              <a href={rec.url} download={`record-${index + 1}.wav`} style={{ fontSize: '12px', color: '#007bff' }}>
                Tải về máy
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default AudioRecorder;