import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginUnified from "./components/LoginUnified";
import Signup from "./components/Signup";
import NicknameSetup from "./components/NicknameSetup";
import Lobby from "./components/Lobby";
import Chat from "./components/Chat";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import PrivateChat from "./components/PrivateChat";
import DMList from "./components/DMList";

function App() {
  const [username, setUsername] = useState(() => localStorage.getItem("username"));

  return (
    <Router>
      <ToastContainer position="top-center" autoClose={2000} />
      {/* {username && <button onClick={handleLogout}>로그아웃</button>} */}
      <Routes>
        <Route path="/" element={<LoginUnified onLogin={() => setUsername(null)} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/nickname" element={<NicknameSetup setUsername={setUsername} />} />
        <Route path="/lobby" element={<Lobby username={username} />} />
        <Route path="/chat/:roomId" element={<Chat />} />
        <Route path="/dm/list" element={<DMList />} />
        <Route path="/dm/:roomId" element={<PrivateChat />} />
        {/* <Route path="/dm/:targetUser" element={<PrivateChat />} /> */}
        {/* <Route path="*" element={<Navigate to="/" />} /> */}
      </Routes>
    </Router>
  );
}
export default App;
