import { createSlice } from '@reduxjs/toolkit';

const publicSlice = createSlice({
  name: 'public',
  initialState: {
    frame: 60,
    listTextEffect: [
      {"code": "zoom-in", "name": "Zoom In", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ZTXNaBp91VvRKi47qgf-JN-WUCDLz4BAsw&s"},
      {"code": "zoom-out", "name": "Zoom Out", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSq0fk8mpqsmv1Sx3TsndMZnBM1CswY6XbKGg&s"},
      {"code": "fade-in", "name": "Fade In", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ZTXNaBp91VvRKi47qgf-JN-WUCDLz4BAsw&s"},
      {"code": "fade-out", "name": "Fade Out", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSq0fk8mpqsmv1Sx3TsndMZnBM1CswY6XbKGg&s"},
      {"code": "slide-in-left", "name": "Slide In Left", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ZTXNaBp91VvRKi47qgf-JN-WUCDLz4BAsw&s"},
      {"code": "slide-in-right", "name": "Slide In Right", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSq0fk8mpqsmv1Sx3TsndMZnBM1CswY6XbKGg&s"},
      {"code": "slide-out-left", "name": "Slide Out Left", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3ZTXNaBp91VvRKi47qgf-JN-WUCDLz4BAsw&s"},
      {"code": "slide-out-right", "name": "Slide Out Right", "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSq0fk8mpqsmv1Sx3TsndMZnBM1CswY6XbKGg&s"},
      {"code": "neon", "name": "Neon", "thumbnail": "https://i.ytimg.com/vi/GjXwIEXcJmw/maxresdefault.jpg"},
      {"code": "random", "name": "Random Effect", "thumbnail": "https://i.ytimg.com/vi/PHWKWgp-aLo/maxresdefault.jpg"},
    ],
    listScreen: [
      {
        "code": "sd (4:3)",
        "width": 640,
        "height": 480,
      },
      {
        "code": "sd (3:4)",
        "width": 480,
        "height": 640,
      },
      {
        "code": "hd (16:9)",
        "width": 1280,
        "height": 720,
      },
      {
        "code": "hd (9:16)",
        "width": 720,
        "height": 1280,
      },
      {
        "code": "FHD (16:9)",
        "width": 1920,
        "height": 1080,
      },
      {
        "code": "FHD (9:16)",
        "width": 1080,
        "height": 1920,
      }
    ],
    listNameEffect: [
      {
        "code": "mainscreen",
        "name": "Màn hình chính"
      },
      // {
      //   "code": "import",
      //   "name": "Import"
      // },
      // {
      //   "code": "textEffect",
      //   "name": "Hiệu ứng chữ"
      // },
      // {
      //   "code": "createSubText",
      //   "name": "Tạo sub chữ"
      // },
      {
        "code": "cutaudio",
        "name": "Cắt nhạc"
      },
      {
        "code": "cutvideo",
        "name": "Cắt video"
      },
      {
        "code": "editor",
        "name": "Thêm hiệu ứng chữ"
      },{
        "code": "separate",
        "name": "Tách nhạc và giọng"
      },
      {
        "code": "download_audio",
        "name": "Tải nhạc từ youtube"
      }
    ],
    effectGlobal: "neon"
  },
  reducers: {
    updatePublic: (state, action) => {
      // action.payload sẽ chứa dữ liệu mới bạn gửi lên
        state.frame = action.payload.frame || state.frame; // Cập nhật frame nếu có, nếu không giữ nguyên
        state.listTextEffect = action.payload?.listTextEffect?.length > 0 
        && action.payload?.listTextEffect?.length > 
        state.listTextEffect?.length ? action.payload.listTextEffect : state.listTextEffect; // Cập nhật listTextEffect nếu có, nếu không giữ nguyên
        state.listScreen = action.payload.listScreen || state.listScreen; // Cập nhật listScreen nếu có, nếu không giữ nguyên 
        state.effectGlobal = action.payload.effectGlobal || state.effectGlobal; // Cập nhật listScreen nếu có, nếu không giữ nguyên 
      }
  }
});

export const { updatePublic} = publicSlice.actions;
export default publicSlice.reducer;