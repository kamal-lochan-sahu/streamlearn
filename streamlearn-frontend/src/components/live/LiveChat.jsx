import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useLiveStore } from '../../store/liveStore';
import { useAuthStore } from '../../store/authStore';
import { liveChatSocket, connectLiveChat } from '../../socket/socket';
import { formatDate } from '../../utils/formatters';

export default function LiveChat({ streamId }) {
  const { messages, addMessage, viewers } = useLiveStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    connectLiveChat();
    liveChatSocket.emit('join-stream', { streamId });

    liveChatSocket.on('new-message', (msg) => addMessage(msg));
    liveChatSocket.on('viewer-count-update', ({ count }) =>
      useLiveStore.setState({ viewers: count })
    );
    liveChatSocket.on('reaction', ({ emoji }) => {
      // Show floating emoji
    });

    return () => {
      liveChatSocket.emit('leave-stream', { streamId });
      liveChatSocket.off('new-message');
      liveChatSocket.off('viewer-count-update');
    };
  }, [streamId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    liveChatSocket.emit('send-message', { streamId, message: input.trim() });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-l border-border">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Live Chat</h3>
        <span className="text-xs text-text-secondary">{viewers} watching</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium text-brand text-xs">{msg.userId?.name || 'User'} </span>
            <span className="text-text-secondary">{msg.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Send a message..."
          className="flex-1 bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-brand text-white placeholder:text-text-muted"
        />
        <button
          onClick={send}
          className="p-2 bg-brand rounded hover:bg-brand-dark transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
