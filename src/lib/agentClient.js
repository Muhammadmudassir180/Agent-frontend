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

import axios from 'axios';

export class AgentClient {
  constructor() {
    this.baseUrl ='http://localhost:5678/webhook-test/message';
    this.streamPath ='/sse';
    this.wsUrl = process.env.REACT_APP_AGENT_WS_URL || '';
    this.sendPath = process.env.REACT_APP_AGENT_SEND_PATH || '/message';
    this.uploadPath = process.env.REACT_APP_AGENT_UPLOAD_PATH || '/upload';
    this.eventSource = null;
    this.websocket = null;
    this.unsub = () => {};
  }

  connect(onEvent) {
    let closed = false;
    const notify = (ev) => !closed && onEvent?.(ev);

    // Try SSE first
    try {
      const es = new EventSource(this.baseUrl + this.streamPath, { withCredentials: true });
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

  async sendMessage({ text, files }) {
    const body = { text: text || '', files: files || [] };
    const url = this.baseUrl;
    console.log("this is the URL for sending the chat", url)
    console.log("this is the body for sending the chat", body)
    const res = await axios.post(url, body, { withCredentials: true });
    // const response = await fetch("http://localhost:5678/webhook-test/message", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ text: body }),
    // });
    // console.log("data", response.json() );
    // return await response.json()
    return res.data || {};
  }

  async uploadFiles(files) {
    if (!files || files.length === 0) return [];
    const form = new FormData();
    for (const f of files) form.append('files', f);
    const url = this.baseUrl + this.uploadPath;
    const res = await axios.post(url, form, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  }
}

