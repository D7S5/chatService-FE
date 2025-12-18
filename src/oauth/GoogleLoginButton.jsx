import React from "react";
import googleIcon from "../assets/web_light.png"; 
import "./GoogleLoginButton.css";

const GoogleLoginButton = () => {
  const handleLogin = () => {
    const baseUrl =
      process.env.REACT_APP_API_BASE || "http://localhost:9090";

    window.location.href = `${baseUrl}/oauth2/authorization/google`;
  };

  return (
    <img
      src={googleIcon}
      alt="구글 로그인"
      onClick={handleLogin}
      className="google-btn"
    />
  );
};

export default GoogleLoginButton;