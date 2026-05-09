import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import { updateTextEffect } from '../../../app/features/textEffectSlice';

const AudioWaveform = ({ audioUrl }) => {
    const containerRef = useRef();
    const waveSurferRef = useRef(null);
    const lastDispatchTimeRef = useRef(0);
    const dispatch = useDispatch();
    
    const [isReady, setIsReady] = useState(false);
    const [localTime, setLocalTime] = useState(0); 

    const { isPlaying, currentTime, timeStyle } = useSelector((state) => state.textEffect);
    const fps = useSelector((state) => state.public.frame || 60);

    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4A4A4A',
            progressColor: '#00d1b2',
            cursorColor: '#ffffff',
            cursorWidth: 2,
            height: 80,
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            responsive: true,
            backend: 'WebAudio',
            normalize: true,
        });

        waveSurferRef.current = ws;
        ws.load(audioUrl);
        ws.on('ready', () => setIsReady(true));

        ws.on('audioprocess', (time) => {
            setLocalTime(time); 
            // QUAN TRỌNG: Nếu đang Play, KHÔNG dispatch lên Redux để tránh loop gây đứng audio
            if (!isPlaying) {
                if (Math.abs(time - lastDispatchTimeRef.current) > 0.1) {
                    dispatch(updateTextEffect({ 
                        currentTime: time, 
                        currentFrame: time * fps,
                        timeStyle: 'waveform' 
                    }));
                    lastDispatchTimeRef.current = time;
                }
            }
        });

        ws.on('interaction', (newTime) => {
            setLocalTime(newTime);
            dispatch(updateTextEffect({ 
                currentTime: newTime, 
                currentFrame: newTime * fps, 
                timeStyle: 'waveform-seek' 
            }));
        });

        return () => ws.destroy();
    }, [audioUrl, dispatch, isPlaying, fps]);

    // Đồng bộ Play/Pause
    useEffect(() => {
        const ws = waveSurferRef.current;
        if (!ws || !isReady) return;
        if (isPlaying && !ws.isPlaying()) ws.play().catch(() => {});
        else if (!isPlaying && ws.isPlaying()) ws.pause();
    }, [isPlaying, isReady]);

    // Ép Waveform chạy theo Video (Chỉ ép khi có sự sai lệch đáng kể)
    useEffect(() => {
        const ws = waveSurferRef.current;
        if (!ws || !isReady || !isPlaying) return;

        if (timeStyle === 'player-playing') {
            const wsTime = ws.getCurrentTime();
            const diff = Math.abs(wsTime - currentTime);

            // Ngưỡng 0.1s là an toàn để không bị đứng âm thanh (stuttering)
            if (diff > 0.1) {
                ws.setTime(currentTime);
                setLocalTime(currentTime);
            }
        }
    }, [currentTime, isReady, isPlaying, timeStyle]);

    return (
        <div style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '11px', marginBottom: '8px', fontFamily: 'monospace' }}>
                <span>AUDIO WAVEFORM</span>
                <span style={{ color: '#00d1b2', fontWeight: 'bold' }}>
                    {localTime.toFixed(2)}s / {Math.round(localTime * fps)}f
                </span>
            </div>
            <div ref={containerRef} style={{ width: '100%', minHeight: '80px', cursor: 'pointer' }} />
        </div>
    );
};

export default AudioWaveform;