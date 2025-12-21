import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { connectWebSocket, getClient } from "../../websocket";
import "./ChatRoom.css";

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [input, setInput] = useState("");

  const messageEndRef = useRef(null);

  /* --------------------------------
     WebSocket 연결 (Chat 방식과 동일)
  -------------------------------- */
  useEffect(() => {
    if (!userId || !username) {
      navigate("/");
      return;
    }

    connectWebSocket((client) => {
      /** 채팅 메시지 */
      client.subscribe(`/topic/chat/${roomId}`, (msg) => {
        setMessages((prev) => [...prev, JSON.parse(msg.body)]);
      });

      /** 참여자 리스트 */
      client.subscribe(`/topic/room-users/${roomId}`, (msg) => {
        setParticipants(JSON.parse(msg.body));
      });

      /** 인원 수 */
      client.subscribe(`/topic/room-count/${roomId}`, (msg) => {
        const payload = JSON.parse(msg.body);
        setCurrentCount(payload.current);
      });

      /** 방 입장 */
      client.publish({
        destination: "/app/room.enter",
        body: JSON.stringify({ roomId, userId }),
      });
    });

    return () => {
      const client = getClient();
      if (client && client.connected) {
        client.publish({
          destination: "/app/room.leave",
          body: JSON.stringify({ roomId, userId }),
        });
        client.deactivate();
      }
    };
  }, [roomId, userId, username, navigate]);

  /* --------------------------------
     초기 REST 데이터
  -------------------------------- */
  useEffect(() => {
    api.get(`/rooms/${roomId}`).then((res) => {
      setMaxCount(res.data.maxParticipants);
    });

    api.get(`/rooms/${roomId}/participants`).then((res) => {
      setParticipants(res.data);
    });

    api.get(`/rooms/${roomId}/messages?limit=50`).then((res) => {
      setMessages(res.data);
    });
  }, [roomId]);

  /* 자동 스크롤 */
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* --------------------------------
     메시지 전송
  -------------------------------- */
  const sendMessage = () => {
    if (!input.trim()) return;

    const client = getClient();
    if (!client || !client.connected) return;

    client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        roomId,
        senderId: userId,
        senderName: username,
        content: input,
      }),
    });

    setInput("");
  };

  const handleLeave = () => {
    navigate("/lobby");
  };

  return (
    <div className="chatroom-wrapper">
      {/* HEADER */}
      <div className="chatroom-header">
        <h3>💬 대규모 채팅방</h3>
        <span className="count">
          {currentCount} / {maxCount}
          <div className="header-actions">
          <button className="header-btn leave-btn" onClick={handleLeave}>
            나가기
          </button>
        </div>
        </span>
      </div>

      {/* MAIN */}
      <div className="chatroom-main">
        {/* 메시지 */}
        <div className="messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.senderId === userId ? "me" : ""}`}
            >
              <span className="sender">{msg.senderName}</span>
              <span className="content">{msg.content}</span>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        {/* 참여자 */}
        <div className="participants">
          <h4>👥 참여자</h4>
          <ul>
            {participants.map((u) => (
              <li key={u.userId}>
                <span className="dot online" />
                {u.username}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* INPUT */}
      <div className="chatroom-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요"
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default ChatRoom;
