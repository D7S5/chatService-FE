import { useState } from "react";
import api from "../../api";
import "./InviteCodePanel.css";

const InviteCodePanel = ({ roomId, isAdmin }) => {
  const [inviteCode, setInviteCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isAdmin) return null;

  const generateInviteCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post(`/rooms/${roomId}/invite/reissue`);
      setInviteCode(res.data.inviteCode);
    } catch (e) {
      setError("초대코드 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteCode);
    alert("초대코드가 복사되었습니다.");
  };

  return (
    <div className="invite-container">
      <button
        onClick={generateInviteCode}
        disabled={loading}
        className="invite-button"
      >
        {loading ? "생성 중..." : "초대코드 생성"}
      </button>

      {inviteCode && (
        <div className="invite-code-box">
          <span className="invite-code">{inviteCode}</span>
          <button onClick={copyToClipboard} className="copy-button">
            복사
          </button>
          <p className="invite-expire">※ 10분 후 만료됩니다</p>
        </div>
      )}

      {error && <p className="invite-error">{error}</p>}
    </div>
  );
};

export default InviteCodePanel;
