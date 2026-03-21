'use client';
import { useState, useEffect } from 'react';
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

// Ảnh gà thật fallback (Unsplash) — dùng khi image_url rỗng
const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
  'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=600&q=80',
  'https://images.unsplash.com/photo-1559715541-5daf0feaf9b9?w=600&q=80',
  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80',
];

function getFallback(id: any): string {
  const n = typeof id === 'number' ? id : parseInt(String(id)) || 0;
  return FALLBACK_IMGS[n % FALLBACK_IMGS.length];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n ?? 0);
}

// Lấy dòng đầu làm tiêu đề, phần còn lại làm mô tả
function parsePost(noi_dung: string) {
  const lines = (noi_dung || '').trim().split('\n').filter(l => l.trim());
  const title = lines[0]?.slice(0, 100) || 'Bài viết';
  const desc = lines.slice(1).join(' ').slice(0, 120) || lines[0]?.slice(0, 120) || '';
  return { title, desc };
}

// ── Post Card ─────────────────────────────────────────────────
function PostCard({ post, large = false, idx = 0 }: { post: any; large?: boolean; idx?: number }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? post.likes ?? 0);
  const img = post.image_url || getFallback(idx);
  const { title, desc } = parsePost(post.noi_dung);
  const name = post.profiles?.username || 'Người dùng';
  const avatar = post.profiles?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B0000&color=fff`;
  const hasVideo = !!post.youtube_url;

  return (
    <Link href={`/thu-vien/${post.id}`} className="block group">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 h-full">
        {/* Ảnh */}
        <div className="relative overflow-hidden" style={{ height: large ? 220 : 160 }}>
          <img
            src={img} alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).src = getFallback(idx); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                <span className="text-[#8B1A1A] text-xl ml-1">▶</span>
              </div>
            </div>
          )}
          {/* Hot badge nếu like cao */}
          {(post.like_count ?? post.likes ?? 0) > 100 && (
            <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              🔥 Bài hot
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={`font-black text-gray-900 leading-tight mb-1.5 group-hover:text-[#8B1A1A] transition-colors line-clamp-2 ${large ? 'text-base' : 'text-sm'}`}>
            {title}
          </h3>
          {desc && (
            <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{desc}</p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <button
                onClick={e => { e.preventDefault(); setLiked(l => !l); setLikeCount((c: number) => c + (liked ? -1 : 1)); }}
                className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500 font-bold' : 'hover:text-red-400'}`}
              >
                {liked ? '❤️' : '🤍'} {formatNum(likeCount)}
              </button>
              <span>💬 {formatNum(post.comment_count ?? 0)}</span>
            </div>
            <span className="bg-[#8B1A1A] text-white text-xs font-bold px-3 py-1.5 rounded-full group-hover:bg-[#6B0F0F] transition">
              Đọc ngay →
            </span>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <img src={avatar} alt={name} className="w-5 h-5 rounded-full object-cover" />
            <span className="text-xs text-gray-500 font-medium truncate">{name}</span>
            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard({ large = false }: { large?: boolean }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className={`bg-gray-200 ${large ? 'h-[220px]' : 'h-40'}`} />
      <div className="p-4 space-y-3">
        <div className="bg-gray-200 h-4 rounded w-3/4" />
        <div className="bg-gray-200 h-3 rounded w-full" />
        <div className="bg-gray-200 h-3 rounded w-2/3" />
        <div className="flex justify-between mt-2">
          <div className="bg-gray-200 h-3 rounded w-1/4" />
          <div className="bg-gray-200 h-7 rounded-full w-24" />
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

  const QUICK = ['Vảy Án Thiên là gì?', 'Gà bị thương điều trị sao?', 'Nhận biết gà hay thế nào?'];

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
      setAnswer(data.reply || data.message || data.answer || 'Không có phản hồi.');
    } catch {
      setAnswer('Lỗi kết nối AI. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🤖</span>
        <div>
          <div className="font-black text-sm text-gray-800">Hỏi Sư Kê AI</div>
          <div className="text-xs text-gray-500">Hỏi gì về gà chọi, AI trả lời ngay</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {QUICK.map(q => (
          <button key={q} onClick={() => { setQuestion(q); ask(q); }}
            className="text-left text-xs bg-white border border-yellow-200 rounded-lg px-3 py-2 hover:bg-yellow-50 hover:border-yellow-400 transition text-gray-700 font-medium">
            💬 {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Hỏi về vảy, lối đá, bệnh gà..."
          className="flex-1 border border-yellow-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
        />
        <button onClick={() => ask(question)} disabled={loading}
          className="bg-[#8B1A1A] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#6B0F0F] transition disabled:opacity-50 min-w-[36px]">
          {loading ? '⏳' : '→'}
        </button>
      </div>
      {(loading || answer) && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-yellow-100 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
          {loading
            ? <div className="flex items-center gap-2 text-gray-400"><div className="w-3 h-3 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" /> Đang suy nghĩ...</div>
            : answer}
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
      // Posts từ bảng posts — chỉ lấy cột thật có trong DB
      const { data: postData, error } = await supabase
        .from('posts')
        .select('id, noi_dung, image_url, likes, like_count, comment_count, youtube_url, created_at, status, profiles(username, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) console.error('posts error:', error.message);
      setPosts(postData || []);

      // Top members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, trust_score')
        .order('trust_score', { ascending: false })
        .limit(5);
      setTopMembers(members || []);
    } catch (err) {
      console.error(err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter realtime
  const filtered = posts.filter(p => {
    if (!search) return true;
    return (p.noi_dung || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'most_liked') return ((b.like_count ?? b.likes ?? 0) - (a.like_count ?? a.likes ?? 0));
    if (sortBy === 'most_commented') return ((b.comment_count ?? 0) - (a.comment_count ?? 0));
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);
  const hotPosts = [...posts]
    .sort((a, b) => ((b.like_count ?? b.likes ?? 0) - (a.like_count ?? a.likes ?? 0)))
    .slice(0, 5);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#8B1A1A] via-red-800 to-red-700 text-white rounded-2xl p-6 mb-5 relative overflow-hidden">
          <div className="relative">
            <h1 className="font-black text-2xl md:text-3xl mb-1">📚 Thư Viện Kiến Thức</h1>
            <p className="text-red-200 text-sm">Nơi chia sẻ kiến thức gà chọi từ cộng đồng & chuyên gia</p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">{posts.length} bài viết</span>
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
              placeholder="Tìm kiếm bài viết về vảy, lối đá, bệnh gà..."
              className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'newest', label: '🕐 Mới nhất' },
              { key: 'most_liked', label: '❤️ Nhiều like' },
              { key: 'most_commented', label: '💬 Nhiều bình luận' },
            ].map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-3 py-2 rounded-full text-xs font-semibold border transition whitespace-nowrap ${sortBy === s.key ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-5">

          {/* ── CỘT TRÁI ── */}
          <aside className="lg:sticky lg:top-20 h-fit space-y-4">
            {/* Danh mục */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-black text-sm text-gray-700">📂 Chủ đề</span>
              </div>
              {DANH_MUC.map(dm => (
                <button key={dm.key} onClick={() => setDanhMuc(dm.key)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm transition border-l-4 ${danhMuc === dm.key ? 'bg-red-50 border-[#8B1A1A] text-[#8B1A1A] font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 font-medium'}`}>
                  <span>{dm.icon}</span>
                  <span>{dm.label}</span>
                  {danhMuc === dm.key && <span className="ml-auto text-[#8B1A1A] text-xs">✓</span>}
                </button>
              ))}
            </div>

            {/* CTA đăng bài */}
            <div className="bg-gradient-to-br from-[#8B1A1A] to-red-700 rounded-xl p-4 text-white text-center">
              <div className="text-2xl mb-2">✍️</div>
              <div className="font-black text-sm mb-1">Chia sẻ kiến thức</div>
              <div className="text-red-200 text-xs mb-3">Đăng bài trong cộng đồng để chia sẻ với mọi người</div>
              <Link href="/cong-dong">
                <button className="bg-white text-[#8B1A1A] text-xs font-black px-4 py-2 rounded-full hover:bg-yellow-50 transition w-full">
                  Đăng bài ngay →
                </button>
              </Link>
            </div>
          </aside>

          {/* ── CỘT GIỮA ── */}
          <main>
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <SkeletonCard large /><SkeletonCard large />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
                </div>
              </>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl p-16 text-center">
                <div className="text-5xl mb-3">📚</div>
                <div className="font-bold text-gray-600 mb-2">
                  {search ? 'Không tìm thấy bài viết phù hợp' : 'Chưa có bài viết nào'}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  {search ? 'Thử tìm với từ khóa khác' : 'Hãy là người đầu tiên chia sẻ kiến thức!'}
                </div>
                <Link href="/cong-dong">
                  <button className="bg-[#8B1A1A] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#6B0F0F] transition">
                    Đăng bài đầu tiên →
                  </button>
                </Link>
              </div>
            ) : (
              <>
                {/* 2 bài featured lớn */}
                {featured.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {featured.map((p, i) => <PostCard key={p.id} post={p} large idx={i} />)}
                  </div>
                )}
                {/* Các bài còn lại */}
                {rest.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rest.map((p, i) => <PostCard key={p.id} post={p} idx={i + 2} />)}
                  </div>
                )}
              </>
            )}
          </main>

          {/* ── CỘT PHẢI ── */}
          <aside className="lg:sticky lg:top-20 h-fit space-y-4">

            {/* Top thành viên */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-black text-sm text-gray-700">⭐ Top Thành Viên</span>
              </div>
              <div className="p-3 space-y-1">
                {topMembers.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2">Chưa có dữ liệu</p>
                ) : topMembers.map((m, i) => (
                  <Link key={m.id} href={`/ho-so/${m.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                      <div className="relative">
                        <img
                          src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'U')}&background=8B0000&color=fff`}
                          alt={m.username} className="w-9 h-9 rounded-full object-cover"
                        />
                        {i === 0 && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800 truncate">{m.username || 'Người dùng'}</div>
                        <div className="text-xs text-gray-400">⭐ {m.trust_score ?? 0} điểm</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Chat */}
            <AIChatBox />

            {/* Bài nổi bật */}
            {hotPosts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="font-black text-sm text-gray-700">🔥 Bài Nổi Bật</span>
                </div>
                <div className="p-3 space-y-3">
                  {hotPosts.map((p, i) => {
                    const { title } = parsePost(p.noi_dung);
                    const img = p.image_url || getFallback(i);
                    return (
                      <Link key={p.id} href={`/thu-vien/${p.id}`}>
                        <div className="flex gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 transition">
                          <img src={img} alt={title}
                            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = getFallback(i); }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{title}</div>
                            <div className="flex gap-2 mt-1 text-xs text-gray-400">
                              <span>❤️ {formatNum(p.like_count ?? p.likes ?? 0)}</span>
                              <span>💬 {formatNum(p.comment_count ?? 0)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liên hệ */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="font-black text-sm text-gray-700 mb-3">📞 Liên hệ</div>
              <div className="space-y-2 text-xs text-gray-600">
                <a href="mailto:khsongthao00@gmail.com" className="flex items-center gap-2 hover:text-[#8B1A1A] transition">
                  <span>📧</span> khsongthao00@gmail.com
                </a>
                <a href="https://zalo.me/0917161003" target="_blank" className="flex items-center gap-2 hover:text-[#8B1A1A] transition">
                  <span>💬</span> Zalo: 0917161003
                </a>
                <a href="tel:0917161003" className="flex items-center gap-2 hover:text-[#8B1A1A] transition">
                  <span>📞</span> 0917161003
                </a>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
