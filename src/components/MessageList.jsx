import React from 'react';

function FilePills({ files }) {
  if (!files || files.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
      {files.map((f, idx) => (
        <span key={idx} className="file-pill" title={f.name || f.url}>
          <span style={{ opacity: 0.8 }}>📎</span>
          {f.name || 'file'}
        </span>
      ))}
    </div>
  );
}

function Bubble({ role, text, files }) {
  const cls = 'bubble ' + (role === 'user' ? 'from-user' : 'from-agent');
  return (
    <div className={cls}>
      <div>{text}</div>
      <FilePills files={files} />
    </div>
  );
}

function MessageList({ messages }) {
  return (
    <div className="messages-inner">
      {messages.map((m) => (
        <Bubble key={m.id || Math.random()} role={m.role} text={m.text} files={m.files} />
      ))}
    </div>
  );
}

export default MessageList;

