import React from "react";
import kakaoIcon from "../assets/kakao.png"; // 선택
import "./KakaoLoginButton.css";

const KakaoLoginButton = () => {
  const baseUrl = process.env.REACT_APP_API_BASE || "http://localhost:9090";

  const handleLogin = () => {
    window.location.href = `${baseUrl}/oauth2/authorization/kakao`;
  };

  return (
    <img
      src={kakaoIcon}
      alt="카카오 로그인"
      onClick={handleLogin}
      className="kakao-login-btn"
    />
  );
};

export default KakaoLoginButton;