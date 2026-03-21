'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { OpenChat, useChat } from './ChatContext';

interface Props {
  chat: OpenChat;
  index: number; // vị trí từ phải sang: 0, 1, 2
}

export default function ChatWindow({ chat, index }: Props) {
  const { currentUser, closeChat, minimizeChat, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Vị trí mặc định — tính từ phải sang, từ dưới lên
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({
        x: window.innerWidth - 320 - index * 328 - 8,
        y: window.innerHeight - 480 - 8,
      });
    }
  }, [index]);

  // Auto scroll
  useEffect(() => {
    if (!chat.minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages, chat.minimized]);

  // Drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button,a,input')) return;
    if (!pos) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 44, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(chat.convId, text);
  };

  if (!pos) return null;

  const isProduct = chat.type === 'product';

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      width: 312, zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
    }}>
      {/* ── HEADER ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          background: '#8B1A1A', padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'move', userSelect: 'none',
        }}
      >
        {/* Avatar: ảnh gà nếu product, chữ cái nếu user */}
        {isProduct ? (
          chat.gaAnh
            ? <img src={chat.gaAnh} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 32, height: 32, background: '#6B0F0F', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🐓</div>
        ) : (
          <div style={{ width: 32, height: 32, background: '#6B0F0F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {(chat.doiPhuongName || 'U')[0].toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isProduct ? chat.gaTen : chat.doiPhuongName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>
            {isProduct ? chat.doiPhuongName : 'Tin nhắn trực tiếp'}
          </div>
        </div>

        {chat.unread > 0 && (
          <span style={{ background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 99, flexShrink: 0 }}>
            {chat.unread}
          </span>
        )}

        <button
          onClick={() => minimizeChat(chat.convId, !chat.minimized)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title={chat.minimized ? 'Mở rộng' : 'Thu nhỏ'}
        >
          {chat.minimized ? '▲' : '▼'}
        </button>
        <button
          onClick={() => closeChat(chat.convId)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title="Đóng"
        >
          ✕
        </button>
      </div>

      {/* ── BODY ── */}
      {!chat.minimized && (
        <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', height: 420 }}>

          {/* Nếu là product chat → hiện link xem gà */}
          {isProduct && chat.gaId && (
            <div style={{ padding: '5px 12px', background: '#fdf0f0', borderBottom: '1px solid #f5dada', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#888' }}>Hỏi mua: {chat.gaTen}</span>
              <Link href={`/ga/${chat.gaId}`} style={{ fontSize: 10, color: '#8B1A1A', fontWeight: 700, textDecoration: 'none' }}>
                Xem gà →
              </Link>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {chat.messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 28 }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>👋</div>
                <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10 }}>Bắt đầu trò chuyện!</div>
                {isProduct && ['Gà còn không?', 'Giá có thể bớt không?', 'Cho xem thêm ảnh không?'].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    style={{ display: 'block', width: '100%', marginBottom: 4, background: '#f5f5f5', border: '1px solid #eee', borderRadius: 99, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#555', textAlign: 'left' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {chat.messages.map(msg => {
              const isMe = msg.sender_id === currentUser?.id;
              if (msg.loai === 'system') return (
                <div key={String(msg.id)} style={{ textAlign: 'center', margin: '4px 0' }}>
                  <span style={{ background: '#fff9e6', color: '#856404', fontSize: 10, padding: '2px 8px', borderRadius: 99 }}>
                    {msg.noi_dung}
                  </span>
                </div>
              );
              return (
                <div key={String(msg.id)} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 5, alignItems: 'flex-end', gap: 4 }}>
                  {!isMe && (
                    <div style={{ width: 20, height: 20, background: '#8B1A1A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, flexShrink: 0 }}>
                      {(chat.doiPhuongName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '74%', padding: '6px 10px', wordBreak: 'break-word',
                    borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    background: isMe ? '#8B1A1A' : '#f0f0f0',
                    color: isMe ? '#fff' : '#333',
                    fontSize: 12, lineHeight: 1.4,
                    opacity: msg.pending ? 0.55 : 1,
                  }}>
                    {msg.noi_dung}
                    <div style={{ fontSize: 9, marginTop: 2, opacity: 0.6, textAlign: 'right' }}>
                      {msg.pending ? '⏳' : new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #eee', padding: '6px 8px', display: 'flex', gap: 5, background: '#fafafa' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Nhắn tin..."
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 99, padding: '5px 10px', fontSize: 12, outline: 'none', background: '#fff' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{ width: 30, height: 30, background: input.trim() ? '#8B1A1A' : '#ddd', border: 'none', borderRadius: '50%', color: '#fff', cursor: input.trim() ? 'pointer' : 'default', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
