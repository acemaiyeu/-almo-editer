import React, { useState } from 'react';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor } from 'demucs-web';
import { useDispatch } from 'react-redux';
import { updateDynamic } from '../../app/features/dynamicIslandSlice';
import { showDynamic } from '../../app/ComponentSupport/functions';

const AudioSeparator = () => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [audioUrls, setAudioUrls] =
    useState({
      vocal: null,
      drums: null,
      bass: null,
      other: null,
    });

  // =========================
  // AUDIO BUFFER -> WAV
  // =========================

  const bufferToWave = (
    audioBuffer
  ) => {

    const numOfChan =
      audioBuffer.numberOfChannels;

    const length =
      audioBuffer.length *
      numOfChan *
      2 +
      44;

    const buffer =
      new ArrayBuffer(length);

    const view =
      new DataView(buffer);

    const channels = [];

    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => {
      view.setUint16(
        pos,
        data,
        true
      );

      pos += 2;
    };

    const setUint32 = (data) => {
      view.setUint32(
        pos,
        data,
        true
      );

      pos += 4;
    };

    // RIFF

    setUint32(0x46464952);

    setUint32(length - 8);

    setUint32(0x45564157);

    // fmt

    setUint32(0x20746d66);

    setUint32(16);

    setUint16(1);

    setUint16(numOfChan);

    setUint32(
      audioBuffer.sampleRate
    );

    setUint32(
      audioBuffer.sampleRate *
      2 *
      numOfChan
    );

    setUint16(numOfChan * 2);

    setUint16(16);

    // data

    setUint32(0x61746164);

    setUint32(length - pos - 4);

    for (
      let i = 0;
      i < numOfChan;
      i++
    ) {

      channels.push(
        audioBuffer.getChannelData(i)
      );
    }

    while (pos < length) {

      for (
        let i = 0;
        i < numOfChan;
        i++
      ) {

        let sample = Math.max(
          -1,
          Math.min(
            1,
            channels[i][offset]
          )
        );

        sample =
          sample < 0
            ? sample * 32768
            : sample * 32767;

        view.setInt16(
          pos,
          sample,
          true
        );

        pos += 2;
      }

      offset++;
    }

    return new Blob(
      [buffer],
      {
        type: 'audio/wav',
      }
    );
  };

  // =========================
  // CREATE BUFFER
  // =========================

  const createAudioBuffer = (
    audioCtx,
    left,
    right,
    sampleRate
  ) => {

    const buffer =
      audioCtx.createBuffer(
        2,
        left.length,
        sampleRate
      );

    buffer
      .getChannelData(0)
      .set(left);

    buffer
      .getChannelData(1)
      .set(right);

    return buffer;
  };

  // =========================
  // PROCESS
  // =========================

  const processAudio = async (e) => {
    if(window.location.hostname !== "localhost"){
      showDynamic(dispatch, "Chức năng đang phát triển không chạy công khai!")
      return;
    }
    

    const file =
      e.target.files[0];

    if (!file) return;

    setIsProcessing(true);

    try {

      const audioCtx =
        new AudioContext();

      // =========================
      // LOAD MODEL
      // =========================

      const processor =
        new DemucsProcessor({
          ort,

          onProgress: (p) => {
            if (typeof p === 'number' && !isNaN(p)) {
               setProgress(Math.floor(p * 100));
            } else {
              // Nếu p là object (thường chứa progress chi tiết), hãy log ra để xem
              let d = p?.progress.toFixed(2) === 1 ? 100 : p?.progress.toFixed(2) * 100;
              setProgress(Math.round(d));
            }
            // setProgress(
            //   Math.floor(p * 100)
            // );
          }
        });

      await processor.loadModel(
        '/models/htdemucs_embedded.onnx'
      );

      // =========================
      // LOAD AUDIO
      // =========================

      const arrayBuffer =
        await file.arrayBuffer();

      const audioBuffer =
        await audioCtx.decodeAudioData(
          arrayBuffer
        );

      const left =
        audioBuffer.getChannelData(0);

      const right =
        audioBuffer.numberOfChannels > 1
          ? audioBuffer.getChannelData(1)
          : left;

      // =========================
      // AI SEPARATION
      // =========================

      const result =
        await processor.separate(
            left,
            right
        );

      // =========================
      // VOCALS
      // =========================

      const vocalsBuffer =
        createAudioBuffer(
            audioCtx,
            result.vocals.left,
            result.vocals.right,
            audioBuffer.sampleRate
        );

      const vocalsBlob =
        bufferToWave(
          vocalsBuffer
        );

      // =========================
      // DRUMS
      // =========================

      const drumsBuffer =
        createAudioBuffer(
            audioCtx,
            result.drums.left,
            result.drums.right,
            audioBuffer.sampleRate
        );

      const drumsBlob =
        bufferToWave(
          drumsBuffer
        );

      // =========================
      // BASS
      // =========================

      const bassBuffer =
        createAudioBuffer(
            audioCtx,
            result.bass.left,
            result.bass.right,
            audioBuffer.sampleRate
        );

      const bassBlob =
        bufferToWave(
          bassBuffer
        );

      // =========================
      // OTHER
      // =========================

      const otherBuffer =
        createAudioBuffer(
            audioCtx,
            result.other.left,
            result.other.right,
            audioBuffer.sampleRate
        );

      const otherBlob =
        bufferToWave(
          otherBuffer
        );

      setAudioUrls({
        vocal: URL.createObjectURL(
          vocalsBlob
        ),

        drums: URL.createObjectURL(
          drumsBlob
        ),

        bass: URL.createObjectURL(
          bassBlob
        ),

        other: URL.createObjectURL(
          otherBlob
        ),
      });

    } catch (err) {

      console.error(err);

      alert(
        'Lỗi AI separator'
      );
    }

    setIsProcessing(false);
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: 'Arial',
      }}
    >

      <h2>
        Demucs AI Separator
      </h2>

      <input
        type="file"
        accept="audio/*"
        onChange={processAudio}
      />

      {isProcessing && (
        <div
          style={{
            marginTop: 20,
          }}
        >

          <p style={{ color: "var(--color-main)"}}>
            Đang AI xử lý...
          </p>

          <p style={{ color: "var(--color-main)"}}>
            {progress}%
          </p>

        </div>
      )}

      {/* VOCAL */}

      {audioUrls.vocal && (
        <div
          style={{
            marginTop: 30,
          }}
        >

          <h3>Vocals</h3>

          <audio
            controls
            src={audioUrls.vocal}
          />

          <br />

          <a
            href={audioUrls.vocal}
            download="vocals.wav"
          >
            Tải Vocals
          </a>

        </div>
      )}

      {/* DRUMS */}

      {audioUrls.drums && (
        <div
          style={{
            marginTop: 30,
          }}
        >

          <h3>Drums</h3>

          <audio
            controls
            src={audioUrls.drums}
          />

          <br />

          <a
            href={audioUrls.drums}
            download="drums.wav" 
            style={{ color: "var(--color-main);"}}
          >
            Tải Drums
          </a>

        </div>
      )}

      {/* BASS */}

      {audioUrls.bass && (
        <div
          style={{
            marginTop: 30,
          }}
        >

          <h3>Bass</h3>

          <audio
            controls
            src={audioUrls.bass}
          />

          <br />

          <a
            href={audioUrls.bass}
            download="bass.wav"
            style={{ color: "var(--color-main);"}}
          >
            Tải Bass
          </a>

        </div>
      )}

      {/* OTHER */}

      {audioUrls.other && (
        <div
          style={{
            marginTop: 30,
          }}
        >

          <h3>Other</h3>

          <audio
            controls
            src={audioUrls.other}
          />

          <br />

          <a
            href={audioUrls.other}
            download="other.wav"
            style={{ color: "var(--color-main);"}}
          >
            Tải Other
          </a>

        </div>
      )}

    </div>
  );
};

export default AudioSeparator;