import React, { useState } from 'react';
import '../../style/SettingModal.scss';
import { updateProfile } from '../../app/features/profileSlice';
import { updateNotification } from '../../services/UserService';

const SettingModal = ({setShowSetting, isNotification = false, profile, dispatch}) => {
  const [settings, setSettings] = useState([
    { id: 1, title: 'Nhận thông báo qua email', desc: 'Nhận email khi có sản phẩm vừa ra mắt hoặc trúng giải', active: true }
  ]);

  const handleToggle = async () => {
      await updateNotification(dispatch, !isNotification);
      dispatch(updateProfile({
        ...profile,
        notification: !isNotification
      }))
      isNotification = !isNotification;
  };
  return (
    <div className="overlay">
      <div className="setting-modal">
        <header className="modal-header">
          <h2>Cài đặt</h2>
          <button className="close-btn" onClick={() => setShowSetting()}>&times;</button>
        </header>

        <div className="setting-list">
          {settings.map((item) => (
            <div key={item.id} className="setting-item" onClick={() => handleToggle()} >
              <div className="setting-info">
                <span className="setting-title">{item.title}</span>
                <p className="setting-desc">{item.desc}</p>
              </div>
              
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isNotification} 
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingModal;