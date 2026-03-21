'use client';
import { useChat } from './ChatContext';
import ChatWindow from './ChatWindow';

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
