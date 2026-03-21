'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const DANH_MUC = [
  { key: 'tat-ca', label: 'Tất cả', icon: '📋' },
  { key: 'vay-chan', label: 'Vảy chân gà', icon: '🦶' },
  { key: 'dang-tuong', label: 'Dáng gà – Tướng gà', icon: '🐓' },
  { key: 'loi-da', label: 'Lối đá', icon: '⚔️' },
  { key: 'nuoi-om', label: 'Nuôi & Om bóp', icon: '🌿' },
  { key: 'benh-ga', label: 'Bệnh gà', icon: '💊' },
  { key: 'thuc-chien', label: 'Kinh nghiệm thực chiến', icon: '🔥' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'most_viewed', label: 'Xem nhiều' },
  { key: 'most_liked', label: 'Vảy chân gà' },
  { key: 'most_commented', label: 'Kinh nghiệm' },
  { key: 'loi-da', label: 'Lối đá gà' },
];

// Ảnh gà thật từ Unsplash làm fallback theo danh mục
const FALLBACK_IMAGES: Record<string, string> = {
  'vay-chan': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
  'dang-tuong': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
  'loi-da': 'https://images.unsplash.com/photo-1559715541-5daf0feaf9b9?w=600&q=80',
  'nuoi-om': 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=600&q=80',
  'benh-ga': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
  'thuc-chien': 'https://images.unsplash.com/photo-1559715541-5daf0feaf9b9?w=600&q=80',
  default: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
};

// Data mẫu phong phú khi chưa có đủ bài trong DB
const SAMPLE_POSTS = [
  {
    id: 's1', tieu_de: '92 loại vảy – cách xem chân gà chuẩn từ sư kê',
    noi_dung: 'Hướng dẫn xem vảy gà chọi từ cơ bản đến chuẩn sư kê. Phân loại 92 loại vảy quý hiếm.',
    category: 'vay-chan', image_url: FALLBACK_IMAGES['vay-chan'],
    like_count: 922, comment_count: 93, view_count: 1400,
    badge: 'hot', created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    profiles: { username: 'Sư kê lâu năm', avatar_url: 'https://i.pravatar.cc/36?img=3' },
  },
  {
    id: 's2', tieu_de: 'Kỹ thuật nuôi gà chọi khỏe mạnh – bộ bí quyết đầy đủ',
    noi_dung: 'Khá lướng then về cách chăm sóc gà chiến. Thực đơn tối ưu trước và sau trận đấu.',
    category: 'nuoi-om', image_url: FALLBACK_IMAGES['nuoi-om'],
    like_count: 98, comment_count: 31, view_count: 1200,
    badge: 'expert', created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    profiles: { username: 'Sư kê lâu năm', avatar_url: 'https://i.pravatar.cc/36?img=5' },
  },
  {
    id: 's3', tieu_de: 'Vảy đá sát – quý tướng ăn liền Tây',
    noi_dung: 'Gue vồ rhe liàn gáp, môi soắc. Nhận biết vảy đá sát chuẩn miền Tây.',
    category: 'vay-chan', image_url: FALLBACK_IMAGES['vay-chan'],
    like_count: 1900, comment_count: 67, view_count: 1300,
    badge: null, created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    profiles: { username: 'Cao Thủ Miền Tây', avatar_url: 'https://i.pravatar.cc/36?img=7' },
  },
  {
    id: 's4', tieu_de: 'Chế độ dinh dưỡng cho gà chiến – chuẩn khoa học',
    noi_dung: 'Thực đơn tối ưu cho gà chiến theo từng giai đoạn: chuẩn bị, thi đấu, phục hồi.',
    category: 'nuoi-om', image_url: FALLBACK_IMAGES['nuoi-om'],
    like_count: 98, comment_count: 22, view_count: 1100,
    badge: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    profiles: { username: 'Chủ Gà Việt', avatar_url: 'https://i.pravatar.cc/36?img=9' },
  },
  {
    id: 's5', tieu_de: 'Lối đá gà cựa đòn miền Tây – kinh nghiệm 20 năm',
    noi_dung: 'Tổng hợp các lối đá gà đặc trưng miền Tây từ kinh nghiệm thực chiến nhiều năm.',
    category: 'loi-da', image_url: FALLBACK_IMAGES['loi-da'],
    like_count: 3100, comment_count: 145, view_count: 3100,
    badge: 'hot', created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    profiles: { username: 'Lão Hùng', avatar_url: 'https://i.pravatar.cc/36?img=11' },
  },
  {
    id: 's6', tieu_de: 'Cách nhận biết Án Thiên, Phủ Địa – vảy quý số 1',
    noi_dung: 'Toa lối đá kiêm hức thật dinh phải biết. Những loại vảy thiêng và bí ẩn nhất.',
    category: 'vay-chan', image_url: FALLBACK_IMAGES['vay-chan'],
    like_count: 3100, comment_count: 88, view_count: 3100,
    badge: 'ai', created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    profiles: { username: 'AI Sư Kê', avatar_url: 'https://i.pravatar.cc/36?img=13' },
  },
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

// ── Badge component ───────────────────────────────────────────
function Badge({ type }: { type: string | null }) {
  if (!type) return null;
  const map: Record<string, { label: string; cls: string }> = {
    hot: { label: '🔥 Bài hot', cls: 'bg-orange-500 text-white' },
    expert: { label: '👑 Sư kê chia sẻ', cls: 'bg-yellow-500 text-white' },
    ai: { label: '🤖 AI tổng hợp', cls: 'bg-blue-500 text-white' },
  };
  const b = map[type];
  if (!b) return null;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>;
}

// ── Post Card ─────────────────────────────────────────────────
function PostCard({ post, large = false }: { post: any; large?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const img = post.image_url || FALLBACK_IMAGES[post.category as string] || FALLBACK_IMAGES.default;
  const name = post.profiles?.username || post.profiles?.full_name || 'Người dùng';
  const avatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B0000&color=fff`;
  const cat = DANH_MUC.find(d => d.key === post.category);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    setLiked(l => !l);
    setLikeCount((c: number) => c + (liked ? -1 : 1));
  };

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group cursor-pointer ${large ? '' : ''}`}>
      {/* Ảnh */}
      <div className="relative overflow-hidden" style={{ height: large ? 220 : 160 }}>
        <img src={img} alt={post.tieu_de || post.noi_dung}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES.default; }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Category tag */}
        {cat && (
          <span className="absolute top-3 left-3 bg-white/90 text-[#8B1A1A] text-xs font-bold px-2 py-1 rounded-full">
            {cat.icon} {cat.label}
          </span>
        )}
        {/* Badge */}
        {post.badge && (
          <span className="absolute top-3 right-3">
            <Badge type={post.badge} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-black text-gray-900 leading-tight mb-2 group-hover:text-[#8B1A1A] transition-colors ${large ? 'text-lg' : 'text-sm'}`}>
          {post.tieu_de || (post.noi_dung?.slice(0, 80))}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-2 mb-3">
          {post.noi_dung?.slice(0, 100)}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">👁 {formatNum(post.view_count ?? 0)}</span>
            <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500 font-bold' : 'hover:text-red-400'}`}>
              {liked ? '❤️' : '🤍'} {formatNum(likeCount)}
            </button>
            <span className="flex items-center gap-1">💬 {formatNum(post.comment_count ?? 0)}</span>
          </div>
          <button className="bg-[#8B1A1A] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#6B0F0F] transition flex items-center gap-1">
            Đọc ngay <span>→</span>
          </button>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover" />
          <span className="text-xs text-gray-500 font-medium">{name}</span>
          <span className="text-xs text-gray-400 ml-auto">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────
function SkeletonCard({ large = false }: { large?: boolean }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className={`bg-gray-200 ${large ? 'h-52' : 'h-40'}`} />
      <div className="p-4 space-y-3">
        <div className="bg-gray-200 h-4 rounded w-3/4" />
        <div className="bg-gray-200 h-3 rounded w-full" />
        <div className="bg-gray-200 h-3 rounded w-2/3" />
        <div className="flex justify-between mt-2">
          <div className="bg-gray-200 h-3 rounded w-1/3" />
          <div className="bg-gray-200 h-6 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

// ── AI Chat Box ───────────────────────────────────────────────
function AIChatBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK = ['Vảy Án Thiên là gì?', 'Gà bị đá chân điều trị sao?', 'Cách nhận biết gà hay?'];

  const ask = async (q: string) => {
    const query = q || question.trim();
    if (!query) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      setAnswer(data.reply || data.message || 'Không có phản hồi.');
    } catch {
      setAnswer('Lỗi kết nối AI. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🐓</span>
        <div>
          <div className="font-black text-sm text-gray-800">Hỏi Đáp Với Sư Kê AI</div>
          <div className="text-xs text-gray-500">Kỏi gì tổng, đảm trả lời việt:</div>
        </div>
      </div>

      {/* Quick questions */}
      <div className="flex flex-col gap-1 mb-3">
        {QUICK.map(q => (
          <button key={q} onClick={() => { setQuestion(q); ask(q); }}
            className="text-left text-xs bg-white border border-yellow-200 rounded-lg px-3 py-1.5 hover:bg-yellow-50 hover:border-yellow-400 transition text-gray-700 font-medium">
            💬 {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Hỏi gì đó về gà chọi..."
          className="flex-1 border border-yellow-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
        />
        <button onClick={() => ask(question)} disabled={loading}
          className="bg-[#8B1A1A] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#6B0F0F] transition disabled:opacity-50">
          {loading ? '⏳' : '→'}
        </button>
      </div>

      {/* Answer */}
      {(loading || answer) && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-yellow-100 text-xs text-gray-700 leading-relaxed">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-3 h-3 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
              Đang suy nghĩ...
            </div>
          ) : answer}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ThuVienPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [topMembers, setTopMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [danhMuc, setDanhMuc] = useState('tat-ca');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Lấy bài viết từ posts — filter category = thư viện hoặc lấy tất cả
      const { data: postData } = await supabase
        .from('posts')
        .select('id, noi_dung, tieu_de, image_url, like_count, likes, comment_count, view_count, category, badge, created_at, profiles(username, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      // Nếu có data thật thì dùng, không thì dùng sample
      if (postData && postData.length > 0) {
        setPosts(postData);
      } else {
        setPosts(SAMPLE_POSTS);
      }

      // Top members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, trust_score')
        .order('trust_score', { ascending: false })
        .limit(5);
      if (members && members.length > 0) setTopMembers(members);
    } catch (err) {
      setPosts(SAMPLE_POSTS);
    } finally {
      setLoading(false);
    }
  }

  // Filter + sort
  const filtered = posts.filter(p => {
    const matchCat = danhMuc === 'tat-ca' || p.category === danhMuc;
    const text = ((p.tieu_de || '') + ' ' + (p.noi_dung || '')).toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'most_viewed') return (b.view_count ?? 0) - (a.view_count ?? 0);
    if (sortBy === 'most_liked') return ((b.like_count ?? b.likes ?? 0)) - ((a.like_count ?? a.likes ?? 0));
    if (sortBy === 'most_commented') return (b.comment_count ?? 0) - (a.comment_count ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);
  const hotPosts = [...posts].sort((a, b) => ((b.like_count ?? 0) - (a.like_count ?? 0))).slice(0, 4);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#8B1A1A] via-red-800 to-red-700 text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="relative">
            <h1 className="font-black text-2xl md:text-3xl mb-1">📚 Thư Viện Kiến Thức</h1>
            <p className="text-red-200 text-sm">Nơi chia sẻ kiến thức gà chọi từ cộng đồng & chuyên gia</p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">{posts.length}+ bài viết</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">6 chủ đề</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Cập nhật hàng ngày</span>
            </div>
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm thêm tiêu đề, loại vảy, lối đá..."
              className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'newest', label: 'Mới nhất' },
              { key: 'most_viewed', label: 'Xem nhiều' },
              { key: 'most_liked', label: 'Vảy chân gà' },
              { key: 'most_commented', label: 'Kinh nghiệm' },
              { key: 'loi-da', label: 'Lối đá gà' },
            ].map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition whitespace-nowrap ${sortBy === s.key ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-5">

          {/* ── CỘT TRÁI — Menu danh mục ── */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-black text-sm text-gray-700">📂 Danh mục</span>
              </div>
              {DANH_MUC.map(dm => (
                <button key={dm.key} onClick={() => setDanhMuc(dm.key)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm transition border-l-4 ${danhMuc === dm.key ? 'bg-red-50 border-[#8B1A1A] text-[#8B1A1A] font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 font-medium'}`}>
                  <span className="text-base">{dm.icon}</span>
                  <span>{dm.label}</span>
                  {danhMuc === dm.key && <span className="ml-auto text-[#8B1A1A] text-xs">✓</span>}
                </button>
              ))}
            </div>

            {/* Đăng bài CTA */}
            <div className="mt-4 bg-gradient-to-br from-[#8B1A1A] to-red-700 rounded-xl p-4 text-white text-center">
              <div className="text-2xl mb-2">✍️</div>
              <div className="font-black text-sm mb-1">Chia sẻ kiến thức</div>
              <div className="text-red-200 text-xs mb-3">Bài của bạn giúp ích cộng đồng</div>
              <Link href="/cong-dong">
                <button className="bg-white text-[#8B1A1A] text-xs font-black px-4 py-2 rounded-full hover:bg-yellow-50 transition w-full">
                  Đăng bài ngay →
                </button>
              </Link>
            </div>
          </aside>

          {/* ── CỘT GIỮA — Feed bài viết ── */}
          <main>
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <SkeletonCard large />
                  <SkeletonCard large />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
                </div>
              </>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl p-16 text-center">
                <div className="text-5xl mb-3">📚</div>
                <div className="font-bold text-gray-600 mb-1">Không tìm thấy bài viết</div>
                <div className="text-sm text-gray-400">Thử tìm kiếm với từ khóa khác</div>
              </div>
            ) : (
              <>
                {/* 2 bài featured lớn */}
                {featured.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {featured.map(p => <PostCard key={p.id} post={p} large />)}
                  </div>
                )}

                {/* Các bài còn lại */}
                {rest.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rest.map(p => <PostCard key={p.id} post={p} />)}
                  </div>
                )}

                {/* Load more */}
                {filtered.length >= 10 && (
                  <div className="text-center mt-6">
                    <button className="bg-white border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold px-8 py-2.5 rounded-full hover:bg-red-50 transition text-sm">
                      Xem thêm bài viết →
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* ── CỘT PHẢI — Sidebar ── */}
          <aside className="lg:sticky lg:top-20 h-fit space-y-4">

            {/* Top thành viên */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-black text-sm text-gray-700">⭐ Top Thành Viên</span>
                <span className="text-xs text-[#8B1A1A] font-semibold cursor-pointer hover:underline">Xem tất cả →</span>
              </div>
              <div className="p-3 space-y-2">
                {(topMembers.length > 0 ? topMembers : [
                  { id: '1', username: 'Cao Thủ', trust_score: 72, avatar_url: 'https://i.pravatar.cc/36?img=3' },
                  { id: '2', username: 'Sư kê lâu năm', trust_score: 58, avatar_url: 'https://i.pravatar.cc/36?img=5' },
                  { id: '3', username: 'Sư kê mới', trust_score: 39, avatar_url: 'https://i.pravatar.cc/36?img=7' },
                ]).map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                    <div className="relative">
                      <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${m.username}&background=8B0000&color=fff`}
                        alt={m.username} className="w-9 h-9 rounded-full object-cover" />
                      {i === 0 && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate">{m.username || 'Người dùng'}</div>
                      <div className="text-xs text-gray-400">{formatNum((m.trust_score ?? 0) * 39)} Viếng</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-gray-700">{m.trust_score ?? 5}</div>
                      <div className="text-yellow-500 text-xs">⭐⭐⭐</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hỏi Sư Kê AI */}
            <AIChatBox />

            {/* Bài nổi bật */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-black text-sm text-gray-700">🔥 Bài Nổi Bật</span>
                <span className="text-xs text-[#8B1A1A] font-semibold cursor-pointer hover:underline">Xem thêm →</span>
              </div>
              <div className="p-3 space-y-3">
                {hotPosts.map(p => {
                  const img = p.image_url || FALLBACK_IMAGES[p.category as string] || FALLBACK_IMAGES.default;
                  return (
                    <div key={p.id} className="flex gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition">
                      <img src={img} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES.default; }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">
                          {p.tieu_de || p.noi_dung?.slice(0, 60)}
                        </div>
                        <div className="flex gap-2 mt-1 text-xs text-gray-400">
                          <span>👁 {formatNum(p.view_count ?? 0)}</span>
                          <span>❤️ {formatNum(p.like_count ?? p.likes ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Liên hệ */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="font-black text-sm text-gray-700 mb-3">📞 Liên hệ</div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <a href="mailto:khsongthao00@gmail.com" className="hover:text-[#8B1A1A] transition truncate">
                    khsongthao00@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <a href="https://zalo.me/0917161003" target="_blank" className="hover:text-[#8B1A1A] transition">
                    Zalo: 0917161003
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href="tel:0917161003" className="hover:text-[#8B1A1A] transition">0917161003</a>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
