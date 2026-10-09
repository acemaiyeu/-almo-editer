// src/pages/clients/components/Timeline.jsx
import { useEffect, useRef, useState } from 'react'
import { decodeBlobToAudioBuffer } from '../lib/audio'

export default function Timeline({
  segments,
  duration,
  selectedId,
  activeTake,
  videoRef,
  onSelect,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const playheadRef = useRef(null)
  const bufferCache = useRef(new Map()) // takeId -> AudioBuffer
  const [sizeTick, setSizeTick] = useState(0)
  const [bufferTick, setBufferTick] = useState(0)
  const [hoverX, setHoverX] = useState(null)

  /* ---------- decode take (chỉ những take đang dùng) ---------- */
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let dirty = false
      for (const s of segments) {
        const take = activeTake(s)
        if (!take) continue
        if (bufferCache.current.has(take.id)) continue
        try {
          const buf = await decodeBlobToAudioBuffer(take.blob)
          if (cancelled) return
          bufferCache.current.set(take.id, buf)
          dirty = true
        } catch (e) {
          console.warn('decode take fail', e)
        }
      }
      if (!cancelled && dirty) setBufferTick((t) => t + 1)
    }
    run()
    return () => { cancelled = true }
  }, [segments, activeTake])

  /* ---------- resize ---------- */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => setSizeTick((t) => t + 1))
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  /* ---------- vẽ waveform ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !duration) return

    const dpr = window.devicePixelRatio || 1
    const W = wrap.clientWidth
    const H = wrap.clientHeight
    if (!W || !H) return

    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // nền
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(0, 0, W, H)

    const mid = H / 2

    for (const s of segments) {
      const x1 = (s.start / duration) * W
      const x2 = (s.end / duration) * W
      const w = Math.max(1, x2 - x1)
      const take = activeTake(s)
      const isSelected = s.id === selectedId

      // nền vùng đoạn
      if (isSelected) {
        ctx.fillStyle = 'rgba(110,231,255,0.14)'
        ctx.fillRect(x1, 0, w, H)
      } else if (take) {
        ctx.fillStyle = 'rgba(167,139,250,0.10)'
        ctx.fillRect(x1, 0, w, H)
      }

      // waveform của take (nếu có)
      if (take) {
        const buf = bufferCache.current.get(take.id)
        if (buf) {
          const data = buf.getChannelData(0)
          const total = data.length
          const step = Math.max(1, total / w)

          const grad = ctx.createLinearGradient(0, 0, 0, H)
          grad.addColorStop(0, 'rgba(110,231,255,0.95)')
          grad.addColorStop(0.5, 'rgba(167,139,250,1)')
          grad.addColorStop(1, 'rgba(110,231,255,0.95)')
          ctx.fillStyle = grad

          for (let x = 0; x < w; x++) {
            const a = Math.floor(x * step)
            const b = Math.min(Math.floor((x + 1) * step), total)
            let peak = 0
            for (let i = a; i < b; i++) {
              const v = data[i] < 0 ? -data[i] : data[i]
              if (v > peak) peak = v
            }
            const h = Math.max(0.8, peak * (H * 0.42))
            ctx.fillRect(x1 + x, mid - h, 1, h * 2)
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.2)'
          ctx.fillRect(x1, mid - 1, w, 2)
        }
      } else {
        // chưa thu → đường mờ giữa
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x1, mid - 1, w, 2)
      }

      // viền đoạn
      ctx.strokeStyle = isSelected
        ? 'rgba(110,231,255,0.95)'
        : take
        ? 'rgba(167,139,250,0.55)'
        : 'rgba(255,255,255,0.12)'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.strokeRect(x1 + 0.5, 0.5, Math.max(0, w - 1), H - 1)
    }
  }, [segments, duration, selectedId, activeTake, bufferTick, sizeTick])

  /* ---------- playhead ---------- */
  useEffect(() => {
    let raf
    const loop = () => {
      const v = videoRef?.current
      const ph = playheadRef.current
      if (v && ph && duration) {
        ph.style.left = `${(v.currentTime / duration) * 100}%`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, duration])

  /* ---------- click ---------- */
  const handleClick = (e) => {
    const wrap = wrapRef.current
    const v = videoRef?.current
    if (!wrap || !v || !duration) return
    const rect = wrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = Math.max(0, Math.min(duration, (x / rect.width) * duration))
    const seg = segments.find((s) => t >= s.start && t <= s.end)
    if (seg) {
      onSelect(seg.id) // App sẽ seek + play + tự dừng cuối đoạn
    } else {
      v.currentTime = t
    }
  }

  const handleMove = (e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    setHoverX(e.clientX - rect.left)
  }

  if (!duration) return null

  return (
    <div className="timeline glass">
      <div className="timeline-head">
        <span>Timeline · Sóng lời thu</span>
        <span>{segments.length} đoạn · {duration.toFixed(1)}s</span>
      </div>
      <div
        className="tl-canvas-wrap"
        ref={wrapRef}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <canvas ref={canvasRef} />
        <div className="tl-playhead" ref={playheadRef} />
        {hoverX != null && wrapRef.current && (
          <div className="tl-hover" style={{ left: hoverX }}>
            {((hoverX / wrapRef.current.clientWidth) * duration).toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  )
}