import React, { useState, useRef } from "react";
import '../../../style/ImportMedia.scss'
import { useDispatch } from "react-redux";
import { updateTextEffect } from "../../../app/features/textEffectSlice";

const ImportMedia = () => {
  const [mediaList, setMediaList] = useState([]);
  const fileInputRef = useRef(null);
    const dispatch = useDispatch();
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const newItems = selectedFiles.map((file) => {
      const blobUrl = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        url: blobUrl,
        type: file.type,
        name: file.name,
      };
    });

    setMediaList((prev) => [...prev, ...newItems]);
    e.target.value = null; // Reset input để có thể chọn lại cùng 1 file
  };

  const removeMedia = (id, url) => {
    URL.revokeObjectURL(url);
    setMediaList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="import-media-container">
      <input
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden-input"
      />

      <button 
        className="import-button" 
        onClick={() => fileInputRef.current.click()}
      >
        + Import Media
      </button>

      <div className="media-grid">
        {mediaList.map((item) => (
          <div key={item.id} className="media-card">
            <div className="media-card-modal" onClick={(e) => {
             dispatch(updateTextEffect({
                audioUrl: item.url,
             }))
            }}>
              Sử dụng
            </div>
            <button 
              className="delete-btn" 
              onClick={() => removeMedia(item.id, item.url)}
            >
              ×
            </button>

            <div className="media-wrapper">
              {item.type.startsWith("image/") && (
                <img src={item.url} alt="preview" />
              )}

              {item.type.startsWith("video/") && (
                <video src={item.url} controls />
              )}

              {item.type.startsWith("audio/") && (
                <audio src={item.url} controls />
              )}
            </div>
            
            <p className="file-name" title={item.name}>
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImportMedia;