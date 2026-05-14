import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X, Download, Film, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { RenderEngine, getMaxDuration, downloadVideo } from '../utils/renderEngine.js';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { label: '4K – 3840×2160', width: 3840, height: 2160, fps: 60, bitrate: 40_000_000 },
  { label: '1080p – 1920×1080', width: 1920, height: 1080, fps: 60, bitrate: 12_000_000 },
  { label: '1080p – 1080x1920', width: 1080, height: 1920, fps: 60, bitrate: 12_000_000 },
  { label: '720p – 1280×720', width: 1280, height: 720, fps: 60, bitrate: 6_000_000 },
  { label: '720p – 720x1280', width: 720, height: 1280, fps: 60, bitrate: 6_000_000 },
  { label: '480p – 854×480', width: 854, height: 480, fps: 24, bitrate: 2_500_000 },
];

const FPS_OPTIONS = [24, 30, 60];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const Select = ({ value, onChange, options, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        style={S.selectBtn(disabled)}
      >
        <span style={{ fontSize: 13, color: '#e2e2e2' }}>{selected?.label}</span>
        <ChevronDown size={14} color="#666" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {options.map(opt => (
            <div
              key={opt.value + Math.random()}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={S.dropdownItem(opt.value === value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProgressBar = ({ value }) => (
  <div style={S.progressTrack}>
    <div style={S.progressFill(value)} />
    <div style={S.progressGlow(value)} />
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const RenderModal = ({isOpen,  onClose }) => {
  const { tracks } = useSelector(state => state.timeline);
  const { effectGlobal } = useSelector(state => state.public);
  const [qualityKey, setQualityKey] = useState('1080p – 1920×1080');
  const [fps, setFps] = useState(30);
  const [status, setStatus] = useState('idle'); // idle | rendering | done | error
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);

  const engineRef = useRef(null);
  const maxDuration = getMaxDuration(tracks);

  const selectedQuality = QUALITY_OPTIONS.find(q => q.label === qualityKey) || QUALITY_OPTIONS[1];

  const handleStart = useCallback(async () => {
    if (status === 'rendering') return;

    setStatus('rendering');
    setProgress(0);
    setCurrentSec(0);
    setResultUrl(null);
    setResultBlob(null);
    setErrorMsg('');

    // Hủy engine cũ trước
  if (engineRef.current) {
    engineRef.current.cancel();
    engineRef.current = null;
  }
    try {
      const engine = new RenderEngine({
        width: selectedQuality.width,
        height: selectedQuality.height,
        fps,
        videoBitsPerSecond: selectedQuality.bitrate,
        effectGlobal,
        previewElement: document.querySelector('.video-preview'),
        onProgress: (pct, sec) => {
          setProgress(pct);
          setCurrentSec(sec);
        },
        onComplete: ({ blob, url }) => {
          setResultBlob(blob);
          setResultUrl(url);
          setStatus('done');
          setProgress(100);
        },
        onError: (err) => {
          console.error('[RenderModal] onError:', err);
          setErrorMsg(err?.message || 'Đã có lỗi xảy ra khi render.');
          setStatus('error');
        },
      });
      // console.log(engine)
      engineRef.current = engine;
      await engine.start(tracks, maxDuration);
      
    } catch (err) {
      console.error('[RenderModal] crash:', err); // ← chỗ này sẽ lộ lỗi thật
      setErrorMsg(err?.message || 'Lỗi khởi động render.');
      setStatus('error');
    }

  // ⚠️ thêm effectGlobal vào đây
  }, [status, tracks, selectedQuality, fps, maxDuration, effectGlobal]);

  const handleCancel = useCallback(() => {
    engineRef.current?.cancel();
    engineRef.current = null;
    setStatus('idle');
    setProgress(0);
  }, []);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    downloadVideo(resultBlob, `export-${Date.now()}.webm`);
  }, [resultBlob]);

  const handleClose = useCallback(() => {
    if (status === 'rendering') handleCancel();
    onClose?.();
  }, [status, handleCancel, onClose]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Render ───────────────────────────────────
  if(!isOpen) {
    return <></>
  }
  return (
    <div style={S.overlay} onClick={handleClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.filmIcon}>
              <Film size={18} color="#ff099a" />
            </div>
            <div>
              <div style={S.title}>Xuất video</div>
              <div style={S.subtitle}>Thời lượng: {formatTime(maxDuration)}</div>
            </div>
          </div>
          <button onClick={handleClose} style={S.closeBtn}>
            <X size={18} color="#888" />
          </button>
        </div>

        {/* Divider */}
        <div style={S.divider} />

        {/* Settings */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Cấu hình</div>
          <div style={S.settingsGrid}>
            <div style={S.settingRow}>
              <span style={S.settingLabel}>Chất lượng</span>
              <Select
                value={qualityKey}
                onChange={setQualityKey}
                disabled={status === 'rendering'}
                options={QUALITY_OPTIONS.map(q => ({ value: q.label, label: q.label }))}
              />
            </div>
            <div style={S.settingRow}>
              <span style={S.settingLabel}>Frame rate</span>
              <div style={S.fpsGroup}>
                {FPS_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    disabled={status === 'rendering'}
                    style={S.fpsBtn(fps === f, status === 'rendering')}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress / Status */}
        {status === 'rendering' && (
          <div style={S.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} color="#ff099a" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#ccc' }}>Đang render...</span>
              </div>
              <span style={{ fontSize: 13, color: '#888' }}>
                {formatTime(currentSec)} / {formatTime(maxDuration)}
              </span>
            </div>
            <ProgressBar value={progress} />
            <div style={{ fontSize: 12, color: '#666', marginTop: 6, textAlign: 'right' }}>
              {progress.toFixed(1)}%
            </div>
          </div>
        )}

        {status === 'done' && (
          <div style={S.statusBox('#0d2e1a', '#22c55e')}>
            <CheckCircle2 size={18} color="#22c55e" />
            <span style={{ fontSize: 13, color: '#22c55e' }}>Render hoàn tất!</span>
          </div>
        )}

        {status === 'error' && (
          <div style={S.statusBox('#2e0d0d', '#ef4444')}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontSize: 13, color: '#ef4444' }}>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div style={S.footer}>
          {status === 'idle' || status === 'error' ? (
            <>
              <button onClick={handleClose} style={S.btnSecondary}>Đóng</button>
              <button onClick={handleStart} style={S.btnPrimary}>
                <Film size={15} />
                Bắt đầu render
              </button>
            </>
          ) : status === 'rendering' ? (
            <button onClick={handleCancel} style={S.btnDanger}>Huỷ</button>
          ) : status === 'done' ? (
            <>
              <button onClick={() => { setStatus('idle'); setProgress(0); }} style={S.btnSecondary}>
                Render lại
              </button>
              <button onClick={handleDownload} style={S.btnPrimary}>
                <Download size={15} />
                Tải về
              </button>
            </>
          ) : null}
        </div>

        {/* CSS keyframes */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  filmIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(255,9,154,0.12)',
    border: '1px solid rgba(255,9,154,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f0f0f0',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  divider: {
    height: 1,
    background: '#222',
    margin: '0 20px',
  },
  section: {
    padding: '16px 20px',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#555',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    fontSize: 13,
    color: '#aaa',
    flexShrink: 0,
  },
  fpsGroup: {
    display: 'flex',
    gap: 6,
  },
  fpsBtn: (active, disabled) => ({
    background: active ? 'rgba(255,9,154,0.15)' : '#222',
    border: `1px solid ${active ? 'rgba(255,9,154,0.5)' : '#333'}`,
    borderRadius: 7,
    color: active ? '#ff099a' : '#888',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    padding: '5px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  }),
  selectBtn: (disabled) => ({
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 210,
    justifyContent: 'space-between',
    opacity: disabled ? 0.5 : 1,
  }),
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 50,
    minWidth: 210,
    boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
  },
  dropdownItem: (active) => ({
    padding: '10px 14px',
    fontSize: 13,
    color: active ? '#ff099a' : '#ccc',
    background: active ? 'rgba(255,9,154,0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  }),
  progressTrack: {
    position: 'relative',
    height: 6,
    background: '#2a2a2a',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    position: 'absolute',
    inset: 0,
    width: `${pct}%`,
    background: 'linear-gradient(90deg, #c4007a, #ff099a)',
    borderRadius: 999,
    transition: 'width 0.2s ease',
  }),
  progressGlow: (pct) => ({
    position: 'absolute',
    top: 0,
    left: `${pct}%`,
    transform: 'translateX(-100%)',
    width: 40,
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,9,154,0.6))',
    borderRadius: 999,
    transition: 'left 0.2s ease',
  }),
  statusBox: (bg, border) => ({
    margin: '0 20px 4px',
    background: bg,
    border: `1px solid ${border}22`,
    borderRadius: 10,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }),
  footer: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    borderTop: '1px solid #222',
    marginTop: 4,
  },
  btnPrimary: {
    background: '#ff099a',
    border: 'none',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '9px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    background: '#222',
    border: '1px solid #333',
    borderRadius: 9,
    color: '#bbb',
    fontSize: 13,
    padding: '9px 18px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 9,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    padding: '9px 20px',
    cursor: 'pointer',
  },
};

export default RenderModal;
