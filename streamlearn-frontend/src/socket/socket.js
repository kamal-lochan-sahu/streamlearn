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
  auth: { token: getToken() },
});
export const watchPartySocket = io(`${SOCKET_URL}/watch-party`, {
  autoConnect: false,
  auth: { token: getToken() },
});
export const liveStreamSocket = io(`${SOCKET_URL}/live-stream`, {
  autoConnect: false,
  auth: { token: getToken() },
});

export const connectLiveChat = () => {
  liveChatSocket.auth = { token: getToken() };
  liveChatSocket.connect();
};
export const connectWatchParty = () => {
  watchPartySocket.auth = { token: getToken() };
  watchPartySocket.connect();
};
export const connectLiveStream = () => {
  liveStreamSocket.auth = { token: getToken() };
  liveStreamSocket.connect();
};
