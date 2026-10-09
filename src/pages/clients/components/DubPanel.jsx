// src/pages/clients/components/DubPanel.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import SegmentWaveform from './SegmentWaveform'

export default function DubPanel({
  segment,
  videoRef,
  onUpdate,
  onSaveTake,
  onSelectTake,
  onDeleteTake,
  notify,
}) {
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [previewId, setPreviewId] = useState(null)

  const mediaRef = useRef({ recorder: null, chunks: [], stream: null, cancelled: false })
  const previewRef = useRef(null)

  const cancelRecording = useCallback(() => {
    const { recorder, stream } = mediaRef.current
    mediaRef.current.cancelled = true
    if (recorder && recorder.state === 'recording') {
      try { recorder.stop() } catch {}
    }
    stream?.getTracks().forEach((t) => t.stop())
    const v = videoRef.current
    if (v) v.pause()
    setRecording(false)
    setCountdown(0)
  }, [videoRef])

  const startRecording = useCallback(async () => {
    if (!segment) return
    const v = videoRef.current
    if (!v) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      mediaRef.current.stream = stream
      mediaRef.current.chunks = []
      mediaRef.current.cancelled = false

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      mediaRef.current.recorder = rec

      rec.ondataavailable = (e) => { if (e.data.size) mediaRef.current.chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (mediaRef.current.cancelled) return
        const blob = new Blob(mediaRef.current.chunks, { type: mime })
        if (blob.size > 800) {
          onSaveTake(segment.id, blob)
          notify('Đã lưu bản lồng mới')
        } else {
          notify('Bản ghi quá ngắn')
        }
      }

      setCountdown(3)
      for (let c = 3; c >= 1; c--) {
        setCountdown(c)
        await new Promise((r) => setTimeout(r, 700))
      }
      setCountdown(0)

      v.currentTime = segment.start
      await v.play().catch(() => {})
      rec.start()
      setRecording(true)

      const end = segment.end
      const watch = () => {
        if (v.currentTime >= end || v.paused || v.ended) {
          if (rec.state === 'recording') rec.stop()
          v.pause()
          setRecording(false)
        } else {
          requestAnimationFrame(watch)
        }
      }
      requestAnimationFrame(watch)
    } catch (err) {
      console.error(err)
      notify('Không truy cập được micro')
      setCountdown(0)
    }
  }, [segment, videoRef, onSaveTake, notify])

  const playSegment = useCallback(() => {
    const v = videoRef.current
    if (!v || !segment) return
    v.currentTime = segment.start
    v.play()
  }, [videoRef, segment])

  const previewTake = useCallback((take) => {
    const v = videoRef.current
    if (v) v.pause()
    previewRef.current?.pause()
    const a = new Audio(take.url)
    previewRef.current = a
    setPreviewId(take.id)
    a.onended = () => setPreviewId(null)
    a.play().catch(() => {})
  }, [videoRef])

  useEffect(() => () => {
    previewRef.current?.pause()
    mediaRef.current.stream?.getTracks().forEach((t) => t.stop())
  }, [])

  if (!segment) {
    return (
      <div className="panel glass dub-panel">
        <div className="panel-head"><h2>Lồng tiếng</h2></div>
        <p className="empty">Chọn một đoạn để lồng tiếng</p>
      </div>
    )
  }

  const activeTake = segment.takes.find((t) => t.id === segment.activeTakeId) || null

  return (
    <div className="panel glass dub-panel">
      <div className="panel-head">
        <h2>Lồng tiếng</h2>
        <span className="time-badge">
          {segment.start.toFixed(1)}s → {segment.end.toFixed(1)}s
        </span>
      </div>

      <SegmentWaveform
        segment={segment}
        videoRef={videoRef}
        take={activeTake}
      />

      <textarea
        className="script"
        placeholder="Kịch bản / lời thoại (tùy chọn)…"
        value={segment.script}
        onChange={(e) => onUpdate(segment.id, { script: e.target.value })}
        rows={3}
      />

      <div className="dub-actions">
        <button className="btn ghost" onClick={playSegment} disabled={recording}>
          ▶ Nghe đoạn
        </button>
        {!recording ? (
          <button className="btn primary" onClick={startRecording}>● Ghi âm</button>
        ) : (
          <button className="btn danger" onClick={cancelRecording}>■ Dừng</button>
        )}
      </div>

      {countdown > 0 && <div className="countdown">{countdown}</div>}
      {recording && <div className="rec-pulse">● Đang ghi…</div>}

      <div className="takes">
        <div className="takes-head">
          <span>Bản lồng ({segment.takes.length})</span>
        </div>
        {segment.takes.length === 0 && <p className="empty small">Chưa có bản lồng nào</p>}
        {segment.takes.map((t, i) => {
          const active = t.id === segment.activeTakeId
          return (
            <div key={t.id} className={`take ${active ? 'active' : ''}`}>
              <button className="take-main" onClick={() => onSelectTake(segment.id, t.id)}>
                <span className="take-name">Take {i + 1}</span>
                {active && <span className="take-badge">đang dùng</span>}
              </button>
              <button className="icon-btn" onClick={() => previewTake(t)} title="Nghe">
                {previewId === t.id ? '❚❚' : '▶'}
              </button>
              <button className="icon-btn danger" onClick={() => onDeleteTake(segment.id, t.id)} title="Xoá">✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}