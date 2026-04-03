import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connectWebSocket, getClient } from "../websocket"; // websocket.js 사용
import api from "../api";
import "../Chat.css";

const PrivateChat = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  // 🔹 WebSocket + 초기 메시지 로드
  useEffect(() => {
    if (!userId || !username) return navigate("/");

    const loadMessages = async () => {
      try {
        const res = await api.get(`/dm/messages/${roomId}`);
        setMessages(res.data || []);
        await api.put(`/dm/messages/${roomId}/read`, null, { params: { userId } });
      } catch (err) {
        console.error("메시지 로딩 실패:", err);
      }
    };
    loadMessages();

    (async () => {
      try {
        await connectWebSocket((client) => {
          client.subscribe(`/user/queue/dm`, (msg) => {
            const body = JSON.parse(msg.body);
            if (body.senderId !== userId) {
              setMessages(prev => [...prev, body]);
            }
          });
        });
      } catch (err) {
        console.error("WS 연결 실패:", err);
      }
    })();

    return () => {
      const client = getClient();
      if (client && client.deactivate) client.deactivate();
    };
  }, [roomId, userId, username, navigate]);

  // 🔹 메시지 전송
  const sendMessage = () => {
    if (!input.trim()) return;

    const payload = {
      roomId,
      // room: { roomId }, // V1
      senderId: userId,
      senderName: username,
      content: input,
      sentAt : Date.now(), // timestamp
    };

    const client = getClient();
    if (client && client.connected) {
      client.publish({
        destination: "/app/dm.send",
        body: JSON.stringify(payload),
      });
      
      // UI 즉시 반영
      setMessages(prev => [...prev, { ...payload, isRead: true }]);
    } else {
      console.warn("WebSocket 미연결 상태");  
    }

    setInput("");
  };

  // 🔹 스크롤 자동 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLeave = () => navigate("/lobby");

  return (
    <div className="chat-container">
      <div className="chat-header">
        💌 DM
        <button className="leave-btn" onClick={handleLeave}>나가기</button>
      </div>

      <div className="chat-box">
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === userId;
          return (
            <div key={idx} className={`message-row ${isMine ? "my-message" : ""}`}>
              <div className="sender-name">{isMine ? "나" : msg.senderName}</div>
              <div className="message-bubble">{msg.content}</div>
            <div className="time">{msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ""}</div>
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력..."
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default PrivateChat;
