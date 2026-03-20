'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ============================================================
// HELPERS
// ============================================================
function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

// ============================================================
// TYPES
// ============================================================
interface Post {
  id: string;
  user_id: string;
  noi_dung: string;       // tên cột thật
  content?: string;       // alias fallback
  youtube_url: string;
  likes?: number;         // cột gốc
  like_count: number;     // cột mới thêm
  comment_count: number;
  share_count: number;
  report_count: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string };
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function CongDongPage() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showPopup, setShowPopup] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postYoutube, setPostYoutube] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');
  const popupRef = useRef<HTMLDivElement>(null);

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  // ── Load posts ────────────────────────────────────────────
  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  async function fetchPosts() {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('status', 'active');

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('like_count', { ascending: false });

    const { data, error } = await query.limit(30);
    if (!error && data) setPosts(data as Post[]);
    setLoading(false);
  }

  // ── Load comments for a post ──────────────────────────────
  async function fetchComments(postId: string) {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data as Comment[] }));
  }

  // ── Submit post ───────────────────────────────────────────
  async function submitPost() {
    if (!postContent.trim() || !user) return;
    setSubmitting(true);

    // Extract YouTube URL nếu user paste iframe HTML
    let cleanYoutube = postYoutube.trim();
    if (cleanYoutube.includes('<iframe')) {
      const srcMatch = cleanYoutube.match(/src=["']([^"']+)["']/);
      cleanYoutube = srcMatch ? srcMatch[1] : '';
    }

    // Insert bài viết (không join profiles ngay — tránh lỗi RLS)
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        noi_dung: postContent.trim(),   // tên cột thật trong DB
        youtube_url: cleanYoutube,
        comment_count: 0,
        share_count: 0,
        report_count: 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      alert(`❌ Lỗi đăng bài: ${error.message}`);
      setSubmitting(false);
      return;
    }

    if (data) {
      // Gắn thông tin user hiện tại vào bài vừa đăng để hiện ngay
      const newPost: Post = {
        ...data,
        noi_dung: postContent.trim(),
        like_count: 0,
        profiles: {
          full_name: user.user_metadata?.full_name || 'Bạn',
          avatar_url: user.user_metadata?.avatar_url || '',
        },
      };
      setPosts(prev => [newPost, ...prev]);
      setPostContent('');
      setPostYoutube('');
      setShowPopup(false);
    }
    setSubmitting(false);
  }

  // ── Like ──────────────────────────────────────────────────
  async function likePost(postId: string) {
    if (!user) return;
    const already = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !already }));
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, like_count: (p.like_count ?? p.likes ?? 0) + (already ? -1 : 1) } : p
      )
    );
    await supabase.rpc('toggle_like', { post_id: postId, delta: already ? -1 : 1 });
  }

  // ── Comment ───────────────────────────────────────────────
  async function submitComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content: text })
      .select('*, profiles(full_name, avatar_url)')
      .single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }));
      setPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)
      );
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    }
  }

  // ── Share ─────────────────────────────────────────────────
  function sharePost(postId: string) {
    const url = `${window.location.origin}/cong-dong?post=${postId}`;
    navigator.clipboard?.writeText(url).then(() => alert('✅ Đã copy link bài viết!'));
  }

  // ── Report ────────────────────────────────────────────────
  async function reportPost(postId: string) {
    if (!user) return;
    await supabase.rpc('report_post', { post_id: postId });
    alert('Đã báo cáo bài viết. Cảm ơn bạn!');
  }

  // ── Toggle comments section ───────────────────────────────
  function toggleComments(postId: string) {
    const next = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) fetchComments(postId);
  }

  // ── Close popup on outside click ──────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    if (showPopup) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

  const userAvatar = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || 'U')}&background=8B0000&color=fff`;
  const userName = user?.user_metadata?.full_name || 'Bạn';

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── POPUP ĐĂNG BÀI ────────────────────────────────── */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={popupRef} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e4e6ea', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tạo bài viết</h3>
              <button onClick={() => setShowPopup(false)} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src={userAvatar} style={{ width: 42, height: 42, borderRadius: '50%' }} />
              <span style={{ fontWeight: 600 }}>{userName}</span>
            </div>
            {/* Content */}
            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì về gà của mình? 🐓"
              style={{ width: '100%', minHeight: 120, border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {/* YouTube */}
            <input
              value={postYoutube}
              onChange={e => setPostYoutube(e.target.value)}
              placeholder="🎬 Dán link YouTube: https://youtu.be/... (không bắt buộc)"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 8, boxSizing: 'border-box', outline: 'none', color: '#555' }}
            />
            <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0 4px' }}>
              💡 Hỗ trợ link YouTube thường, youtu.be, hoặc paste iframe embed
            </p>
            {/* Submit */}
            <button
              onClick={submitPost}
              disabled={submitting || !postContent.trim()}
              style={{ width: '100%', marginTop: 14, padding: '13px', background: submitting ? '#e88' : postContent.trim() ? '#c0392b' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: postContent.trim() && !submitting ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
            >
              {submitting ? '⏳ Đang đăng bài...' : '🚀 Đăng bài'}
            </button>
          </div>
        </div>
      )}

      {/* ── BODY: 3 CỘT ───────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, padding: '16px 12px' }}>

        {/* ── CỘT TRÁI ──────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 12 }}>
            {[
              { href: '/', icon: '🏠', label: 'Trang chủ' },
              { href: '/cong-dong', icon: '👥', label: 'Cộng đồng', active: true },
              { href: '/cho', icon: '🐓', label: 'Gà đang bán' },
              { href: '/videos', icon: '🎬', label: 'Video thực chiến' },
              { href: '/thu-vien', icon: '📚', label: 'Bài viết kiến thức' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', background: item.active ? '#fdf0f0' : 'transparent', borderLeft: item.active ? '3px solid #c0392b' : '3px solid transparent', color: item.active ? '#c0392b' : '#333', fontWeight: item.active ? 700 : 400, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 14 }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: 13, marginBottom: 12 }}>Top sự kê uy tín</div>
            {['Anh Tuấn', 'Lão Hùng', 'Sự Kê Nam'].map((name, i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <img src={`https://i.pravatar.cc/36?img=${i * 5 + 3}`} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CỘT GIỮA (FEED) ───────────────────────────────── */}
        <main>
          {/* Thanh đăng bài */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={userAvatar} style={{ width: 42, height: 42, borderRadius: '50%' }} />
              <div
                onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập để đăng bài!')}
                style={{ flex: 1, background: '#f0f2f5', borderRadius: 24, padding: '10px 18px', cursor: 'pointer', color: '#888', fontSize: 15, border: '1px solid #e4e6ea' }}
              >
                Bạn đang nghĩ gì về gà của mình? 🐓
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e4e6ea', justifyContent: 'flex-end' }}>
              <button onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập!')} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ✍️ Viết bài
              </button>
            </div>
          </div>

          {/* Sort tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {([['newest', '🕐 Mới nhất'], ['hot', '🔥 Nổi bật']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)} style={{ padding: '7px 18px', borderRadius: 20, border: 'none', background: sortBy === v ? '#c0392b' : '#fff', color: sortBy === v ? '#fff' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Posts */}
          {loading ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888' }}>⏳ Đang tải bài viết...</div>
          ) : posts.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 50, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <p style={{ color: '#888', marginBottom: 16 }}>Chưa có bài viết nào</p>
              <button onClick={() => setShowPopup(true)} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
                Viết bài đầu tiên
              </button>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                comments={comments[post.id] || []}
                liked={!!likedPosts[post.id]}
                expanded={!!expandedComments[post.id]}
                commentInput={commentInputs[post.id] || ''}
                currentUserAvatar={userAvatar}
                onLike={() => likePost(post.id)}
                onToggleComments={() => toggleComments(post.id)}
                onCommentChange={v => setCommentInputs(prev => ({ ...prev, [post.id]: v }))}
                onCommentSubmit={() => submitComment(post.id)}
                onShare={() => sharePost(post.id)}
                onReport={() => reportPost(post.id)}
              />
            ))
          )}
        </main>

        {/* ── CỘT PHẢI ──────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
          {/* Video nổi bật */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎬 Video nổi bật</div>
            {[{ title: 'Đá gà kích tính', views: '10K', ytId: 'dQw4w9WgXcQ' }, { title: 'Gà xanh 3 hồ', views: '20K', ytId: 'dQw4w9WgXcQ' }].map(v => (
              <div key={v.title} style={{ marginBottom: 12, cursor: 'pointer' }}>
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', paddingBottom: '56.25%' }}>
                  <img src={`https://img.youtube.com/vi/${v.ytId}/mqdefault.jpg`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>▶</div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>▶ {v.views}</div>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600 }}>{v.title}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{v.views} lượt xem</p>
              </div>
            ))}
          </div>

          {/* Bài viết hot */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#c0392b', marginBottom: 12 }}>🔥 Bài viết hot</div>
            {['Cách xem vây gà chuẩn', 'Top giống gà đá hay', 'Bí quyết nuôi gà đòn'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10, cursor: 'pointer' }}>
                <span style={{ color: '#c0392b', marginTop: 2 }}>▪</span>
                <span style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Banners */}
          {[
            { bg: '#7B1818', text: 'Vitamin B12\nCHO GÀ', emoji: '💊' },
            { bg: '#1a3a6e', text: 'Máy ấp trứng\nTự động', emoji: '🥚' },
            { bg: '#4a1a00', text: 'Thức ăn\nCho gà đá', emoji: '🌾' },
          ].map(b => (
            <div key={b.text} style={{ background: b.bg, borderRadius: 10, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{b.emoji}</span>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{b.text}</div>
            </div>
          ))}
        </aside>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 1024px) {
          .cgv-grid { grid-template-columns: 200px 1fr !important; }
          .cgv-right { display: none !important; }
        }
        @media (max-width: 768px) {
          .cgv-grid { grid-template-columns: 1fr !important; }
          .cgv-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// POST CARD COMPONENT
// ============================================================
interface PostCardProps {
  post: Post;
  comments: Comment[];
  liked: boolean;
  expanded: boolean;
  commentInput: string;
  currentUserAvatar: string;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (v: string) => void;
  onCommentSubmit: () => void;
  onShare: () => void;
  onReport: () => void;
}

function PostCard({ post, comments, liked, expanded, commentInput, currentUserAvatar, onLike, onToggleComments, onCommentChange, onCommentSubmit, onShare, onReport }: PostCardProps) {
  const ytId = getYoutubeId(post.youtube_url);
  const avatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}&background=8B0000&color=fff`;
  const name = post.profiles?.full_name || 'Người dùng';
  const postText = post.noi_dung || post.content || '';   // hỗ trợ cả 2 tên cột
  const likeCount = post.like_count ?? post.likes ?? 0;   // hỗ trợ cả 2 tên cột

  return (
    <div style={{ background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <img src={avatar} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #f0f2f5' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <button onClick={onReport} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20, padding: '0 4px' }} title="Báo cáo">⋯</button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 12px', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{postText}</div>

      {/* YouTube embed */}
      {ytId && (
        <div style={{ paddingBottom: '56.25%', position: 'relative', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 16, fontSize: 13, color: '#888', borderBottom: '1px solid #e4e6ea' }}>
        <span>👍 {formatNum(likeCount)}</span>
        <span>💬 {formatNum(post.comment_count)}</span>
        <span>🔁 {formatNum(post.share_count)}</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', padding: '4px 8px' }}>
        {[
          { icon: liked ? '👍' : '👍', label: 'Thích', color: liked ? '#c0392b' : '#65676b', action: onLike },
          { icon: '💬', label: 'Bình luận', color: '#65676b', action: onToggleComments },
          { icon: '🔁', label: 'Chia sẻ', color: '#65676b', action: onShare },
          { icon: '⚠️', label: 'Báo cáo', color: '#65676b', action: onReport },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600, color: btn.color, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f2f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <span>{btn.icon}</span> {btn.label}
          </button>
        ))}
      </div>

      {/* Comments section */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e4e6ea', padding: '12px 16px' }}>
          {comments.length === 0 && <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>Chưa có bình luận nào</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=U&background=8B0000&color=fff`} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ background: '#f0f2f5', borderRadius: 16, padding: '8px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.profiles?.full_name || 'Người dùng'}</div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{c.content}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{timeAgo(c.created_at)}</div>
              </div>
            </div>
          ))}
          {/* Comment input */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={currentUserAvatar} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', gap: 8, background: '#f0f2f5', borderRadius: 24, padding: '6px 12px', alignItems: 'center' }}>
              <input
                value={commentInput}
                onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onCommentSubmit()}
                placeholder="Viết bình luận..."
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14 }}
              />
              <button onClick={onCommentSubmit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
