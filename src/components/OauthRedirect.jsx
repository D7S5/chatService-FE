import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";

export default function OAuthRedirect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const load = async () => {
      const token = params.get("token");
      if (!token) {
        navigate("/");
        return;
      }

      // 🔥 반드시 먼저 저장
      localStorage.setItem("accessToken", token);

      try {
        const res = await api.get("/me");

        localStorage.setItem("userId" , res.data.id)
        localStorage.setItem("username", res.data.username)
        
        navigate(
          res.data.nicknameCompleted
            ? "/lobby"
            : "/oauth/nickname"
        );
      } catch {
        navigate("/");
      }
    };

    load();
}, [params, navigate]);

  return null;
}
