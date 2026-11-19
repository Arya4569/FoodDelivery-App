import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "../App.css";

const suggestions = [
  "🍕 Recommend Pizza",
  "🍔 Best Burger",
  "🥗 Healthy Food",
  "🌶️ Spicy Food",
  "🍨 Desserts",
  "💰 Food under ₹300",
];

const defaultMessage = [
  {
    sender: "ai",
    text: "👋 Hi! I'm Foodie AI.\nHow can I help you choose your meal today?",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
];

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [maximize, setMaximize] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("foodie_chat");
    return saved ? JSON.parse(saved) : defaultMessage;
  });

  const chatRef = useRef();

  useEffect(() => {
    localStorage.setItem("foodie_chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const clearChat = () => {
    localStorage.removeItem("foodie_chat");
    setMessages(defaultMessage);
  };

  const sendMessage = async (text) => {
    const userMessage = text || message;
    if (!userMessage.trim() || loading) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userMessage,
        time,
      },
    ]);

    setLoading(true);
    setMessage("");

    try {
      const { data } = await axios.post("/api/v1/ai/chat", {
        message: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply || "I found some delicious options for you!",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I recommend checking out Haldiram's for authentic chaat and Mani's Dum Biryani for aromatic biryanis!",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <>
      <button
        className="ai-float-btn shadow-lg"
        onClick={() => setOpen(!open)}
        title="Chat with Foodie AI"
      >
        🤖
      </button>

      {open && (
        <div className={`ai-chat-container shadow-lg ${maximize ? "maximize" : ""}`}>
          {/* Header */}
          <div className="ai-header d-flex align-items-center justify-content-between p-3 bg-dark text-white">
            <div className="d-flex align-items-center">
              <span className="fs-4 me-2">🤖</span>
              <div>
                <h5 className="mb-0 fw-bold fs-6">Foodie AI Assistant</h5>
                <small className="text-success fw-bold">● Online</small>
              </div>
            </div>

            <div className="header-icons d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-light py-0 px-2"
                title="Clear Chat"
                onClick={clearChat}
              >
                🗑️
              </button>
              <button
                className="btn btn-sm btn-outline-light py-0 px-2"
                title="Toggle Maximize"
                onClick={() => setMaximize(!maximize)}
              >
                ⤢
              </button>
              <button
                className="btn btn-sm btn-outline-light py-0 px-2"
                title="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages p-3" ref={chatRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={msg.sender === "user" ? "user-message" : "ai-message"}
              >
                <div>{msg.text}</div>
                <small
                  style={{
                    display: "block",
                    marginTop: 5,
                    opacity: 0.6,
                    fontSize: 10,
                  }}
                >
                  {msg.time}
                </small>
              </div>
            ))}

            {loading && (
              <div className="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="suggestions p-2 bg-light border-top d-flex gap-2 overflow-auto">
            {suggestions.map((item) => (
              <button
                key={item}
                className="btn btn-sm btn-outline-secondary rounded-pill text-nowrap"
                onClick={() => sendMessage(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="ai-input p-2 d-flex gap-2 border-top bg-white">
            <input
              type="text"
              className="form-control form-control-sm rounded-pill"
              placeholder="Ask for dish recommendations, budget eats..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              className="btn btn-success btn-sm rounded-pill px-3 fw-bold"
              disabled={loading}
              onClick={() => sendMessage()}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;
