import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "./api";

let client = null;
let wsToken = null;
let connecting = false;
let reconnectTimer = null;

async function fetchWsToken() {
  try {
    const res = await api.post("/ws/token");
    return res.data.wsToken;
  } catch (err) {
    console.error("Failed to fetch wsToken:", err);
    throw err;
  }
}

// 개발 환경에서는 백엔드 주소를 직접 사용
const wsBase =
  process.env.NODE_ENV === "development"
    ? "http://localhost:9090/ws"
    : `${window.location.origin}/ws`;

async function createClient(onConnectCallback) {
  wsToken = await fetchWsToken();

  const stompClient = new Client({
    webSocketFactory: () => new SockJS(`${wsBase}?ws-token=${wsToken}`),
    reconnectDelay: 5000,
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,

    onConnect: () => {
      if (onConnectCallback) onConnectCallback(stompClient);

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = setTimeout(() => {
        reconnect(onConnectCallback);
      }, 110 * 1000);
    },

    onStompError: (frame) => {
      console.error("STOMP Error:", frame);
    },

    onWebSocketClose: () => {
      // console.warn("WebSocket Closed");
    },
  });

  return stompClient;
}

export async function connectWebSocket(onConnectCallback) {
  if (connecting) return client;
  connecting = true;

  try {
    client = await createClient(onConnectCallback);
    client.activate();
    return client;
  } catch (err) {
    console.error("connectWebSocket failed:", err);
    throw err;
  } finally {
    connecting = false;
  }
}

async function reconnect(onConnectCallback) {
  if (connecting) return;
  connecting = true;

  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (client && client.deactivate) {
      await client.deactivate();
    }

    client = await createClient(onConnectCallback);
    client.activate();
  } catch (err) {
    console.error("Reconnect failed:", err);
  } finally {
    connecting = false;
  }
}

export const getClient = () => client;