import React, { useState, useEffect, useRef } from 'react';
import '../../style/IPhone17ProMaxKaraoke.scss'; 
import { showDynamic } from '../../app/ComponentSupport/functions';
import { useDispatch } from 'react-redux';
import { resetDynamic } from '../../app/features/dynamicIslandSlice';
import JSZip from 'jszip'; 

export default function IphoneKaraoke() {
  const [activeTab, setActiveTab] = useState('karaoke');
  
  // Audio states
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioName, setAudioName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioFileRaw, setAudioFileRaw] = useState(null); 
  const [showKeyboard, setShowKeyBoard] = useState(true);

  // States dữ liệu lyrics
  const [rawSongLyrics, setRawSongLyrics] = useState([]);
  const [songLyrics, setSongLyrics] = useState([]);

  // States của Tab Karaoke
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [spokenWords, setSpokenWords] = useState([]);
  const dispatch = useDispatch();
  const [upcomingWords, setUpcomingWords] = useState([]);
  const [keyboardWords, setKeyboardWords] = useState([]);

  // States của Tab Studio
  const [rawText, setRawText] = useState('');
  const [studioWords, setStudioWords] = useState([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [currentStudioLineId, setCurrentStudioLineId] = useState(1);

  // 🛠️ Thêm State phục vụ chỉnh sửa thời gian thủ công
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Hàm chuyển đổi dữ liệu phẳng thành cấu trúc lines
  const buildLyricsStructure = (flatWords) => {
    const stampedWords = flatWords.filter(w => w.time !== null);
    if (stampedWords.length === 0) return [];

    const lineMap = {};
    stampedWords.forEach(word => {
      if (!lineMap[word.lineId]) {
        lineMap[word.lineId] = [];
      }
      lineMap[word.lineId].push({ text: word.text, time: word.time });
    });

    // Sắp xếp lại danh sách các từ trong cùng một dòng theo thứ tự thời gian tăng dần để tránh lỗi sub bay ngược
    Object.keys(lineMap).forEach(id => {
      lineMap[id].sort((a, b) => a.time - b.time);
    });

    const orderedLineIds = Object.keys(lineMap).map(Number).sort((a, b) => a - b);
    
    return orderedLineIds.map((id, index) => {
      const wordsInLine = lineMap[id];
      let calculatedEndTime = 0;

      if (index < orderedLineIds.length - 1) {
        const nextLineId = orderedLineIds[index + 1];
        const firstWordOfNextLine = lineMap[nextLineId][0];
        calculatedEndTime = Number((firstWordOfNextLine.time - 0.2).toFixed(2));
      } else {
        const lastWord = wordsInLine[wordsInLine.length - 1];
        calculatedEndTime = Number((lastWord.time + 2.0).toFixed(2));
      }

      return {
        lineId: id,
        endTime: calculatedEndTime,
        words: wordsInLine
      };
    });
  };

  // Tự động phân dòng ban đầu hoặc khi cập nhật dữ liệu thủ công
  useEffect(() => {
    if (rawSongLyrics.length > 0) {
      const structured = buildLyricsStructure(rawSongLyrics);
      setSongLyrics(structured);
      setStudioWords(rawSongLyrics);
      
      const stamped = rawSongLyrics.filter(w => w.time !== null);
      if (stamped.length > 0) {
        const maxLineId = Math.max(...stamped.map(w => w.lineId));
        setCurrentStudioLineId(maxLineId);
        setRecordingIndex(stamped.length);
      }
    }
  }, [rawSongLyrics]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioUrl]);

  // Vòng lặp đồng bộ thời gian thực tế của Audio
  useEffect(() => {
    if (isPlaying) {
      const updateTimeline = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        if (activeTab === 'karaoke' && songLyrics.length > 0) {
          checkKaraokeLogic(time);
        }
        animationFrameRef.current = requestAnimationFrame(updateTimeline);
      };
      animationFrameRef.current = requestAnimationFrame(updateTimeline);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, activeTab, currentLineIndex, upcomingWords, songLyrics]);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFileRaw(file); 
      setAudioUrl(URL.createObjectURL(file));
      setAudioName(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
      resetKaraokeState(true);
    }
  };

  const togglePlay = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      showDynamic(dispatch, "", 1,"");
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime >= duration - 0.5 || audioRef.current.paused) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        resetKaraokeState(false);
      }
      
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Audio play error:", err);
      });
    }
  };

  const resetKaraokeState = (shouldForceTimeZero = false) => {
    setCurrentLineIndex(0);
    setSpokenWords([]);
    
    if (shouldForceTimeZero && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }

    if (songLyrics.length > 0 && songLyrics[0]) {
      setKeyboardWords(songLyrics[0].words || []);
      setUpcomingWords(songLyrics[0].words || []);
    } else {
      setKeyboardWords([]);
      setUpcomingWords([]);
    }
  };

  useEffect(() => {
    resetKaraokeState(true); 
  }, [songLyrics, activeTab]);

  const checkKaraokeLogic = (time) => {
    const currentLine = songLyrics[currentLineIndex];
    if (!currentLine) return;

    if (time >= currentLine.endTime) {
      if (currentLineIndex < songLyrics.length - 1) {
        const nextIdx = currentLineIndex + 1;
        setCurrentLineIndex(nextIdx);
        setSpokenWords([]);
        setKeyboardWords(songLyrics[nextIdx].words || []);
        setUpcomingWords(songLyrics[nextIdx].words || []);
      } else {
        setKeyboardWords([]);
      }
      return;
    }

    if (upcomingWords.length > 0 && time >= upcomingWords[0].time) {
      const wordToFly = upcomingWords[0];
      triggerWordFlyAnimation(wordToFly.text);
      setSpokenWords(prev => [...prev, wordToFly]);
      setUpcomingWords(prev => prev.slice(1));
    }
  };

  const triggerWordFlyAnimation = (text) => {
    if (!text || text.trim() === '') return; 
    const cleanId = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const keyElement = document.querySelector(`.key-${cleanId}`);
    const targetElement = document.querySelector('.fly-target-zone');

    if (keyElement && targetElement) {
      const keyRect = keyElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      const ghost = document.createElement('div');
      ghost.innerText = text;
      ghost.className = "flying-ghost-word";
      
      ghost.style.left = `${keyRect.left + keyRect.width / 2}px`;
      ghost.style.top = `${keyRect.top + keyRect.height / 2}px`;
      document.body.appendChild(ghost);

      const dx = (targetRect.left + targetRect.width / 2) - (keyRect.left + keyRect.width / 2);
      const dy = (targetRect.top + targetRect.height / 2) - (keyRect.top + keyRect.height / 2);

      setTimeout(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.6)`;
        ghost.style.opacity = '0';
      }, 25);

      setTimeout(() => ghost.remove(), 550);
    }
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    
    const words = rawText.trim().replace(/\n/g, ' ').split(/\s+/).filter(w => w !== '').map(word => ({
      text: word,
      time: null,
      lineId: 1,
      isLineEnd: false
    }));

    setStudioWords(words);
    setRecordingIndex(0);
    setCurrentStudioLineId(1);
  };

  // Lắng nghe phím bấm hệ thống
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== 'studio') return;
      
      // Chặn nhận phím tắt nếu người dùng đang gõ nhập số chỉnh sửa time trực tiếp
      if (editingIndex !== null) return;

      // Nhấn phím K để chèn đoạn dạo nhạc
      if (e.key === 'k' || e.key === 'K') {
        if (!isPlaying || !audioRef.current) return;
        e.preventDefault();

        const currentTimeStamp = Number(audioRef.current.currentTime.toFixed(2));
        const blankWord = {
          text: " ", 
          time: currentTimeStamp,
          lineId: currentStudioLineId,
          isLineEnd: false
        };

        const updatedWords = [...studioWords];
        updatedWords.splice(recordingIndex, 0, blankWord);
        
        setStudioWords(updatedWords);
        setRecordingIndex(prev => prev + 1); 
        return;
      }

      if (e.code === 'Space') {
        if (studioWords.length === 0) return;
        e.preventDefault(); 
        
        if (!isPlaying && audioUrl && recordingIndex === 0) {
          if (audioRef.current) audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          return; 
        }

        if (isPlaying && !isSpacePressed && recordingIndex < studioWords.length) {
          setIsSpacePressed(true);
          const updatedWords = [...studioWords];
          
          updatedWords[recordingIndex].time = Number(audioRef.current.currentTime.toFixed(2));
          updatedWords[recordingIndex].lineId = currentStudioLineId;
          setStudioWords(updatedWords);
        }
      }

      if (e.code === 'Enter') {
        if (studioWords.length === 0) return;
        e.preventDefault();
        const lastRecordedIdx = recordingIndex - 1 >= 0 ? recordingIndex - 1 : 0;
        
        if (studioWords[lastRecordedIdx]) {
          const updatedWords = [...studioWords];
          updatedWords[lastRecordedIdx].isLineEnd = true;
          
          const nextLineId = currentStudioLineId + 1;
          setCurrentStudioLineId(nextLineId);

          for (let i = recordingIndex; i < updatedWords.length; i++) {
            updatedWords[i].lineId = nextLineId;
          }
          setStudioWords(updatedWords);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (activeTab !== 'studio' || e.code !== 'Space' || studioWords.length === 0 || editingIndex !== null) return;
      e.preventDefault();
      
      if (isSpacePressed) {
        setIsSpacePressed(false);
        if (recordingIndex < studioWords.length) {
          setRecordingIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTab, isPlaying, recordingIndex, studioWords, isSpacePressed, audioUrl, currentStudioLineId, editingIndex]);

  // 🛠️ HÀM MỚI: Kích hoạt chế độ chỉnh sửa thời gian thủ công khi Click vào Badge
  const startInlineEditTime = (index, currentTimeVal) => {
    setEditingIndex(index);
    setEditingValue(currentTimeVal !== null ? currentTimeVal.toString() : '0');
  };

  // 🛠️ HÀM MỚI: Lưu giá trị thời gian thủ công vừa sửa đổi vào mảng dữ liệu gốc
  const saveInlineEditTime = (index) => {
    const parsedTime = parseFloat(editingValue);
    if (!isNaN(parsedTime)) {
      const updatedWords = [...studioWords];
      updatedWords[index].time = Number(parsedTime.toFixed(2));
      
      setStudioWords(updatedWords);
    }
    setEditingIndex(null);
  };

  const saveStudioDataToKaraoke = () => {
    const structured = buildLyricsStructure(studioWords);
    setSongLyrics(structured);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);

    setCurrentLineIndex(0);
    setSpokenWords([]);
    if (structured.length > 0) {
      setKeyboardWords(structured[0].words || []);
      setUpcomingWords(structured[0].words || []);
    }

    setActiveTab('karaoke'); 
  };

  useEffect(() => {
    if (isPlaying !== true) return;

    const audioElement = audioRef.current;
    if (!audioElement || !audioUrl) return;

    const handleGetDuration = () => {
      const durationInSeconds = audioElement.duration;
      setDuration(durationInSeconds);
      const durationInMilliseconds = Math.round(durationInSeconds * 1000); 
      
      if (durationInMilliseconds > 100) {
        showDynamic(
          dispatch,
          audioName.replaceAll(".wav","").replaceAll(".mp3",""),
          durationInMilliseconds,
          ""
        );
      }
    };

    if (audioElement.readyState >= 1) {
      handleGetDuration();
    } else {
      audioElement.addEventListener('loadedmetadata', handleGetDuration, { once: true });
    }

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleGetDuration);
    };
  }, [isPlaying]); 

  const exportToZipProject = async () => {
    try {
      const zip = new JSZip();
      const lyricsJsonString = JSON.stringify(studioWords, null, 2);
      zip.file("lyrics_timeline.json", lyricsJsonString);
      
      if (audioFileRaw) {
        zip.file(audioName, audioFileRaw);
      }

      const contentBlob = await zip.generateAsync({ type: "blob" });
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(contentBlob);
      const cleanName = audioName ? audioName.split('.')[0] : "almo_karaoke";
      downloadLink.download = `${cleanName}_project.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error("Lỗi xuất file ZIP:", error);
    }
  };

  const handleImportZipProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const unzippedData = await zip.loadAsync(file);
      let importedLyrics = null;
      let importedAudioFile = null;
      let detectedAudioName = "";

      for (const relativePath in unzippedData.files) {
        const zipEntry = unzippedData.files[relativePath];
        if (zipEntry.name === "lyrics_timeline.json") {
          const jsonText = await zipEntry.async("string");
          importedLyrics = JSON.parse(jsonText);
        } else if (zipEntry.name.endsWith(".mp3") || zipEntry.name.endsWith(".wav") || zipEntry.name.endsWith(".m4a")) {
          const audioBlob = await zipEntry.async("blob");
          detectedAudioName = zipEntry.name;
          importedAudioFile = new File([audioBlob], detectedAudioName, { type: "audio/mpeg" });
        }
      }

      if (importedLyrics) {
        setStudioWords(importedLyrics);
        setRawSongLyrics(importedLyrics); 
        
        const stamped = importedLyrics.filter(w => w.time !== null);
        setRecordingIndex(stamped.length);
        if (stamped.length > 0) {
          const maxLineId = Math.max(...stamped.map(w => w.lineId));
          setCurrentStudioLineId(maxLineId);
        }
      }

      if (importedAudioFile) {
        setAudioFileRaw(importedAudioFile);
        setAudioUrl(URL.createObjectURL(importedAudioFile));
        setAudioName(detectedAudioName);
        setIsPlaying(false);
        setCurrentTime(0);
      }

      alert("📤 Đã khôi phục toàn bộ dự án từ file ZIP thành công!");
      e.target.value = ""; 
    } catch (error) {
      console.error("Lỗi import ZIP:", error);
      alert("Cấu trúc file ZIP tải lên không hợp lệ!");
    }
  };

  return (
    <div className="layout-root-container">
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      <div className="global-tab-navigation">
        <button 
          onClick={() => setActiveTab('karaoke')}
          className={`global-tab-btn ${activeTab === 'karaoke' ? 'active' : ''}`}
        >
          🎤 PHÒNG KARAOKE (IPHONE MODE)
        </button>
        <button 
          onClick={() => setActiveTab('studio')}
          className={`global-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
        >
          ⚙️ STUDIO SETUP LỜI (FULL SCREEN)
        </button>
      </div>

      <div className="global-content-body">
        
        {activeTab === 'karaoke' && (
          <div className="iphone-wrapper-center">
            <div className="iphone-chassis">
              <div className="iphone-screen">
                <div className="phone-dynamic-body">
                  <div className="karaoke-tab-view">
                    <div className="display-lyrics-center">
                      <div className="fly-target-zone">
                        {spokenWords.length === 0 ? (
                          <span className="placeholder-text"></span>
                        ) : (
                          spokenWords.map((word, idx) => (
                            <span key={idx} className="active-word-item">
                              {word.text}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {showKeyboard && 
                    <div className="keyboard-suggest-box">
                      <div className="keyboard-header-title">#ALMO</div>
                      <div className="keyboard-layout-grid">
                        {keyboardWords.length > 0 ? (
                          keyboardWords.map((word, index) => {
                            const isUpcoming = upcomingWords.some(w => w.text === word.text && w.time === word.time);
                            const keyId = word.text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                            if(word.text.trim() === '') return null;

                            return (
                              <div
                                key={index}
                                className={`key-btn key-${keyId} ${isUpcoming ? 'has-word' : 'empty-word'}`}
                              >
                                {word.text}
                              </div>
                            );
                          })
                        ) : (
                          Array(6).fill(0).map((_, i) => (
                            <div key={i} className="key-btn empty-word"></div>
                          ))
                        )}
                      </div>
                    </div>}
                  </div>

                  {!isPlaying && <div className="bottom-audio-controller">
                      <div className="audio-name-display">🎵 {audioName}</div>
                    <button
                      onClick={togglePlay}
                      disabled={!audioUrl}
                      className={`master-play-btn ${!audioUrl ? 'disabled' : isPlaying ? 'playing' : ''}`}
                    >
                      {isPlaying ? '⏸ TẠM DỪNG NHẠC' : '▶ PHÁT BÀI HÁT'}
                    </button>
                  </div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="studio-fullscreen-view">
            <div className="studio-header-panel">
              <h2>⚙️ HỆ THỐNG GHIM TIME & ĐỒNG BỘ LỜI</h2>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={exportToZipProject} 
                  className="action-btn-accent" 
                  style={{ background: '#ec4899', padding: '8px 16px', fontSize: '13px' }}
                >
                  📥 XUẤT FILE ZIP DỰ ÁN
                </button>
                <div className="file-uploader-wrapper" style={{ height: '36px', width: '200px', margin: 0, background: '#4b5563' }}>
                  <input type="file" accept=".zip" onChange={handleImportZipProject} />
                  <span style={{ color: '#fff' }}>📤 LOAD FILE ZIP DỰ ÁN</span>
                </div>
              </div>

              <div className="studio-timer-badge">
                ⏱️ {currentTime.toFixed(1)}s / {duration ? duration.toFixed(1) : '0.0'}s
              </div>
            </div>
            
            <div className="file-uploader-wrapper">
              <input type="file" accept="audio/*" onChange={handleAudioUpload} />
              <span>📁 Chọn nhạc nền bài hát (.mp3)</span>
            </div>

            <div className="studio-workspace-layout">
              <div className="workspace-left-panel">
                <div className="step-block">
                  <label className="step-label">BƯỚC 1: NHẬP VĂN BẢN THÔ</label>
                  <textarea
                    className="studio-textarea"
                    placeholder="Nhập hoặc dán lời thô vào đây..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <button onClick={handleParseRawText} className="action-btn-accent">
                    ⚡ TÁCH CHỮ LÀM BÀN PHÍM
                  </button>
                </div>

                <div className="speed-control-wrapper">
                  <div className="speed-label-row">
                    <span>⏱️ Tốc độ phát nhạc Studio:</span>
                    <strong className="speed-value">{playbackSpeed.toFixed(1)}x</strong>
                  </div>
                  <input 
                    type="range" min="0.1" max="1.0" step="0.1" 
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="speed-slider"
                  />
                </div>

                <div className="studio-audio-player-box">
                  {!audioUrl ? (
                    <div className="file-uploader-wrapper global-style">
                      <input type="file" accept="audio/*" onChange={handleAudioUpload} />
                      <span>📁 Tải file nhạc nền lên (.mp3)</span>
                    </div>
                  ) : (
                    <div className="audio-control-active">
                      <div className="song-title">🎵 {audioName}</div>
                      <button
                        onClick={togglePlay}
                        className={`master-play-btn wide-style ${isPlaying ? 'playing' : ''}`}
                      >
                        {isPlaying ? '⏸ TẠM DỪNG BẮT TIME' : '▶ PHÁT NHẠC ĐỂ GHIM TIME'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="step-block">
                    <button className="button-primary" onClick={() => setShowKeyBoard(!showKeyboard)}>{showKeyboard ? "Ẩn bàn phím" : "Hiện bàn phím"}</button>
                </div>
              </div>

              <div className="workspace-right-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="step-label">BƯỚC 2: ẤN [SPACE] GHIM TIME, [K] DẠO NHẠC, CLICK VÀO SỐ GIÂY ĐỂ TỰ CHỈNH</label>
                  <span className="current-line-indicator">DÒNG HIỆN TẠI: #{currentStudioLineId}</span>
                </div>
                
                <div className="words-timeline-grid expanded">
                  {studioWords.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`word-badge ${idx === recordingIndex && isPlaying ? 'recording' : ''} ${item.time !== null ? 'stamped' : ''} ${item.isLineEnd ? 'badge-line-end' : ''}`}
                    >
                      <span className="txt">{item.text.trim() === '' ? '[DẠO NHẠC]' : item.text}</span>
                      
                      {/* 🛠️ KHU VỰC THAY ĐỔI: Cho phép sửa time linh hoạt */}
                      {editingIndex === idx ? (
                        <input
                          type="number"
                          step="0.01"
                          className="inline-edit-time-input"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => saveInlineEditTime(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEditTime(idx);
                          }}
                          autoFocus
                          style={{ width: '65px', background: '#1f2937', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', textAlign: 'center', fontSize: '11px', padding: '2px' }}
                        />
                      ) : (
                        <span 
                          className="tm" 
                          onClick={() => startInlineEditTime(idx, item.time)}
                          style={{ cursor: 'pointer', textDecoration: 'underline dotted', color: item.time ? '#10b981' : '#9ca3af' }}
                          title="Click để sửa lại thời gian"
                        >
                          {item.time !== null ? `${item.time}s (L#${item.lineId})` : `--- (L#${item.lineId})`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={saveStudioDataToKaraoke} className="submit-studio-btn large-style">
                  💾 XUẤT DATA & CHUYỂN SANG PHÒNG KARAOKE (NÚT LỚN)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}