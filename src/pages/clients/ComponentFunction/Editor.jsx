import React, { useState, useEffect, useRef } from 'react';
import '../../../style/Editor.css';
import { toast } from 'react-toastify';
import custom_text from '../../../../public/img/custom-text.png'

const Editor = () => {
  const [cssCode, setCssCode] = useState(
    'color: white; font-size: 60px; font-weight: 900;'
  );

  const [keyframeCode, setKeyframeCode] = useState(`
@keyframes neon2 {
  0%, 100% { text-shadow: 0 0 20px #fff, 0 0 30px #0fa; opacity: 1; }
  50% { text-shadow: none; opacity: 0.6; }
}

@keyframes zoom-in {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
`);

  const [effect, setEffect] = useState('neon2');
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const styleElementRef = useRef(null);

  // Inject CSS vào <head>
  useEffect(() => {
    if (!styleElementRef.current && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.id = 'dynamic-runtime-css';
      document.head.appendChild(style);
      styleElementRef.current = style;
    }

    styleElementRef.current.textContent = `
      #title-preview {
        ${cssCode}
      }

      ${keyframeCode}
    `;

    return () => {
      if (styleElementRef.current && typeof document !== 'undefined') {
        document.head.removeChild(styleElementRef.current);
        styleElementRef.current = null;
      }
    };
  }, [cssCode, keyframeCode]);

  // Run animation (force re-render)
  const handleRun = () => {
    setIsPlaying(false);

    requestAnimationFrame(() => {
      setAnimationKey(prev => prev + 1);
      setIsPlaying(true);
    });
  };
const changeNameToEnglish = (input) => {
  try {
    if (!input) throw new Error("Dữ liệu đầu vào trống");

    // Hàm phụ để bỏ dấu tiếng Việt
    const removeVietnameseTones = (str) => {
      return str
        .normalize("NFD") // Tách các dấu ra khỏi chữ cái
        .replace(/[\u0300-\u036f]/g, "") // Xóa các dấu
        .replace(/đ/g, "d").replace(/Đ/g, "D"); // Xử lý chữ đ đặc biệt
    };

    // Xử lý chuỗi chính
    const cleanString = removeVietnameseTones(input)
      .toLowerCase()              // Chuyển về chữ thường
      .replace(/\s+/g, "")        // Xóa tất cả khoảng trắng
      .replace(/[^a-z0-9:-]/g, ""); // Xóa các ký tự đặc biệt (chỉ giữ chữ, số, dấu : và -)

    return cleanString;

  } catch (error) {
    console.error("Lỗi:", error.message);
    return "";
  }
};

  const handleSave = () => {
    let list_effect_custom = localStorage.getItem("list_effect_custom") !== null ? JSON.parse(localStorage.getItem("list_effect_custom")) : []
    let effect_custom = localStorage.getItem("effect_custom") !== null ? localStorage.getItem("effect_custom") : ""
    const name_effect = prompt("Vui lòng đặt tên của bạn:");
    const code_effect = changeNameToEnglish(name_effect)
    localStorage.setItem("effect_custom", effect_custom + " " + keyframeCode),
    list_effect_custom.push({code: code_effect, name: name_effect, thumbnail: custom_text})
    localStorage.setItem("list_effect_custom", JSON.stringify(list_effect_custom))
    toast.success("Đã thêm thành công!")
  };
  const handleChangeCss = (str_css) => {
    try{
      const result = str_css
        .split(";")
        .filter(item => item.trim() !== "")
        .reduce((acc, item) => {
          const [key, value] = item.split(":");
          acc[key.trim()] = value.trim(); // Gán key và value vào object tích lũy
          return acc;
        }, {});
          return result;
    }catch(e){
        console.log(e)
    }
  }
  return (
    <div className="editor-container">
      <div className="editor-header">
        {/* CSS */}
        <div className="editor-panel">
          <div className="panel-title">CSS</div>
          <textarea
            className="editor-textarea"
            value={cssCode}
            onChange={(e) => {
              setCssCode(e.target.value);
              setIsPlaying(false);
            }}
          />
        </div>

        {/* Keyframes */}
        <div className="editor-panel">
          <div className="panel-title">Keyframes</div>
          <textarea
            className="editor-textarea"
            value={keyframeCode}
            onChange={(e) => {
              setKeyframeCode(e.target.value);
              setIsPlaying(false);
            }}
          />
        </div>

        {/* Controls */}
        <div className="editor-panel">
          <div className="panel-title">Controls</div>
          <div className="controls">
            <select
              value={effect}
              onChange={(e) => {
                setEffect(e.target.value);
                setIsPlaying(false);
              }}
            >
              <option value="neon2">Neon Effect</option>
              <option value="zoom-in">Zoom In</option>
              <option value="none">No Animation</option>
            </select>

            <button className="btn-run" onClick={handleRun}>
              Run
            </button>
            <button className="btn-save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="preview-area">
        <div
          key={animationKey}
          id="title-preview"
          style={{
            ...handleChangeCss(cssCode),
            animation:
              isPlaying && effect !== 'none'
                ? `${effect} 2s infinite alternate`
                : 'none'
          }}
        >
          Almo Editor
        </div>
      </div>
    </div>
  );
};

export default Editor;