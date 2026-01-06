import React, { useState, useRef, useEffect } from "react";
import "./ParticipantItem.css";

const ParticipantItem = ({ p, me, onKick, onBan }) => {
  const [open, setOpen] = useState(false);
  const itemRef = useRef(null);

  /** 🔒 me 없으면 렌더링만 막고 Hook은 정상 실행 */
  const isMeMissing = !me;

  const isMe = me && p.userId === me.userId;
  const isOwner = me?.role === "OWNER";
  const isAdmin = me?.role === "ADMIN";

  const canKick = !isMe && (isOwner || isAdmin);
  const canBan = !isMe && isOwner;

  /** 바깥 클릭 시 닫기 */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isMeMissing) return null;

  return (
    <li
      ref={itemRef}
      className={`participant-item ${isMe ? "me" : ""}`}
      onClick={() => {
        if (canKick || canBan) setOpen((v) => !v);
      }}
    >
      {/* USER INFO */}
      <div className="user">
        <span className="name">{p.username}</span>
        {p.role === "OWNER" && <span className="role owner">👑</span>}
        {p.role === "ADMIN" && <span className="role admin">🛡</span>}
      </div>

      {/* ACTION MENU */}
      {open && (canKick || canBan) && (
        <div className="menu">
          {canKick && (
            <button
              className="menu-item kick"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onKick(p);
              }}
            >
              강퇴
            </button>
          )}

          {canBan && (
            <button
              className="menu-item ban"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onBan(p);
              }}
            >
              밴
            </button>
          )}
        </div>
      )}
    </li>
  );
};

export default ParticipantItem;
