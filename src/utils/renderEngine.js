/**
 * RenderEngine v2 - Smooth canvas-based video rendering
 *
 * Các fix chính so với v1:
 * 1. Video được PLAY bình thường thay vì seek từng frame
 * 2. FPS throttle chuẩn bằng timestamp delta trong rAF
 * 3. Drift correction nhẹ nhàng (chỉ seek khi lệch > 0.5s)
 * 4. Audio được sync qua AudioContext.currentTime thay vì seek liên tục
 * 5. Canvas drawImage chỉ xảy ra đúng fps, không vượt quá
 * 6. Cleanup an toàn, tránh memory leak
 */

export class RenderEngine {
  constructor(options = {}) {
    this.width = options.width || 1280;
    this.height = options.height || 720;
    this.fps = options.fps || 30;
    this.videoBitsPerSecond = options.videoBitsPerSecond || 8_000_000;
    this.effectGlobal = options.effectGlobal || 'none';
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});

    // Internal state
    this.canvas = null;
    this.ctx = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.destination = null;
    this.chunks = [];
    this.isRendering = false;
    this.animationFrameId = null;

    // Media maps: id → { element, item, sourceNode? }
    this.videoElements = new Map();
    this.audioElements = new Map();

    // Timing
    this.renderStartTime = 0; // performance.now() khi bắt đầu render
    this.lastFrameTimestamp = 0; // timestamp của rAF lần trước
    this.frameInterval = 1000 / this.fps; // ms mỗi frame
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────

  async initialize() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.destination = this.audioContext.createMediaStreamDestination();

    // Tạo master gain để control volume tổng
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.destination);
    // this.masterGain.connect(this.audioContext.destination); tắt âm lượng khi render
  }

  // ─────────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────────

  async preloadMedia(tracks) {
    const promises = [];

    tracks.forEach(track => {
      track.items.forEach(item => {
        if (item.type === 'video') {
          const video = document.createElement('video');
          video.src = item.url;
          video.muted = true; // audio được xử lý riêng qua AudioContext
          video.crossOrigin = 'anonymous';
          video.preload = 'auto';
          video.playsInline = true;
          // Không loop, không autoplay
          video.loop = false;

          const p = new Promise(resolve => {
            video.onloadeddata = resolve;
            video.onerror = resolve; // vẫn resolve để không block
            setTimeout(resolve, 8000); // fallback timeout
          });

          promises.push(p);
          this.videoElements.set(item.id, { element: video, item });

        } else if (item.type === 'audio') {
          const audio = document.createElement('audio');
          audio.src = item.url;
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          audio.loop = false;

          const p = new Promise(resolve => {
            audio.oncanplaythrough = resolve;
            audio.onerror = resolve;
            setTimeout(resolve, 8000);
          });

          promises.push(p);
          this.audioElements.set(item.id, { element: audio, item });
        }
      });
    });

    await Promise.all(promises);
  }

  // ─────────────────────────────────────────────
  // AUDIO SETUP
  // ─────────────────────────────────────────────

  connectAudio() {
    this.audioElements.forEach((data) => {
      try {
        if (!data.sourceNode) {
          const source = this.audioContext.createMediaElementSource(data.element);
          source.connect(this.masterGain);
          data.sourceNode = source;
        }
      } catch (err) {
        console.warn('[RenderEngine] Audio connect warning:', err.message);
      }
    });
  }

  /**
   * Sync audio: chỉ play/pause và seek khi lệch nhiều
   * KHÔNG seek mỗi frame để tránh stuttering
   */
  syncAudio(tracks, currentTimeSec) {
    const activeAudios = this._getActiveAudios(tracks, currentTimeSec);
    const activeIds = new Set(activeAudios.map(a => a.id));

    this.audioElements.forEach((data, id) => {
      const { element, item } = data;
      const targetTime = currentTimeSec - item.start;
      const isActive = activeIds.has(id);

      if (isActive && targetTime >= 0 && targetTime <= item.duration) {
        // Drift correction: chỉ seek nếu lệch > 0.5s
        if (Math.abs(element.currentTime - targetTime) > 0.5) {
          element.currentTime = targetTime;
        }
        if (element.paused) {
          element.play().catch(() => {});
        }
      } else {
        if (!element.paused) {
          element.pause();
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // VIDEO SYNC
  // ─────────────────────────────────────────────

  /**
   * Start/stop video elements theo timeline
   * Video được play() bình thường, KHÔNG seek từng frame
   */
  syncVideo(tracks, currentTimeSec) {
    let activeVideoItem = null;
    tracks.forEach(track => {
      track.items.forEach(item => {
        if (item.type === 'video' &&
            currentTimeSec >= item.start &&
            currentTimeSec <= item.start + item.duration) {
          activeVideoItem = item;
        }
      });
    });

    this.videoElements.forEach((data, id) => {
      const { element, item } = data;
      const isActive = activeVideoItem?.id === id;
      const targetTime = currentTimeSec - item.start;

      if (isActive && targetTime >= 0 && targetTime <= item.duration) {
        // Drift correction nhẹ nhàng: chỉ seek khi lệch > 0.5s
        if (Math.abs(element.currentTime - targetTime) > 0.5) {
          element.currentTime = targetTime;
        }
        if (element.paused) {
          element.play().catch(() => {});
        }
      } else {
        if (!element.paused) {
          element.pause();
        }
        // Reset về đầu nếu chưa đến lượt
        if (targetTime < 0 && element.currentTime !== 0) {
          element.currentTime = 0;
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // RENDER FRAME
  // ─────────────────────────────────────────────

  renderFrame(tracks, currentTimeSec) {
    const { ctx, width, height } = this;
console.log("renderFrame")
    // Nền đen
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Tìm video active
    let activeVideoData = null;
    this.videoElements.forEach((data) => {
      const { item } = data;
      if (currentTimeSec >= item.start && currentTimeSec <= item.start + item.duration) {
        activeVideoData = data;
      }
    });

    // Draw video frame (contain fit)
    if (activeVideoData) {
      const video = activeVideoData.element;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.min(width / vw, height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.drawImage(video, dx, dy, dw, dh);
      }
    }

    // Draw text overlays
    this._renderTexts(tracks, currentTimeSec);
  }

  _renderTexts(tracks, currentTimeSec) {
    const { ctx, width, height } = this;
    const activeTexts = [];

    tracks.forEach(track => {
      track.items.forEach(item => {
        if (item.type === 'text' &&
            currentTimeSec >= item.start &&
            currentTimeSec <= item.start + item.duration) {
          activeTexts.push(item);
        }
      });
    });
console.log("activeTexts",activeTexts)
    if (activeTexts.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    activeTexts.forEach((txt, index) => {
      console.log("activeTexts", activeTexts)
      const yOffset = (index - (activeTexts.length - 1) / 2) * 64;
      const itemTime = currentTimeSec - txt.start; // giây kể từ lúc text bắt đầu xuất hiện
      const baseX = width / 2;
      const baseY = height / 2 + yOffset;

      // ── Lyrics mode ──────────────────────────────
      if (txt.lyrics && txt.lyrics.length > 0) {
        const activeLyric = txt.lyrics.find(l => itemTime >= l.start && itemTime <= l.end);
        const upcoming = txt.lyrics.filter(l => l.start > itemTime).slice(0, 2);

        if (activeLyric) {
          ctx.font = 'bold 38px sans-serif';
          ctx.fillStyle = '#ff099a';
          this._setShadow(ctx, 'rgba(0,0,0,0.9)', 8, 0, 3);
          ctx.fillText(activeLyric.word, baseX, baseY);
        }
        if (upcoming.length > 0) {
          ctx.font = '22px sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          this._setShadow(ctx, 'rgba(0,0,0,0.6)', 4, 0, 2);
          ctx.fillText(upcoming.map(l => l.word).join(' '), baseX, baseY + 50);
        }
        this._clearShadow(ctx);
        return; // xong lyrics, sang item tiếp
      }

      // ── Normal text mode ──────────────────────────
      const effectName = txt.textEffect || txt.typeEffect || this.effectGlobal || 'none';
      const fontSize   = parseInt(txt.style?.fontSize) || 26;
      const fontWeight = txt.style?.fontWeight || 'bold';
      const fontFamily = txt.style?.fontFamily || 'sans-serif';
      const baseColor  = txt.style?.color || '#ffffff';

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      // Duratiion của animation intro (giây). Sau khoảng này animation kết thúc,
      // text hiển thị ở trạng thái "đã vào xong".
      const ANIM_DUR = 0.4;
      // t: tiến độ animation [0 → 1], sau ANIM_DUR thì clamp về 1
      const t = Math.min(itemTime / ANIM_DUR, 1);
      // easeOut cubic
      const ease = 1 - Math.pow(1 - t, 3);

      ctx.save();
      ctx.translate(baseX, baseY);

      switch (effectName) {

        // ── zoom-in: scale từ 0.5 → 1, opacity 0 → 1
        case 'zoom-in': {
          const scale = 0.5 + ease * 0.5;
          ctx.globalAlpha = ease;
          ctx.scale(scale, scale);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── zoom-out: khi text sắp biến mất → scale 1 → 0, opacity 1 → 0
        // Dùng thời gian còn lại (time to end) thay vì itemTime
        case 'zoom-out': {
          const timeLeft = txt.duration - itemTime;
          const tOut = Math.min(timeLeft / ANIM_DUR, 1);
          const eOut = 1 - Math.pow(1 - tOut, 3);
          ctx.globalAlpha = eOut;
          ctx.scale(eOut, eOut);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── fade-in: opacity 0 → 1
        case 'fade-in': {
          ctx.globalAlpha = ease;
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── fade-out: opacity 1 → 0 về cuối
        case 'fade-out': {
          const timeLeft = txt.duration - itemTime;
          const tOut = Math.min(timeLeft / ANIM_DUR, 1);
          ctx.globalAlpha = 1 - Math.pow(1 - tOut, 3);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── slide-in-left: translateX từ -width → 0, opacity 0 → 1
        case 'slide-in-left': {
          const offsetX = (ease - 1) * width * 0.6; // bắt đầu từ -60% width
          ctx.globalAlpha = ease;
          ctx.translate(offsetX, 0);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── slide-in-right: translateX từ +width → 0
        case 'slide-in-right': {
          const offsetX = (1 - ease) * width * 0.6;
          ctx.globalAlpha = ease;
          ctx.translate(offsetX, 0);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── slide-out-left: translateX 0 → -width về cuối
        case 'slide-out-left': {
          const timeLeft = txt.duration - itemTime;
          const tOut = Math.min(timeLeft / ANIM_DUR, 1);
          const eOut = 1 - Math.pow(1 - tOut, 3);
          const offsetX = (eOut - 1) * width * 0.6;
          ctx.globalAlpha = eOut;
          ctx.translate(offsetX, 0);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── slide-out-right: translateX 0 → +width về cuối
        case 'slide-out-right': {
          const timeLeft = txt.duration - itemTime;
          const tOut = Math.min(timeLeft / ANIM_DUR, 1);
          const eOut = 1 - Math.pow(1 - tOut, 3);
          const offsetX = (1 - eOut) * width * 0.6;
          ctx.globalAlpha = eOut;
          ctx.translate(offsetX, 0);
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── neon: nhấp nháy text-shadow màu xanh lá, dùng sin wave theo time
        case 'neon': {
          // pulse theo sin, chu kỳ ~1s
          const pulse = 0.5 + 0.5 * Math.sin(itemTime * Math.PI * 2);
          const opacity = 0.8 + 0.2 * pulse;
          ctx.globalAlpha = opacity;

          // Lớp glow ngoài (to, mờ)
          ctx.shadowColor = `rgba(0, 255, 170, ${0.4 + 0.3 * pulse})`;
          ctx.shadowBlur   = 20 + 10 * pulse;
          ctx.fillStyle    = '#ffffff';
          ctx.fillText(txt.name || '', 0, 0);

          // Lớp glow trong (nhỏ, sáng hơn) — vẽ lại cùng vị trí
          ctx.shadowColor = `rgba(0, 255, 170, ${0.7 + 0.3 * pulse})`;
          ctx.shadowBlur   = 6 + 4 * pulse;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── random: rung nhẹ theo sin/cos với frequency riêng mỗi item
        case 'random': {
          // Mỗi text item dùng offset phase khác nhau để không rung đồng pha
          const phase = (txt.id || index) * 1.3;
          const rx = 2 * Math.sin(itemTime * 18 + phase);
          const ry = 2 * Math.cos(itemTime * 14 + phase + 1);
          ctx.translate(rx, ry);
          ctx.globalAlpha = 1;
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }

        // ── none / default: hiển thị tĩnh
        default: {
          ctx.globalAlpha = 1;
          this._setShadow(ctx, 'rgba(0,0,0,0.85)', 6, 0, 2);
          ctx.fillStyle = baseColor;
          ctx.fillText(txt.name || '', 0, 0);
          break;
        }
      }

      this._clearShadow(ctx);
      ctx.restore();
    });

    ctx.restore();
  }

  _setShadow(ctx, color, blur, offsetX, offsetY) {
    ctx.shadowColor   = color;
    ctx.shadowBlur    = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
  }

  _clearShadow(ctx) {
    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // ─────────────────────────────────────────────
  // RECORDER SETUP
  // ─────────────────────────────────────────────

  setupRecorder() {
    const canvasStream = this.canvas.captureStream(this.fps);
    const audioTracks = this.destination.stream.getAudioTracks();

    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeType = this._getSupportedMimeType(audioTracks.length > 0);

    this.mediaRecorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: this.videoBitsPerSecond,
    });

    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      if (this.chunks.length === 0) {
        this.onError(new Error('RenderEngine: No data captured.'));
        return;
      }
      const blob = new Blob(this.chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      this.onComplete({ blob, url, mimeType });
    };
  }

  _getSupportedMimeType(hasAudio) {
    const withAudio = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const videoOnly = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const list = hasAudio ? withAudio : videoOnly;
    for (const type of list) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'video/webm';
  }

  // ─────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────

  async start(tracks, maxDuration) {
    console.log("start")
    if (this.isRendering) return;
    this.isRendering = true;
    this.chunks = [];

    try {
      await this.initialize();
      await this.preloadMedia(tracks);
      this.connectAudio();
      this.setupRecorder();

      // Bắt đầu ghi
      this.mediaRecorder.start(200); // chunk mỗi 200ms
      this.renderStartTime = performance.now();
      this.lastFrameTimestamp = 0;

      // Sync video/audio trước frame đầu tiên
      this.syncVideo(tracks, 0);
      this.syncAudio(tracks, 0);

      const loop = (timestamp) => {
        if (!this.isRendering) return;

        // FPS throttle: bỏ qua frame nếu chưa đủ thời gian
        const delta = timestamp - this.lastFrameTimestamp;
        if (delta < this.frameInterval - 1) {
          this.animationFrameId = requestAnimationFrame(loop);
          return;
        }
        this.lastFrameTimestamp = timestamp;

        // Tính thời gian render hiện tại
        const currentTimeSec = (performance.now() - this.renderStartTime) / 1000;

        if (currentTimeSec >= maxDuration) {
          this._finish();
          return;
        }

        // Render canvas frame
        this.renderFrame(tracks, currentTimeSec);

        // Sync media (drift correction nhẹ, không phải mỗi frame)
        // Gọi mỗi 10 frame (~333ms ở 30fps) để tránh gây giật
        this._frameSyncCounter = (this._frameSyncCounter || 0) + 1;
        if (this._frameSyncCounter % 10 === 0) {
          this.syncVideo(tracks, currentTimeSec);
          this.syncAudio(tracks, currentTimeSec);
        }

        // Progress callback
        const progress = Math.min((currentTimeSec / maxDuration) * 100, 100);
        this.onProgress(progress, currentTimeSec);

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);

    } catch (err) {
      this.isRendering = false;
      this.onError(err);
      console.log("E", err)
    }
  }

  _finish() {
    this.isRendering = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dừng tất cả media
    this.videoElements.forEach(({ element }) => {
      element.pause();
    });
    this.audioElements.forEach(({ element }) => {
      element.pause();
    });

    // Dừng recorder (sẽ trigger onstop → onComplete)
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Đóng AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }

    // Cleanup canvas
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    this.videoElements.clear();
    this.audioElements.clear();
  }

  stop() {
    this._finish();
  }

cancel() {
  this.isRendering = false; // ← phải có dòng này trước _finish
  this._finish();
  this.chunks = [];
}

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  _getActiveAudios(tracks, currentTimeSec) {
    const result = [];
    tracks.forEach(track => {
      track.items.forEach(item => {
        if (item.type === 'audio' &&
            currentTimeSec >= item.start &&
            currentTimeSec <= item.start + item.duration) {
          result.push(item);
        }
      });
    });
    return result;
  }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

/**
 * Tính tổng duration của timeline
 */
export const getMaxDuration = (tracks) => {
  if (!tracks || tracks.length === 0) return 10;
  let max = 10;
  tracks.forEach(track => {
    track.items.forEach(item => {
      const end = item.start + item.duration;
      if (end > max) max = end;
    });
  });
  return max;
};

/**
 * Download file video sau khi render xong
 */
export const downloadVideo = (blob, filename = 'export.webm') => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
