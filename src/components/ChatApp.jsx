import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import '../styles/base.css';
import '../styles/header.css';
import '../styles/messages.css';
import '../styles/composer.css';
import '../styles/chatlist.css';
import '../styles/auth.css';
import Header from './Header';
import MessageList from './MessageList';
import Composer from './Composer';
import { AgentClient } from '../lib/agentClient';
import Auth from './Auth';
import ChatList from './ChatList';

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const [authed, setAuthed] = useState(!!(sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')));
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const clientRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null); // 👈 hidden element for scrollIntoView

  const client = useMemo(() => {
    const instance = new AgentClient();
    clientRef.current = instance;
    return instance;
  }, []);

  useEffect(() => {
    const unsub = client.connect((evt) => {
      if (evt.type === 'open') setIsConnected(true);
      if (evt.type === 'close') setIsConnected(false);
      if (evt.type === 'message') {
        setMessages((prev) => [...prev, evt.payload]);
      }
    });
    return () => unsub();
  }, [client]);

  // ✅ auto scroll when new message arrives
  useLayoutEffect(() => {
    if (!bottomRef.current) return;
    if (autoScroll) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, autoScroll]);

  // ✅ track scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 5;
    setAutoScroll(isNearBottom);
  };

  const handleSend = async (text, files) => {
    const tmpId = 'user-' + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tmpId,
        role: 'user',
        text,
        files: files?.map(f => ({ name: f.name, size: f.size })),
      },
    ]);

    try {
      let uploaded = [];
      if (files && files.length > 0) {
        uploaded = await client.uploadFiles(files); // your uploader
      }
      await client.sendMessage({ text, files: uploaded, chatId: activeChatId });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'system',
          text: 'Failed to send message: ' + (e?.message || 'Unknown error'),
        },
      ]);
    }
  };


  const onLogin = () => {
    setAuthed(true);
    const sample = [
      { id: 'c1', title: 'Welcome chat', updatedAt: Date.now() - 3600_000 },
      { id: 'c2', title: 'Docs Q&A', updatedAt: Date.now() - 7200_000 },
    ];
    setChats(sample);
    setActiveChatId(sample[0]?.id || 'new');
  };

  const onSelectChat = (id) => {
    setActiveChatId(id);
    setMessages([{ id: 'sys-' + Date.now(), role: 'system', text: `Opened chat ${id}` }]);
  };

  const onNewChat = () => {
    const id = 'chat-' + Date.now();
    setChats((prev) => [{ id, title: 'New chat', updatedAt: Date.now() }, ...prev]);
    setActiveChatId(id);
    setMessages([]);
  };

  if (!authed) {
    return (
      <>
        <Header connected={false} />
        <Auth onLogin={onLogin} />
      </>
    );
  }

  return (
    <div className="main-layout">
      <ChatList chats={chats} activeChatId={activeChatId} onSelect={onSelectChat} onNewChat={onNewChat} />
      <div className="main-right">
        <Header connected={isConnected} />
        <div className="chat-container">
          <div
            className="messages"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <MessageList messages={messages} />
            <div ref={bottomRef} />
          </div>
          <Composer onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}

export default ChatApp;
