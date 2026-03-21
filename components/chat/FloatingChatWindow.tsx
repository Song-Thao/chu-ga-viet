'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string | number;
  sender_id: string;
  noi_dung: string;
  loai: string;
  created_at: string;
  pending?: boolean;
}

interface ChatWindow {
  convId: string;
  gaId: string;
  gaTen: string;
  gaAnh: string;
  doiPhuongName: string;
  messages: Message[];
  minimized: boolean;
  unread: number;
  // vị trí
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function FloatingChatManager() {
  const [windows, setWindows] = useState<ChatWindow[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const channelsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user ?? null));
  }, []);

  // Lắng nghe event từ Header
  useEffect(() => {
    async function handleOpenChat(e: Event) {
      const { convId, gaId, gaTen, gaAnh, doiPhuongId } = (e as CustomEvent).detail;
      await openChatWindow(convId, gaId, gaTen, gaAnh, doiPhuongId);
    }
    window.addEventListener('cgv-open-chat', handleOpenChat);
    return () => window.removeEventListener('cgv-open-chat', handleOpenChat);
  }, [currentUser, windows]);

  const openChatWindow = useCallback(async (
    convId: string,
    gaId: string,
    gaTen: string,
    gaAnh: string,
    doiPhuongId: string,
  ) => {
    // Nếu đã mở → unminimize
    const existing = windows.find(w => w.convId === convId);
    if (existing) {
      setWindows(prev => prev.map(w =>
        w.convId === convId ? { ...w, minimized: false, unread: 0 } : w
      ));
      return;
    }

    // Lấy tên đối phương
    const { data: dp } = await supabase
      .from('profiles').select('username').eq('id', doiPhuongId).maybeSingle();

    // Lấy messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, noi_dung, loai, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    // Vị trí mặc định — offset theo số cửa sổ đang mở
    const offset = windows.length * 30;
    const newWindow: ChatWindow = {
      convId, gaId, gaTen, gaAnh,
      doiPhuongName: dp?.username || 'Người dùng',
      messages: msgs || [],
      minimized: false,
      unread: 0,
      x: Math.max(20, window.innerWidth - 380 - offset),
      y: Math.max(20, window.innerHeight - 520 - offset),
      width: 340,
      height: 480,
    };

    setWindows(prev => [...prev.slice(-2), newWindow]); // max 3 cửa sổ
    subscribeConv(convId);
  }, [windows, currentUser]);

  function subscribeConv(convId: string) {
    if (channelsRef.current[convId]) return;
    const ch = supabase.channel(`float-chat-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setWindows(prev => prev.map(w => {
          if (w.convId !== convId) return w;
          if (w.messages.find(m => String(m.id) === String(msg.id))) return w;
          return {
            ...w,
            messages: [...w.messages.filter(m => !m.pending), msg],
            unread: w.minimized ? w.unread + 1 : 0,
          };
        }));
      }).subscribe();
    channelsRef.current[convId] = ch;
  }

  function closeWindow(convId: string) {
    if (channelsRef.current[convId]) {
      supabase.removeChannel(channelsRef.current[convId]);
      delete channelsRef.current[convId];
    }
    setWindows(prev => prev.filter(w => w.convId !== convId));
  }

  function toggleMinimize(convId: string) {
    setWindows(prev => prev.map(w =>
      w.convId === convId ? { ...w, minimized: !w.minimized, unread: 0 } : w
    ));
  }

  async function sendMessage(convId: string, text: string) {
    if (!text.trim() || !currentUser) return;
    const tempId = `temp-${Date.now()}`;
    const temp: Message = {
      id: tempId, sender_id: currentUser.id,
      noi_dung: text, loai: 'text',
      created_at: new Date().toISOString(), pending: true,
    };
    setWindows(prev => prev.map(w =>
      w.convId === convId ? { ...w, messages: [...w.messages, temp] } : w
    ));
    const { data } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: currentUser.id,
      noi_dung: text, loai: 'text',
    }).select('id, sender_id, noi_dung, loai, created_at').single();
    if (data) {
      setWindows(prev => prev.map(w =>
        w.convId === convId
          ? { ...w, messages: w.messages.map(m => m.id === tempId ? data : m) }
          : w
      ));
    }
  }

  function updatePos(convId: string, x: number, y: number) {
    setWindows(prev => prev.map(w => w.convId === convId ? { ...w, x, y } : w));
  }

  if (windows.length === 0) return null;

  return (
    <>
      {windows.map(w => (
        <FloatingWindow
          key={w.convId}
          win={w}
          currentUser={currentUser}
          onClose={() => closeWindow(w.convId)}
          onToggleMinimize={() => toggleMinimize(w.convId)}
          onSend={(text) => sendMessage(w.convId, text)}
          onMove={(x, y) => updatePos(w.convId, x, y)}
        />
      ))}
    </>
  );
}

// ── Single Floating Window ────────────────────────────────────
function FloatingWindow({ win, currentUser, onClose, onToggleMinimize, onSend, onMove }: {
  win: ChatWindow;
  currentUser: any;
  onClose: () => void;
  onToggleMinimize: () => void;
  onSend: (text: string) => void;
  onMove: (x: number, y: number) => void;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (!win.minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [win.messages, win.minimized]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - win.x,
      y: e.clientY - win.y,
    };
    e.preventDefault();
  }, [win.x, win.y]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth - win.width, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
      onMove(newX, newY);
    }
    function handleMouseUp() {
      isDragging.current = false;
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [win.width, onMove]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: win.x,
        top: win.y,
        width: win.width,
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.1)',
        userSelect: 'none',
      }}
    >
      {/* Header — kéo ở đây */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          background: '#8B1A1A',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'move',
        }}
      >
        {win.gaAnh ? (
          <img src={win.gaAnh} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, background: '#6B0F0F', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🐓</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{win.gaTen}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{win.doiPhuongName}</div>
        </div>
        {/* Badges unread */}
        {win.unread > 0 && (
          <span style={{ background: '#FFD700', color: '#000', fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 99 }}>
            {win.unread}
          </span>
        )}
        {/* Buttons */}
        <button onClick={onToggleMinimize}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={win.minimized ? 'Mở rộng' : 'Thu nhỏ'}
        >
          {win.minimized ? '▲' : '▼'}
        </button>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {!win.minimized && (
        <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', height: win.height - 48 }}>
          {/* Link xem gà */}
          <div style={{ padding: '6px 12px', background: '#fdf0f0', borderBottom: '1px solid #f0d0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888' }}>Hỏi mua con gà này</span>
            <Link href={`/ga/${win.gaId}`} style={{ fontSize: 11, color: '#8B1A1A', fontWeight: 700, textDecoration: 'none' }}>
              Xem gà →
            </Link>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {win.messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 32 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>Bắt đầu trò chuyện!</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['Gà còn không bạn?', 'Giá có thể bớt không?', 'Cho xem thêm ảnh được không?'].map(q => (
                    <button key={q} onClick={() => onSend(q)}
                      style={{ background: '#f5f5f5', border: '1px solid #eee', borderRadius: 99, padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: '#555', textAlign: 'left' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {win.messages.map(msg => {
              const isMe = msg.sender_id === currentUser?.id;
              if (msg.loai === 'system') return (
                <div key={String(msg.id)} style={{ textAlign: 'center', margin: '6px 0' }}>
                  <span style={{ background: '#fff3cd', color: '#856404', fontSize: 10, padding: '2px 8px', borderRadius: 99 }}>{msg.noi_dung}</span>
                </div>
              );
              return (
                <div key={String(msg.id)} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6, alignItems: 'flex-end', gap: 4 }}>
                  {!isMe && (
                    <div style={{ width: 22, height: 22, background: '#8B1A1A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, flexShrink: 0 }}>
                      {win.doiPhuongName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '72%',
                    padding: '6px 10px',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isMe ? '#8B1A1A' : '#f0f0f0',
                    color: isMe ? '#fff' : '#333',
                    fontSize: 13,
                    lineHeight: 1.4,
                    opacity: msg.pending ? 0.6 : 1,
                    wordBreak: 'break-word',
                  }}>
                    {msg.noi_dung}
                    <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7, textAlign: 'right' }}>
                      {msg.pending ? '⏳' : new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #eee', padding: '8px 10px', display: 'flex', gap: 6, background: '#fafafa' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Nhắn tin..."
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 99, padding: '6px 12px', fontSize: 13, outline: 'none', background: '#fff' }}
            />
            <button onClick={handleSend} disabled={!input.trim()}
              style={{ width: 32, height: 32, background: input.trim() ? '#8B1A1A' : '#ddd', border: 'none', borderRadius: '50%', color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
