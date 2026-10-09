// src/pages/clients/VoiceVideoEditor.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './voicevideoeditor.css'
import Background from './components/Background'
import VideoStage from './components/VideoStage'
import Timeline from './components/Timeline'
import DubPanel from './components/DubPanel'
import ExportPanel from './components/ExportPanel'
import { decodeFileToAudioBuffer, decodeBlobToAudioBuffer, renderMix } from './lib/audio'
import { planSegments, fixedSegments } from './lib/segmenter'
import { uid, fmt } from './lib/utils'

export default function VoiceVideoEditor() {
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [duration, setDuration] = useState(0)
  const [segments, setSegments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [originalBuffer, setOriginalBuffer] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [skipUndubbed, setSkipUndubbed] = useState(false)
  const [toast, setToast] = useState(null)

  const videoRef = useRef(null)
  const bufferCache = useRef(new Map())          // takeId -> AudioBuffer (dùng khi export)
  const segmentPlayRef = useRef(null)            // { start, end } giới hạn phát

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  /* ================================================================
     1. Nạp video + phân tích
     ================================================================ */
  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setVideoFile(file)
    setSegments([])
    setSelectedId(null)
    setOriginalBuffer(null)
    bufferCache.current.clear()
    segmentPlayRef.current = null
  }, [videoUrl])

  const handleLoadedMetadata = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration || 0)
    if (!videoFile) return

    setAnalyzing(true)
    try {
      const buf = await decodeFileToAudioBuffer(videoFile)
      setOriginalBuffer(buf)
      const segs = planSegments(buf.duration, buf)
      setSegments(segs.map((s) => ({ ...s, id: uid(), takes: [], activeTakeId: null, script: '' })))
      notify(`Đã chia thành ${segs.length} đoạn ngắn`)
    } catch (e) {
      console.warn('Không giải mã được audio, dùng chia đều:', e)
      const segs = fixedSegments(v.duration, 6)
      setSegments(segs.map((s) => ({ ...s, id: uid(), takes: [], activeTakeId: null, script: '' })))
      notify('Không đọc được audio gốc — đã chia đều 6 giây/đoạn')
    } finally {
      setAnalyzing(false)
    }
  }, [videoFile, notify])

  useEffect(() => {
    if (segments.length && !segments.some((s) => s.id === selectedId)) {
      setSelectedId(segments[0].id)
    }
  }, [segments, selectedId])

  /* ================================================================
     2. Helpers segment
     ================================================================ */
  const activeTake = useCallback(
    (seg) => (seg?.takes || []).find((t) => t.id === seg.activeTakeId) || null,
    []
  )

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  )

  const dubbedCount = segments.filter((s) => activeTake(s)).length

  const seekTo = useCallback((t) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(t, v.duration || 0))
  }, [])

  const updateSegment = useCallback((id, patch) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const saveTake = useCallback((segId, blob) => {
    const url = URL.createObjectURL(blob)
    const take = { id: uid(), url, blob, createdAt: Date.now() }
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segId ? { ...s, takes: [...s.takes, take], activeTakeId: take.id } : s
      )
    )
    bufferCache.current.delete(take.id)
    return take
  }, [])

  const selectTake = useCallback((segId, takeId) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === segId ? { ...s, activeTakeId: takeId } : s))
    )
  }, [])

  const deleteTake = useCallback((segId, takeId) => {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segId) return s
        const takes = s.takes.filter((t) => t.id !== takeId)
        return {
          ...s,
          takes,
          activeTakeId: s.activeTakeId === takeId
            ? (takes[takes.length - 1]?.id ?? null)
            : s.activeTakeId,
        }
      })
    )
    bufferCache.current.delete(takeId)
  }, [])

  const addSegmentAtPlayhead = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    const seg = {
      id: uid(),
      start: t,
      end: Math.min(t + 4, v.duration),
      takes: [],
      activeTakeId: null,
      script: '',
    }
    setSegments((prev) => [...prev, seg].sort((a, b) => a.start - b.start))
    setSelectedId(seg.id)
  }, [])

  const removeSegment = useCallback((id) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }, [])

  /* ================================================================
     3. Phát đúng một đoạn: seek + play + tự dừng cuối đoạn
     ================================================================ */
  const playSegment = useCallback((id) => {
    const v = videoRef.current
    const s = segments.find((x) => x.id === id)
    if (!v || !s) return
    setSelectedId(id)
    v.currentTime = s.start
    segmentPlayRef.current = { start: s.start, end: s.end }
    v.play().catch(() => {})
  }, [segments])

  const clearSegmentRange = useCallback(() => {
    segmentPlayRef.current = null
  }, [])

  /* ================================================================
     4. Vòng lặp đồng bộ audio take + auto-pause cuối đoạn
     ================================================================ */
  const audioElsRef = useRef(new Map()) // segId -> { el, takeId }
  const activeElRef = useRef(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v || segments.length === 0) return
    let raf

    const loop = () => {
      const t = v.currentTime

      /* ---- (A) auto-pause khi hết đoạn đang phát ---- */
      const range = segmentPlayRef.current
      if (range) {
        if (t >= range.end - 0.02 || t < range.start - 0.5) {
          v.pause()
          segmentPlayRef.current = null
        }
      }

      /* ---- (B) đồng bộ audio take ---- */
      const seg = segments.find((s) => t >= s.start && t < s.end)
      const take = seg ? activeTake(seg) : null

      if (take && seg) {
        let entry = audioElsRef.current.get(seg.id)
        if (!entry || entry.takeId !== take.id) {
          entry?.el.pause()
          const el = new Audio(take.url)
          el.preload = 'auto'
          entry = { el, takeId: take.id }
          audioElsRef.current.set(seg.id, entry)
        }
        const el = entry.el

        if (activeElRef.current !== el) {
          audioElsRef.current.forEach((e) => { if (e.el !== el) e.el.pause() })
          activeElRef.current = el
          el.currentTime = Math.max(0, t - seg.start)
        }

        const want = Math.max(0, t - seg.start)
        if (Math.abs(el.currentTime - want) > 0.28) el.currentTime = want

        if (v.paused) {
          if (!el.paused) el.pause()
        } else if (el.paused) {
          el.currentTime = want
          el.play().catch(() => {})
        }
        v.muted = true
      } else {
        if (activeElRef.current) {
          activeElRef.current.pause()
          activeElRef.current = null
        }
        v.muted = false

        // chế độ "chỉ xem đoạn đã lồng"
        if (skipUndubbed && seg && !v.paused) {
          const next = segments.find((s) => s.start >= seg.end - 0.02 && activeTake(s))
          if (next) v.currentTime = next.start
          else v.pause()
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [segments, skipUndubbed, activeTake])

  /* ---- dừng audio khi đổi video ---- */
  useEffect(() => {
    if (!videoUrl) return
    return () => {
      audioElsRef.current.forEach((e) => e.el.pause())
      audioElsRef.current.clear()
      activeElRef.current = null
    }
  }, [videoUrl])

  /* ================================================================
     5. Thoát khỏi chế độ phát-đoạn khi user tự điều khiển
     ================================================================ */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onSeek = () => clearSegmentRange()
    const onPause = () => {
      // Nếu pause vì hết đoạn thì đã null; nếu pause thủ công cũng null
      clearSegmentRange()
    }
    v.addEventListener('seeked', onSeek)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('seeked', onSeek)
      v.removeEventListener('pause', onPause)
    }
  }, [videoUrl, clearSegmentRange])

  /* ================================================================
     6. Space = play/pause
     ================================================================ */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      const v = videoRef.current
      if (!v) return
      clearSegmentRange() // Space = phát tự do
      v.paused ? v.play() : v.pause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSegmentRange])

  /* ================================================================
     7. Export helpers
     ================================================================ */
  const getTakeBuffer = useCallback(async (take) => {
    if (bufferCache.current.has(take.id)) return bufferCache.current.get(take.id)
    const buf = await decodeBlobToAudioBuffer(take.blob)
    bufferCache.current.set(take.id, buf)
    return buf
  }, [])

  const buildClips = useCallback(async () => {
    const clips = []
    for (const seg of segments) {
      const take = activeTake(seg)
      if (!take) continue
      const buffer = await getTakeBuffer(take)
      clips.push({ start: seg.start, end: seg.end, buffer, segId: seg.id })
    }
    return clips.sort((a, b) => a.start - b.start)
  }, [segments, activeTake, getTakeBuffer])

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="app">
      <Background />

      <header className="topbar glass">
        <div className="brand">
          <span className="logo" />
          <div>
            <h1>DubStudio</h1>
            <p>Lồng tiếng video theo từng đoạn ngắn</p>
          </div>
        </div>

        <div className="topbar-stats">
          <div className="chip"><b>{segments.length}</b><span>đoạn</span></div>
          <div className="chip accent"><b>{dubbedCount}</b><span>đã lồng</span></div>
          <div className="chip"><b>{fmt(duration)}</b><span>thời lượng</span></div>
        </div>

        <label className="btn ghost file-btn">
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {videoUrl ? 'Đổi video' : 'Chọn video'}
        </label>
      </header>

      <main className="layout">
        <aside className="panel glass left">
          <div className="panel-head">
            <h2>Đoạn ngắn</h2>
            <button className="mini" onClick={addSegmentAtPlayhead} disabled={!videoUrl}>
              + Tại vị trí
            </button>
          </div>

          <div className="seg-list">
            {segments.length === 0 && (
              <p className="empty">
                {analyzing ? 'Đang phân tích video…' : 'Chưa có đoạn nào.'}
              </p>
            )}
            {segments.map((s, i) => {
              const take = activeTake(s)
              return (
                <button
                  key={s.id}
                  className={`seg-item ${s.id === selectedId ? 'active' : ''} ${take ? 'dubbed' : ''}`}
                  onClick={() => playSegment(s.id)}
                >
                  <span className="seg-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="seg-time">
                    {fmt(s.start)} → {fmt(s.end)}
                  </span>
                  <span className={`dot ${take ? 'on' : ''}`} />
                  {s.takes.length > 1 && <span className="take-count">{s.takes.length}</span>}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="center">
          <VideoStage
            ref={videoRef}
            videoUrl={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onFile={handleFile}
            hasSegments={segments.length > 0}
            skipUndubbed={skipUndubbed}
            setSkipUndubbed={setSkipUndubbed}
            dubbedCount={dubbedCount}
            analyzing={analyzing}
            onManualToggle={clearSegmentRange}
          />

          <Timeline
            segments={segments}
            duration={duration}
            selectedId={selectedId}
            activeTake={activeTake}
            videoRef={videoRef}
            onSelect={playSegment}
          />
        </section>

        <aside className="right">
          <DubPanel
            segment={selectedSegment}
            videoRef={videoRef}
            onUpdate={updateSegment}
            onSaveTake={saveTake}
            onSelectTake={selectTake}
            onDeleteTake={deleteTake}
            notify={notify}
          />

          <ExportPanel
            segments={segments}
            activeTake={activeTake}
            originalBuffer={originalBuffer}
            videoRef={videoRef}
            duration={duration}
            buildClips={buildClips}
            renderMix={renderMix}
            notify={notify}
          />
        </aside>
      </main>

      {toast && <div className="toast glass">{toast}</div>}
    </div>
  )
}