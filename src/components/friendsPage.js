import React, { useEffect, useState } from "react";
import api from "../api";
import "../friends.css";

const FriendsPage = () => {
  const userId = localStorage.getItem("userId");

  const [friendList, setFriendList] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]); // 받은 요청
  const [pendingSent, setPendingSent] = useState([]); // 보낸 요청
  const [searchId, setSearchId] = useState(""); // 친구 검색

  // 초기 로딩
  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    const res = await api.get(`/friends/list?userId=${userId}`);
    setFriendList(res.data);
  };

  const loadRequests = async () => {
    const res1 = await api.get(`/friends/requests?userId=${userId}`);
    setPendingReceived(res1.data);

    const res2 = await api.get(`/friends/sent?userId=${userId}`);
    setPendingSent(res2.data);
  };

  const sendRequest = async () => {
    if (!searchId) return alert("UUID를 입력하세요.");
    try {
      await api.post(`/friends/request?from=${userId}&to=${searchId}`);
      alert("친구 요청을 보냈습니다.");
      loadRequests();
    } catch (e) {
      alert("요청 실패");
      console.log(e);
    }
  };

  const acceptRequest = async (id) => {
    await api.post(`/friends/accept/${id}`);
    alert("수락했습니다.");
    loadFriends();
    loadRequests();
  };

  const rejectRequest = async (id) => {
    await api.post(`/friends/reject/${id}`);
    alert("거절했습니다.");
    loadRequests();
  };
  /* 보낸 요청 취소 */
  const cancelRequest = async (to) => {
    await api.post(`/friends/cancel?from=${userId}&to=${to}`);
    alert("요청을 취소했습니다.");
    loadRequests();
  };

  return (
    <div className="friends-container">
      <h1>친구 관리</h1>

      {/* 친구 검색 영역 */}
      <div className="card">
        <h2>친구 추가</h2>
        <input
          type="text"
          placeholder="상대 UUID 입력"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
        <button className="primary" onClick={sendRequest}>친구 요청</button>
      </div>

      {/* 받은 친구 요청 */}
      <div className="card">
        <h2>받은 요청</h2>
        {pendingReceived.length === 0 ? (
          <p>받은 요청 없음</p>
        ) : (
          pendingReceived.map(r => (
            <div key={r.id} className="request-item">
              <span>보낸 사람: {r.fromUserId}</span>
              <button className="success" onClick={() => acceptRequest(r.id)}>수락</button>
              <button className="danger" onClick={() => rejectRequest(r.id)}>거절</button>
            </div>
          ))
        )}
      </div>

      {/* 보낸 요청 */}
      <div className="card">
        <h2>보낸 요청</h2>
        {pendingSent.length === 0 ? (
          <p>보낸 요청 없음</p>
        ) : (
          pendingSent.map(r => (
            <div key={r.id} className="request-item">
              <span>받는 사람: {r.toUserId}</span>
              <button className="warning" onClick={() => cancelRequest(r.toUserId)}>취소</button>
            </div>
          ))
        )}
      </div>

      {/* 친구 목록 */}
      <div className="card">
        <h2>친구 목록</h2>
        {friendList.length === 0 ? (
          <p>친구 없음</p>
        ) : (
          friendList.map(f => (
            <div key={f} className="friend-item">
              <span>친구: {f}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
