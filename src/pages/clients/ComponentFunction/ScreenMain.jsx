import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Player } from "@remotion/player";
import { MyVideoComposition } from "./MyVideoComposition.jsx";
import { updateTextEffect } from "../../../app/features/textEffectSlice.js";

const ScreenMain = () => {
    const { lyrics, audioUrl, isPlaying, currentFrame, textEffect, timeStyle } = useSelector((state) => state.textEffect);
    const fpsRedux = useSelector((state) => state.public.frame || 60);
    const dispatch = useDispatch();
    const duration = 60; 
    const playerRef = useRef(null);
    const lastTimeRef = useRef(0);

    // 1. Đồng bộ từ Redux vào Player (Chỉ khi người dùng kéo Waveform)
    useEffect(() => {
        const player = playerRef.current;
        if (!player || isPlaying) return; // Nếu đang play thì không cưỡng bức seek

        if (timeStyle === 'waveform' || timeStyle === 'waveform-seek') {
            const targetFrame = Math.round(currentFrame);
            if (Math.abs(targetFrame - player.getCurrentFrame()) > 1) {
                player.seekTo(targetFrame);
            }
        }
    }, [currentFrame, timeStyle, isPlaying]);

    const handleManualPlay = () => {
        if (!playerRef.current) return;

        if (playerRef.current.isPlaying()) {
            playerRef.current.pause();
            dispatch(updateTextEffect({
                isPlaying: false
            }))
        } else {
            dispatch(updateTextEffect({
                isPlaying: true
            }))
            playerRef.current.play();
            playerRef.current.setVolume(0); // Tắt volume player vì đã có Waveform phát
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <Player 
                style={{ width: '100%' }}
                ref={playerRef}
                component={MyVideoComposition}
                durationInFrames={Math.floor(duration * fpsRedux)}
                fps={fpsRedux}
                controls
                compositionWidth={1280}
                compositionHeight={720}
                inputProps={{ audioUrl, lyrics, selectedEffect: textEffect }}
                onStateUpdate={(state) => {
                    // Cập nhật trạng thái Play/Pause
                    if (state.status === 'playing' && !isPlaying) dispatch(updateTextEffect({ isPlaying: true }));
                    if (state.status === 'paused' && isPlaying) dispatch(updateTextEffect({ isPlaying: false }));

                    // Nguồn thời gian chuẩn duy nhất khi đang Play
                    if (state.status === 'playing') {
                        const frame = playerRef.current?.getCurrentFrame() || 0;
                        const time = frame / fpsRedux;

                        if (Math.abs(time - lastTimeRef.current) > 0.03) { 
                            dispatch(updateTextEffect({ 
                                currentTime: time, 
                                currentFrame: frame,
                                timeStyle: 'player-playing' 
                            }));
                            lastTimeRef.current = time;
                        }
                    }
                }}
            />
            <button onClick={handleManualPlay} style={{
                width: "94%", height: "80%", position: 'absolute', 
                top: "0", left: "10px", backgroundColor: "transparent", 
                zIndex: 1000, border: 'none', cursor: 'pointer'
            }} />
        </div>
    );
};

export default ScreenMain;