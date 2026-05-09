import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Merge, Type } from 'lucide-react';

const SubLyricEditor = ({ isOpen, onClose, item, onApply }) => {
  const itemDuration = item?.duration || 5;
  const itemStart = item?.start || 0;

  const getInitialLyrics = () => {
    if (item?.lyrics && item.lyrics.length > 0) {
      return item.lyrics.map(l => ({ ...l }));
    }
    const words = item?.name ? item.name.trim().split(/\s+/) : [''];
    const wordDuration = itemDuration / words.length;
    return words.map((w, i) => ({
      word: w,
      start: i * wordDuration,
      end: (i + 1) * wordDuration
    }));
  };

  const [lyrics, setLyrics] = useState(() => getInitialLyrics());
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState('form'); // 'form' | 'bulk'
  const inputRefs = useRef([]);

  const handleAddWord = () => {
    const lastEnd = lyrics.length > 0 ? lyrics[lyrics.length - 1].end : 0;
    const remaining = itemDuration - lastEnd;
    const duration = remaining > 0.5 ? 0.5 : remaining;
    setLyrics([...lyrics, { word: '', start: lastEnd, end: lastEnd + duration }]);
  };

  const handleRemoveWord = (index) => {
    const updated = lyrics.filter((_, i) => i !== index);
    // Recalculate timings to fill the gap
    if (updated.length > 0) {
      const totalOldDuration = lyrics.reduce((sum, l) => sum + (l.end - l.start), 0);
      const scale = itemDuration / (totalOldDuration - (lyrics[index].end - lyrics[index].start) || 1);
      let current = 0;
      updated.forEach((l, i) => {
        const dur = (lyrics[i < index ? i : i + 1].end - lyrics[i < index ? i : i + 1].start) * scale;
        l.start = current;
        l.end = current + dur;
        current = l.end;
      });
    }
    setLyrics(updated);
  };

  const handleUpdateWord = (index, field, value) => {
    const updated = [...lyrics];
    updated[index][field] = value;
    setLyrics(updated);
  };

  const handleUpdateTime = (index, field, value) => {
    const num = parseFloat(value) || 0;
    const updated = [...lyrics];
    updated[index][field] = Math.max(0, Math.min(itemDuration, num));
    setLyrics(updated);
  };

  const handleBulkParse = () => {
    const lines = rawText.trim().split('\n').filter(l => l.trim());
    const parsed = lines.map((line, i) => {
      // Format: "word|start|end" or just "word"
      const parts = line.split('|').map(p => p.trim());
      const word = parts[0] || '';
      const start = parts[1] ? parseFloat(parts[1]) : (i * (itemDuration / lines.length));
      const end = parts[2] ? parseFloat(parts[2]) : ((i + 1) * (itemDuration / lines.length));
      return { word, start: Math.max(0, start), end: Math.min(itemDuration, end) };
    });
    setLyrics(parsed);
    setMode('form');
  };

  const handleApply = () => {
    // Filter out empty words and sort by start time
    const validLyrics = lyrics
      .filter(l => l.word.trim())
      .sort((a, b) => a.start - b.start);
    onApply(validLyrics);
    onClose();
  };

  const handleAutoSplit = () => {
    const text = item?.name || '';
    const words = text.trim().split(/\s+/).filter(w => w);
    if (words.length === 0) return;
    const wordDuration = itemDuration / words.length;
    setLyrics(words.map((w, i) => ({
      word: w,
      start: i * wordDuration,
      end: (i + 1) * wordDuration
    })));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < lyrics.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleAddWord();
        setTimeout(() => inputRefs.current[lyrics.length]?.focus(), 50);
      }
    }
  };

  if (!isOpen || !item) return null;

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
        maxWidth: '600px',
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
            Chỉnh sửa Sub/Lyrics
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div style={{
          padding: '12px 20px',
          background: '#222',
          fontSize: '12px',
          color: '#888',
          flexShrink: 0
        }}>
          <span style={{ color: '#ccc' }}>Text gốc:</span> {item.name} | 
          <span style={{ color: '#ccc' }}> Start:</span> {itemStart.toFixed(2)}s | 
          <span style={{ color: '#ccc' }}> Duration:</span> {itemDuration.toFixed(2)}s
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
            <Merge size={12} />
            Tự chia đều
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
              {lyrics.map((lyric, index) => (
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
                    value={lyric.word}
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
                    value={lyric.start.toFixed(2)}
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
                    value={lyric.end.toFixed(2)}
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
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubLyricEditor;

