import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../DMList.css";

const DMList = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;
    loadRooms();
  }, [userId]);

  const loadRooms = async () => {
    try {
      const res = await api.get(`/dm/list/${userId}`);
      setRooms(res.data || []);
    } catch (err) {
      console.error("Failed to fetch dm rooms:", err);
    }
  };
  

  const openRoom = (roomId) => {
    navigate(`/dm/${roomId}`);
  };

  return (
    <div className="dm-list-container">
      <h2>📨 DM 목록</h2>

      {rooms.length === 0 ? (
        <p className="empty-text">현재 DM 대화가 없습니다.</p>
      ) : (
        <ul className="dm-room-list">
          {rooms.map((room) => {
            const opponent =
              room.userA.id === userId ? room.userB : room.userA;

            return (
              <li
                key={room.roomId}
                className="dm-room-item"
                onClick={() => openRoom(room.roomId)}
              >
                <div className="dm-room-info">
                  <span className="dm-username">{opponent.username}</span>
                  <span className="last-message">
                    {room.lastMessage ? room.lastMessage : "메시지가 없습니다"}
                  </span>
                </div>
                <span className="dm-time">
                  {room.lastMessageTime
                    ? new Date(room.lastMessageTime).toLocaleString()
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button className="go-lobby-btn" onClick={() => navigate("/lobby")}>
        🔙 로비로 돌아가기
      </button>
    </div>
  );
};

export default DMList;
