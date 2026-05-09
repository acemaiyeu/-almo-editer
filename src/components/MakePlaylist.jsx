import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Type, Clock } from 'lucide-react';

const MakePlaylist = ({ isOpen, onClose, onApply, startTime = 0 }) => {
  const [words, setWords] = useState([{ word: '', start: 0, end: 1 }]);
  const [baseStart, setBaseStart] = useState(startTime);
  const [defaultDuration, setDefaultDuration] = useState(1.5);
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState('form'); // 'form' | 'bulk'
  const inputRefs = useRef([]);

  const handleAddWord = () => {
    const lastEnd = words.length > 0 ? words[words.length - 1].end : 0;
    setWords([...words, { word: '', start: lastEnd, end: lastEnd + defaultDuration }]);
  };

  const handleRemoveWord = (index) => {
    const updated = words.filter((_, i) => i !== index);
    // Recalculate sequential timings
    let current = 0;
    updated.forEach((w) => {
      const dur = w.end - w.start;
      w.start = current;
      w.end = current + dur;
      current = w.end;
    });
    setWords(updated);
  };

  const handleUpdateWord = (index, field, value) => {
    const updated = [...words];
    updated[index][field] = value;
    setWords(updated);
  };

  const handleUpdateTime = (index, field, value) => {
    const num = parseFloat(value) || 0;
    const updated = [...words];
    updated[index][field] = Math.max(0, num);
    setWords(updated);
  };

  const handleBulkParse = () => {
    const lines = rawText.trim().split('\n').filter(l => l.trim());
    let current = 0;
    const parsed = lines.map((line) => {
      const parts = line.split('|').map(p => p.trim());
      const word = parts[0] || '';
      const start = parts[1] ? parseFloat(parts[1]) : current;
      const end = parts[2] ? parseFloat(parts[2]) : (start + defaultDuration);
      current = end;
      return { word, start: Math.max(0, start), end: Math.max(0, end) };
    });
    setWords(parsed);
    setMode('form');
  };

  const handleAutoSplit = () => {
    const text = prompt('Nhập câu để tự chia đều:', '');
    if (!text) return;
    const w = text.trim().split(/\s+/).filter(w => w);
    if (w.length === 0) return;
    const dur = defaultDuration;
    setWords(w.map((word, i) => ({
      word,
      start: i * dur,
      end: (i + 1) * dur
    })));
  };

  const handleApply = () => {
    const validWords = words
      .filter(w => w.word.trim())
      .sort((a, b) => a.start - b.start);
    
    // Convert to text items with lyrics (each word = 1 text item with single-word lyrics)
    const items = validWords.map((w, i) => ({
      id: Date.now() + i,
      name: w.word.trim(),
      type: 'text',
      start: baseStart + w.start,
      duration: Math.max(0.3, w.end - w.start),
      color: '#7c3aed',
      lyrics: [{ word: w.word.trim(), start: 0, end: w.end - w.start }]
    }));

    onApply(items);
    onClose();
    // Reset
    setWords([{ word: '', start: 0, end: 1 }]);
    setRawText('');
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < words.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleAddWord();
        setTimeout(() => inputRefs.current[words.length]?.focus(), 50);
      }
    }
  };

  if (!isOpen) return null;

  const mainColor = 'var(--color-main)';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '85vh',
        border: '1px solid #333',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: '600' }}>
            <Type size={20} color={mainColor} />
            Tạo Sub từ Lyrics
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Settings */}
        <div style={{
          padding: '12px 20px',
          background: '#222',
          display: 'flex',
          gap: '16px',
          flexShrink: 0,
          borderBottom: '1px solid #222',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#888" />
            <span style={{ color: '#888', fontSize: '12px' }}>Bắt đầu:</span>
            <input
              type="number"
              step="0.1"
              value={baseStart.toFixed(1)}
              onChange={(e) => setBaseStart(parseFloat(e.target.value) || 0)}
              style={{
                width: '70px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '12px'
              }}
            />
            <span style={{ color: '#666', fontSize: '11px' }}>s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#888', fontSize: '12px' }}>Duration mặc định:</span>
            <input
              type="number"
              step="0.1"
              value={defaultDuration.toFixed(1)}
              onChange={(e) => setDefaultDuration(parseFloat(e.target.value) || 1)}
              style={{
                width: '60px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '12px'
              }}
            />
            <span style={{ color: '#666', fontSize: '11px' }}>s</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          gap: '8px',
          flexShrink: 0,
          borderBottom: '1px solid #222'
        }}>
          <button
            onClick={() => setMode('form')}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: mode === 'form' ? mainColor : '#444',
              background: mode === 'form' ? 'rgba(255,9,154,0.15)' : '#222',
              color: mode === 'form' ? mainColor : '#ccc',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Form nhập
          </button>
          <button
            onClick={() => setMode('bulk')}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: mode === 'bulk' ? mainColor : '#444',
              background: mode === 'bulk' ? 'rgba(255,9,154,0.15)' : '#222',
              color: mode === 'bulk' ? mainColor : '#ccc',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Nhập nhanh
          </button>
          <button
            onClick={handleAutoSplit}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#222',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Type size={12} />
            Tự chia câu
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {mode === 'bulk' ? (
            <div>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                Nhập mỗi dòng theo format: <code style={{ color: mainColor }}>từ|start|end</code> hoặc chỉ <code style={{ color: mainColor }}>từ</code>
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Hello|0|1.5
World|1.5|3.0
...`}
                style={{
                  width: '100%',
                  height: '200px',
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={handleBulkParse}
                style={{
                  marginTop: '10px',
                  background: mainColor,
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Phân tích
              </button>
            </div>
          ) : (
            <div>
              {words.map((w, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    background: '#222',
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ color: '#666', fontSize: '11px', minWidth: '20px' }}>{index + 1}</span>
                  <input
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    value={w.word}
                    onChange={(e) => handleUpdateWord(index, 'word', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Từ..."
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '6px 10px',
                      fontSize: '13px'
                    }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={w.start.toFixed(2)}
                    onChange={(e) => handleUpdateTime(index, 'start', e.target.value)}
                    style={{
                      width: '70px',
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '6px 8px',
                      fontSize: '12px'
                    }}
                  />
                  <span style={{ color: '#666' }}>-</span>
                  <input
                    type="number"
                    step="0.1"
                    value={w.end.toFixed(2)}
                    onChange={(e) => handleUpdateTime(index, 'end', e.target.value)}
                    style={{
                      width: '70px',
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '6px 8px',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    onClick={() => handleRemoveWord(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddWord}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#222',
                  border: '1px dashed #555',
                  borderRadius: '6px',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '8px'
                }}
              >
                <Plus size={14} />
                Thêm từ
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#333',
              border: 'none',
              color: '#ccc',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            style={{
              background: mainColor,
              border: 'none',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Tạo Sub
          </button>
        </div>
      </div>
    </div>
  );
};

export default MakePlaylist;

