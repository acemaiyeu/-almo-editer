// src/pages/clients/components/VideoStage.jsx
import { forwardRef, useRef, useState } from 'react'

const VideoStage = forwardRef(function VideoStage(
  {
    videoUrl,
    onLoadedMetadata,
    onFile,
    hasSegments,
    skipUndubbed,
    setSkipUndubbed,
    dubbedCount,
    analyzing,
    onManualToggle, // App thông báo: user chủ động play/pause → thoát khỏi chế độ phát đoạn
  },
  ref
) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div className="stage glass">
      {!videoUrl ? (
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="drop-icon">▶</div>
          <h2>Kéo video vào đây</h2>
          <p>hoặc bấm để chọn file</p>
          <small>MP4 · WebM · MOV</small>
        </div>
      ) : (
        <>
          {/* .video-shell tách stacking context để video nằm TRÊN .glass::before */}
          <div className="video-shell">
            <video
              ref={ref}
              src={videoUrl}
              className="video"
              onLoadedMetadata={onLoadedMetadata}
              playsInline
              preload="auto"
            />
          </div>

          {analyzing && (
            <div className="stage-overlay">
              <div className="spinner" />
              <p>Đang phân tích âm thanh…</p>
            </div>
          )}

          {hasSegments && (
            <div className="stage-controls">
              <label className="toggle glass">
                <input
                  type="checkbox"
                  checked={skipUndubbed}
                  onChange={(e) => setSkipUndubbed(e.target.checked)}
                />
                <span>Chỉ đoạn đã lồng ({dubbedCount})</span>
              </label>
              <button
                className="btn glass small"
                onClick={() => {
                  const v = ref.current
                  if (!v) return
                  onManualToggle?.()
                  v.paused ? v.play() : v.pause()
                }}
              >
                ▶ / ❚❚
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default VideoStage