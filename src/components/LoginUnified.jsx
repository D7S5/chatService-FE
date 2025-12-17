import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import NaverLoginButton from "../oauth/NaverLoginButton";
import GoogleLoginButton from "../oauth/GoogleLoginButton";
import "../Login.css";
import KakaoLoginButton from "../oauth/KakaoLoginButton";

const LoginUnified = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  /* -------------------------------
     일반 이메일 로그인
  -------------------------------- */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");

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

  /* -------------------------------
     OAuth 로그인 (리다이렉트)
  -------------------------------- */
  const handleOAuthLogin = (provider) => {
    const baseUrl = process.env.REACT_APP_API_BASE || "http://localhost:9090";
    window.location.href = `${baseUrl}/oauth2/authorization/${provider}`;
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>

      {/* 이메일 로그인 */}
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

        <button type="submit">이메일 로그인</button>
      </form>

      <div className="divider">또는</div>

      <div className="oauth-buttons">
      <GoogleLoginButton />
      <NaverLoginButton />
      <KakaoLoginButton />
      </div>
      <p>
        회원이 아니신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
};

export default LoginUnified;
