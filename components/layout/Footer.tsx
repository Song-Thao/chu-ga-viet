'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Footer() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    supabase.from('config').select('tk_ten, tk_so, tk_ngan_hang, tk_bin, zalo').single()
      .then(({ data }) => { if (data) setConfig(data); });
  }, []);

  const zalo = config?.zalo || '0917161003';
  const phone = config?.zalo || '0917161003';
  const email = 'khsongthao00@gmail.com';
  const tkTen = config?.tk_ten || '';
  const tkSo = config?.tk_so || '';
  const tkNganHang = config?.tk_ngan_hang || '';
  const tkBin = config?.tk_bin || '';

  return (
    <footer className="bg-[#8B1A1A] text-white mt-10">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">

        {/* Cột 1 — Giới thiệu */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-bold text-yellow-400 mb-2">🐓 Chủ Gà Việt</h3>
          <p className="text-gray-300 text-xs leading-relaxed">
            Nền tảng mua bán và phân tích gà chiến số 1 Việt Nam
          </p>
        </div>

        {/* Cột 2 — Chức năng */}
        <div>
          <h3 className="font-bold mb-3">Chức năng</h3>
          <ul className="space-y-2 text-gray-300">
            <li><Link href="/cho" className="hover:text-white transition">Chợ giao dịch</Link></li>
            <li><Link href="/dang-ga" className="hover:text-white transition">Đăng bán gà</Link></li>
            <li><Link href="/ai-phan-tich" className="hover:text-white transition">AI Phân tích</Link></li>
          </ul>
        </div>

        {/* Cột 3 — Cộng đồng */}
        <div>
          <h3 className="font-bold mb-3">Cộng đồng</h3>
          <ul className="space-y-2 text-gray-300">
            <li><Link href="/cong-dong" className="hover:text-white transition">Feed bài viết</Link></li>
            <li><Link href="/thu-vien" className="hover:text-white transition">Thư viện kiến thức</Link></li>
          </ul>
        </div>

        {/* Cột 4 — Liên hệ + Thanh toán */}
        <div>
          <h3 className="font-bold mb-3">Liên hệ</h3>
          <ul className="space-y-2 text-gray-300 text-xs">
            <li>
              <a href={`tel:${phone}`} className="hover:text-white transition flex items-center gap-1">
                📞 {phone}
              </a>
            </li>
            <li>
              <a href={`https://zalo.me/${zalo}`} target="_blank" className="hover:text-white transition flex items-center gap-1">
                💬 Zalo: {zalo}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className="hover:text-white transition flex items-center gap-1">
                📧 {email}
              </a>
            </li>
          </ul>

          {/* Thanh toán */}
          <h3 className="font-bold mt-4 mb-2">💳 Thanh toán</h3>
          <ul className="space-y-1 text-gray-300 text-xs">
            <li>💵 Tiền mặt</li>
            <li>📱 Chuyển khoản / VietQR</li>
            {tkTen && <li className="text-yellow-300">👤 {tkTen}</li>}
            {tkSo && <li>🔢 {tkSo}</li>}
            {tkNganHang && <li>🏦 {tkNganHang}</li>}
          </ul>

          {/* QR nếu có đủ thông tin */}
          {tkBin && tkSo && (
            <div className="mt-3">
              <img
                src={`https://img.vietqr.io/image/${tkBin}-${tkSo}-compact2.png?accountName=${encodeURIComponent(tkTen)}`}
                alt="VietQR"
                className="w-28 h-28 rounded-lg border border-white/20 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">Quét QR để chuyển khoản</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-red-900 text-center py-4 text-gray-400 text-xs">
        © 2024 Chủ Gà Việt. All rights reserved.
      </div>
    </footer>
  );
}
