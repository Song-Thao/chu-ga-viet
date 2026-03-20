'use client';
import { useState } from 'react';

const BaiViet = [
  {
    id: 1, user: 'Anh Tuấn', time: '2 giờ trước',
    noi_dung: 'Gà chọi đẹp quá anh em ơi! Con này mắt lửa, chân vuông chuẩn không?',
    anh: true, likes: 5, comments: 3,
  },
  {
    id: 2, user: 'Bác Hùng', time: '5 giờ trước',
    noi_dung: 'Gà này chọi hay lắm ôn cò chưa tiếng nống, chọi nhiệt hơn phu tiền mog chia ciy nọt ong đường.',
    anh: true, likes: 12, comments: 7,
  },
  {
    id: 3, user: 'Chú Minh', time: '1 ngày trước',
    noi_dung: 'Hỏi anh em: Gà tre 6 tháng tuổi nên cho ăn gì để tăng sức chiến?',
    anh: false, likes: 8, comments: 15,
  },
];

const MauNen = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900'];

export default function CongDongPage() {
  const [posts, setPosts] = useState(BaiViet);
  const [newPost, setNewPost] = useState('');
  const [liked, setLiked] = useState<number[]>([]);

  const handlePost = () => {
    if (!newPost.trim()) return;
    setPosts([{
      id: Date.now(), user: 'Bạn', time: 'Vừa xong',
      noi_dung: newPost, anh: false, likes: 0, comments: 0,
    }, ...posts]);
    setNewPost('');
  };

  const toggleLike = (id: number) => {
    setLiked(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="grid md:grid-cols-3 gap-4">

        {/* MAIN FEED */}
        <div className="md:col-span-2 space-y-4">

          {/* HEADER */}
          <div className="bg-[#8B1A1A] text-white rounded-xl p-4">
            <h1 className="font-black text-lg">🐓 Cộng Đồng Chủ Gà Việt</h1>
            <p className="text-red-200 text-sm mt-1">Anh em nhận ảnh giúp con này</p>
          </div>

          {/* ĐĂNG BÀI */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">B</div>
              <input value={newPost} onChange={e => setNewPost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePost()}
                placeholder="Hỏi về gà, chia sẻ kinh nghiệm..."
                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <button className="text-gray-500 text-sm hover:text-red-700 transition">📷 Ảnh</button>
                <button className="text-gray-500 text-sm hover:text-red-700 transition">🎬 Video</button>
                <button className="text-gray-500 text-sm hover:text-red-700 transition">🤖 AI phân tích</button>
              </div>
              <button onClick={handlePost}
                className="bg-[#8B1A1A] text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
                Đăng
              </button>
            </div>
          </div>

          {/* DANH SÁCH BÀI */}
          {posts.map((post, idx) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="w-10 h-10 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {post.user[0]}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-800">{post.user}</div>
                  <div className="text-xs text-gray-400">{post.time}</div>
                </div>
                <button className="ml-auto text-gray-400 hover:text-gray-600">•••</button>
              </div>

              {/* Nội dung */}
              <p className="px-4 pb-3 text-sm text-gray-700">{post.noi_dung}</p>

              {/* Ảnh */}
              {post.anh && (
                <div className={`${MauNen[idx % MauNen.length]} h-48 flex items-center justify-center text-6xl`}>
                  🐓
                </div>
              )}

              {/* Caption */}
              {post.anh && (
                <p className="px-4 py-2 text-sm text-gray-600 font-medium">{post.noi_dung.slice(0, 30)}...</p>
              )}

              {/* Reactions */}
              <div className="px-4 py-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>👍😄</span>
                  <span>{post.likes + (liked.includes(post.id) ? 1 : 0)}</span>
                </div>
                <span className="text-sm text-gray-500">{post.comments} bình luận</span>
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 flex gap-4 border-t pt-2">
                <button onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition ${liked.includes(post.id) ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
                  👍 Thích
                </button>
                <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-green-600 transition">
                  💬 Bình luận
                </button>
                <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition">
                  ↗ Chia sẻ
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">

          {/* BÀI VIẾT NỔI BẬT */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">📌 Bài viết nổi bật</h3>
            {['Cách xem tướng gà chuẩn', 'Kinh nghiệm nuôi gà chiến', 'Top 5 dòng gà mạnh nhất'].map((title, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="w-8 h-8 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm text-gray-700 hover:text-red-800 cursor-pointer">{title}</span>
              </div>
            ))}
          </div>

          {/* THÀNH VIÊN NỔI BẬT */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">👑 Thành viên nổi bật</h3>
            {['Anh Tuấn', 'Bác Hùng', 'Chú Minh'].map((ten, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {ten[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{ten}</div>
                  <div className="text-xs text-gray-400">⭐ {4.5 + i * 0.1} • {20 + i * 5} bài</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
