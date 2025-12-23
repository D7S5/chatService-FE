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

  const bottomRef = useRef(null);

  /* --------------------------------
     WebSocket 연결 (Chat 방식과 동일)
  -------------------------------- */
  useEffect(() => {
    if (!userId || !username) {
      navigate("/");
      return;
    }

    connectWebSocket((client) => {
      /** BAN */
      client.subscribe("/user/queue/rate-limit", (msg) => {
      const data = JSON.parse(msg.body);
      alert(`채팅이 너무 빠릅니다.\n${data.retryAfter}초 후 다시 시도하세요.`);
    });
    
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
        body: JSON.stringify({ roomId, userId, username }),
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
        sentAt : Date.now() // timestamp
      }),
    });

    setInput("");
  };

  const handleLeave = () => {
    const client = getClient();

  if (client && client.connected) {
    client.publish({
      destination: "/app/room.leave",
      body: JSON.stringify({ roomId, userId }),
    });

    // 소켓 정리
    client.deactivate();
  }

  navigate("/lobby");
  };

  const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
    return (
    <div className="chatroom-wrapper">
      {/* HEADER */}
      <div className="chatroom-header">
        <h3>💬 채팅방</h3>
        <span className="count">
          {currentCount} / {maxCount}
        </span>
        <div className="header-actions">
          <button className="leave-btn" onClick={handleLeave}>
            나가기
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="chatroom-main">
        {/* MESSAGES */}
        <div className="messages">
          {messages.map((msg, idx) => {
              const mine = String(msg.senderId) === userId;
              const prev = messages[idx - 1];

              // console.log("서버 senderUsername:", msg.username, typeof msg.username);
              // console.log("내 userId:", userId, typeof userId);
              // console.log("mine 판단:", msg.senderId == userId);

              // 상대방일 때만 연속 이름 숨김
              const showName = !mine && (!prev || prev.senderId !== msg.senderId);
              const showTime =
                !prev ||
                prev.senderId !== msg.senderId ||
                new Date(msg.createdAt) - new Date(prev.createdAt) > 60 * 1000;

              return (
                <div
                  key={idx}
                  className={`message ${mine ? "me" : "other"}`}
                >
                  {showName && <div className="sender">{msg.senderName}</div>}

                  <div className="bubble-row">
                    {/* 상대방 시간 (왼쪽) */}
                    {!mine && showTime && (
                      <span className="time left">{formatTime(msg.createdAt)}</span>
                    )}

                    <div className="bubble">{msg.content}</div>

                    {/* 내 시간 (오른쪽) */}
                    {mine && showTime && (
                      <span className="time right">{formatTime(msg.createdAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          <div ref={messageEndRef} />
        </div>

        {/* PARTICIPANTS */}
          {/* <h4>👥 참여자</h4> */}
        <div className="participants">
          <ul>
            {participants.map((u) => (
              <li key={u.userId}>
                <span className="dot" />
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