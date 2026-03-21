'use client';
import { ChatMessage } from './ChatPopupContext';

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  doiPhuongName: string;
}

export default function MessageItem({ msg, isMe, doiPhuongName }: Props) {
  const time = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (msg.loai === 'system') {
    return (
      <div className="text-center my-2">
        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">{msg.noi_dung}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-1.5 mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-6 h-6 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
          {doiPhuongName[0]?.toUpperCase() || 'U'}
        </div>
      )}
      <div className={`max-w-[75%] group`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
          isMe
            ? 'bg-[#8B1A1A] text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        } ${msg.pending ? 'opacity-60' : ''}`}>
          {msg.noi_dung}
        </div>
        <div className={`text-xs mt-0.5 px-1 ${isMe ? 'text-right text-gray-400' : 'text-gray-400'}`}>
          {msg.pending ? '⏳ Đang gửi...' : time}
        </div>
      </div>
    </div>
  );
}
