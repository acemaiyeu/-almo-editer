import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Scissors, Trash2, Plus, Type, Film, Music, ChevronDown, BarChart2, Film as FilmIcon, Merge, ListMusic } from 'lucide-react';
import { setValueTimeline } from '../../../app/features/timelineSlice';
import ProjectManager from '../../../components/ProjectManager';
import RenderModal from '../../../components/RenderModal';
import SubLyricEditor from '../../../components/SubLyricEditor';
import LyricsSubMaker from '../../../components/LyricsSubMaker';
import MakePlaylist from '../../../components/MakePlaylist';
import EffectAllTrack from '../../../components/EffectAllTrack';

const AlmoEditorFinal = () => {
  const dispatch = useDispatch();
  const { currentTime, tracks, pixelsPerSecond, isPlaying } = useSelector((state) => state.timeline);
  const { listTextEffect } = useSelector((state) => state.public);
  const PIXELS_PER_SECOND = pixelsPerSecond || 30;

  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [draggingItem, setDraggingItem] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, trackId: null, itemId: null });
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [showSubEditor, setShowSubEditor] = useState(false);
  const [selectedSubItem, setSelectedSubItem] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [showQuickSub, setShowQuickSub] = useState(false);
  const [showQuickSubEffect, setShowQuickSubEffect] = useState(false);
  
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [resizingItem, setResizingItem] = useState(null);

  // Calculate max duration from all track items, default to 10s khi trống
  const maxDuration = tracks.length > 0
    ? Math.max(
        10,
        ...tracks.flatMap(t => t.items.map(i => i.start + i.duration))
      )
    : 10;
  const timelineWidth = maxDuration * PIXELS_PER_SECOND;
  const rulerTicks = Math.ceil(maxDuration / 5);

  const currentTimeRef = useRef(0);
  const requestRef = useRef();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // --- LOGIC NHẢY KIM ĐỎ KHI CLICK (MỚI) ---
  const handleTimelineSeek = (e) => {
    // Chỉ nhảy kim nếu KHÔNG phải đang kéo thả item hoặc resize
    if (draggingItem || resizingItem || draggingPlayhead) return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    // Tính toán X: Tọa độ click - lề trái container - 150px (sidebar) + khoảng scroll
    const x = e.clientX - rect.left - 150 + container.scrollLeft;
    
    const newPixel = Math.max(0, x);
    dispatch(setValueTimeline({ currentTime: newPixel }));
  };

  // Đồng bộ ref để loop animation không bị delay bởi state
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const playheadX = currentTime + 150; // +150 vì có sidebar track name
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    const buffer = 100; // khoảng đệm trước khi scroll

    if (playheadX > scrollLeft + containerWidth - buffer) {
      container.scrollLeft = playheadX - containerWidth + buffer;
    }

    if (playheadX < scrollLeft + buffer) {
      container.scrollLeft = Math.max(0, playheadX - buffer);
    }
  }, [currentTime]);

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  // --- 1. ENGINE TIMELINE (REAL-TIME SYNC) ---
  useEffect(() => {
    let lastTimestamp = null;
    const step = (timestamp) => {
      if (!isPlaying) return;
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      const deltaSec = deltaMs / 1000;
      const nextPixel = currentTimeRef.current + (deltaSec * PIXELS_PER_SECOND);
      const nextTimeSec = nextPixel / PIXELS_PER_SECOND;
      if (nextTimeSec >= maxDuration) {
        dispatch(setValueTimeline({ currentTime: 0, isPlaying: false }));
        return;
      }
      dispatch(setValueTimeline({ currentTime: nextPixel }));
      requestRef.current = requestAnimationFrame(step);
    };
    if (isPlaying) {
      lastTimestamp = null;
      requestRef.current = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, PIXELS_PER_SECOND, dispatch, maxDuration]);

  // --- 2. LOGIC IMPORT MEDIA (VIDEO/AUDIO) ---
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.includes('video') ? 'video' : 'audio';
    
    let tempElement
    if(typeof document !== 'undefined'){
      tempElement = document.createElement(type);
    }
    tempElement.src = url;
    
    tempElement.onloadedmetadata = () => {
      const realDuration = tempElement.duration;
      const waveCount = Math.max(10, Math.floor(realDuration)); 
      
      const newItem = { 
        id: Date.now(), 
        name: file.name, 
        url, 
        type, 
        start: currentTime / PIXELS_PER_SECOND, 
        duration: realDuration, 
        color: type === 'video' ? '#2563eb' : '#0891b2',
        waveData: type === 'audio' ? Array.from({length: waveCount}, () => Math.floor(Math.random() * 80) + 20) : []
      };

      dispatch(setValueTimeline({ 
        tracks: [...tracks, { id: "tr-" + Date.now(), name: type.toUpperCase(), items: [newItem] }] 
      }));
    };
    e.target.value = null;
  };
  const getRandomValue = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
  // --- 3. LOGIC ADD TEXT EFFECT ---
  const handleAddText = () => {
    setShowAddMenu(false);
    const textContent = prompt("Nhập nội dung chữ:", "New Text");
    if (!textContent) return;

    const newItem = {
      id: Date.now(),
      name: textContent,
      type: 'text',
      start: currentTime / PIXELS_PER_SECOND,
      duration: 5,
      color: '#7c3aed',
    };

    const existingTextTrack = tracks.find(t => t.name === 'TEXT');
    
    if (existingTextTrack) {
      const hasOverlap = existingTextTrack.items.some(item => {
        const itemStart = item.start;
        const itemEnd = item.start + item.duration;
        const newStart = newItem.start;
        const newEnd = newItem.start + newItem.duration;
        return (newStart < itemEnd && newEnd > itemStart);
      });

      if (!hasOverlap) {
        const newTracks = tracks.map(t => 
          t.id === existingTextTrack.id 
            ? { ...t, items: [...t.items, newItem] }
            : t
        );
        dispatch(setValueTimeline({ tracks: newTracks }));
        return;
      }
    }

    dispatch(setValueTimeline({ 
      tracks: [...tracks, { id: "tr-" + Date.now(), name: "TEXT", items: [newItem] }] 
    }));
  };

  // --- 4. LOGIC CẮT (SPLIT) ---
  const handleSplit = () => {
    if (!selectedItemId) return;
    const splitTimeSec = currentTime / PIXELS_PER_SECOND;
    
    const newTracks = tracks.map(track => {
      const itemToSplit = track.items.find(i => i.id === selectedItemId);
      if (itemToSplit && splitTimeSec > itemToSplit.start && splitTimeSec < (itemToSplit.start + itemToSplit.duration)) {
        const firstPart = { ...itemToSplit, duration: splitTimeSec - itemToSplit.start };
        const secondPart = { 
          ...itemToSplit, 
          id: Date.now() + Math.random(), 
          start: splitTimeSec, 
          duration: itemToSplit.duration - (splitTimeSec - itemToSplit.start) 
        };
        const otherItems = track.items.filter(i => i.id !== selectedItemId);
        return { ...track, items: [...otherItems, firstPart, secondPart] };
      }
      return track;
    });
    dispatch(setValueTimeline({ tracks: newTracks }));
  };

  // --- 5. LOGIC KÉO THẢ & RESIZE (GLOBAL EVENT) ---
  useEffect(() => {
    const handleMove = (e) => {
      const container = containerRef.current;
      if (!container || (!draggingPlayhead && !draggingItem && !resizingItem)) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - 150 + container.scrollLeft;

      if (draggingPlayhead) {
        dispatch(setValueTimeline({ currentTime: Math.max(0, x) }));
      } else if (draggingItem) {
        const deltaSec = (e.clientX - draggingItem.initialMouseX) / PIXELS_PER_SECOND;
        const newTracks = tracks.map(t => (
          t.id === draggingItem.trackId ? {
            ...t, items: t.items.map(i => i.id === draggingItem.itemId ? { ...i, start: Math.max(0, draggingItem.initialStart + deltaSec) } : i)
          } : t
        ));
        dispatch(setValueTimeline({ tracks: newTracks }));
      } else if (resizingItem) {
        const deltaSec = (e.clientX - resizingItem.initialMouseX) / PIXELS_PER_SECOND;
        const newTracks = tracks.map(t => (
          t.id === resizingItem.trackId ? {
            ...t, items: t.items.map(i => {
              if (i.id !== resizingItem.itemId) return i;
              if (resizingItem.edge === 'left') {
                const newStart = Math.max(0, resizingItem.initialStart + deltaSec);
                const newDuration = Math.max(0.5, resizingItem.initialDuration + (resizingItem.initialStart - newStart));
                return { ...i, start: newStart, duration: newDuration };
              } else {
                const newDuration = Math.max(0.5, resizingItem.initialDuration + deltaSec);
                return { ...i, duration: newDuration };
              }
            })
          } : t
        ));
        dispatch(setValueTimeline({ tracks: newTracks }));
      }
    };

    const handleUp = () => {
      if (draggingItem) {
        const { trackId, itemId } = draggingItem;
        const track = tracks.find(t => t.id === trackId);
        const draggedItem = track?.items.find(i => i.id === itemId);
        
        if (track && draggedItem && track.name === 'TEXT') {
          const otherItems = track.items.filter(i => i.id !== itemId);
          const hasOverlap = otherItems.some(item => {
            const itemStart = item.start;
            const itemEnd = item.start + item.duration;
            const dragStart = draggedItem.start;
            const dragEnd = draggedItem.start + draggedItem.duration;
            return (dragStart < itemEnd && dragEnd > itemStart);
          });

          if (hasOverlap) {
            const newTrack = { id: "tr-" + Date.now(), name: "TEXT", items: [draggedItem] };
            const newTracks = tracks.map(t => 
              t.id === trackId 
                ? { ...t, items: t.items.filter(i => i.id !== itemId) }
                : t
            ).concat(newTrack);
            dispatch(setValueTimeline({ tracks: newTracks }));
          }
        }
      }
      setDraggingPlayhead(false);
      setDraggingItem(null);
      setResizingItem(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [draggingPlayhead, draggingItem, resizingItem, tracks, PIXELS_PER_SECOND, dispatch]);

  // --- 6. SUB LYRIC EDITOR ---
  const handleOpenSubEditor = (item) => {
    if (item.type !== 'text') return;
    setSelectedSubItem(item);
    setShowSubEditor(true);
  };

  const handleApplyLyrics = (lyrics) => {
    if (!selectedSubItem) return;
    const newTracks = tracks.map(t => ({
      ...t,
      items: t.items.map(i => i.id === selectedSubItem.id ? { ...i, lyrics } : i)
    }));
    dispatch(setValueTimeline({ tracks: newTracks }));
  };

  // --- 7. MERGE TEXT ITEMS ---
  const handleToggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedForMerge([]);
  };

  const handleSelectForMerge = (item) => {
    if (!mergeMode || item.type !== 'text') return;
    const exists = selectedForMerge.find(i => i.id === item.id);
    if (exists) {
      setSelectedForMerge(selectedForMerge.filter(i => i.id !== item.id));
    } else {
      setSelectedForMerge([...selectedForMerge, item]);
    }
  };

  const handleMergeSelected = () => {
    if (selectedForMerge.length < 2) return;
    const sorted = [...selectedForMerge].sort((a, b) => a.start - b.start);
    const firstItem = sorted[0];
    const lastItem = sorted[sorted.length - 1];
    const mergedDuration = (lastItem.start + lastItem.duration) - firstItem.start;
    
    const allLyrics = [];
    sorted.forEach(item => {
      if (item.lyrics && item.lyrics.length > 0) {
        const offset = item.start - firstItem.start;
        item.lyrics.forEach(l => {
          allLyrics.push({
            word: l.word,
            start: l.start + offset,
            end: l.end + offset
          });
        });
      } else {
        const offset = item.start - firstItem.start;
        allLyrics.push({
          word: item.name,
          start: offset,
          end: offset + item.duration
        });
      }
    });

    const mergedItem = {
      ...firstItem,
      duration: mergedDuration,
      name: sorted.map(i => i.name).join(' '),
      lyrics: allLyrics.sort((a, b) => a.start - b.start)
    };

    const idsToRemove = new Set(sorted.map(i => i.id));
    const newTracks = tracks.map(t => ({
      ...t,
      items: t.items.filter(i => !idsToRemove.has(i.id)).concat(mergedItem)
    }));
    dispatch(setValueTimeline({ tracks: newTracks }));
    setSelectedForMerge([]);
    setMergeMode(false);
    setSelectedItemId(null);
  };

  // --- 8. QUICK SUB CREATOR ---
  const handleApplyQuickSub = (items) => {
    let currentTracks = [...tracks];
    const newQuickSubTracks = items.map(markerItem => {
      const timestamp = Date.now() + Math.floor(Math.random() * 1000);
      const duration = markerItem.end - markerItem.start;

      return {
        id: "tr-" + timestamp,
        name: "TEXT", 
        items: [
          {
            id: timestamp,
            name: markerItem.word,
            type: 'text',
            start: markerItem.start,
            duration: duration,
            style: {
              fontSize: 20,
              color: '#ffffff'
            },"color": "#7c3aed"
          }
        ]
      };
    });

    dispatch(setValueTimeline({ 
      tracks: [...currentTracks, ...newQuickSubTracks] 
    }));
  };

  return (
    <div style={{ height: '39vh', background: '#111', display: 'flex', flexDirection: 'column', borderTop: '1px solid #333', overflow: 'auto', borderRadius: '12px' }}>
      
      {/* TOOLBAR */}
      <div style={{ padding: '12px 20px', background: '#1a1a1a', display: 'flex', gap: '20px', alignItems: 'center', position: 'relative', zIndex: 500, borderBottom: '1px solid #222' }}>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)} 
            style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}
          >
            <Plus size={18} /> Add Layer <ChevronDown size={14} />
          </button>
          
          {showAddMenu && (
            <div style={{ position: 'absolute', top: '45px', left: 0, background: '#222', border: '1px solid #444', borderRadius: '6px', width: '180px', zIndex: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <div onClick={() => { setShowAddMenu(false); fileInputRef.current.click(); }} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '10px', color: '#eee' }}>
                <Film size={16} color="#3b82f6" /> Import Media
              </div>
              <div onClick={handleAddText} style={{ padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#eee' }}>
                <Type size={16} color="#a855f7" /> Text Effect
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', background: '#333' }} />

        <button onClick={handleSplit} title="Cắt đoạn (Split)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedItemId ? '#fff' : '#444' }}>
          <Scissors size={20} />
        </button>
        
        <button 
          onClick={() => {
            if(selectedItemId) {
              dispatch(setValueTimeline({ 
                tracks: tracks.map(t => ({...t, items: t.items.filter(i => i.id !== selectedItemId)})).filter(t => t.items.length > 0)
              }));
              setSelectedItemId(null);
            }
          }} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedItemId ? '#ef4444' : '#444' }}
        >
          <Trash2 size={20} />
        </button>

        {mergeMode && selectedForMerge.length >= 2 && (
          <button
            onClick={handleMergeSelected}
            style={{
              background: 'var(--color-main)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'
            }}
          >
            Gộp {selectedForMerge.length} items
          </button>
        )}

        <input type="file" ref={fileInputRef} hidden accept="video/*,audio/*" onChange={onFileChange} />

        <div style={{ width: '1px', height: '24px', background: '#333' }} />

        <button
          onClick={() => setShowQuickSub(true)}
          style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'
          }}
        >
          <Type size={18} color="var(--color-main)" /> Tạo sub
        </button>
        <button
          onClick={() => setShowQuickSubEffect(true)}
          style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'
          }}
        >
          <Type size={18} color="var(--color-main)" /> Hiệu ứng chữ toàn track
        </button>

        <div style={{ width: '1px', height: '24px', background: '#333' }} />

        <button
          onClick={() => setShowRenderModal(true)}
          style={{
            background: 'var(--color-main)', border: 'none', color: '#000', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600'
          }}
        >
          <FilmIcon size={16} /> Render
        </button>

        <ProjectManager />
      </div>

      {/* TIMELINE VIEWPORT - CLICK Ở ĐÂY ĐỂ SEEK */}
      <div 
        ref={containerRef} 
        onClick={handleTimelineSeek}
        style={{ flex: 1, overflow: 'auto', position: 'relative' }} 
        id="track-container-main"
      >
        <div style={{ width: timelineWidth + 150, height: '100%', position: 'relative' }}>
          
          {/* RULER (THƯỚC ĐO CHUẨN 5S) */}
          <div style={{ display: 'flex', height: '35px', background: '#161616', borderBottom: '1px solid #222', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ width: '150px', position: 'sticky', left: 0, background: '#161616', zIndex: 50, borderRight: '1px solid #333' }} />
            <div style={{width: "150px",borderLeft: '1px solid #333', fontSize: '10px', paddingLeft: '8px', color: '#666', flexShrink: 0, display: 'flex', alignItems: 'center' }}>Ruler Times:</div>
            {[...Array(rulerTicks)].map((_, i) => (
              <div key={i} style={{ width: "150px", borderLeft: '1px solid #333', fontSize: '10px', paddingLeft: '8px', color: '#666', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {i * 5}s
              </div>
            ))}
          </div>

          {/* PLAYHEAD (KIM ĐỎ) - SỬ DỤNG pointer-events: none ĐỂ KHÔNG CHẶN CLICK CỦA CONTAINER CHA */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: '#ff4d4d', left: currentTime + 150, zIndex: 100, pointerEvents: 'none' }}>
             <div 
              onMouseDown={(e) => {
                  e.stopPropagation(); // Ngăn sự kiện mouse down trigger Seek bậy
                  setDraggingPlayhead(true);
              }} 
              style={{ width: '14px', height: '24px', background: '#ff4d4d', cursor: 'ew-resize', marginLeft: '-6px', clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)', pointerEvents: 'auto' }} 
             />
          </div>

          {/* RENDERING TRACKS */}
          {tracks.map(track => (
            <div key={track.id + Math.random()} style={{ display: 'flex', minHeight: '90px', borderBottom: '1px solid #222', position: 'relative' }}>
              <div style={{ width: '150px', background: '#111', borderRight: '1px solid #333', padding: '20px 15px', position: 'sticky', left: 0, zIndex: 20, fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                {track.name.includes('VIDEO') ? <Film size={14} /> : track.name.includes('AUDIO') ? <Music size={14} /> : <Type size={14} />}
                {track.name}
              </div>
              
              <div style={{ flex: 1, position: 'relative' }}>
                {track.items.map(item => {
                  const isSelectedForMerge = selectedForMerge.find(i => i.id === item.id);
                  return (
                    <div key={item.id + Math.random()}
                      onContextMenu={(e) => {
                        if (item.type !== 'text') return;
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, trackId: track.id, itemId: item.id });
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation(); // NGĂN NHẢY KIM KHI CLICK CHỌN ITEM
                        if (mergeMode && item.type === 'text') {
                          handleSelectForMerge(item);
                        } else {
                          setSelectedItemId(item.id);
                          setDraggingItem({ trackId: track.id, itemId: item.id, initialMouseX: e.clientX, initialStart: item.start });
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubEditor(item);
                      }}
                      style={{
                        position: 'absolute', left: item.start * PIXELS_PER_SECOND, width: item.duration * PIXELS_PER_SECOND,
                        height: '60px', top: '15px', background: item.color, borderRadius: '4px',
                        border: isSelectedForMerge ? '2px dashed var(--color-main)' : (selectedItemId === item.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)'),
                        cursor: mergeMode && item.type === 'text' ? 'pointer' : 'move',
                        zIndex: 10, padding: '10px', overflow: 'hidden',
                        opacity: isSelectedForMerge ? 0.8 : 1
                      }}>
                      {/* LEFT RESIZE HANDLE */}
                      {selectedItemId === item.id && !mergeMode && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ trackId: track.id, itemId: item.id, edge: 'left', initialMouseX: e.clientX, initialStart: item.start, initialDuration: item.duration });
                          }}
                          style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
                            cursor: 'ew-resize', background: 'rgba(255,255,255,0.3)', borderRadius: '4px 0 0 4px'
                          }}
                        />
                      )}
                      {/* RIGHT RESIZE HANDLE */}
                      {selectedItemId === item.id && !mergeMode && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ trackId: track.id, itemId: item.id, edge: 'right', initialMouseX: e.clientX, initialStart: item.start, initialDuration: item.duration });
                          }}
                          style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px',
                            cursor: 'ew-resize', background: 'rgba(255,255,255,0.3)', borderRadius: '0 4px 4px 0'
                          }}
                        />
                      )}
                      <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)', color: '#fff' }}>{item.name}</div>
                      {item.typeEffect && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>FX: {item.typeEffect}</div>}
                      {item.lyrics && item.lyrics.length > 0 && (
                        <div style={{ fontSize: '9px', color: 'var(--color-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Type size={10} /> Sub: {item.lyrics.length} từ
                        </div>
                      )}

                      {/* WAVEFORM AUDIO */}
                      {item.type === 'audio' && (
                        <div style={{ display: 'flex', gap: '1.5px', alignItems: 'flex-end', height: '22px', marginTop: '8px' }}>
                          {item.waveData?.map((h, idx) => (
                            <div key={idx} style={{ flex: 1, background: 'rgba(255,255,255,0.4)', height: h + '%', borderRadius: '1px' }} />
                          ))}
                        </div>
                      )}
                      {item.type === 'video' && <div style={{ marginTop: '8px', opacity: 0.3 }}><BarChart2 size={16} color="white" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu.visible && (
        <div style={{ position: 'fixed', top: contextMenu.y - 100, left: contextMenu.x, background: '#222', border: '1px solid #444', borderRadius: '6px', width: '180px', zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', height: "150px", overflow: "auto" }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontSize: '12px', color: '#999', fontWeight: 'bold' }}>Chọn hiệu ứng</div>
          {listTextEffect && listTextEffect.length > 0 ? listTextEffect.map((effect, index) => (
            <div key={index} onClick={(e) => {
              e.stopPropagation();
              const newTracks = tracks.map(t => t.id === contextMenu.trackId || t.items.some(i => i.id === contextMenu.itemId) ? {
                ...t,
                
                items: t.items.map(i => i.id === contextMenu.itemId ? { ...i, typeEffect: effect.code, textEffect: effect.code, randomEffect:  effect.code && !i.randomEffect ? {
                  x: getRandomValue(-1000,1000),
                  y: getRandomValue(-700,700)
                } : undefined} : i)
              } : t);
              dispatch(setValueTimeline({ tracks: newTracks }));
              setContextMenu(prev => ({ ...prev, visible: false }));
            }} style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', color: '#eee', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={effect.thumbnail} alt={effect.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
              {effect.name}
            </div>
          )) : (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#666' }}>Không có hiệu ứng</div>
          )}
        </div>
      )}

      {/* MODALS GIỮ NGUYÊN */}
      <RenderModal isOpen={showRenderModal} onClose={() => setShowRenderModal(false)} />
      <SubLyricEditor key={selectedSubItem?.id} isOpen={showSubEditor} onClose={() => setShowSubEditor(false)} item={selectedSubItem} onApply={handleApplyLyrics} />
      <LyricsSubMaker isOpen={showQuickSub} onClose={() => setShowQuickSub(false)} onApply={handleApplyQuickSub} startTime={currentTime / PIXELS_PER_SECOND} />
      <EffectAllTrack isOpen={showQuickSubEffect} onClose={() => setShowQuickSubEffect(false)} onApply={handleApplyQuickSub} startTime={currentTime / PIXELS_PER_SECOND} />
      <MakePlaylist isOpen={showPlaylist} onClose={() => setShowPlaylist(false)} />
    </div>
  );
};

export default AlmoEditorFinal;