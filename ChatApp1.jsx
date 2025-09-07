import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import '../styles/base.css';
import '../styles/header.css';
import '../styles/messages.css';
import '../styles/composer.css';
import '../styles/chatlist.css';
import '../styles/auth.css';
import Header from './src/components/Header';
import MessageList from './src/components/MessageList';
import Composer from './src/components/Composer';
import { AgentClient } from './src/lib/agentClient';
import Auth from './src/components/Auth';
import ChatList from './src/components/ChatList';

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

  // Helper: base64 -> Blob URL
  const base64ToBlobUrl = (b64, mime = 'application/octet-stream') => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  };

  // Helper: push an agent text message
  const pushText = (txt) => {
    if (!txt) return;
    setMessages(prev => [...prev, { id: 'agent-' + Date.now(), role: 'agent', text: txt }]);
  };

  try {
    const response = await client.sendInlineFiles({ text, files, chatId: activeChatId });
    console.log("Full server response:", JSON.stringify(response, null, 2));

    // Normalize to array
    const items = Array.isArray(response) ? response : [response];

    // Collect any plain text we can find (fallback)
    const extractText = (obj) => {
      if (!obj) return [];
      if (typeof obj === "string") return [obj];
      if (typeof obj === "number" || typeof obj === "boolean") return [String(obj)];
      if (Array.isArray(obj)) return obj.flatMap(extractText);
      if (typeof obj === "object") return Object.values(obj).flatMap(extractText);
      return [];
    };

    // Process each item
    for (const item of items) {
      if (!item || !item.type) continue;

      switch (item.type) {
        case "audio": {
          const { text, base64, mime_type, name } = item.payload || {};
          if (!base64) break;

          // Create blob URL & autoplay
          const audioUrl = base64ToBlobUrl(base64, mime_type || "audio/mpeg");
          try {
            const audio = new Audio(audioUrl);
            await audio.play(); // may be blocked if not user-initiated; since this runs after a user send, it's usually allowed
          } catch (err) {
            console.warn("Autoplay blocked; audio will still be shown in UI.", err);
          }

          // Store message with both URL and base64 (so UI can render either way)
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

        case "message": {
          // If your backend also returns pure text messages
          const txt = item?.payload?.content || item?.payload?.text || "";
          pushText(txt);
          break;
        }

        case "image":
        case "file":
        case "video": {
          // If you want to render other file types, add similar handling here.
          // Example: show a file pill with a downloadable link
          const p = item.payload || {};
          setMessages(prev => [
            ...prev,
            {
              id: `agent-${item.type}-` + Date.now(),
              role: 'agent',
              text: p.caption || "",
              files: [
                {
                  name: p.name || `${item.type}`,
                  // Optional: turn base64 to blob URL for download/preview
                  url: p.base64 ? base64ToBlobUrl(p.base64, p.mime_type) : undefined,
                  size: p.size,
                  mime_type: p.mime_type,
                }
              ]
            }
          ]);
          break;
        }

        default: {
          // Fallback: try to extract text from unknown shapes
          const texts = extractText(item).map(s => s.trim()).filter(Boolean);
          const unique = [...new Set(texts)];
          const agentText = unique.sort((a, b) => b.length - a.length)[0];
          pushText(agentText || "");
        }
      }
    }
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
