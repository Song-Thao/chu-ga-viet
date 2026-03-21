'use client';
import { useChatPopup } from './ChatPopupContext';
import ChatWindow from './ChatWindow';

export default function ChatPopupManager() {
  const { conversations } = useChatPopup();
  if (conversations.length === 0) return null;
  return (
    <>
      {conversations.map((conv, index) => (
        <ChatWindow key={conv.convId} conv={conv} index={index} />
      ))}
    </>
  );
}
