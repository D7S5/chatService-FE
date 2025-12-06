import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { connectWebSocket, getClient } from "../websocket";
import "../Chat.css";

const Chat = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const username = location.state?.username;
  const roomName = location.state?.roomName || "이름 없는 방";

  // WebSocket 연결
  useEffect(() => {
    if (!username) return navigate("/");

    (async () => {
      try {
        await connectWebSocket((client) => {
          // 방 구독
          client.subscribe(`/topic/room.${roomId}`, (msg) => {
            const body = JSON.parse(msg.body);
            setMessages((prev) => [...prev, body]);
          });

          // JOIN 이벤트 보내기
          client.publish({
            destination: "/app/chat.addUser",
            body: JSON.stringify({ sender: username, roomId, type: "JOIN" }),
          });
        });
      } catch (err) {
        console.error("WS 연결 실패", err);
      }
    })();

    return () => {
      const client = getClient();
      if (client && client.deactivate) client.deactivate();
    };
  }, [roomId, username, navigate]);

  // 메시지 전송
  const sendMessage = () => {
    if (!input.trim()) return;

    const client = getClient();
    if (client && client.connected) {
      client.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({
          sender: username,
          roomId,
          content: input,
          type: "CHAT",
        }),
      });
      setInput("");
    }
  };

  // 스크롤 자동 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 나가기 버튼
  const handleLeave = () => {
    navigate("/lobby");
  };

  return (
    <div className="chat-container">
      
      {/* 상단 헤더 */}
      <div className="chat-header">
        {roomName}

        <div className="header-actions">
          <button className="header-btn leave-btn" onClick={handleLeave}>
            나가기
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="chat-box">
        {messages.map((m, i) => {
          const mine = m.sender === username;

          return (
            <div key={i} className={`message-row ${mine ? "my-message" : ""}`}>
              {!mine && <div className="sender-name">{m.sender}</div>}

              <div className="message-bubble">{m.content}</div>
            </div>
          );
        })}

        <div ref={bottomRef}></div>
      </div>

      {/* 입력 영역 */}
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력..."
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default Chat;
