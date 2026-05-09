import { createSlice } from '@reduxjs/toolkit';

const dynamicIslandSlice = createSlice({
  name: 'dynamic',
  initialState: {
    notifi: '',
    content: ''
  },
  reducers: {
    // Tên hàm chuẩn là updateDynamic
    updateDynamic: (state, action) => {
      state.notifi = action.payload.title;
      state.content = action.payload.content;
    },
    resetDynamic: (state) => {
      state.notifi = '';
      state.content = '';
    }
  }
});

// SỬA TẠI ĐÂY: Đảm bảo tên trong ngoặc nhọn { } khớp hoàn toàn với tên ở trên
export const { updateDynamic, resetDynamic } = dynamicIslandSlice.actions;
export default dynamicIslandSlice.reducer;