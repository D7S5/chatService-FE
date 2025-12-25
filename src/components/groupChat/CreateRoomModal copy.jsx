import { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import "./CreateRoomModal.css";

const CreateRoomModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [maxUsers, setMaxUsers] = useState(100);
  const navigate = useNavigate();
  const [type, setType] = useState("PUBLIC");
  const [error, setError] = useState("");

  const isLargeRoom = maxUsers >= 100;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("방 이름을 입력하세요.");
      return;
    }

    try {
      const res = await api.post("/rooms", {
        name,
        type,
        maxParticipants: maxUsers,
      });

      console.log("방 생성 응답:", res.data);

      onCreated(res.data);
      navigate(`/rooms/${res.data.roomId}`);
      onClose();
    } 
    catch (e) {
      
      setError("채팅방 생성 실패");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>➕ 채팅방 생성</h2>

        <label>방 이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="채팅방 이름"
        />

        <label>최대 인원 수</label>
        <div className="range-box">
          <input
            type="range"
            min={2}
            max={1000}
            step={10}
            value={maxUsers}
            onChange={(e) => setMaxUsers(Number(e.target.value))}
          />
          <input
            type="number"
            min={2}
            max={1000}
            value={maxUsers}
            onChange={(e) => setMaxUsers(Number(e.target.value))}
          />
        </div>

        {isLargeRoom && (
          <div className="large-badge">
          </div>
        )}

        <label>방 공개 설정</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="PUBLIC">공개</option>
          <option value="PRIVATE">비공개</option>
        </select>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button onClick={onClose} className="cancel">
            취소
          </button>
          <button onClick={handleCreate} className="create">
            생성
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;
