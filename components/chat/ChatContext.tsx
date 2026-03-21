'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string | number;
  sender_id: string;
  noi_dung: string;
  loai: string;
  created_at: string;
  pending?: boolean;
}

export interface OpenChat {
  convId: string;
  type: 'product' | 'user';
  // product chat
  gaId?: string;
  gaTen?: string;
  gaAnh?: string;
  // người kia
  doiPhuongId: string;
  doiPhuongName?: string;
  // state
  messages: ChatMessage[];
  minimized: boolean;
  unread: number;
}

interface ChatContextType {
  openChats: OpenChat[];
  currentUser: any;
  openChat: (params: Omit<OpenChat, 'messages' | 'minimized' | 'unread'>) => Promise<void>;
  closeChat: (convId: string) => void;
  minimizeChat: (convId: string, val: boolean) => void;
  sendMessage: (convId: string, text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be inside ChatProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const channelsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setCurrentUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Subscribe realtime cho 1 conv
  const subscribeConv = useCallback((convId: string) => {
    if (channelsRef.current[convId]) return;
    const ch = supabase.channel(`chat-ctx-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setOpenChats(prev => prev.map(c => {
          if (c.convId !== convId) return c;
          if (c.messages.find(m => String(m.id) === String(msg.id))) return c;
          return {
            ...c,
            messages: [...c.messages.filter(m => !m.pending || m.noi_dung !== msg.noi_dung), msg],
            unread: c.minimized ? c.unread + 1 : 0,
          };
        }));
      }).subscribe();
    channelsRef.current[convId] = ch;
  }, []);

  // Mở chat window
  const openChat = useCallback(async (params: Omit<OpenChat, 'messages' | 'minimized' | 'unread'>) => {
    if (!currentUser) { alert('Vui lòng đăng nhập!'); return; }

    // Nếu đã mở → unminimize
    const existing = openChats.find(c => c.convId === params.convId);
    if (existing) {
      setOpenChats(prev => prev.map(c =>
        c.convId === params.convId ? { ...c, minimized: false, unread: 0 } : c
      ));
      return;
    }

    // Max 3 cửa sổ
    if (openChats.length >= 3) {
      const oldest = openChats[0];
      if (channelsRef.current[oldest.convId]) {
        supabase.removeChannel(channelsRef.current[oldest.convId]);
        delete channelsRef.current[oldest.convId];
      }
      setOpenChats(prev => prev.slice(1));
    }

    // Lấy tên đối phương nếu chưa có
    let doiPhuongName = params.doiPhuongName;
    if (!doiPhuongName) {
      const { data: dp } = await supabase
        .from('profiles').select('username').eq('id', params.doiPhuongId).maybeSingle();
      doiPhuongName = dp?.username || 'Người dùng';
    }

    // Lấy messages cũ
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, noi_dung, loai, created_at')
      .eq('conversation_id', params.convId)
      .order('created_at', { ascending: true });

    setOpenChats(prev => [...prev, {
      ...params,
      doiPhuongName,
      messages: msgs || [],
      minimized: false,
      unread: 0,
    }]);

    subscribeConv(params.convId);
  }, [currentUser, openChats, subscribeConv]);

  // Đóng
  const closeChat = useCallback((convId: string) => {
    if (channelsRef.current[convId]) {
      supabase.removeChannel(channelsRef.current[convId]);
      delete channelsRef.current[convId];
    }
    setOpenChats(prev => prev.filter(c => c.convId !== convId));
  }, []);

  // Minimize
  const minimizeChat = useCallback((convId: string, val: boolean) => {
    setOpenChats(prev => prev.map(c =>
      c.convId === convId ? { ...c, minimized: val, unread: val ? c.unread : 0 } : c
    ));
  }, []);

  // Gửi tin
  const sendMessage = useCallback(async (convId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    const tempId = `temp-${Date.now()}`;
    const temp: ChatMessage = {
      id: tempId, sender_id: currentUser.id,
      noi_dung: text, loai: 'text',
      created_at: new Date().toISOString(), pending: true,
    };
    setOpenChats(prev => prev.map(c =>
      c.convId === convId ? { ...c, messages: [...c.messages, temp] } : c
    ));
    const { data } = await supabase.from('messages')
      .insert({ conversation_id: convId, sender_id: currentUser.id, noi_dung: text, loai: 'text' })
      .select('id, sender_id, noi_dung, loai, created_at').single();
    if (data) {
      setOpenChats(prev => prev.map(c =>
        c.convId === convId
          ? { ...c, messages: c.messages.map(m => m.id === tempId ? data : m) }
          : c
      ));
    } else {
      setOpenChats(prev => prev.map(c =>
        c.convId === convId
          ? { ...c, messages: c.messages.filter(m => m.id !== tempId) }
          : c
      ));
    }
  }, [currentUser]);

  return (
    <ChatContext.Provider value={{ openChats, currentUser, openChat, closeChat, minimizeChat, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}
