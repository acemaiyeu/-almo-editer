import React, { useState, useEffect, useRef } from 'react';
import '../../style/IPhone17ProMaxKaraoke.scss'; 
import { showDynamic } from '../../app/ComponentSupport/functions';
import { useDispatch } from 'react-redux';
import { resetDynamic } from '../../app/features/dynamicIslandSlice';
import JSZip from 'jszip'; // Thêm thư viện JSZip để nén và giải nén file

export default function IphoneKaraoke() {
  const [activeTab, setActiveTab] = useState('karaoke');
  
  // Audio states
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioName, setAudioName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioFileRaw, setAudioFileRaw] = useState(null); // Lưu trữ file nhạc gốc phục vụ cho việc đóng gói ZIP
const [showKeyboard, setShowKeyBoard] = useState(true)
  // Khai báo dữ liệu gốc dạng mảng phẳng
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

  // Tự động phân dòng ban đầu
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
      setAudioFileRaw(file); // Lưu giữ tham chiếu file nhị phân thô để nén zip
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
        showDynamic(dispatch, "", 1,"")
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
        setIsPlaying(false);
        audioRef.current.pause();
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

  // Ghi nhận sự kiện Space/Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== 'studio' || studioWords.length === 0) return;

      if (e.code === 'Space') {
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
      if (activeTab !== 'studio' || e.code !== 'Space') return;
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
  }, [activeTab, isPlaying, recordingIndex, studioWords, isSpacePressed, audioUrl, currentStudioLineId]);

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
    // LỌC ĐIỀU KIỆN CHẶN: Chỉ xử lý khi nhạc bắt đầu phát thực sự
    if (isPlaying !== true) return;

    const audioElement = audioRef.current;
    if (!audioElement || !audioUrl) return;

    // Hàm xử lý lấy giá trị chốt hạ
    const handleGetDuration = () => {
      const durationInSeconds = audioElement.duration;
      console.log("audioElement.duration", audioElement.duration);
      // Cập nhật timeline hiển thị (đơn vị: giây)
      setDuration(durationInSeconds);

      // Đổi sang mili-giây
      const durationInMilliseconds = Math.round(durationInSeconds * 1000); 
      
      // Kiểm tra nếu ra số quá nhỏ (như số 2) do chưa load kịp thì bỏ qua không lấy
      if (durationInMilliseconds > 100) {
        console.log("🎯 ĐÃ LẤY ĐƯỢC GIÁ TRỊ CUỐI CÙNG KHI MỚI CHẠY:", durationInMilliseconds, "ms");

        // Đẩy sang hàm hiển thị dynamic của bạn
        showDynamic(
          dispatch,
          audioName.replaceAll(".wav","").replaceAll(".mp3",""),
          durationInMilliseconds,
          ""
        );
      }
    };

    // Nếu trình duyệt đã có sẵn dữ liệu thời gian của file, tóm lấy luôn
    if (audioElement.readyState >= 1) {
      handleGetDuration();
    } else {
      // Nếu chưa có, bắt buộc đợi sự kiện loadedmetadata kích hoạt đúng 1 lần rồi lấy
      audioElement.addEventListener('loadedmetadata', handleGetDuration, { once: true });
    }

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleGetDuration);
    };
  }, [isPlaying]); 

  // =========================================================
  // 🆕 TÍNH NĂNG THÊM MỚI: EXPORT DỰ ÁN THÀNH FILE .ZIP
  // =========================================================
  const exportToZipProject = async () => {
    try {
      const zip = new JSZip();
      
      // 1. Chuyển đổi mảng cấu trúc studioWords hiện tại thành chuỗi JSON
      const lyricsJsonString = JSON.stringify(studioWords, null, 2);
      zip.file("lyrics_timeline.json", lyricsJsonString);
      
      // 2. Kiểm tra xem người dùng đã upload nhạc chưa, nếu rồi đóng gói luôn file thô nhị phân
      if (audioFileRaw) {
        zip.file(audioName, audioFileRaw);
      } else {
        console.warn("⚠️ Không tìm thấy file nhạc nền thô, ZIP xuất ra sẽ chỉ có dữ liệu JSON lời.");
      }

      // 3. Tiến hành build nén file ZIP
      const contentBlob = await zip.generateAsync({ type: "blob" });
      
      // 4. Tạo đường link ảo để kích hoạt download file tự động về máy tính
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(contentBlob);
      const cleanName = audioName ? audioName.split('.')[0] : "almo_karaoke";
      downloadLink.download = `${cleanName}_project.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log("📥 Đã xuất thành công gói dự án ZIP hoàn chỉnh!");
    } catch (error) {
      console.error("Lỗi trong quá trình nén và xuất file ZIP:", error);
    }
  };

  // =========================================================
  // 🆕 TÍNH NĂNG THÊM MỚI: IMPORT NGƯỢC FILE .ZIP VÀO HỆ THỐNG
  // =========================================================
  const handleImportZipProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const unzippedData = await zip.loadAsync(file);
      
      let importedLyrics = null;
      let importedAudioFile = null;
      let detectedAudioName = "";

      // Duyệt qua tất cả các file có bên trong gói ZIP vừa tải lên
      for (const relativePath in unzippedData.files) {
        const zipEntry = unzippedData.files[relativePath];
        
        if (zipEntry.name === "lyrics_timeline.json") {
          // Đọc nội dung file JSON lời bài hát
          const jsonText = await zipEntry.async("string");
          importedLyrics = JSON.parse(jsonText);
        } else if (zipEntry.name.endsWith(".mp3") || zipEntry.name.endsWith(".wav") || zipEntry.name.endsWith(".m4a")) {
          // Đọc nội dung file nhạc nền
          const audioBlob = await zipEntry.async("blob");
          detectedAudioName = zipEntry.name;
          // Tạo một đối tượng File hoàn chỉnh từ Blob nhị phân để lưu vào state
          importedAudioFile = new File([audioBlob], detectedAudioName, { type: "audio/mpeg" });
        }
      }

      // Cập nhật dữ liệu vào các state của ứng dụng để đồng bộ lại giao diện
      if (importedLyrics) {
        setStudioWords(importedLyrics);
        setRawSongLyrics(importedLyrics); // Đồng bộ sang karaoke
        
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
      e.target.value = ""; // Reset input file
    } catch (error) {
      console.error("Lỗi khi giải nén hoặc phân tích file ZIP dự án:", error);
      alert("Cấu trúc file ZIP tải lên không hợp lệ hoặc bị lỗi dữ liệu!");
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

      {/* THANH TAB ĐIỀU KHIỂN NẰM NGOÀI CÙNG CỦA ỨNG DỤNG */}
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

      {/* NỘI DUNG THAY ĐỔI THEO TAB */}
      <div className="global-content-body">
        
        {/* --- TAB 1: PHÒNG KARAOKE - CHỈ HIỂN THỊ IPHONE --- */}
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

                  {/* Thanh Audio control nằm gọn bên trong iPhone đối với tab Karaoke */}
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

        {/* --- TAB 2: SETUP LỜI (STUDIO) - HIỂN THỊ RỘNG RÃI Ở NGOÀI BÌNH THƯỜNG --- */}
        {activeTab === 'studio' && (
          <div className="studio-fullscreen-view">
            <div className="studio-header-panel">
              <h2>⚙️ HỆ THỐNG GHIM TIME & ĐỒNG BỘ LỜI</h2>
              
              {/* KHU VỰC THÊM MỚI: CÁC NÚT IMPORT / EXPORT ĐÓNG GÓI DỰ ÁN DẠNG ZIP */}
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
              {/* Bên trái: Nhập text thô & Controller nhạc */}
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

              {/* Bên phải: Lưới chữ ghim thời gian rộng rãi */}
              <div className="workspace-right-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="step-label">BƯỚC 2: ẤN [SPACE] ĐỂ GHIM TIME & [ENTER] ĐỂ NGẮT DÒNG</label>
                  <span className="current-line-indicator">DÒNG HIỆN TẠI: #{currentStudioLineId}</span>
                </div>
                
                <div className="words-timeline-grid expanded">
                  {studioWords.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`word-badge ${idx === recordingIndex && isPlaying ? 'recording' : ''} ${item.time ? 'stamped' : ''} ${item.isLineEnd ? 'badge-line-end' : ''}`}
                    >
                      <span className="txt">{item.text}</span>
                      <span className="tm">{item.time ? `${item.time}s (L#${item.lineId})` : `--- (L#${item.lineId})`}</span>
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