import React from "react";
import '../../../style/TimelineComponent.scss'
import { useSelector } from "react-redux";
import AudioWaveform from "./AudioWaveform";


const TimeLineComponent = () => {
    const {lyrics: lyricsData, audioUrl, currentFrame} = useSelector((state) => state.textEffect);
    return (    
        <div className="timeline-component-container">
                <div className="timeline-clock">{currentFrame}</div>
                <div className="timeline-item">
                    <div className="timeline-tracks">
                    {lyricsData && lyricsData.length > 0 && lyricsData.map((item, index) => (
                        <div 
                        key={index}
                        className="lyric-block"
                        style={{
                            left: `${item.start / 10}px`, // Ví dụ: 10ms = 1px độ dài
                            width: `${(item.end - item.start) / 10}px`,
                            position: 'absolute',
                            backgroundColor: '#ff0080',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '10px'
                        }}
                        >
                        {item.word}
                        </div>
                    ))}
                    </div>
                </div>
                <AudioWaveform audioUrl={audioUrl} />
        </div>
    )
}
export default TimeLineComponent;