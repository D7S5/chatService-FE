import naverLoginBtn from "../assets/NAVER_login_Light_KR_green_wide_H56.png";
import './NaverLoginButton.css'


const NaverLoginButton = () => {
  const baseUrl = process.env.REACT_APP_API_BASE || "http://localhost:9090";

  const handleLogin = () => {
    window.location.href = `${baseUrl}/oauth2/authorization/naver`;
  };

  return (
    <img
      src={naverLoginBtn}
      alt="네이버 로그인"
      onClick={handleLogin}
      className="naver-login-btn"
    />
  );
};

export default NaverLoginButton;
