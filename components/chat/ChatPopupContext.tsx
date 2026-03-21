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

export interface ChatConversation {
  convId: string;
  gaId: string;
  gaTen: string;
  gaAnh: string;
  doiPhuongId: string;
  doiPhuongName: string;
  messages: ChatMessage[];
  minimized: boolean;
  loading: boolean;
  unread: number;
}

interface ChatContextType {
  conversations: ChatConversation[];
  openChat: (gaId: string, sellerId: string, gaTen?: string, gaAnh?: string) => Promise<void>;
  closeChat: (convId: string) => void;
  minimizeChat: (convId: string, val: boolean) => void;
  sendMessage: (convId: string, text: string) => Promise<void>;
  currentUser: any;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatPopup() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatPopup must be used inside ChatPopupProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function ChatPopupProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const channelsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Subscribe realtime cho 1 conv ───────────────────────────
  const subscribeConv = useCallback((convId: string) => {
    if (channelsRef.current[convId]) return; // đã subscribe
    const channel = supabase
      .channel(`chat-popup-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setConversations(prev => prev.map(c => {
          if (c.convId !== convId) return c;
          // Tránh duplicate
          if (c.messages.find(m => String(m.id) === String(msg.id))) return c;
          // Nếu đang minimized → tăng unread
          return {
            ...c,
            messages: [...c.messages.filter(m => !m.pending || m.noi_dung !== msg.noi_dung), msg],
            unread: c.minimized ? c.unread + 1 : 0,
          };
        }));
      })
      .subscribe();
    channelsRef.current[convId] = channel;
  }, []);

  // ── Unsubscribe ──────────────────────────────────────────────
  const unsubscribeConv = useCallback((convId: string) => {
    if (channelsRef.current[convId]) {
      supabase.removeChannel(channelsRef.current[convId]);
      delete channelsRef.current[convId];
    }
  }, []);

  // ── openChat ─────────────────────────────────────────────────
  const openChat = useCallback(async (
    gaId: string,
    sellerId: string,
    gaTen = 'Con gà',
    gaAnh = '',
  ) => {
    if (!currentUser) { alert('Vui lòng đăng nhập để nhắn tin!'); return; }
    if (currentUser.id === sellerId) { alert('Đây là gà của bạn!'); return; }

    // Giới hạn 3 cửa sổ chat cùng lúc
    if (conversations.length >= 3) {
      setConversations(prev => {
        const oldest = prev[0];
        unsubscribeConv(oldest.convId);
        return prev.slice(1);
      });
    }

    // Check đã mở chưa → reopen
    const existing = conversations.find(c => c.gaId === gaId);
    if (existing) {
      setConversations(prev => prev.map(c =>
        c.convId === existing.convId ? { ...c, minimized: false, unread: 0 } : c
      ));
      return;
    }

    // Check conversation đã tồn tại trong DB
    let convId: string;
    const { data: existConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('ga_id', gaId)
      .eq('buyer_id', currentUser.id)
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (existConv) {
      convId = existConv.id;
    } else {
      // Tạo mới
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ ga_id: gaId, buyer_id: currentUser.id, seller_id: sellerId })
        .select('id')
        .single();
      if (error || !newConv) { console.error('Tạo conversation thất bại:', error); return; }
      convId = newConv.id;
    }

    // Lấy tên đối phương
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', sellerId)
      .maybeSingle();

    // Lấy messages cũ
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, noi_dung, loai, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    const newConvObj: ChatConversation = {
      convId,
      gaId,
      gaTen,
      gaAnh,
      doiPhuongId: sellerId,
      doiPhuongName: sellerProfile?.username || 'Người bán',
      messages: msgs || [],
      minimized: false,
      loading: false,
      unread: 0,
    };

    setConversations(prev => [...prev, newConvObj]);
    subscribeConv(convId);
  }, [currentUser, conversations, subscribeConv, unsubscribeConv]);

  // ── closeChat ────────────────────────────────────────────────
  const closeChat = useCallback((convId: string) => {
    unsubscribeConv(convId);
    setConversations(prev => prev.filter(c => c.convId !== convId));
  }, [unsubscribeConv]);

  // ── minimizeChat ─────────────────────────────────────────────
  const minimizeChat = useCallback((convId: string, val: boolean) => {
    setConversations(prev => prev.map(c =>
      c.convId === convId ? { ...c, minimized: val, unread: val ? c.unread : 0 } : c
    ));
  }, []);

  // ── sendMessage ──────────────────────────────────────────────
  const sendMessage = useCallback(async (convId: string, text: string) => {
    if (!text.trim() || !currentUser) return;

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      sender_id: currentUser.id,
      noi_dung: text,
      loai: 'text',
      created_at: new Date().toISOString(),
      pending: true,
    };
    setConversations(prev => prev.map(c =>
      c.convId === convId ? { ...c, messages: [...c.messages, tempMsg] } : c
    ));

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: currentUser.id,
      noi_dung: text,
      loai: 'text',
    }).select('id, sender_id, noi_dung, loai, created_at').single();

    if (!error && data) {
      // Replace temp với message thật
      setConversations(prev => prev.map(c =>
        c.convId === convId
          ? { ...c, messages: c.messages.map(m => m.id === tempId ? data : m) }
          : c
      ));
    } else {
      // Xóa optimistic nếu lỗi
      setConversations(prev => prev.map(c =>
        c.convId === convId
          ? { ...c, messages: c.messages.filter(m => m.id !== tempId) }
          : c
      ));
    }
  }, [currentUser]);

  return (
    <ChatContext.Provider value={{ conversations, openChat, closeChat, minimizeChat, sendMessage, currentUser }}>
      {children}
    </ChatContext.Provider>
  );
}
