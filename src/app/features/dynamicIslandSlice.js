import { createSlice } from '@reduxjs/toolkit';

const dynamicIslandSlice = createSlice({
  name: 'dynamic',
  initialState: {
    title: '',
    content: '',
    time_show: 5000,
    notifi: ''
  },
  reducers: {
    // Tên hàm chuẩn là updateDynamic
    updateDynamic: (state, action) => {
      // state.notifi = action.payload.title;
      state.content = action.payload.content;
      state.time_show = action.payload.time_show,
      state.title = action.payload.title??state.title
    },
    resetDynamic: (state) => {
      state.notifi = '';
      state.content = '';
      state.time_show = 5000
    }
  }
});

// SỬA TẠI ĐÂY: Đảm bảo tên trong ngoặc nhọn { } khớp hoàn toàn với tên ở trên
export const { updateDynamic, resetDynamic } = dynamicIslandSlice.actions;
export default dynamicIslandSlice.reducer;