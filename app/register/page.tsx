'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username },
      },
    });

    if (error) {
      setError(error.message === 'User already registered' ? 'Email này đã được đăng ký' : error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="font-black text-xl text-gray-800 mb-2">Kiểm tra email!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Chúng tôi đã gửi link xác nhận đến <strong>{form.email}</strong>.
            Vui lòng kiểm tra và nhấn vào link để kích hoạt tài khoản.
          </p>
          <Link href="/login"
            className="block bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
            🔑 Đến trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8">

        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐓</div>
          <h1 className="font-black text-2xl text-gray-800">Tạo tài khoản</h1>
          <p className="text-gray-500 text-sm mt-1">Tham gia cộng đồng Chủ Gà Việt</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Tên hiển thị *</label>
            <input required value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              placeholder="VD: Anh Tuấn Gà Chiến"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Email *</label>
            <input required type="email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder="email@example.com"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Mật khẩu *</label>
            <input required type="password" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Xác nhận mật khẩu *</label>
            <input required type="password" value={form.confirm}
              onChange={e => setForm({...form, confirm: e.target.value})}
              placeholder="Nhập lại mật khẩu"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition disabled:opacity-50">
            {loading ? '⏳ Đang tạo tài khoản...' : '🐓 Đăng ký ngay'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-[#8B1A1A] font-bold hover:underline">
            Đăng nhập
          </Link>
        </div>

        <div className="text-center mt-2">
          <Link href="/" className="text-xs text-gray-400 hover:underline">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
