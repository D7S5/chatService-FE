import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // axios 인스턴스 (JWT 자동 헤더 포함)
import { toast } from 'react-toastify';
import '../Login.css';

const NicknameSetup = ({}) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); 
 
const handleSubmit = async (e) => {
  e.preventDefault();
   const trimmed = nickname.trim(); 

    if (!trimmed) return setError('닉네임을 입력하세요.');
    if (trimmed.length < 2 || trimmed.length > 20) return setError('닉네임은 2~20자 사이여야 합니다.');

  try {
    await api.post('/user/set-nickname', { nickname : trimmed})

    localStorage.setItem("username", trimmed)
    
    toast.success("닉네임 설정 완료!");
    navigate("/lobby");
  } catch (err) {
    
    const message = 
      err.response?.data?.message || "서버 오류가 발생했습니다";
    toast.error(message);
    setError(message);
  }
};

  return (
    <div className="login-container">
      <h2>닉네임 설정</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력하세요"
          className={error ? 'input-error' : ''}
          autoFocus
        />
        {error && <p className="error-message">{error}</p>}
        <button type="submit">확인</button>
      </form>
    </div>
  );
};

export default NicknameSetup;
