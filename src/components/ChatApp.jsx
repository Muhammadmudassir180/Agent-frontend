import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import '../styles/base.css';
import '../styles/header.css';
import '../styles/messages.css';
import '../styles/composer.css';
import Header from './Header';
import MessageList from './MessageList';
import Composer from './Composer';
import { AgentClient } from '../lib/agentClient';

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

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
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 50;
    setAutoScroll(isNearBottom);
  };

  const handleSend = async (text, files) => {
    const tmpId = 'user-' + Date.now();
    // optimistic render
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
        uploaded = await client.uploadFiles(files);
      }
      await client.sendMessage({ text, files: uploaded });
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

  return (
    <div className="app-shell">
      <Header connected={isConnected} />
      <div className="chat-container">
        <div
          className="messages"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <MessageList messages={messages} />
          <div ref={bottomRef} /> {/* 👈 hidden div at bottom */}
        </div>
        <Composer onSend={handleSend} />
      </div>
    </div>
  );
}

export default ChatApp;
