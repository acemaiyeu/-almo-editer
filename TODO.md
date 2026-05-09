# TODO - Auto Sub Maker Feature

## Steps

1. [ ] Edit `src/app/features/textEffectSlice.js` - Add `setLyrics` reducer action
2. [ ] Modify `src/components/LyricsSubMaker.jsx` - Add 'auto' mode with:
   - Audio playback with speed control (0.1x - 2.0x)
   - Lyrics paste textarea
   - SPACE key timing (press 1 = start, press 2 = end)
   - Visual word highlighting
   - Apply button saves to textEffect.lyrics AND creates timeline tracks
3. [ ] Edit `src/pages/clients/ComponentFunction/TimeLineComponent2.jsx` - Pass audioUrl to LyricsSubMaker, update apply handler to also save lyrics
4. [ ] Test integration

