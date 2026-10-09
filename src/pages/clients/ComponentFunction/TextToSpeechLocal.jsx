import React, { useState } from 'react';

const TextToSpeechLocal = () => {
  const [text, setText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Hàm tạo link file MP3 trực tiếp từ Google TTS
  const createMp3Url = (content) => {
    const encodedText = encodeURIComponent(content);
    // Endpoint Google Translate TTS trả về file .mp3 chuẩn
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=vi&client=tw-ob`;
  };

  // 2. Gọi Ollama trực tiếp từ React JS
  const handleProcessAndSynthesize = async () => {
    if (!text.trim()) {
      alert('Vui lòng nhập văn bản!');
      return;
    }

    setLoading(true);
    setError(null);
    setProcessedText('');
    setAudioUrl('');

    try {
      // Gọi trực tiếp Ollama API đang chạy ở Local
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:1b',
          prompt: `Bạn là trợ lý tiếng Việt. Hãy sửa lỗi chính tả và ngắt nghỉ cho văn bản sau để đọc TTS tự nhiên hơn. CHỈ trả về văn bản đã sửa, không giải thích thêm:\n\n${text}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Không kết nối được Ollama! Bạn đã bật "set OLLAMA_ORIGINS=*" chưa?');
      }

      const data = await response.json();
      const cleanedText = data.response ? data.response.trim() : text;

      setProcessedText(cleanedText);

      // Tạo URL MP3 từ văn bản Llama 3.2 vừa xử lý
      const mp3 = createMp3Url(cleanedText);
      setAudioUrl(mp3);

    } catch (err) {
      console.error('Lỗi React TTS:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>React JS + Ollama (Llama 3.2:1b) TTS</h2>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Nhập văn bản cần đọc:</label>
        <textarea
          style={styles.textarea}
          rows="5"
          placeholder="Nhập đoạn văn bản tiếng Việt..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <button
        style={{
          ...styles.button,
          backgroundColor: loading ? '#ccc' : '#0070f3',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
        onClick={handleProcessAndSynthesize}
        disabled={loading}
      >
        {loading ? 'Llama 3.2 đang xử lý...' : '⚡ Tối ưu & Tạo file MP3'}
      </button>

      {error && (
        <div style={styles.errorBox}>
          <strong>Lỗi:</strong> {error}
        </div>
      )}

      {/* Hiển thị văn bản Ollama tối ưu */}
      {processedText && (
        <div style={styles.resultBox}>
          <h4 style={styles.subTitle}>🤖 Văn bản Llama 3.2:1b đã sửa:</h4>
          <p style={styles.processedContent}>{processedText}</p>
        </div>
      )}

      {/* Trình phát & Tải file MP3 */}
      {audioUrl && (
        <div style={styles.audioBox}>
          <h4 style={styles.subTitle}>🔊 Audio MP3:</h4>
          <audio controls autoPlay src={audioUrl} style={styles.audioPlayer}>
            Trình duyệt không hỗ trợ phát âm thanh.
          </audio>
          <div style={{ marginTop: '10px' }}>
            <a href={audioUrl} target="_blank" rel="noreferrer" download="speech.mp3" style={styles.downloadBtn}>
              ⬇ Tải file .MP3 về máy
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    fontFamily: 'Segoe UI, Tahoma, sans-serif',
  },
  title: { textAlign: 'center', marginBottom: '20px', fontSize: '18px' },
  fieldGroup: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold' },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
  },
  resultBox: {
    marginTop: '20px',
    padding: '14px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    borderLeft: '4px solid #0070f3',
  },
  audioBox: {
    marginTop: '16px',
    padding: '14px',
    backgroundColor: '#e6f7ff',
    borderRadius: '8px',
    borderLeft: '4px solid #1890ff',
  },
  subTitle: { margin: '0 0 8px 0', fontSize: '15px' },
  processedContent: { margin: 0, color: '#444', lineHeight: '1.5' },
  audioPlayer: { width: '100%', marginTop: '8px' },
  downloadBtn: {
    display: 'inline-block',
    padding: '8px 12px',
    backgroundColor: '#52c41a',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

export default TextToSpeechLocal;