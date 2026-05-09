import React, { useState } from "react";

const YoutubeMp3Downloader = ({ youtubeUrl }) => {
  const [loading, setLoading] = useState(false);

  const downloadMp3 = async () => {
    if (!youtubeUrl) {
      alert("Không có link YouTube");
      return;
    }

    try {
      setLoading(true);

      // API convert MP3
      const apiUrl = `https://api.vevioz.com/api/button/mp3?url=${encodeURIComponent(
        youtubeUrl
      )}`;

      // mở tab download
      window.open(apiUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Lỗi tải nhạc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadMp3}
      disabled={loading}
      style={{
        padding: "12px 20px",
        border: "none",
        borderRadius: "10px",
        background: "#ff0000",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      {loading ? "Đang xử lý..." : "Tải MP3"}
    </button>
  );
};

export default YoutubeMp3Downloader;