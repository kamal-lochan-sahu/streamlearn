import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const getToken = () => {
  try {
    const raw = localStorage.getItem('streamlearn-auth');
    return raw ? JSON.parse(raw).state?.accessToken : null;
  } catch {
    return null;
  }
};

export const liveChatSocket = io(`${SOCKET_URL}/live-chat`, {
  autoConnect: false,
  // a function, so every reconnect uses the CURRENT access token (tokens expire every 15 minutes)
  auth: (cb) => cb({ token: getToken() }),
});
export const watchPartySocket = io(`${SOCKET_URL}/watch-party`, {
  autoConnect: false,
  // a function, so every reconnect uses the CURRENT access token (tokens expire every 15 minutes)
  auth: (cb) => cb({ token: getToken() }),
});
export const liveStreamSocket = io(`${SOCKET_URL}/live-stream`, {
  autoConnect: false,
  // a function, so every reconnect uses the CURRENT access token (tokens expire every 15 minutes)
  auth: (cb) => cb({ token: getToken() }),
});

export const connectLiveChat = () => {
  if (!liveChatSocket.connected) liveChatSocket.connect();
};
export const connectWatchParty = () => {
  if (!watchPartySocket.connected) watchPartySocket.connect();
};
export const connectLiveStream = () => {
  if (!liveStreamSocket.connected) liveStreamSocket.connect();
};
