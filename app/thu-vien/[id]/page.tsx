'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
  'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=800&q=80',
  'https://images.unsplash.com/photo-1559715541-5daf0feaf9b9?w=800&q=80',
];

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

function getYoutubeId(raw: string): string | null {
  if (!raw) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function ThuVienDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    if (id) fetchPost();
  }, [id]);

  async function fetchPost() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id, noi_dung, image_url, likes, like_count, comment_count, youtube_url, created_at, status, user_id, profiles(username, avatar_url)')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !data) { router.push('/thu-vien'); return; }

    setPost(data);
    setLikeCount(data.like_count ?? data.likes ?? 0);

    // Comments
    const { data: cmts } = await supabase
      .from('comments')
      .select('id, content, created_at, profiles(username, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    setComments(cmts || []);

    // Bài liên quan
    const { data: rel } = await supabase
      .from('posts')
      .select('id, noi_dung, image_url, like_count, likes, created_at')
      .eq('status', 'active')
      .neq('id', id)
      .order('like_count', { ascending: false })
      .limit(4);
    setRelated(rel || []);

    setLoading(false);
  }

  async function handleLike() {
    if (!user) { alert('Vui lòng đăng nhập để thích bài viết!'); return; }
    setLiked(l => !l);
    setLikeCount(c => c + (liked ? -1 : 1));
    await supabase.rpc('toggle_like', { post_id: id, delta: liked ? -1 : 1 });
  }

  async function handleComment() {
    if (!user) { alert('Vui lòng đăng nhập để bình luận!'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: user.id, content: commentText.trim() })
      .select('id, content, created_at, profiles(username, avatar_url)')
      .single();
    if (data) {
      setComments(prev => [...prev, data]);
      setCommentText('');
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="bg-gray-200 h-8 rounded w-3/4 mb-4" />
      <div className="bg-gray-200 h-64 rounded-xl mb-6" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="bg-gray-200 h-4 rounded" />)}
      </div>
    </div>
  );

  if (!post) return null;

  const lines = (post.noi_dung || '').trim().split('\n').filter((l: string) => l.trim());
  const title = lines[0] || 'Bài viết';
  const body = lines.slice(1).join('\n') || post.noi_dung || '';
  const img = post.image_url || FALLBACK_IMGS[0];
  const ytId = getYoutubeId(post.youtube_url);
  const name = post.profiles?.username || 'Người dùng';
  const avatar = post.profiles?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B0000&color=fff`;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-[#8B1A1A] transition">Trang chủ</Link>
          <span>/</span>
          <Link href="/thu-vien" className="hover:text-[#8B1A1A] transition">Thư viện</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate">{title.slice(0, 40)}...</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── NỘI DUNG CHÍNH ── */}
          <article>
            {/* Tiêu đề */}
            <h1 className="font-black text-2xl md:text-3xl text-gray-900 leading-tight mb-4">{title}</h1>

            {/* Author + stats */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-200">
              <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="font-bold text-sm text-gray-800">{name}</div>
                <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <button onClick={handleLike}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border-2 transition ${liked ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500'}`}>
                  {liked ? '❤️' : '🤍'} {formatNum(likeCount)}
                </button>
                <span className="text-sm text-gray-500">💬 {formatNum(comments.length)}</span>
              </div>
            </div>

            {/* Ảnh chính */}
            <div className="rounded-xl overflow-hidden mb-6 shadow-sm">
              <img src={img} alt={title} className="w-full max-h-96 object-cover"
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMGS[0]; }} />
            </div>

            {/* Nội dung bài viết */}
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                {body}
              </div>
            </div>

            {/* Video YouTube nếu có */}
            {ytId && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-3">🎬 Video kèm theo</h3>
                <div className="relative rounded-xl overflow-hidden shadow-sm" style={{ paddingBottom: '56.25%', background: '#000' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?controls=1&rel=0`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mb-8 p-4 bg-white rounded-xl shadow-sm">
              <button onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border-2 transition ${liked ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-600 hover:border-red-400'}`}>
                {liked ? '❤️ Đã thích' : '🤍 Thích'} • {formatNum(likeCount)}
              </button>
              <button onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('✅ Đã copy link bài viết!');
              }} className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border-2 border-gray-300 text-gray-600 hover:border-blue-400 transition">
                🔗 Chia sẻ
              </button>
              <Link href="/thu-vien" className="ml-auto text-sm text-[#8B1A1A] font-semibold hover:underline">
                ← Về thư viện
              </Link>
            </div>

            {/* COMMENTS */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <span className="font-black text-base text-gray-800">💬 Bình luận ({comments.length})</span>
              </div>

              {/* Danh sách comment */}
              <div className="divide-y divide-gray-100">
                {comments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                  </div>
                ) : comments.map(c => {
                  const cName = c.profiles?.username || 'Người dùng';
                  const cAvatar = c.profiles?.avatar_url
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=8B0000&color=fff`;
                  return (
                    <div key={c.id} className="flex gap-3 px-5 py-4">
                      <img src={cAvatar} alt={cName} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-2xl px-4 py-2.5">
                          <div className="font-bold text-sm text-gray-800">{cName}</div>
                          <div className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 ml-2">{timeAgo(c.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input comment */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                {user ? (
                  <div className="flex gap-3 items-end">
                    <img
                      src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name || 'U')}&background=8B0000&color=fff`}
                      alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                    />
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Viết bình luận của bạn..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
                      />
                      <button onClick={handleComment} disabled={submitting || !commentText.trim()}
                        className="mt-2 bg-[#8B1A1A] text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-[#6B0F0F] transition disabled:opacity-50">
                        {submitting ? '⏳ Đang gửi...' : '➤ Gửi bình luận'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <span className="text-sm text-gray-500">Vui lòng </span>
                    <Link href="/login" className="text-[#8B1A1A] font-bold text-sm hover:underline">đăng nhập</Link>
                    <span className="text-sm text-gray-500"> để bình luận</span>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* ── SIDEBAR PHẢI ── */}
          <aside className="lg:sticky lg:top-20 h-fit space-y-4">

            {/* Bài liên quan */}
            {related.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="font-black text-sm text-gray-700">📖 Bài viết liên quan</span>
                </div>
                <div className="p-3 space-y-3">
                  {related.map((r, i) => {
                    const rTitle = (r.noi_dung || '').split('\n')[0]?.slice(0, 70) || 'Bài viết';
                    const rImg = r.image_url || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                    return (
                      <Link key={r.id} href={`/thu-vien/${r.id}`}>
                        <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-1.5 transition cursor-pointer">
                          <img src={rImg} alt={rTitle}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMGS[0]; }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{rTitle}</div>
                            <div className="flex gap-2 mt-1.5 text-xs text-gray-400">
                              <span>❤️ {formatNum(r.like_count ?? r.likes ?? 0)}</span>
                              <span>{timeAgo(r.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back button */}
            <Link href="/thu-vien">
              <button className="w-full bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm">
                ← Về Thư Viện
              </button>
            </Link>

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
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
