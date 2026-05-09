import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import { setValueTimeline } from '../app/features/timelineSlice';
import { updateTextEffect } from '../app/features/textEffectSlice';
import { updatePublic } from '../app/features/publicSlice';
import {
  serializeProject,
  deserializeProject,
  downloadProjectFile,
  readProjectFile
} from '../utils/projectSerializer';

const ProjectManager = () => {
  const dispatch = useDispatch();
  const store = useSelector((state) => state);
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    if (store.timeline.tracks.length === 0) {
      showMessage('Timeline trống, không có gì để lưu!');
      return;
    }

    setIsSaving(true);
    try {
      const jsonString = await serializeProject(store);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadProjectFile(jsonString, `almo-project-${timestamp}.json`);
      showMessage('Đã lưu project thành công!');
    } catch (err) {
      console.error('Lỗi lưu project:', err);
      showMessage('Lỗi khi lưu project!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const jsonString = await readProjectFile(file);
      const projectData = await deserializeProject(jsonString);

      // Restore all Redux states
      dispatch(setValueTimeline(projectData.timeline));
      dispatch(updateTextEffect(projectData.textEffect));
      dispatch(updatePublic(projectData.public));

      showMessage('Đã load project thành công!');
    } catch (err) {
      console.error('Lỗi load project:', err);
      showMessage('Lỗi khi load project! File không hợp lệ.');
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleSave}
        disabled={isSaving}
        title="Lưu project"
        style={{
          background: 'var(--color-main)',
          border: 'none',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: '4px',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: '500',
          opacity: isSaving ? 0.7 : 1
        }}
      >
        {isSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
        Lưu
      </button>

      <button
        onClick={handleLoadClick}
        disabled={isLoading}
        title="Load project"
        style={{
          background: '#f59e0b',
          border: 'none',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: '500',
          opacity: isLoading ? 0.7 : 1
        }}
      >
        {isLoading ? <Loader2 size={14} className="spin" /> : <FolderOpen size={14} />}
        Load
      </button>

      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept=".json,application/json"
        onChange={handleFileSelect}
      />

      {message && (
        <span style={{
          fontSize: '12px',
          color: message.includes('Lỗi') ? '#ef4444' : 'var(--color-main)',
          marginLeft: '8px'
        }}>
          {message}
        </span>
      )}
    </div>
  );
};

export default ProjectManager;

