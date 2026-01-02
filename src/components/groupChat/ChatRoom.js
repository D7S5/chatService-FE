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

  /* ==================================================
     1️⃣ 방 참가 (REST – 단 1회)
  ================================================== */
  useEffect(() => {
    if (!userId || !username) {
      navigate("/");
      return;
    }

    const enterRoom = async () => {
      try {
        await api.post(`/rooms/${roomId}/participants`);
      } catch (e) {
        console.error("방 참가 실패", e);
        navigate("/lobby");
      }
    };

    enterRoom();
  }, [roomId, userId, username, navigate]);

  /* ==================================================
     2️⃣ WebSocket 연결 (메시지 전용)
  ================================================== */
  useEffect(() => {
    connectWebSocket((client) => {
      /** 채팅 제한 */
      client.subscribe("/user/queue/rate-limit", (msg) => {
        const data = JSON.parse(msg.body);
        alert(`채팅이 너무 빠릅니다.\n${data.retryAfter}초 후 다시 시도하세요.`);
      });

      /** 채팅 메시지 */
      client.subscribe(`/topic/chat/${roomId}`, (msg) => {
        setMessages((prev) => [...prev, JSON.parse(msg.body)]);
      });

      /** 참가자 변경 이벤트 → REST 재조회 */
      client.subscribe(`/topic/room-users/${roomId}`, () => {
        reloadParticipants();
      });

      /** 인원 수 */
      client.subscribe(`/topic/room-count/${roomId}`, (msg) => {
        setCurrentCount(JSON.parse(msg.body).current);
      });
    });

    return () => {
      getClient()?.deactivate();
    };
  }, [roomId]);

  /* ==================================================
     3️⃣ 초기 REST 데이터 로드
  ================================================== */
  const reloadParticipants = async () => {
    const res = await api.get(`/rooms/${roomId}/participants`);
    setParticipants(res.data);
  };

  useEffect(() => {
    api.get(`/rooms/${roomId}`).then((res) => {
      setMaxCount(res.data.maxParticipants);
    });

    reloadParticipants();

    api.get(`/rooms/${roomId}/messages?limit=50`).then((res) => {
      setMessages(res.data);
    });
  }, [roomId]);

  /* ==================================================
     4️⃣ 메시지 자동 스크롤
  ================================================== */
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ==================================================
     5️⃣ 메시지 전송
  ================================================== */
  const sendMessage = () => {
    if (!input.trim()) return;

    const client = getClient();
    if (!client?.connected) return;

    client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        roomId,
        senderId: userId,
        senderName: username,
        content: input,
        sentAt: Date.now(),
      }),
    });

    setInput("");
  };

  /* ==================================================
     6️⃣ 방 나가기 (REST 단일 책임)
  ================================================== */
  const handleLeave = async () => {
    try {
      await api.delete(`/rooms/${roomId}/participants`);
    } catch (e) {
      console.warn("방 나가기 실패", e);
    }

    getClient()?.deactivate();
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

  /* ==================================================
     RENDER
  ================================================== */
  return (
    <div className="chatroom-wrapper">
      {/* HEADER */}
      <div className="chatroom-header">
        <h3>💬 채팅방</h3>
        <span className="count">
          {currentCount} / {maxCount}
        </span>
        <button className="leave-btn" onClick={handleLeave}>
          나가기
        </button>
      </div>

      {/* MAIN */}
      <div className="chatroom-main">
        {/* MESSAGES */}
        <div className="messages">
          {messages.map((msg, idx) => {
            const mine = msg.senderId === userId;
            const prev = messages[idx - 1];

            const showName = !mine && (!prev || prev.senderId !== msg.senderId);
            const showTime =
              !prev ||
              prev.senderId !== msg.senderId ||
              new Date(msg.createdAt) - new Date(prev.createdAt) > 60 * 1000;

            return (
              <div key={idx} className={`message ${mine ? "me" : "other"}`}>
                {showName && <div className="sender">{msg.senderName}</div>}
                <div className="bubble-row">
                  {!mine && showTime && (
                    <span className="time left">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                  <div className="bubble">{msg.content}</div>
                  {mine && showTime && (
                    <span className="time right">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        {/* PARTICIPANTS */}
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
