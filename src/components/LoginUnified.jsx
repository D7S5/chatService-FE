import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import "../Login.css";

const LoginUnified = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 모두 입력하세요.");
      return;
    }
    try {
      const res = await api.post(
        "/auth/login",
        { email, password },
        { withCredentials: true }
      );

      const { accessToken, user } = res.data;

  
      localStorage.setItem("accessToken", accessToken);
    
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);

      navigate("/lobby"); 
    } catch (err) {
      setError(err.response?.data?.message || "로그인 실패");
    }
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>
      <form onSubmit={handleEmailLogin} className="login-form">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-message">{error}</p>}
        <button type="submit">로그인</button>
      </form>
      <p>
        회원이 아니신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
};

export default LoginUnified;
