import React, { useState } from 'react';
import { X, Type, Clock, AlignLeft } from 'lucide-react';

const QuickSubCreator = ({ isOpen, onClose, onApply, startTime = 0 }) => {
  const [text, setText] = useState('');
  const [durationPerLine, setDurationPerLine] = useState(3);
  const [mode, setMode] = useState('equal'); // 'equal' or 'manual'
  const [manualTimings, setManualTimings] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    if (!text.trim()) return;

    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    let items = [];

    if (mode === 'equal') {
      // Each line gets equal duration
      items = lines.map((line, index) => ({
        id: Date.now() + index,
        name: line.trim(),
        type: 'text',
        start: startTime + (index * durationPerLine),
        duration: durationPerLine,
        color: '#7c3aed',
      }));
    } else {
      // Manual timings: format "start|duration" per line
      const timings = manualTimings.split('\n').filter(l => l.trim());
      items = lines.map((line, index) => {
        const timing = timings[index] || `${startTime + (index * 3)}|3`;
        const [s, d] = timing.split('|').map(Number);
        return {
          id: Date.now() + index,
          name: line.trim(),
          type: 'text',
          start: s || startTime + (index * 3),
          duration: d || 3,
          color: '#7c3aed',
        };
      });
    }

    onApply(items);
    setText('');
    setManualTimings('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        width: '520px',
        maxWidth: '90vw',
        border: '1px solid #333',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: '600' }}>
            <Type size={20} color="var(--color-main)" />
            Tạo sub chữ nhanh
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setMode('equal')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mode === 'equal' ? 'var(--color-main)' : '#444',
                background: mode === 'equal' ? 'rgba(255,9,154,0.15)' : '#222',
                color: mode === 'equal' ? 'var(--color-main)' : '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              <AlignLeft size={14} style={{ marginRight: '4px', display: 'inline' }} />
              Chia đều thời gian
            </button>
            <button
              onClick={() => setMode('manual')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mode === 'manual' ? 'var(--color-main)' : '#444',
                background: mode === 'manual' ? 'rgba(255,9,154,0.15)' : '#222',
                color: mode === 'manual' ? 'var(--color-main)' : '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              <Clock size={14} style={{ marginRight: '4px', display: 'inline' }} />
              Tự nhập thời gian
            </button>
          </div>

          {/* Text input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#999', fontSize: '13px', marginBottom: '8px', display: 'block' }}>
              Nội dung (mỗi dòng là 1 sub)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dòng 1&#10;Dòng 2&#10;Dòng 3..."
              style={{
                width: '100%',
                height: '120px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '10px',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Equal mode settings */}
          {mode === 'equal' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#999', fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                Thời lượng mỗi dòng (giây)
              </label>
              <input
                type="number"
                value={durationPerLine}
                onChange={(e) => setDurationPerLine(Number(e.target.value))}
                min={0.5}
                step={0.5}
                style={{
                  width: '100%',
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Manual mode settings */}
          {mode === 'manual' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#999', fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                Thời gian (format: start|duration, mỗi dòng tương ứng)
              </label>
              <textarea
                value={manualTimings}
                onChange={(e) => setManualTimings(e.target.value)}
                placeholder="0|3&#10;3|4&#10;7|2..."
                style={{
                  width: '100%',
                  height: '80px',
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Preview */}
          {text.trim() && (
            <div style={{
              background: '#222',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#888'
            }}>
              <div style={{ color: '#ccc', marginBottom: '4px' }}>Preview:</div>
              {text.split('\n').filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#fff' }}>{line.trim()}</span>
                  <span style={{ color: 'var(--color-main)' }}>
                    {mode === 'equal' 
                      ? `${startTime + (i * durationPerLine)}s - ${durationPerLine}s`
                      : 'manual'
                    }
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: '#333',
                border: 'none',
                color: '#ccc',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleApply}
              disabled={!text.trim()}
              style={{
                background: 'var(--color-main)',
                border: 'none',
                color: '#000',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
                opacity: text.trim() ? 1 : 0.5
              }}
            >
              Tạo {text.split('\n').filter(l => l.trim()).length} sub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSubCreator;

