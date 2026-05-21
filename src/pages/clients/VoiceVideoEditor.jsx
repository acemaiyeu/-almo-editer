import { useRef, useState } from "react";
import {
  FaMicrophone,
  FaPause,
  FaPlay,
  FaTrash,
  FaVolumeMute,
  FaVideo,
} from "react-icons/fa";

const voices = [
  { id: "male", name: "Nam Trầm" },
  { id: "female", name: "Nữ Cao" },
  { id: "kid", name: "Trẻ Em" },
  { id: "old", name: "Ông Già" },
];

const VoiceVideoEditor = () => {
  console.log("render");

  const videoRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(null);

  const [tracks, setTracks] = useState([]);

  const [recording, setRecording] = useState(false);

  const [selectedVoice, setSelectedVoice] =
    useState("male");

  const mediaRecorderRef = useRef(null);

  const chunksRef = useRef([]);

  // =========================
  // IMPORT VIDEO
  // =========================

  const importVideo = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setVideoUrl(url);
  };

  // =========================
  // PLAY
  // =========================

  const playAll = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.play();
      }

      tracks.forEach((track) => {
        if (track.audio) {
          track.audio.play();
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // PAUSE
  // =========================

  const pauseAll = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }

    tracks.forEach((track) => {
      if (track.audio) {
        track.audio.pause();
      }
    });
  };

  // =========================
  // RECORD
  // =========================

  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);

        const id = Date.now();

        setTracks((prev) => [
          ...prev,
          {
            id,
            name: selectedVoice,
            url,
            audio,
            muted: false,
          },
        ]);
      };

      mediaRecorderRef.current = recorder;

      recorder.start();

      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("Không mở được mic");
    }
  };

  // =========================
  // STOP RECORD
  // =========================

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  };

  // =========================
  // DELETE TRACK
  // =========================

  const deleteTrack = (id) => {
    setTracks((prev) =>
      prev.filter((t) => t.id !== id)
    );
  };

  // =========================
  // MUTE
  // =========================

  const toggleMute = (id) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id) {
          track.audio.muted = !track.muted;

          return {
            ...track,
            muted: !track.muted,
          };
        }

        return track;
      })
    );
  };

  return (
    <div
      style={{
        background: "#111",
        minHeight: "100vh",
        color: "white",
        padding: 20,
      }}
    >
      <h1>Voice Video Editor</h1>

      {/* IMPORT VIDEO */}

      <label
        style={{
          background: "#222",
          padding: 10,
          display: "inline-block",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        <FaVideo /> Import Video

        <input
          type="file"
          accept="video/*"
          hidden
          onChange={importVideo}
        />
      </label>

      {/* VIDEO */}

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          muted
          style={{
            width: "100%",
            marginBottom: 20,
            borderRadius: 10,
          }}
        />
      )}

      {/* CONTROLS */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <button onClick={playAll}>
          <FaPlay />
        </button>

        <button onClick={pauseAll}>
          <FaPause />
        </button>

        {!recording ? (
          <button onClick={startRecording}>
            <FaMicrophone />
            Thu Âm
          </button>
        ) : (
          <button onClick={stopRecording}>
            Dừng
          </button>
        )}

        <select
          value={selectedVoice}
          onChange={(e) =>
            setSelectedVoice(e.target.value)
          }
        >
          {voices.map((voice) => (
            <option
              key={voice.id}
              value={voice.name}
            >
              {voice.name}
            </option>
          ))}
        </select>
      </div>

      {/* TRACKS */}

      {tracks.map((track) => (
        <div
          key={track.id}
          style={{
            background: "#222",
            padding: 10,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
            }}
          >
            <input
              value={track.name}
              onChange={(e) => {
                setTracks((prev) =>
                  prev.map((t) =>
                    t.id === track.id
                      ? {
                          ...t,
                          name:
                            e.target.value,
                        }
                      : t
                  )
                );
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() =>
                  toggleMute(track.id)
                }
              >
                <FaVolumeMute />
              </button>

              <button
                onClick={() =>
                  deleteTrack(track.id)
                }
              >
                <FaTrash />
              </button>
            </div>
          </div>

          {/* AUDIO PLAYER */}

          <audio
            controls
            src={track.url}
            style={{
              width: "100%",
              marginTop: 10,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default VoiceVideoEditor;