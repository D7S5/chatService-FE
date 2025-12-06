import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import "../Signup.css";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    // 비밀번호 확인 체크
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // 백엔드 RegisterRequest 형식에 맞게 요청
      await api.post("/auth/register", { username, password, email });
      toast.success("회원가입 성공! 로그인 페이지로 이동합니다.");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "이미 존재하는 이메일이거나 아이디입니다");
    }
  };

  return (
    <div className="signup-container">
      <h2>회원가입</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="사용자 이름"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">회원가입</button>
      </form>
      <p>
        이미 회원이신가요? <Link to="/">로그인</Link>
      </p>
    </div>
  );
}

export default Signup;
