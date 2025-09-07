import React, { useEffect } from "react";
import "../styles/composer.css"

function FilePills({ files }) {
  if (!files || files.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      {files.map((f, idx) => (
        <span key={idx} className="file-pill" title={f.name || f.url}>
          <span style={{ opacity: 0.8 }}>📎</span>
          {f.name || "file"}
        </span>
      ))}
    </div>
  );
}

function Bubble({ role, text, files, audio }) {
  const cls = "bubble " + (role === "user" ? "from-user" : "from-agent");

  // Revoke object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (audio?.audioUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(audio.audioUrl);
      }
    };
  }, [audio?.audioUrl]);

  return (
    <div className={cls}>
      {text && <div>{text}</div>}

      {audio && (
        <div style={{ marginTop: 6 }}>
          {/* Prefer blob URL if available */}
          {audio.audioUrl ? (
            <audio controls autoPlay src={audio.audioUrl}>
              Your browser does not support the audio element.
            </audio>
          ) : (
            // Fallback: data URL (works but bigger in memory)
            <audio
              controls
              autoPlay
              src={`data:${audio.mime_type || "audio/mpeg"};base64,${audio.base64}`}
            >
              Your browser does not support the audio element.
            </audio>
          )}
          {audio.name && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {audio.name}
            </div>
          )}
          {/*    //Also show text if available */}
          
        </div>
      )}

      <FilePills files={files} />
    </div>
  );
}

function MessageList({ messages }) {
  return (
    <div className="messages-inner">
      {messages.map((m) => (
        <Bubble
          key={m.id || Math.random()}
          role={m.role}
          text={m.text}
          files={m.files}
          audio={m.audio}   // 👈 IMPORTANT
        />
      ))}
    </div>
  );
}

export default MessageList;
