import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Lobby.css";
import api, { logout } from "../api";
import { connectWebSocket, getClient } from "../websocket";
import CreateRoomModal from "./groupChat/CreateRoomModal";

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [dmRooms, setDMRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [error, setError] = useState("");

  const [roomCounts, setRoomCounts] = useState({});
  
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const heartbeatRef = useRef(null);

  const [showCreate, setShowCreate] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);


  useEffect(() => {
    if (!userId || !username) return;

    // WebSocket 연결
    connectWebSocket((client) => {
      
      client.publish({
        destination: "/app/user.enter",
        body: JSON.stringify({ userId, username }),
      });

      /** 첫 heartbeat 딜레이 */
      setTimeout(() => {
        if (!client.connected) return;

        client.publish({
          destination: "/app/user.heartbeat",
          body: JSON.stringify({}),
        });

        // 반복 heartbeat
        heartbeatRef.current = setInterval(() => {
          if (!client.connected) return;

          client.publish({
            destination: "/app/user.heartbeat",
            body: JSON.stringify({}),
          });
        }, 10000);
      }, 5000);
  
      client.subscribe("/topic/online-users", (msg) => {
        const list = JSON.parse(msg.body);
        // { userId : userId , username : username , online : true }
        const filteredList = list.filter(u => u.userId !== userId);

        setOnlineUsers(filteredList);

        const onlineMap = {};
        filteredList.forEach( u => {
          onlineMap[u.userId] = u.online;          
        });

        setFriends(prev =>
          prev.map( f => ({
            ...f, 
            online: !!onlineMap[f.id]
          }))
        )
      });

      client.subscribe("/topic/rooms", (msg) => {
        setRooms(JSON.parse(msg.body));
      });

      client.subscribe(`/topic/friends/${userId}`, (msg) => {
        const payload = JSON.parse(msg.body);

        if (payload.type === "REQUEST") loadFriendRequests();
        if (payload.type === "ACCEPT") loadFriends();
      });
    });
      
    loadRooms();
    loadDMRooms();
    loadFriends();
    loadFriendRequests();
    loadRoomCount();

    /** 브라우저 닫힘 감지 → 자동 logout/offline */
    const handleUnload = () => {
      const client = getClient();
      if (client && client.connected) {
        client.publish({
          destination: "/app/user.leave",
          body: JSON.stringify({}),
        });
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);

      const client = getClient();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (client && client.connected) {
        client.publish({
          destination: "/app/user.leave",
          body: JSON.stringify({}),
        });
      }

      client?.deactivate();
    };
  }, [userId, username]);

  const loadRooms = async () => {  
    const res = await api.get("/rooms");
    if (!res) return;

    setRooms(res.data);
};

const loadRoomCount = async () => {
  try {
    const res = await api.get("/rooms/with-count");
    const map = {};
    res.data.forEach(r => {
      map[r.roomId] = r.currentCount;
    });
    setRoomCounts(map);
  } catch (e) {
    console.error("room count load 실패", e);
  }
};

const loadDMRooms = async () => {
  const res = await api.get(`/dm/list/${userId}`);
  if (!res) return;

  setDMRooms(res.data);
};

  const loadFriends = async () => {

  const res = await api.get(`/user/friends/list/${userId}`);
  if (!res) return;

  const friendsWithStatus = res.data.map((f) => ({
    ...f,
    online: !!onlineUsers[f.id],
  }));
  setFriends(friendsWithStatus);

};

  const loadFriendRequests = async () => {
  const res = await api.get(`/user/friends/received/${userId}`);
  if (!res) return;

  setFriendRequests(res.data);
};
  /* DM 시작 */
  const handleSendDM = async (targetUuid) => {
      const res = await api.post("/dm/start", {
        userA: userId,
        userB: targetUuid,
      });
      
      if (!res) return ;

      navigate(`/dm/${res.data.roomId}`, {
        state: { userId, targetUuid },
      });
  };

  /* 친구 요청 */
  const handleSendFriendRequest = async (targetUuid) => {
    try {
      await api.post("/user/friends/request", {
        fromUserId: userId,
        toUserId: targetUuid,
      });

      setSentFriendRequests((prev) => [...prev, targetUuid]);
    } catch (err) {
      alert(err.response?.data?.message || "친구 요청 실패");
    }
  };

  /* 친구 요청 수락 */
  const acceptFriendRequest = async (requestId) => {
    try {
      const res = await api.post(`/user/friends/accept/${requestId}`);
      alert(res.data);
      loadFriends();
      loadFriendRequests();
    } catch (err) {
      alert("요청 수락 실패");
    }
  };

  const removeFriend = async (targetId) => {
  if (!window.confirm("정말 친구를 끊을까요?")) return;

  try {
    await api.delete(`/user/friends/${targetId}`);
    setFriends(prev => prev.filter(f => f.id !== targetId));
  } catch {
    alert("친구 끊기 실패");
  }
};

  /* 친구 요청 거절 */
  const rejectFriendRequest = async (requestId) => {
    try {
      await api.post(`/user/friends/reject/${requestId}`);
      alert("거절했습니다.");
      loadFriendRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = (room) => {
    navigate(`/rooms/${room.roomId}`, {
      state: { username, roomName: room.name },
    });
  };

  const handleLogout = () => {
  const client = getClient();

  if (heartbeatRef.current) {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }

  if (client && client.connected) {
    client.publish({
      destination: "/app/user.leave",
      body: JSON.stringify({}),
    });
    client.deactivate();
  }

  logout();
};

const handleJoinByInvite = async () => {
  
  if (!inviteCode.trim()) {
    alert("초대코드를 입력하세요.");
    return;
  }

  try {
    setJoining(true);

    const res = await api.post("/rooms/join-by-invite", {
      inviteCode,
    });

    const roomId = res.data.roomId;

    navigate(`/rooms/${roomId}`);
  } catch (e) {
    alert(e.response?.data?.message ?? "초대코드가 유효하지 않습니다.");
  } finally {
    setJoining(false);
    setInviteCode("");
  }
};

  return (
    <div className="lobby-wrapper">
      <div className="lobby-header">
        <div className="invite-box">
          <input
            type="text"
            placeholder="초대코드 입력"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinByInvite()}
            disabled={joining}
          />
          <button onClick={handleJoinByInvite} disabled={joining}>
            입장
          </button>
        </div>

        <h2>💬 채팅 로비</h2>
        <p className="welcome">
          환영합니다, <strong>{username}</strong>님!
        </p>
        <button onClick={() => navigate("/nickname")} style={{ marginLeft: "10px" }}>
          닉네임 변경
        </button>
        <button onClick={handleLogout} className="logout-btn">
      로그아웃
    </button>
      </div>
  <div className="lobby-grid">
    {/* 채팅방 목록 */}
    <div className="card rooms">
      <div className="card-header">
        <h3>📁 채팅방 목록</h3>
        <button
          className="create-room-btn"
          onClick={() => setShowCreate(true)}
        >
          ➕ 생성
        </button>
        {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => {
            setRooms(prev => [...prev, room]);
          }}
        />
      )}
      </div>

      {rooms.length === 0 ? (
        <p className="empty-text">채팅방이 없습니다.</p>
      ) : (
        <ul className="list">
          {rooms
            .filter((r) => r.type === "PUBLIC")
            .map((room) => {
              const current =
                roomCounts[room.roomId] ?? room.currentCount ?? 0;

              return (
                <li key={room.roomId} className="list-item">
                  <div className="room-info">
                    <span className="room-name">{room.name}</span>
                    <span className="room-count">
                       {current} / {room.maxParticipants}
                    </span>
                  </div>

                  <button
                    className="join-btn"
                    disabled={current >= room.maxParticipants}
                    onClick={() => handleJoinRoom(room)}
                  >
                    {current >= room.maxParticipants ? "만석" : "입장"}
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
      {/* DM 목록 */}
      <div className="card dm">
          <h3>💌 DM 목록</h3>
          {dmRooms.length === 0 ? (
            <p className="empty-text">DM이 없습니다.</p>
          ) : (
            <ul className="list">
              {dmRooms.map((room) => {
                // 상대방 닉네임
                const targetNickname = room.targetUsername || room.targetUserId || "알 수 없음";

                return (
                  <li key={room.roomId} className="list-item">
                    <span>
                      {targetNickname}
                      {room.unreadCount > 0 && (
                        <span className="dm-badge">{room.unreadCount}</span>
                      )}
                    </span>
                    <button
                      className="dm-btn"
                      onClick={() => navigate(`/dm/${room.roomId}`)}
                    >
                      이동
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* 접속 중 사용자 */}
          <div className="card online">
            <h3>🟢 접속 중 사용자</h3>
            {onlineUsers.filter(u => u.userId !== userId).length === 0 ? (
              <p className="empty-text">접속 중인 사용자가 없습니다.</p>
            ) : (
              <ul className="list">
                {onlineUsers
                  .filter(u => u.userId !== userId)
                  .map(u => {
                    const alreadyFriend = friends.some(f => f.id === u.userId);
                    const alreadyRequested = sentFriendRequests.includes(u.userId);
                    return (
                      <li key={u.userId} className="list-item">
                        <span>{u.username}</span>
                        {!alreadyFriend && (
                          <button 
                            onClick={() => handleSendFriendRequest(u.userId)}
                            disabled={alreadyRequested}
                          >
                            {alreadyRequested ? "요청 보냄" : "친구 요청"}
                          </button>
                        )}
                        <button onClick={() => handleSendDM(u.userId)}>DM</button>
                      </li>
                    )
                  })}
              </ul>
            )}
          </div>

        {/* 받은 친구 요청 */}
        <div className="card friend-requests">
            <h3>📨 받은 친구 요청</h3>
            {friendRequests.length === 0 ? (
              <p className="empty-text">요청이 없습니다.</p>
            ) : (
              <ul className="list">
                {friendRequests.map(req => (
                  <li key={req.id} className="request-item">
                    <span className="nickname">
                      {req.fromUserNickname}
                    </span>

                    <div className="actions">
                      <button
                        className="accept"
                        onClick={() => acceptFriendRequest(req.id)}
                      >
                        수락
                      </button>
                      <button
                        className="reject"
                        onClick={() => rejectFriendRequest(req.id)}
                      >
                        거절
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        {/* 친구 목록 */}
        <div className="card friends">
          <h3>👥 친구 목록</h3>

          {friends.length === 0 ? (
            <p className="empty-text">친구가 없습니다.</p>
          ) : (
            <ul className="list">
              {friends.map((user) => (
                <li key={user.id} className="list-item">
                  <span
                    className={`user-status ${user.online ? "user-online" : "user-offline"}`}
                  ></span>

                  <span className="username">{user.username}</span>

                  <button className="dm-btn" onClick={() => handleSendDM(user.id)}>
                    DM
                  </button>
                  <button
                    className="danger-btn"
                    onClick={() => removeFriend(user.id)}
                  >
                    친구 끊기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Lobby;