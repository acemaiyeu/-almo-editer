import React, { useState } from "react";
import { toast } from "react-toastify";

const YoutubeMp3Downloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.warn("Vui lòng nhập link YouTube");
      return;
    }

    try {
      setLoading(true);

      // chất lượng cao nhất mp3
      const downloadUrl = `https://v19.www-y2mate.com/search?q=${url}`;

      // mở tab tải
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 500,
        margin: "50px auto",
        padding: 20,
        borderRadius: 16,
        background: "#1e1e1e",
        color: "#fff",
        fontFamily: "Arial",
      }}
    >
      <h2 style={{ marginBottom: 15 }}>
        YouTube MP3 Downloader
      </h2>

      <input
        type="text"
        placeholder="Dán link YouTube..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #333",
          outline: "none",
          marginBottom: 15,
          background: "#111",
          color: "#fff",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          border: "none",
          borderRadius: 10,
          background: "#ff0000",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Đang xử lý..." : "Qua trang tải"}
      </button>
    </div>
  );
};

export default YoutubeMp3Downloader;