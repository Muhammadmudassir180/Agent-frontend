import React, { useState } from "react";
import axios from "axios";

const MessageInput = () => {
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const res = await axios.post(
        "http://localhost:5678/webhook-test/message", // your n8n webhook
        { text: message },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Message sent:", message);
      console.log("📩 n8n response:", res.data);
    } catch (err) {
      console.error("❌ Error sending message:", err.response?.data || err.message);
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px", padding: "10px" }}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        style={{
          flex: 1,
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />
      <button
        onClick={sendMessage}
        style={{
          padding: "10px 20px",
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#4cafef",
          color: "white",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
