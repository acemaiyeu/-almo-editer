import { useState } from 'react'
import { getAudioContext, audioBufferToWav, downloadBlob } from '../lib/audio'

export default function ExportPanel({
  segments, activeTake, originalBuffer, videoRef, duration,
  buildClips, renderMix, notify,
}) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeOriginal, setIncludeOriginal] = useState(false)

  const dubbedCount = segments.filter((s) => activeTake(s)).length

  const exportAudio = async () => {
    if (!dubbedCount) return notify('Chưa có đoạn nào được lồng')
    setExporting(true); setProgress(0)
    try {
      const clips = await buildClips()
      const mix = await renderMix(clips, duration, originalBuffer, { includeOriginal })
      const blob = audioBufferToWav(mix)
      downloadBlob(blob, `dub-audio-${Date.now()}.wav`)
      notify('Đã xuất audio')
    } catch (e) {
      console.error(e)
      notify('Lỗi khi xuất audio')
    } finally {
      setExporting(false)
    }
  }

  const exportVideo = async () => {
    const v = videoRef.current
    if (!v) return
    if (!dubbedCount) return notify('Chưa có đoạn nào được lồng')

    setExporting(true); setProgress(0)
    try {
      const clips = await buildClips()
      const ctx = getAudioContext()
      const dest = ctx.createMediaStreamDestination()

      if (includeOriginal && originalBuffer) {
        const src = ctx.createBufferSource()
        src.buffer = originalBuffer
        src.connect(dest)
        src.start()
      }

      const scheduled = clips.map((c) => {
        const src = ctx.createBufferSource()
        src.buffer = c.buffer
        src.connect(dest)
        return { src, clip: c }
      })

      const vStream = v.captureStream ? v.captureStream() : v.mozCaptureStream?.()
      if (!vStream) throw new Error('Trình duyệt không hỗ trợ captureStream')

      const videoTrack = vStream.getVideoTracks()[0]
      const combined = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()])

      const mimes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm'
      const rec = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 5_000_000 })
      const chunks = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const done = new Promise((r) => { rec.onstop = r })

      v.muted = true
      v.currentTime = 0
      await new Promise((r) => setTimeout(r, 250))
      rec.start(200)

      await v.play()

      const t0 = ctx.currentTime
      for (const { src, clip } of scheduled) {
        try { src.start(t0 + clip.start) } catch {}
      }

      const watch = () => {
        const t = v.currentTime
        setProgress(Math.min(99, (t / duration) * 100))
        if (v.ended || t >= duration - 0.05) {
          if (rec.state === 'recording') rec.stop()
          scheduled.forEach((s) => { try { s.src.stop() } catch {} })
        } else {
          requestAnimationFrame(watch)
        }
      }
      requestAnimationFrame(watch)

      await done
      const blob = new Blob(chunks, { type: mime })
      downloadBlob(blob, `dub-video-${Date.now()}.webm`)
      setProgress(100)
      notify('Đã xuất video')
    } catch (e) {
      console.error(e)
      notify('Lỗi khi xuất video: ' + e.message)
    } finally {
      setExporting(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  return (
    <div className="panel glass export-panel">
      <div className="panel-head">
        <h2>Xuất</h2>
        <span className="time-badge">{dubbedCount}/{segments.length}</span>
      </div>

      <label className="toggle row">
        <input
          type="checkbox"
          checked={includeOriginal}
          onChange={(e) => setIncludeOriginal(e.target.checked)}
        />
        <span>Trộn với âm thanh gốc</span>
      </label>

      <div className="export-actions">
        <button className="btn ghost" disabled={exporting} onClick={exportAudio}>
          ⬇ Xuất audio (WAV)
        </button>
        <button className="btn primary" disabled={exporting} onClick={exportVideo}>
          ⬇ Xuất video (WebM)
        </button>
      </div>

      {exporting && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>{Math.round(progress)}%</span>
        </div>
      )}

      <p className="hint">
        WebM có thể phát trên Chrome/Edge. Nếu cần MP4, hãy dùng ffmpeg chuyển đổi sau.
      </p>
    </div>
  )
}