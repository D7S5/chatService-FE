import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import "../OAuthNickname.css"

const OAuthNickname = () => {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
//   const [available, setAvailable] = useState(null);

  const token = params.get("token");

  const submitNickname = async () => {
    if (!nickname.trim()) {
      setError("닉네임을 입력하세요");
      return;
    }

    try {
      localStorage.setItem("accessToken", token);

      const res = await api.post("/user/oauth/nickname", {
        nickname,
      });

      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("username", res.data.username);

      navigate("/lobby");
    } catch (e) {
      setError("닉네임 설정 실패");
    }
  };
  
//   const checkNickname = async (value) => {
//   try {
//     const res = await api.get("/user/nickname/check", {
//       params: { nickname: value },
//     });

//     setAvailable(res.data.available);
//     setError(res.data.available ? "" : res.data.message);
//   } catch {
//     setAvailable(false);
//     setError("닉네임 확인 실패");
//   }
// };

  return (
    <div className="login-container">
      <h2>닉네임 설정</h2>
      <input
        value={nickname}
        onChange={(e) => {
            setNickname(e.target.value);
            // checkNickname(e.target.value);
        }}
        placeholder="닉네임"
      />
      {/* {available === true && (
        <p className="success-message">사용 가능한 닉네임입니다.</p>
        )} */}
      {error && <p className="error">{error}</p>}
      <button onClick={submitNickname}>완료</button>
    </div>
  );
};

export default OAuthNickname;
