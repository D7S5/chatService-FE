import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function OAuthRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (!token) return;

    localStorage.setItem("accessToken", token);

    const payload = JSON.parse(atob(token.split(".")[1]));

    if (!payload.nicknameCompleted) {
      navigate("/oauth/nickname");
    } else {
      navigate("/lobby");
    }
  }, []);

  return null;
}