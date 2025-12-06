// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";

// let client = null;

// export const connectWebSocket = (onConnected) => {
//   if (client?.connected) return client;

//   const token = localStorage.getItem("accessToken");

//   client = new Client({
//     webSocketFactory: () =>
//       new SockJS("http://localhost:9090/ws-stomp"), // 변경 없음

//     connectHeaders: {
//       Authorization: `Bearer ${token}` // ⭐ 필수!!!
//     },

//     reconnectDelay: 5000,
//     onConnect: () => {
//       console.log("WebSocket 연결 완료!");
//       onConnected(client);
//     },

//     onStompError: (frame) => {
//       console.error("STOMP 오류:", frame.headers["message"]);
//     },
//   });

//   client.activate();
//   return client;
// };

// export const disconnectWebSocket = () => {
//   if (client && client.connected) {
//     client.deactivate();
//   }
// };
