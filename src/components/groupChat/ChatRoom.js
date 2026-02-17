import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { connectWebSocket, getClient } from "../../websocket";
import "./ChatRoom.css";
import ParticipantItem from "./ParticipantItem";
import InviteCodePanel from "./InviteCodePanel";

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
  const [forcedExit, setForcedExit] = useState(null);

  const messageEndRef = useRef(null);
  const [roomType, setRoomType] = useState()
  const me = participants.find((p) => p.userId === userId);
  const isAdmin = me?.role === "ADMIN";
  const isOwner = me?.role === "OWNER";

  const isPrivate = roomType === "PRIVATE";
  const canToggleSidebar = isPrivate && (isAdmin || isOwner)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!userId || !username) {
      navigate("/");
      return;
    }

    const init = async () => {
      try {
        const roomRes = await api.get(`/rooms/${roomId}`);

        if (roomRes.data.accessible == false) {
          // console.log("accessible = " + roomRes.data.accessible)
          // console.log("reason = " + roomRes.data.reason)
          navigate("/lobby")
        } else {
          setMaxCount(roomRes.data.maxParticipants);
          setRoomType(roomRes.data.type);

          await enterRoom(roomRes.data.type, roomRes.data.ownerUserId);
        }
      } catch (e) {
        handleEnterRoomError(e);
      }
    }
    
    init();
  }, [roomId, userId, username, navigate]);
  
  const enterRoom = async (type, ownerUserId) => {
      try {
        if (type === "PRIVATE" && ownerUserId === userId) {
          return ;
        }
        await api.post(`/rooms/${roomId}/participants`);
        await reloadParticipants();
    } catch (e) { 
        handleEnterRoomError(e)
      }
    };

  const handleEnterRoomError = (e) => {
      if (!e || !e.response) {
        console.error("알 수 없는 에러", e);
        alert("방에 입장할 수 없습니다.");
        navigate("/lobby");
        return;
      }

      const msg = e.response.data?.message;

      if (msg === "INVITE_CODE_REQUIRED") {
        alert("비밀방은 초대코드로만 입장할 수 있습니다.");
      } else if (msg === "BANNED") {
        alert("이 채팅방에서 차단되었습니다.");
      } else {
        alert("방에 입장할 수 없습니다.");
      }

      navigate("/lobby");
    };

  useEffect(() => {
    if (!forcedExit) return;

    if (forcedExit.reason === "KICK") {
      alert("관리자에 의해 강퇴되었습니다.");
    } else {
      alert("이 방에서 차단되었습니다. 사유 = " + forcedExit.reason);
    }
      getClient()?.deactivate();

      navigate("/lobby");
}, [forcedExit, navigate]);

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
      client.subscribe(`/topic/rooms/${roomId}/count`, (msg) => {
        setCurrentCount(JSON.parse(msg.body).current);
      });

      client.subscribe("/user/queue/room-force-exit", (msg) => {
        
        const data = JSON.parse(msg.body);
        
        if (data.roomId !== roomId) return;
          setForcedExit(data);
      });

      client.subscribe(`/topic/rooms/${roomId}/participants`, (msg) => {
        const { userId, role } = JSON.parse(msg.body);

        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === userId ? { ...p, role } : p
          )
        );
      });

      reloadParticipants();
      reloadCount();    
    });

    return () => {
      getClient()?.deactivate();
    };
  }, [roomId]);
  
  // 초기 REST 로드

  const reloadParticipants = async () => {
    const res = await api.get(`/rooms/${roomId}/participants`);
    setParticipants(res.data);
  };  

  const reloadCount = async () => {
      await api.get(`/rooms/${roomId}/count`).then((res) => {
      setCurrentCount(res.data.current)
    });
  }
  useEffect(() => {

    api.get(`/rooms/${roomId}`).then((res) => {
      setMaxCount(res.data.maxParticipants);
      setRoomType(res.data.type); 
    });

    reloadParticipants();
    reloadCount();    

    api.get(`/rooms/${roomId}/messages?limit=50`).then((res) => {
      setMessages(res.data);
    });
  }, [roomId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


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

  const kickUser = async (targetUserId) => {
  try {
    await api.post(`/rooms/${roomId}/kick`, {
      targetUserId,
    });
  } catch (e) {
    alert("강퇴 실패");
  }
};

const banUser = async (targetUserId, reason) => {
  try {
    await api.post(`/rooms/${roomId}/ban`, {
      targetUserId,
      reason,
    });
  } catch (e) {
    alert("밴 실패");
  }
};

const handleKick = async (p) => {
  if (!window.confirm(`${p.username} 님을 강퇴할까요?`)) return;

  await kickUser(p.userId);
  reloadParticipants();
};

const handleBan = async (p) => {
  const reason = prompt(
    `${p.username} 님을 차단합니다.\n사유를 입력하세요`
  );
  if (!reason) return;

  await banUser(p.userId, reason);
  reloadParticipants();
};

const handleGrantAdmin = (user) => {
  const client = getClient();
  if (!client?.connected) return;

  client.publish({
    destination: `/app/rooms/${roomId}/admin`,
    body: JSON.stringify({
      targetUserId: user.userId,
    }),
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
        <button className="leave-btn" onClick={handleLeave}>
          나가기
        </button>
      </div>
      {/* MAIN */}  
      <div className="chatroom-main">
          {canToggleSidebar && (
            <div className={`left-sidebar ${sidebarOpen ? "open" : "closed"}`}>
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
              >
                {sidebarOpen ? "◀" : "▶"}
              </button>

              {sidebarOpen && isPrivate && (
                <InviteCodePanel
                  roomId={roomId}
                  isAdmin={true}
                />
              )}
            </div>
          )}

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
            {participants.map((p) => (
              <ParticipantItem
                key={p.userId}
                p={p}
                me={me}
                onKick={handleKick}
                onBan={handleBan}
                onGrantAdmin={handleGrantAdmin}
              />
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
