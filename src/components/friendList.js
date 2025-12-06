import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const FriendList = () => {
  const [friends, setFriends] = useState([]);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await api.get(`/user/friends?userId=${userId}`);
        setFriends(res.data || []);
      } catch (e) {
        console.error("친구 목록 로드 실패", e);
      }
    };
    fetchFriends();
  }, [userId]);

  const handleDM = (friendId) => {
    navigate(`/dm/${friendId}`); // UUID를 URL 파라미터로 전달
  };

  return (
    <div>
      <h2>친구 목록</h2>
      <ul>
        {friends.map(f => (
          <li key={f.id}>
            {f.username} 
            <button onClick={() => handleDM(f.id)}>DM</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendList;
