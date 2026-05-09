import React from 'react';
import '../style/EffectAllTrack.scss'
import { useDispatch, useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import { X, Play, Pause, Music, Upload, FastForward, Info, Clock } from 'lucide-react';
import { updatePublic } from '../app/features/publicSlice';

const EffectAllTrack = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const {listTextEffect, effectGlobal } = useSelector((state) => state.public);
    const handleChangeEffect = (effect_code) => {
        dispatch(updatePublic({effectGlobal: effect_code}))
    }
    if(!isOpen){
      return <></>
    }
    return (
      <div className={`effect-container`}>
          <div  className='effect-content'>
            <div className="close" onClick={() => onClose(false)}>Đóng</div>
              {listTextEffect && listTextEffect.length > 0 && listTextEffect.map((effect) => {
            return (
              <div className={`effect-item ${effectGlobal === effect.code ? 'active' : ''}`} title={effect.name} onClick={() => handleChangeEffect(effect.code)}>
                <div className='effect-item-thumbnail'>
                    <img className="effect-item-thumbnail-img" loading='lazy' src={effect.thumbnail}></img>
                </div>
                <div className='effect-item-content'>
                  {effect.name}
                </div>
              </div>
            )
          })}
          
          </div>
           <div className="effect-note">Hiệu ứng áp dụng cho toàn text</div>
      </div>
    )

}
  
export default EffectAllTrack;