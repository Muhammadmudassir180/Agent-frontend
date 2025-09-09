/*
  AgentClient:
  - Connects to agent stream via SSE first, falls back to WebSocket if provided
  - sendMessage: POSTs text and metadata to agent; separate upload for files
  Configure via environment variables:
  - REACT_APP_AGENT_BASE_URL: e.g., https://your-n8n-host.com
  - REACT_APP_AGENT_STREAM_PATH: e.g., /sse (SSE endpoint that streams events)
  - REACT_APP_AGENT_WS_URL: optional wss://your-n8n-host.com/ws
  - REACT_APP_AGENT_SEND_PATH: e.g., /message
  - REACT_APP_AGENT_UPLOAD_PATH: e.g., /upload
*/

// using fetch API for all requests

export class AgentClient {
  constructor() {
    // this.baseUrl = "http://localhost:5678/webhook-test";
    this.baseUrl="  https://de91cd4d3ad9.ngrok-free.app"
    this.streamPath = process.env.REACT_APP_AGENT_STREAM_PATH || '/sse';
    this.wsUrl = process.env.REACT_APP_AGENT_WS_URL || '';
    this.sendPath = process.env.REACT_APP_AGENT_SEND_PATH || '/message';
    this.uploadPath = process.env.REACT_APP_AGENT_UPLOAD_PATH || '/upload';
    this.withCredentials = (process.env.REACT_APP_WITH_CREDENTIALS === 'true');
    this.eventSource = null;
    this.websocket = null;
    this.unsub = () => {};
  }

  connect(onEvent) {
    let closed = false;
    const notify = (ev) => !closed && onEvent?.(ev);

    // Try SSE first
    try {
      const es = new EventSource(this.baseUrl + this.streamPath, { withCredentials: this.withCredentials });
      this.eventSource = es;
      es.onopen = () => notify({ type: 'open' });
      es.onerror = () => notify({ type: 'close' });
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          notify({ type: 'message', payload: data });
        } catch (_) {
          notify({ type: 'message', payload: { id: Date.now(), role: 'agent', text: e.data } });
        }
      };
      this.unsub = () => { closed = true; es.close(); };
      return this.unsub;
    } catch (_) {
      // ignore and try WS
    }

    // Fallback to WebSocket if configured
    if (this.wsUrl) {
      const ws = new WebSocket(this.wsUrl);
      this.websocket = ws;
      ws.onopen = () => notify({ type: 'open' });
      ws.onclose = () => notify({ type: 'close' });
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          notify({ type: 'message', payload: data });
        } catch (_) {
          notify({ type: 'message', payload: { id: Date.now(), role: 'agent', text: e.data } });
        }
      };
      this.unsub = () => { closed = true; try { ws.close(); } catch(_){} };
      return this.unsub;
    }

    // No streaming available
    notify({ type: 'close' });
    this.unsub = () => { closed = true; };
    return this.unsub;
  }

 
  async sendInlineFiles(arg1, arg2) {
    const { text, files, chatId } = typeof arg1 === 'object' && arg1 !== null
      ? { text: arg1.text, files: arg1.files, chatId: arg1.chatId }
      : { text: arg1, files: arg2, chatId: undefined };

    // const base_url = this.baseUrl + this.sendPath;
    const base_url=" https://fa84055f5096.ngrok-free.app/chat";

    const toBase64 = (file) => new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });

    const filesArray = Array.isArray(files) ? files : [];
    const inlineFiles = [];

    for (const f of filesArray) {
      if (!f) continue;
      const base64 = await toBase64(f);

      // ✅ Differentiate file type
      let fileType = "file"; // default
      if (f.type.startsWith("image/")) {
        fileType = "image";
      } else if (f.type.startsWith("audio/")) {
        fileType = "audio";
      } else if (f.type.startsWith("video/")) {
        fileType = "video";
      } else {
        fileType = "file"; // pdf, docs, etc.
      }

      inlineFiles.push({
        type: fileType,
        payload: {
          role: "user",
          chatId: chatId || undefined,
          mime_type: f.type || '',
          name: f.name || 'file',
          size: f.size || 0,
          base64,
        },
      });
    }

    // Build payload container
    const payloads = [];

    // ✅ Add text payload separately
    if (text && text.trim()) {
      payloads.push({
        type: "message",
        payload: {
          role: "user",
          chatId: chatId || undefined,
          content: text.trim(),
        },
      });
    }

    // ✅ Add files payloads with proper types
    if (inlineFiles.length) {
      payloads.push(...inlineFiles);
    }

    // 🔑 Send everything in ONE request
    const res = await fetch(base_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: this.withCredentials ? 'include' : 'omit',
      body: JSON.stringify({ items: payloads })   // wrap all in one object
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    return res.json().catch(() => ({}));

  }




  async uploadFiles(files, chatId) {
    if (!files || files.length === 0) return {};
    const form = new FormData();
    // Label this as a files-only message for backend routing
    form.append('type', 'files');
    form.append('role', 'user');
    if (chatId) form.append('chatId', chatId);

    const filesMeta = [];
    files.forEach((file, index) => {
      if (!file) return;
      const key = index === 0 ? 'data' : `data_${index}`;
      form.append(key, file);
      filesMeta.push({ key, name: file.name || key, type: file.type || '', size: file.size || 0 });
    });
    form.append('filesMeta', JSON.stringify(filesMeta));

    const url = this.baseUrl + this.sendPath;
    const res = await fetch(url, {
      method: 'POST',
      credentials: this.withCredentials ? 'include' : 'omit',
      body: form
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json().catch(() => ({}));
  }
}

  