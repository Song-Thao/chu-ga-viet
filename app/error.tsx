'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🐓</div>
        <h2 className="font-black text-xl text-gray-800 mb-2">Có lỗi xảy ra</h2>
        <p className="text-gray-500 text-sm mb-6">Vui lòng thử lại hoặc tải lại trang.</p>
        <button
          onClick={reset}
          className="bg-[#8B1A1A] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#6B0F0F] transition"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
