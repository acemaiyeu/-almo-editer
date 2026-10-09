// src/pages/clients/components/SegmentWaveform.jsx
import { useEffect, useRef, useState } from 'react'
import { decodeBlobToAudioBuffer } from '../lib/audio'

export default function SegmentWaveform({ segment, videoRef, take }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const playheadRef = useRef(null)
  const [buffer, setBuffer] = useState(null)
  const [sizeTick, setSizeTick] = useState(0)

  /* ---------- decode take ---------- */
  useEffect(() => {
    let cancelled = false
    setBuffer(null)
    if (!take) return
    decodeBlobToAudioBuffer(take.blob)
      .then((buf) => { if (!cancelled) setBuffer(buf) })
      .catch((e) => console.warn('decode take fail', e))
    return () => { cancelled = true }
  }, [take])

  /* ---------- resize ---------- */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => setSizeTick((t) => t + 1))
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  /* ---------- vẽ ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !segment) return

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

    const mid = H / 2
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(0, 0, W, H)

    if (buffer) {
      const data = buffer.getChannelData(0)
      const total = data.length
      const step = Math.max(1, total / W)

      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, 'rgba(110,231,255,0.9)')
      grad.addColorStop(0.5, 'rgba(167,139,250,1)')
      grad.addColorStop(1, 'rgba(110,231,255,0.9)')
      ctx.fillStyle = grad

      for (let x = 0; x < W; x++) {
        const a = Math.floor(x * step)
        const b = Math.min(Math.floor((x + 1) * step), total)
        let peak = 0
        for (let i = a; i < b; i++) {
          const v = data[i] < 0 ? -data[i] : data[i]
          if (v > peak) peak = v
        }
        const h = Math.max(0.8, peak * (H * 0.42))
        ctx.fillRect(x, mid - h, 1, h * 2)
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(0, mid - 1, W, 2)
    }
  }, [buffer, segment, sizeTick])

  /* ---------- playhead trong đoạn ---------- */
  useEffect(() => {
    let raf
    const loop = () => {
      const v = videoRef?.current
      const ph = playheadRef.current
      if (v && ph && segment) {
        const dur = segment.end - segment.start
        const t = v.currentTime
        if (t >= segment.start && t <= segment.end && dur > 0) {
          ph.style.left = `${((t - segment.start) / dur) * 100}%`
          ph.style.opacity = 1
        } else {
          ph.style.opacity = 0
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, segment])

  if (!segment) return null

  return (
    <div className="seg-waveform" ref={wrapRef}>
      <canvas ref={canvasRef} />
      <div className="seg-playhead" ref={playheadRef} />
      <div className="seg-waveform-label">
        {take ? 'Sóng lời thu (take đang dùng)' : 'Chưa thu — bấm ● Ghi âm'}
      </div>
    </div>
  )
}