import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentTime: 0,
  tracks: [],
  pixelsPerSecond: 30, // Tăng lên 30 để nhìn mượt hơn
  isPlaying: false
};

export const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setValueTimeline: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setValueTimeline } = timelineSlice.actions;
export default timelineSlice.reducer;