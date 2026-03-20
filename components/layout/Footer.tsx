export default function Footer() {
  return (
    <footer className="bg-[#8B1A1A] text-white mt-10">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <h3 className="font-bold text-yellow-400 mb-3">🐓 Chủ Gà Việt</h3>
          <p className="text-gray-300">Nền tảng mua bán và phân tích gà chiến số 1 Việt Nam</p>
        </div>
        <div>
          <h3 className="font-bold mb-3">Chức năng</h3>
          <ul className="space-y-2 text-gray-300">
            <li><a href="/cho" className="hover:text-white">Chợ giao dịch</a></li>
            <li><a href="/dang-ga" className="hover:text-white">Đăng bán gà</a></li>
            <li><a href="/ai-phan-tich" className="hover:text-white">AI Phân tích</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-3">Cộng đồng</h3>
          <ul className="space-y-2 text-gray-300">
            <li><a href="/cong-dong" className="hover:text-white">Feed bài viết</a></li>
            <li><a href="/thu-vien" className="hover:text-white">Thư viện kiến thức</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-3">Liên hệ</h3>
          <ul className="space-y-2 text-gray-300">
            <li>📞 0909 xxx xxx</li>
            <li>📧 info@chugaviet.vn</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-red-900 text-center py-4 text-gray-400 text-xs">
        © 2024 Chủ Gà Việt. All rights reserved.
      </div>
    </footer>
  );
}
