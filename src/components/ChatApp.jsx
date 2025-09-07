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
    const base64ToBlobUrl = (b64, mime = 'application/octet-stream') => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
    };


    try {
      const response = await client.sendInlineFiles({ text, files, chatId: activeChatId });
      console.log("Full server response:", JSON.stringify(response, null, 2));
  
      // Normalize to array
      const items = Array.isArray(response) ? response : [response];
      // --- Recursive extractor ---

      const extractText = (obj) => {
        if (!obj) return [];
        if (typeof obj === "string") return [obj];
        if (typeof obj === "number" || typeof obj === "boolean") return [String(obj)];
        if (Array.isArray(obj)) return obj.flatMap(extractText);
        if (typeof obj === "object") {
          return Object.entries(obj).flatMap(([key, val]) => {
            if (["base64", "audioUrl", "mime_type"].includes(key)) return []; // 🚫 skip binary
            return extractText(val);
          });
        }
        return [];
      };
      //PROCESS EACH ITEM
      for (const item of items) {
      if (!item || !item.type) continue;
      
      if (item.type === "audio") {
        // Handle audio item          
        const { text, base64, mime_type, name } = item.payload || {};
        if (!base64) break;
        const audioUrl = base64ToBlobUrl(base64, mime_type || 'audio/mpeg');
        try {
            const audio = new Audio(audioUrl);
            await audio.play(); // may be blocked if not user-initiated; since this runs after a user send, it's usually allowed
          } catch (err) {
            console.warn("Autoplay blocked; audio will still be shown in UI.", err);
          }
          setMessages(prev => [
            ...prev,
            {
              id: 'agent-audio-' + Date.now(),
              role: 'agent',
              audio: {
                text,
                audioUrl,            // preferred by UI
                base64,              // fallback
                mime_type: mime_type || "audio/mpeg",
                name: name || "Audio response",
              },
            }
          ]);
          break;
      }
      }




      

      const texts = extractText(response)
        .map(s => s.trim())
        .filter(Boolean);
  
      // Deduplicate + pick the longest as "main reply"
      const unique = [...new Set(texts)];
      const agentText = unique.sort((a, b) => b.length - a.length)[0] || "⚠️ No reply text found";
  
      setMessages((prev) => [
        ...prev,
        { id: 'agent-' + Date.now(), role: 'agent', text: agentText },
      ]);
  
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
