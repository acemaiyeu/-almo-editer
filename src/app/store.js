// store.js
import { configureStore } from '@reduxjs/toolkit';
import dynamicReducer from './features/dynamicIslandSlice';
import textEffectReducer from './features/textEffectSlice';
import publicReducer from './features/publicSlice';
import timelineReducer from './features/timelineSlice';

export const store = configureStore({
  reducer: {
    dynamic: dynamicReducer,
    textEffect: textEffectReducer,
    public: publicReducer,
    timeline: timelineReducer,
  },
});