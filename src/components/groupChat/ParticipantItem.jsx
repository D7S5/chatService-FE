import React, { useState, useRef, useEffect } from "react";
import "./ParticipantItem.css";

const ParticipantItem = ({
  p,
  me,
  onKick,
  onBan,
  onGrantAdmin, 
}) => {
  const [open, setOpen] = useState(false);
  const itemRef = useRef(null);

  const isMeMissing = !me;

  const isMe = me && p.userId === me.userId;
  const isOwner = me?.role === "OWNER";
  const isAdmin = me?.role === "ADMIN";

  const isTargetAdmin = p.role === "ADMIN";
  const isTargetOwner = p.role === "OWNER";

  const canKick = !isMe && (isOwner || isAdmin);
  const canBan = !isMe && isOwner;
  const canGrantAdmin = !isMe && isOwner && p.role !== "OWNER"; // ⭐ 핵심

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
        if (canKick || canBan || canGrantAdmin) {
          setOpen((v) => !v);
        }
      }}
    >
      {/* USER INFO */}
      <div className="user">
        <span className="name">{p.username}</span>
        {p.role === "OWNER" && <span className="role owner">👑</span>}
        {p.role === "ADMIN" && <span className="role admin">🛡</span>}
      </div>

      {/* ACTION MENU */}
      {open && ((canKick || canBan || canGrantAdmin) && !isTargetOwner) && (
        <div className="menu">
          {canGrantAdmin && (
            <button
              className="menu-item admin"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onGrantAdmin(p);
              }}
            >
              {isTargetAdmin ? "관리자 해제" : "관리자 지정"}
            </button>
          )}

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
