import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function Composer({ onSend }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const onFilesSelected = useCallback((fileList) => {
    const arr = Array.from(fileList || []);
    setFiles((prev) => [...prev, ...arr]);
    // Reset the input so selecting the same file again triggers onChange
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const onSubmit = useCallback(() => {
    if (!text && files.length === 0) return;
    onSend(text, files);
    setText('');
    setFiles([]);
  }, [text, files, onSend]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // 🔹 Auto-resize textarea when text changes
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto'; // reset
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  }, [text]);

  // drag and drop
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer?.files?.length) onFilesSelected(e.dataTransfer.files);
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        recordTimerRef.current && clearInterval(recordTimerRef.current);
        setRecordMs(0);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        onSend('', [file]);
        chunks.length = 0;
      };
      mediaRecorderRef.current = mr;
      mr.start(250);
      setIsRecording(true);
      const start = Date.now();
      recordTimerRef.current = setInterval(() => setRecordMs(Date.now() - start), 200);
    } catch (e) {
      alert('Microphone permission denied or unsupported.');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && isRecording) {
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  useEffect(() => () => { recordTimerRef.current && clearInterval(recordTimerRef.current); }, []);

  const previews = useMemo(() => {
    return files.map((f) => {
      const isImage = f.type.startsWith('image/');
      const url = isImage ? URL.createObjectURL(f) : '';
      return { name: f.name, type: f.type, size: f.size, url, isImage };
    });
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
    };
  }, [previews]);

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="composer-wrap">
      <div className="composer" ref={dropRef} onDragOver={onDragOver} onDrop={onDrop}>
        {previews.length > 0 && (
          <div className="attachments">
            {previews.map((p, idx) => (
              <div key={idx} className={p.isImage ? 'attachment-thumb' : 'attachment-pill'}>
                {p.isImage ? (
                  <img src={p.url} alt={p.name} />
                ) : (
                  <span title={p.name}>📎 {p.name}</span>
                )}
                <button className="remove-attach" onClick={() => removeFile(idx)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="attach-menu">
          <button className="icon-btn" onClick={() => setShowAttach(v => !v)} title="Attach">📎</button>
          {showAttach && (
            <div className="attach-dropdown">
              <button className="attach-item" onClick={() => { setShowAttach(false); inputRef.current?.setAttribute('accept', 'video/*'); inputRef.current?.click(); }}>Video</button>
              <button className="attach-item" onClick={() => { setShowAttach(false); inputRef.current?.setAttribute('accept', 'image/*'); inputRef.current?.click(); }}>Images</button>
              <button className="attach-item" onClick={() => { setShowAttach(false); inputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,audio/*'); inputRef.current?.click(); }}>Docs & Audio</button>
            </div>
          )}
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            multiple
            onChange={(e) => onFilesSelected(e.target.files)}
          />
        </div>
        <button 
                className="icon-btn" 
                onClick={isRecording ? stopRecording : startRecording} 
                title="Record voice"
              >
                {isRecording ? (
                  <div className="dots">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  '🎤'
                )}  
              </button>

        <textarea
          ref={textareaRef}
          className="text-input dropzone"
          rows={1}
          style={{ overflow: 'hidden', resize: 'none' }}
          placeholder={isRecording ? `Recording... ${Math.round(recordMs/1000)}s` : "Type a message, press Enter to send..."}
          value={text}
           onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";          // reset height
            e.target.style.height = e.target.scrollHeight + "px"; // set new height
          }}
          onKeyDown={onKeyDown}
        />
        <button className="send-btn" onClick={onSubmit}>Send</button>
      </div>
    </div>
  );
}

export default Composer;
