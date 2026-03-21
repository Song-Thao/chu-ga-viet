'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChatConversation, useChatPopup } from './ChatPopupContext';
import MessageItem from './MessageItem';

interface Props {
  conv: ChatConversation;
  index: number; // vị trí từ phải sang (0, 1, 2)
}

export default function ChatWindow({ conv, index }: Props) {
  const { closeChat, minimizeChat, sendMessage, currentUser } = useChatPopup();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll khi có message mới
  useEffect(() => {
    if (!conv.minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conv.messages, conv.minimized]);

  // Focus input khi mở
  useEffect(() => {
    if (!conv.minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [conv.minimized]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(conv.convId, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Vị trí từ phải sang: index 0 = rightmost
  const rightOffset = 16 + index * 320 + index * 8;

  return (
    <>
      {/* ── DESKTOP POPUP ── */}
      <div
        className="hidden md:flex flex-col bg-white rounded-t-xl shadow-2xl border border-gray-200 fixed bottom-0 z-50"
        style={{ width: 300, right: rightOffset }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 bg-[#8B1A1A] rounded-t-xl cursor-pointer select-none"
          onClick={() => minimizeChat(conv.convId, !conv.minimized)}
        >
          {conv.gaAnh ? (
            <img src={conv.gaAnh} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-red-700 rounded-lg flex items-center justify-center text-base flex-shrink-0">🐓</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-xs truncate">{conv.gaTen}</div>
            <div className="text-red-200 text-xs truncate">{conv.doiPhuongName}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {conv.unread > 0 && (
              <span className="bg-yellow-400 text-black text-xs font-black w-4 h-4 rounded-full flex items-center justify-center">
                {conv.unread > 9 ? '9+' : conv.unread}
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); minimizeChat(conv.convId, !conv.minimized); }}
              className="text-white/80 hover:text-white text-sm w-5 h-5 flex items-center justify-center"
              title={conv.minimized ? 'Mở rộng' : 'Thu nhỏ'}
            >
              {conv.minimized ? '▲' : '▼'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); closeChat(conv.convId); }}
              className="text-white/80 hover:text-white text-sm w-5 h-5 flex items-center justify-center"
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body — ẩn khi minimized */}
        {!conv.minimized && (
          <>
            {/* Link xem gà */}
            <div className="px-3 py-1.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Hỏi mua con gà này</span>
              <Link href={`/ga/${conv.gaId}`}
                className="text-xs text-[#8B1A1A] font-semibold hover:underline">
                Xem gà →
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0" style={{ height: 280 }}>
              {conv.messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">👋</div>
                  <div className="text-xs text-gray-400 mb-3">Bắt đầu trò chuyện về con gà này!</div>
                  <div className="flex flex-col gap-1.5">
                    {['Gà còn không bạn?', 'Giá có thể bớt không?', 'Cho xem thêm ảnh được không?'].map(q => (
                      <button key={q} onClick={() => sendMessage(conv.convId, q)}
                        className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full hover:bg-gray-100 transition text-left">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {conv.messages.map(msg => (
                <MessageItem
                  key={String(msg.id)}
                  msg={msg}
                  isMe={msg.sender_id === currentUser?.id}
                  doiPhuongName={conv.doiPhuongName}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-2 flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhắn tin..."
                className="flex-1 border border-gray-200 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-8 h-8 bg-[#8B1A1A] text-white rounded-full flex items-center justify-center hover:bg-[#6B0F0F] transition disabled:opacity-40 flex-shrink-0 text-sm"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── MOBILE FULLSCREEN ── */}
      {!conv.minimized && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header mobile */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#8B1A1A] flex-shrink-0">
            <button onClick={() => minimizeChat(conv.convId, true)} className="text-white text-lg">←</button>
            {conv.gaAnh ? (
              <img src={conv.gaAnh} alt="" className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center text-lg">🐓</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{conv.gaTen}</div>
              <div className="text-red-200 text-xs">{conv.doiPhuongName}</div>
            </div>
            <Link href={`/ga/${conv.gaId}`} className="text-red-200 text-xs hover:text-white">Xem gà</Link>
            <button onClick={() => closeChat(conv.convId)} className="text-white/80 hover:text-white ml-1">✕</button>
          </div>

          {/* Messages mobile */}
          <div className="flex-1 overflow-y-auto p-4">
            {conv.messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👋</div>
                <div className="text-sm text-gray-400 mb-4">Bắt đầu trò chuyện!</div>
                <div className="flex flex-col gap-2 items-center">
                  {['Gà còn không bạn?', 'Giá có thể bớt không?', 'Cho xem thêm ảnh được không?'].map(q => (
                    <button key={q} onClick={() => sendMessage(conv.convId, q)}
                      className="bg-gray-50 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-full hover:bg-gray-100 transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {conv.messages.map(msg => (
              <MessageItem
                key={String(msg.id)}
                msg={msg}
                isMe={msg.sender_id === currentUser?.id}
                doiPhuongName={conv.doiPhuongName}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input mobile */}
          <div className="border-t border-gray-100 p-3 flex gap-2 items-center flex-shrink-0 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin..."
              className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#8B1A1A] text-white rounded-full flex items-center justify-center hover:bg-[#6B0F0F] transition disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Mobile minimized — hiện floating button */}
      {conv.minimized && (
        <div
          className="md:hidden fixed bottom-20 right-4 z-50"
          style={{ bottom: 80 + index * 60 }}
        >
          <button
            onClick={() => minimizeChat(conv.convId, false)}
            className="w-14 h-14 bg-[#8B1A1A] rounded-full shadow-xl flex items-center justify-center relative"
          >
            <span className="text-2xl">💬</span>
            {conv.unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                {conv.unread > 9 ? '9+' : conv.unread}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
