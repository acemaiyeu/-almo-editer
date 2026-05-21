import React, { use, useEffect, useState } from "react";
import '../../../style/FunctionComponent.scss'
import { useDispatch, useSelector } from "react-redux";
import { updateTextEffect } from "../../../app/features/textEffectSlice";
import Import from "./Import";
import AudioTrimmer from "./AudioTrimmer";
import LyricMarker from "./LyricMarker";
import VideoCutter from "./VideoCutter";
import ScreenMain from "./ScreenMain";
import VideoPlayer from "./VideoPlayer"
import Editor from "./Editor";
import { updatePublic } from "../../../app/features/publicSlice";
import AudioSeparator from "../AudioSeparator";
import YoutubeMp3Downloader from "../YoutubeMp3Downloader";
import RecodingVideo from "../RecodingVideo";
import VoiceVideoEditor from "../VoiceVideoEditor";

const FunctionComponent = () => {
    const dispatch = useDispatch();
    const {listTextEffect, listNameEffect} = useSelector((state) => state.public);
    const {textEffect} = useSelector((state) => state.textEffect);
    const handleClick = (text) => {
        dispatch(updateTextEffect({ textEffect: text }));
    }
    const [nameEffectActive, setNameEffectActive] = useState('mainscreen'); // Mặc định active là 'textEffect'
    const list_effect_custom = localStorage.getItem("list_effect_custom");
    useEffect(() => {
         if(list_effect_custom){
        
            const list_effect = JSON.parse(list_effect_custom)
            
            const newListTextEffect = [...listTextEffect, ...list_effect];
            
            dispatch(updatePublic({listTextEffect: newListTextEffect}))
        }
    }, [list_effect_custom])
   
    

    return (    
        <div className="function-component-container" style={{minHeight: `${nameEffectActive === 'mainscreen' ? 'auto' : '100vh'}`}}>
            <div className="function-names">
                {listNameEffect && listNameEffect.length > 0 ? listNameEffect.map((item, index) => (
                    <div className={`function-name ${item.code === nameEffectActive ? 'active' : ''}`} key={index} onClick={() => {
                        setNameEffectActive(item.code)
                        dispatch(updatePublic({nameEffectActive: item.code}))
                        }
                    }>
                        {item.name}
                    </div>
                )) : (
                    <p>Không có chức năng nào để hiển thị.</p>
                )}
            </div>
            <div className="function-content">
                {nameEffectActive === 'import' && <Import />}
                {nameEffectActive === 'textEffect' &&
                    <>
                        <div className="effect-title">Hiệu ứng chữ</div>
                            <div className="effect-container" >
                                {listTextEffect && listTextEffect.length > 0 ? listTextEffect.map((effect, index) => (
                                    <div className={`${textEffect === effect.code ? 'active' : ''} effect-item`} title={effect.name} onClick={() => handleClick(effect.code)} key={index}>
                                        <img loading="lazy" src={effect.thumbnail} alt={effect.name} />
                                    </div>
                                )) : (
                                    <p>Không có hiệu ứng nào để hiển thị.</p>
                                )}
                            </div>
                            </>
                }
                {nameEffectActive === 'cutaudio' && <AudioTrimmer />}
                {nameEffectActive === 'cutvideo' &&  <VideoCutter />}
                {nameEffectActive === 'createSubText' && <LyricMarker />}
                {nameEffectActive === 'mainscreen' && <VideoPlayer />}
                {nameEffectActive === 'editor' && <Editor />}
                {nameEffectActive === 'separate' && <AudioSeparator/>}
                {nameEffectActive === 'download_audio' && <YoutubeMp3Downloader />}
                {nameEffectActive === 'recoding_video' && <VoiceVideoEditor  />}
                

                
                
                


                
                
            </div>
                
        </div>
    )
}
export default FunctionComponent;