export function planSegments(duration, audioBuffer) {
  if (!audioBuffer) return fixedSegments(duration, 6)

  const data = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const frameSize = Math.max(1, Math.floor(sampleRate * 0.02))

  const rms = []
  for (let i = 0; i < data.length; i += frameSize) {
    let sum = 0
    const end = Math.min(i + frameSize, data.length)
    for (let j = i; j < end; j++) sum += data[j] * data[j]
    rms.push(Math.sqrt(sum / (end - i)))
  }

  const sorted = [...rms].sort((a, b) => a - b)
  const noise = sorted[Math.floor(sorted.length * 0.25)] || 0
  const peak = sorted[Math.floor(sorted.length * 0.95)] || 1
  const threshold = noise + (peak - noise) * 0.15 + 0.003

  const silences = []
  let start = -1
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] < threshold) {
      if (start === -1) start = i
    } else if (start !== -1) {
      const dur = ((i - start) * frameSize) / sampleRate
      if (dur > 0.35) {
        silences.push({
          start: (start * frameSize) / sampleRate,
          end: (i * frameSize) / sampleRate,
        })
      }
      start = -1
    }
  }

  const cuts = [0, ...silences.map((s) => (s.start + s.end) / 2), duration]
  const maxLen = 8
  const minLen = 1.8
  const out = []
  let segStart = 0
  for (let i = 1; i < cuts.length; i++) {
    const cut = cuts[i]
    if (cut - segStart >= maxLen || i === cuts.length - 1) {
      if (cut - segStart >= minLen) {
        out.push({ start: segStart, end: cut })
        segStart = cut
      }
    }
  }
  if (segStart < duration - 0.15) out.push({ start: segStart, end: duration })

  return out.length ? out : fixedSegments(duration, 6)
}

export function fixedSegments(duration, chunkSize = 6) {
  const segs = []
  for (let t = 0; t < duration; t += chunkSize) {
    segs.push({ start: t, end: Math.min(t + chunkSize, duration) })
  }
  return segs
}