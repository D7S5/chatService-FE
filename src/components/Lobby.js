import React, { useEffect, useRef, useState } from "react";
import { json, useNavigate } from "react-router-dom";
import "../Lobby.css";
import api from "../api";
import { connectWebSocket, getClient } from "../websocket";

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [dmRooms, setDMRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (!userId || !username) return;

    // WebSocket 연결
    connectWebSocket((client) => {
      // 🔥 STOMP 연결 완료 후 실행됨

      /** 1) 입장 이벤트 전송 */
      client.publish({
        destination: "/app/user.enter",
        body: JSON.stringify({ uuid: userId, username }),
      });

      /** 2) 첫 heartbeat 딜레이 */
      setTimeout(() => {
        if (!client.connected) return;

        client.publish({
          destination: "/app/user.heartbeat",
          body: JSON.stringify({ uuid: userId }),
        });

        // 반복 heartbeat
        heartbeatRef.current = setInterval(() => {
          if (!client.connected) return;

          client.publish({
            destination: "/app/user.heartbeat",
            body: JSON.stringify({ uuid: userId }),
          });
        }, 10000);
      }, 5000);
  
      client.subscribe("/topic/online-users", (msg) => {
        const list = JSON.parse(msg.body);
        // { uuid : uuid , username : username , online : true }
        const filteredList = list.filter(u => u.uuid !== userId);

        setOnlineUsers(filteredList);

        const onlineMap = {};
        list.forEach( u => {
          onlineMap[u.uuid] = u.online;          
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

      /** 5) 친구 관련 구독 */
      client.subscribe(`/topic/friends/${userId}`, (msg) => {
        const payload = JSON.parse(msg.body);

        if (payload.type === "REQUEST") loadFriendRequests();
        if (payload.type === "ACCEPT") loadFriends();
      });
    });

    // 데이터 로드
    loadRooms();
    loadDMRooms();
    loadFriends();
    loadFriendRequests();

    /** 🔥 브라우저 닫힘 감지 → 자동 logout/offline */
    const handleUnload = () => {
      const client = getClient();
      if (client && client.connected) {
        client.publish({
          destination: "/app/user.leave",
          body: JSON.stringify({ uuid: userId }),
        });
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    /** 🔥 언마운트 시 정리 */
    return () => {
      window.removeEventListener("beforeunload", handleUnload);

      const client = getClient();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (client && client.connected) {
        client.publish({
          destination: "/app/user.leave",
          body: JSON.stringify({ uuid: userId }),
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
  /** DM 시작 */
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

  /** 친구 요청 */
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

  /** 친구 요청 수락 */
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

  /** 친구 요청 거절 */
  const rejectFriendRequest = async (requestId) => {
    try {
      await api.post(`/user/friends/reject/${requestId}`);
      alert("거절했습니다.");
      loadFriendRequests();
    } catch (err) {
      console.error(err);
    }
  };

  /** 채팅방 입장 */
  const handleJoinRoom = (room) => {
    navigate(`/chat/${room.roomId}`, {
      state: { username, roomName: room.name },
    });
  };

  /** 채팅방 생성 */
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const res = await api.post("/rooms", { name: newRoomName });
      setRooms((prev) => [...prev, res.data]);
      setNewRoomName("");
    } catch {
      setError("채팅방 생성 실패");
    }
  };
  
  const handleLogout = () => {
  localStorage.clear();
  navigate("/");
};

async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (e) {
    console.error("logout error:", e);
  }

  // AccessToken 제거
  localStorage.removeItem("accessToken");

  // 메인 페이지 이동
  window.location.href = "/";
}
  return (
    <div className="lobby-wrapper">
      <div className="lobby-header">
        <h2>💬 채팅 로비</h2>
        <p className="welcome">
          환영합니다, <strong>{username}</strong>님!
        </p>
        <button onClick={() => navigate("/nickname")} style={{ marginLeft: "10px" }}>
          닉네임 변경
        </button>
        <button onClick={logout} className="logout-btn">
      로그아웃
    </button>
      </div>

      <div className="lobby-grid">
        {/* 채팅방 목록 */}
        <div className="card rooms">
          <h3>📁 채팅방 목록</h3>
          {rooms.length === 0 ? (
            <p className="empty-text">채팅방이 없습니다.</p>
          ) : (
            <ul className="list">
              {rooms
                .filter((r) => r.type === "PUBLIC")
                .map((room) => (
                  <li key={room.roomId} className="list-item">
                    <span>{room.name}</span>
                    <button className="join-btn" onClick={() => handleJoinRoom(room)}>
                      입장
                    </button>
                  </li>
                ))}
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
            {onlineUsers.filter(u => u.uuid !== userId).length === 0 ? (
              <p className="empty-text">접속 중인 사용자가 없습니다.</p>
            ) : (
              <ul className="list">
                {onlineUsers
                  .filter(u => u.uuid !== userId)
                  .map(u => {
                    const alreadyFriend = friends.some(f => f.id === u.uuid);
                    const alreadyRequested = sentFriendRequests.includes(u.uuid);
                    return (
                      <li key={u.uuid} className="list-item">
                        <span>{u.username}</span>
                        {!alreadyFriend && (
                          <button 
                            onClick={() => handleSendFriendRequest(u.uuid)}
                            disabled={alreadyRequested}
                          >
                            {alreadyRequested ? "요청 보냄" : "친구 요청"}
                          </button>
                        )}
                        <button onClick={() => handleSendDM(u.uuid)}>DM</button>
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
                <li key={req.id}>
                  <span>{req.fromUserNickname + " "}</span>
                  <button onClick={() => acceptFriendRequest(req.id)}>수락</button>
                  <button onClick={() => rejectFriendRequest(req.id)}>거절</button>
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
                </li>
              ))}
            </ul>
          )}
        </div>


        {/* 채팅방 생성 */}
        <div className="card form-card">
          <h3>➕ 채팅방 생성</h3>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              placeholder="새 채팅방 이름"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
            <button className="create-btn" type="submit">
              생성
            </button>
          </form>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Lobby;