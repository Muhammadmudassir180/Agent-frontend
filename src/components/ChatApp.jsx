import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const clientRef = useRef(null);
  const scrollRef = useRef(null);

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text, files) => {
    const tmpId = 'user-' + Date.now();
    // optimistic render
    setMessages((prev) => [...prev, { id: tmpId, role: 'user', text, files: files?.map(f => ({ name: f.name, size: f.size })) }]);
    try {
      let uploaded = [];
      if (files && files.length > 0) {
        uploaded = await client.uploadFiles(files);
      }
      await client.sendMessage({ text, files: uploaded });
    } catch (e) {
      setMessages((prev) => [...prev, { id: 'err-' + Date.now(), role: 'system', text: 'Failed to send message: ' + (e?.message || 'Unknown error') }]);
    }
  };

  return (
    <div className="app-shell">
      <Header connected={isConnected} />
      <div className="chat-container">
        <div className="messages" ref={scrollRef}>
          <MessageList messages={messages} />
        </div>
        <Composer onSend={handleSend} />
      </div>
    </div>
  );
}

export default ChatApp;

