let _ctx = null

export function getAudioContext() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    _ctx = new AC()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

export async function decodeFileToAudioBuffer(file) {
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject)
  })
}

export async function decodeBlobToAudioBuffer(blob) {
  const ctx = getAudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject)
  })
}

export async function renderMix(clips, duration, originalBuffer, opts = {}) {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.max(1, Math.ceil((duration + 0.15) * sampleRate))
  const out = ctx.createBuffer(2, length, sampleRate)
  const dataL = out.getChannelData(0)
  const dataR = out.getChannelData(1)

  if (opts.includeOriginal && originalBuffer) {
    const ch = originalBuffer.numberOfChannels
    const srcL = originalBuffer.getChannelData(0)
    const srcR = ch > 1 ? originalBuffer.getChannelData(1) : srcL
    const n = Math.min(srcL.length, length)
    for (let i = 0; i < n; i++) {
      dataL[i] += srcL[i] * 0.75
      dataR[i] += srcR[i] * 0.75
    }
  }

  for (const clip of clips) {
    const ch = clip.buffer.numberOfChannels
    const srcL = clip.buffer.getChannelData(0)
    const srcR = ch > 1 ? clip.buffer.getChannelData(1) : srcL
    const start = Math.max(0, Math.round(clip.start * sampleRate))
    const n = Math.min(srcL.length, length - start)
    for (let i = 0; i < n; i++) {
      dataL[start + i] += srcL[i]
      dataR[start + i] += srcR[i]
    }
  }

  for (let i = 0; i < length; i++) {
    dataL[i] = Math.tanh(dataL[i])
    dataR[i] = Math.tanh(dataR[i])
  }
  return out
}

export function audioBufferToWav(buffer) {
  const numCh = Math.min(2, buffer.numberOfChannels)
  const len = buffer.length
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const dataSize = len * blockAlign
  const arr = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arr)

  const wstr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  wstr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  wstr(8, 'WAVE')
  wstr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  wstr(36, 'data')
  view.setUint32(40, dataSize, true)

  const chans = []
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c))

  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, chans[c][i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([arr], { type: 'audio/wav' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}