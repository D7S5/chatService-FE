// websocket.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "./api";

let client = null;
let wsToken = null;
let connecting = false;

// -----------------------------------------------------------
// 1) 120초 단기 WebSocket Token 발급
// -----------------------------------------------------------
async function fetchWsToken() {
  try {
    const res = await api.post("/ws/token");
    return res.data.wsToken;
  } catch (err) {
    console.error("Failed to fetch wsToken:", err);
    throw err;
  }
}

// -----------------------------------------------------------
// 2) STOMP Client 생성 함수
// -----------------------------------------------------------
async function createClient(onConnectCallback) {
  wsToken = await fetchWsToken();

  const stompClient = new Client({
    webSocketFactory: () => new SockJS("http://localhost:9090/ws?ws-token=" + wsToken),
    reconnectDelay: 5000,  // 자동 재연결
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,

    // 연결 성공 시
    onConnect: () => {
      // console.log("WS Connected"); debug

      if (onConnectCallback) onConnectCallback(stompClient);

      setTimeout(() => {
        // console.log("wsToken 만료 임박 → 재연결 시도"); debug
        reconnect(onConnectCallback);
      }, 110 * 1000);
    },

    onStompError: (frame) => {
      console.error("STOMP Error:", frame);
    },

    onWebSocketClose: () => {
      // console.warn("WebSocket Closed"); debug
    }
  });

  return stompClient;
}

export async function connectWebSocket(onConnectCallback) {
  if (connecting) return;
  connecting = true;

  try {
    client = await createClient(onConnectCallback);
    client.activate();   // 여기서 실제 연결
  } finally {
    connecting = false;
  }

  return client;
}
    
async function reconnect(onConnectCallback) {
  if (connecting) return;
  connecting = true;

  try {
    if (client && client.deactivate) {
      await client.deactivate();
    }
  } catch (err) {
    console.warn("Deactivate failed, continue:", err);
  }

  client = await createClient(onConnectCallback);
  client.activate();
  connecting = false;
}

export const getClient = () => client;
