'use client';
import { useChat } from '@/components/chat/ChatContext';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPopupManager() {
  const { openChats } = useChat();
  if (openChats.length === 0) return null;
  return (
    <>
      {openChats.map((chat, index) => (
        <ChatWindow key={chat.convId} chat={chat} index={index} />
      ))}
    </>
  );
}
