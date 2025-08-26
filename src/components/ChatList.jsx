import React from 'react';

function ChatList({ chats, activeChatId, onSelect, onNewChat }) {
  return (
    <aside className="chatlist">
      <div className="chatlist-header">
        <div>Past chats</div>
        <button className="icon-btn" onClick={onNewChat} title="New chat">＋</button>
      </div>
      <div className="chatlist-items">
        {chats.map((c) => (
          <button key={c.id} className={'chatlist-item' + (c.id === activeChatId ? ' active' : '')} onClick={() => onSelect(c.id)}>
            <div className="title">{c.title || 'Untitled chat'}</div>
            <div className="meta">{new Date(c.updatedAt || Date.now()).toLocaleString()}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default ChatList;

