import { createSlice } from '@reduxjs/toolkit';

const textEffectSlice = createSlice({
  name: 'textEffect',
  initialState: {
    text: "",
    lyrics: [
    {
        "word": "Ta",
        "start": 37.575231,
        "end": 37.731257
    },
    {
        "word": "gặp",
        "start": 37.847244,
        "end": 38.043286
    },
    {
        "word": "nhau",
        "start": 38.219439,
        "end": 38.391303
    },
    {
        "word": "như",
        "start": 38.58733,
        "end": 38.715322
    },
    {
        "word": "những",
        "start": 39.039509,
        "end": 39.291377
    },
    {
        "word": "người",
        "start": 39.499524,
        "end": 39.611421
    },
    {
        "word": "lạ",
        "start": 39.871437,
        "end": 40.207511
    },
    {
        "word": "giữa",
        "start": 40.431494,
        "end": 40.659603
    },
    {
        "word": "chốn",
        "start": 40.88754,
        "end": 41.035543
    },
    {
        "word": "nại",
        "start": 41.239612,
        "end": 41.491592
    },
    {
        "word": "hà",
        "start": 41.65963,
        "end": 41.799653
    }
], // Mảng chứa dữ liệu chữ, ví dụ: [{ word: "Chào", start: 1000, end: 1500 }, ...],
    isPlaying: false,
    currentTime: 0, // Thời gian hiện tại của nhạc (tính bằng giây),
    currentFrame: 0, // Thời gian hiện tại của nhạc (tính bằng frame),
    timeStyle: "normal",
    textEffect: "zoom-in",
    audioUrl: null,
  },
  reducers: {
    updateTextEffect: (state, action) => {
      // action.payload sẽ chứa dữ liệu mới bạn gửi lên
        state.text = action.payload.text || state.text; // Cập nhật text nếu có, nếu không giữ nguyên
        state.lyrics = action.payload.lyrics || state.lyrics; // Cập nhật lyrics nếu có, nếu không giữ nguyên
        state.isPlaying = action.payload.isPlaying !== undefined ? action.payload.isPlaying : state.isPlaying; // Cập nhật isPlaying nếu có, nếu không giữ nguyên
        state.currentTime = action.payload.currentTime !== undefined ? action.payload.currentTime : state.currentTime; // Cập nhật currentTime nếu có, nếu không giữ nguyên
        state.currentFrame = action.payload.currentFrame !== undefined ? action.payload.currentFrame : state.currentFrame; // Cập nhật currentFrame nếu có, nếu không giữ nguyên
        state.timeStyle = action.payload.timeStyle !== undefined ? action.payload.timeStyle : state.timeStyle; // Cập nhật timeStyle nếu có, nếu không giữ nguyên
        state.textEffect = action.payload.textEffect || state.textEffect; // Cập nhật textEffect nếu có, nếu không giữ nguyên
        state.audioUrl = action.payload.audioUrl || state.audioUrl; // Cập nhật audioUrl nếu có, nếu không giữ nguyên
      },
    setLyrics: (state, action) => {
      state.lyrics = action.payload;
    }
  }
});

export const { updateTextEffect, setLyrics } = textEffectSlice.actions;
export default textEffectSlice.reducer;