'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================
// HELPERS
// ============================================================
function getYoutubeId(raw: string): string | null {
  if (!raw) return null;
  let url = raw;
  if (raw.includes('<iframe')) {
    const srcMatch = raw.match(/src=["']([^"']+)["']/);
    if (!srcMatch) return null;
    url = srcMatch[1];
  }
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
  noi_dung: string;
  content?: string;
  youtube_url: string;
  likes?: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  report_count: number;
  image_url?: string;
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

interface Banner {
  vi_tri: number;
  tieu_de: string;
  tieu_de_phu: string;
  link: string;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function PostContent({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 220;
  const preview = isLong && !expanded ? lines.slice(0, 4).join('\n').slice(0, 220) : text;
  return (
    <div style={{ padding: '0 16px 12px', fontSize: 15, lineHeight: 1.65 }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{preview}{isLong && !expanded && '...'}</div>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginTop: 2 }}>
          {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
        </button>
      )}
    </div>
  );
}

// ── Floating Video Popup — kéo được, âm thanh bật mặc định ───
function FloatingVideoPopup({ ytId, onClose, startX, startY, popupW, popupH }: {
  ytId: string; onClose: () => void;
  startX: number; startY: number;
  popupW: number; popupH: number;
}) {
  const [pos, setPos] = useState({ x: startX, y: startY });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - popupW, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - popupH, e.clientY - dragOffset.current.y)),
      });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [popupW, popupH]);

  function startDrag(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      width: popupW, zIndex: 9999,
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      background: '#000',
    }}>
      {/* Thanh kéo */}
      <div onMouseDown={startDrag} style={{
        height: 32, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', cursor: 'grab', userSelect: 'none',
      }}>
        <span style={{ color: '#aaa', fontSize: 12 }}>⠿ Kéo để di chuyển</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          color: '#fff', width: 22, height: 22, cursor: 'pointer',
          fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
      {/* Video — âm thanh bật mặc định, dùng controls gốc YouTube */}
      <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${ytId}&rel=0`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ── HoverVideoSidebar — thumbnail, hover → popup nổi ─────────
function HoverVideoSidebar({ finalId, thumb, title, views }: {
  finalId: string; thumb: string; title: string; views: number;
}) {
  const [showPopup, setShowPopup] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    const popupW = 480;
    const popupH = popupW * 0.5625 + 32;
    const x = Math.min(rect.left, window.innerWidth - popupW - 8);
    const y = Math.max(8, rect.top - popupH / 2 + rect.height / 2);
    setPopupPos({ x, y, popupW, popupH });
    setShowPopup(true);
  }

  const [popupPos, setPopupPos] = useState({ x: 0, y: 0, popupW: 480, popupH: 302 });

  return (
    <>
      {showPopup && (
        <FloatingVideoPopup
          ytId={finalId}
          onClose={() => setShowPopup(false)}
          startX={popupPos.x} startY={popupPos.y}
          popupW={popupPos.popupW} popupH={popupPos.popupH}
        />
      )}
      <div ref={thumbRef} style={{ marginBottom: 12 }}>
        {/* Thumbnail nhỏ — hover để mở popup */}
        <div
          onMouseEnter={handleMouseEnter}
          style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', paddingBottom: '56.25%', cursor: 'pointer' }}
        >
          <img
            src={thumb || `https://img.youtube.com/vi/${finalId}/mqdefault.jpg`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            alt={title}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>▶</div>
          </div>
          <div style={{ position: 'absolute', bottom: 4, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 5px', borderRadius: 3 }}>
            🖱️ Rê để xem
          </div>
          {views > 0 && (
            <div style={{ position: 'absolute', bottom: 4, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 5px', borderRadius: 3 }}>
              ▶ {formatNum(views)}
            </div>
          )}
        </div>
        <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{title}</p>
      </div>
    </>
  );
}

// ── HoverVideoPost — thumbnail trong feed, hover → popup nổi ─
function HoverVideoPost({ ytId }: { ytId: string }) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0, popupW: 640, popupH: 392 });
  const thumbRef = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    const popupW = Math.min(640, window.innerWidth - 16);
    const popupH = popupW * 0.5625 + 32;
    const x = Math.max(8, rect.left + rect.width / 2 - popupW / 2);
    const y = Math.max(8, rect.top - popupH / 2 + rect.height / 2);
    setPopupPos({ x, y, popupW, popupH });
    setShowPopup(true);
  }

  return (
    <>
      {showPopup && (
        <FloatingVideoPopup
          ytId={ytId}
          onClose={() => setShowPopup(false)}
          startX={popupPos.x} startY={popupPos.y}
          popupW={popupPos.popupW} popupH={popupPos.popupH}
        />
      )}
      <div ref={thumbRef} onMouseEnter={handleMouseEnter}
        style={{ paddingBottom: '56.25%', position: 'relative', background: '#000', cursor: 'pointer' }}>
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          alt="video thumbnail"
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>▶</div>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
          🖱️ Rê chuột để xem
        </div>
      </div>
    </>
  );
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
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [topSuKe, setTopSuKe] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const bannerColors = ['#7B1818', '#1a3a6e', '#4a1a00'];
  const bannerEmojis = ['💊', '🥚', '🌾'];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => { fetchPosts(); }, [sortBy]);
  useEffect(() => { fetchSidebarData(); }, []);

  async function fetchSidebarData() {
    const { data: hotData } = await supabase.from('posts').select('id, noi_dung, like_count, likes')
      .eq('status', 'active').order('like_count', { ascending: false }).limit(5);
    if (hotData) setHotPosts(hotData as Post[]);

    const { data: vidData } = await supabase.from('videos').select('*').limit(5);
    if (vidData) setFeaturedVideos(vidData);

    const { data: suKeData } = await supabase.from('profiles').select('id, username, avatar_url, trust_score, role')
      .eq('status', 'active').order('trust_score', { ascending: false }).limit(5);
    if (suKeData) setTopSuKe(suKeData);

    const { data: bannerData } = await supabase.from('banners').select('*').order('vi_tri');
    if (bannerData && bannerData.length > 0) setBanners(bannerData);
  }

  async function fetchPosts() {
    setLoading(true);
    let query = supabase.from('posts').select('*').eq('status', 'active');
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('like_count', { ascending: false });
    const { data, error } = await query.limit(30);
    if (error) { console.error('fetchPosts error:', error.message); setLoading(false); return; }
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
      const profileMap: Record<string, any> = {};
      profilesData?.forEach((p: any) => { profileMap[p.id] = p; });
      setPosts(data.map((p: any) => ({ ...p, profiles: profileMap[p.user_id] || null })) as Post[]);
    } else { setPosts([]); }
    setLoading(false);
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase.from('comments')
      .select('*, profiles(full_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data as Comment[] }));
  }

  async function submitPost() {
    if (!postContent.trim() || !user) return;
    setSubmitting(true);
    let cleanYoutube = postYoutube.trim();
    if (cleanYoutube.includes('<iframe')) {
      const srcMatch = cleanYoutube.match(/src=["']([^"']+)["']/);
      cleanYoutube = srcMatch ? srcMatch[1] : '';
    }
    let uploadedImageUrl = '';
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const fileName = `posts/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('images').upload(fileName, imageFile, { upsert: true });
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        uploadedImageUrl = urlData.publicUrl;
      }
    }
    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id, noi_dung: postContent.trim(), youtube_url: cleanYoutube,
      image_url: uploadedImageUrl || null, comment_count: 0, share_count: 0, report_count: 0, status: 'active',
    }).select().single();
    if (error) { alert(`❌ Lỗi đăng bài: ${error.message}`); setSubmitting(false); return; }
    if (data) {
      setPosts(prev => [{ ...data, noi_dung: postContent.trim(), image_url: uploadedImageUrl || null, like_count: 0,
        profiles: { full_name: user.user_metadata?.full_name || 'Bạn', avatar_url: user.user_metadata?.avatar_url || '' },
      } as Post, ...prev]);
      setPostContent(''); setPostYoutube(''); setImageFile(null); setImagePreview(''); setShowPopup(false);
    }
    setSubmitting(false);
  }

  async function likePost(postId: string) {
    if (!user) return;
    const already = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !already }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count ?? p.likes ?? 0) + (already ? -1 : 1) } : p));
    await supabase.rpc('toggle_like', { post_id: postId, delta: already ? -1 : 1 });
  }

  async function submitComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    const { data } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: text })
      .select('*, profiles(full_name, avatar_url)').single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    }
  }

  function sharePost(postId: string) {
    const url = `${window.location.origin}/cong-dong?post=${postId}`;
    navigator.clipboard?.writeText(url).then(() => alert('✅ Đã copy link bài viết!'));
  }

  async function reportPost(postId: string) {
    if (!user) return;
    await supabase.rpc('report_post', { post_id: postId });
    alert('Đã báo cáo bài viết. Cảm ơn bạn!');
  }

  function toggleComments(postId: string) {
    const next = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) fetchComments(postId);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setShowPopup(false);
    }
    if (showPopup) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

  const userAvatar = user?.user_metadata?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || 'U')}&background=8B0000&color=fff`;
  const userName = user?.user_metadata?.full_name || 'Bạn';

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* POPUP ĐĂNG BÀI */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          <div ref={popupRef} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e4e6ea', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tạo bài viết</h3>
              <button onClick={() => setShowPopup(false)} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src={userAvatar} style={{ width: 42, height: 42, borderRadius: '50%' }} alt="" />
              <span style={{ fontWeight: 600 }}>{userName}</span>
            </div>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì về gà của mình? 🐓"
              style={{ width: '100%', minHeight: 120, border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const file = e.target.files?.[0]; if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); } }} />
            {imagePreview ? (
              <div style={{ position: 'relative', marginTop: 10 }}>
                <img src={imagePreview} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} alt="" />
                <button onClick={() => { setImageFile(null); setImagePreview(''); }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', marginTop: 10, padding: '9px', border: '1.5px dashed #ddd', borderRadius: 8, background: '#fafafa', color: '#888', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                📷 Thêm ảnh
              </button>
            )}
            <input value={postYoutube} onChange={e => setPostYoutube(e.target.value)}
              placeholder="🎬 Dán link YouTube (không bắt buộc)"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 8, boxSizing: 'border-box', outline: 'none', color: '#555' }} />
            <button onClick={submitPost} disabled={submitting || !postContent.trim()}
              style={{ width: '100%', marginTop: 14, padding: '13px', background: submitting ? '#e88' : postContent.trim() ? '#c0392b' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: postContent.trim() && !submitting ? 'pointer' : 'not-allowed' }}>
              {submitting ? '⏳ Đang đăng bài...' : '🚀 Đăng bài'}
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT 3 CỘT */}
      <div className="cgv-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, padding: '16px 12px' }}>

        {/* CỘT TRÁI */}
        <aside className="cgv-left" style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 12 }}>
            {[
              { href: '/', icon: '🏠', label: 'Trang chủ' },
              { href: '/cong-dong', icon: '👥', label: 'Cộng đồng', active: true },
              { href: '/cho', icon: '🐓', label: 'Gà đang bán' },
              { href: '/thu-vien', icon: '🎬', label: 'Video thực chiến' },
              { href: '/thu-vien', icon: '📚', label: 'Bài viết kiến thức' },
            ].map((item, idx) => (
              <Link key={`${item.href}-${idx}`} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: item.active ? '#fdf0f0' : 'transparent', borderLeft: item.active ? '3px solid #c0392b' : '3px solid transparent', color: item.active ? '#c0392b' : '#333', fontWeight: item.active ? 700 : 400 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 14 }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: 13, marginBottom: 12 }}>🏆 Top sự kê uy tín</div>
            {topSuKe.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>Đang tải...</p>
            ) : topSuKe.map((sk, i) => {
              const displayName = sk.username || 'Người dùng';
              const avatar = sk.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8B0000&color=fff`;
              return (
                <Link key={sk.id} href={`/ho-so/${sk.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '4px 6px', borderRadius: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <img src={avatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt={displayName} />
                      {i === 0 && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 12 }}>👑</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{displayName}</div>
                      {sk.trust_score > 0 && <div style={{ fontSize: 11, color: '#c0392b' }}>⭐ {sk.trust_score} điểm</div>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* CỘT GIỮA */}
        <main>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={userAvatar} style={{ width: 42, height: 42, borderRadius: '50%' }} alt="" />
              <div onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập để đăng bài!')}
                style={{ flex: 1, background: '#f0f2f5', borderRadius: 24, padding: '10px 18px', cursor: 'pointer', color: '#888', fontSize: 15, border: '1px solid #e4e6ea' }}>
                Bạn đang nghĩ gì về gà của mình? 🐓
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e4e6ea', justifyContent: 'flex-end' }}>
              <button onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập!')}
                style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ✍️ Viết bài
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {([['newest', '🕐 Mới nhất'], ['hot', '🔥 Nổi bật']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                style={{ padding: '7px 18px', borderRadius: 20, border: 'none', background: sortBy === v ? '#c0392b' : '#fff', color: sortBy === v ? '#fff' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888' }}>⏳ Đang tải bài viết...</div>
          ) : posts.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 50, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <p style={{ color: '#888', marginBottom: 16 }}>Chưa có bài viết nào</p>
              <button onClick={() => setShowPopup(true)} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Viết bài đầu tiên</button>
            </div>
          ) : posts.map(post => (
            <PostCard
              key={post.id} post={post} comments={comments[post.id] || []}
              liked={!!likedPosts[post.id]} expanded={!!expandedComments[post.id]}
              commentInput={commentInputs[post.id] || ''} currentUserAvatar={userAvatar}
              onLike={() => likePost(post.id)} onToggleComments={() => toggleComments(post.id)}
              onCommentChange={v => setCommentInputs(prev => ({ ...prev, [post.id]: v }))}
              onCommentSubmit={() => submitComment(post.id)}
              onShare={() => sharePost(post.id)} onReport={() => reportPost(post.id)}
            />
          ))}
        </main>

        {/* CỘT PHẢI */}
        <aside className="cgv-right" style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎬 Video nổi bật</div>
            {featuredVideos.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>Chưa có video</p>
            ) : featuredVideos.map((v: any) => {
              const ytRaw = v.youtube_url || v.embed_url || v.video_url || v.url || v.link || '';
              const ytId = getYoutubeId(ytRaw);
              const finalId = ytId || null;
              const title = v.tieu_de || v.title || v.ten || 'Video';
              const views = v.luot_xem || v.views || v.view_count || 0;
              const thumb = v.thumbnail || v.anh_dai_dien || v.image_url || '';
              return finalId ? (
                <HoverVideoSidebar key={v.id} finalId={finalId} thumb={thumb} title={title} views={views} />
              ) : null;
            })}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#c0392b', marginBottom: 12 }}>🔥 Bài viết hot</div>
            {hotPosts.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>Chưa có bài viết</p>
            ) : hotPosts.map(p => {
              const text = p.noi_dung || p.content || '';
              const preview = text.length > 65 ? text.slice(0, 65) + '...' : text;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => document.getElementById(`post-${p.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
                  <span style={{ color: '#c0392b', marginTop: 2, flexShrink: 0 }}>▪</span>
                  <span style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{preview}</span>
                </div>
              );
            })}
          </div>

          {banners.length > 0 ? banners.map((b, idx) => (
            b.link ? (
              <a key={b.vi_tri} href={b.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: bannerColors[idx] || '#7B1818', borderRadius: 10, padding: '14px 16px', marginBottom: 10, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{bannerEmojis[idx] || '📢'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{b.tieu_de}</div>
                    {b.tieu_de_phu && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{b.tieu_de_phu}</div>}
                  </div>
                </div>
              </a>
            ) : (
              <div key={b.vi_tri} style={{ background: bannerColors[idx] || '#7B1818', borderRadius: 10, padding: '14px 16px', marginBottom: 10, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>{bannerEmojis[idx] || '📢'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{b.tieu_de}</div>
                  {b.tieu_de_phu && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{b.tieu_de_phu}</div>}
                </div>
              </div>
            )
          )) : [
            { bg: '#7B1818', text: 'Vitamin B12', sub: 'CHO GÀ', emoji: '💊' },
            { bg: '#1a3a6e', text: 'Máy ấp trứng', sub: 'Tự động', emoji: '🥚' },
            { bg: '#4a1a00', text: 'Thức ăn', sub: 'Cho gà đá', emoji: '🌾' },
          ].map(b => (
            <div key={b.text} style={{ background: b.bg, borderRadius: 10, padding: '14px 16px', marginBottom: 10, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{b.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{b.text}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{b.sub}</div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* CSS RESPONSIVE */}
      <style>{`
        @media (max-width: 1024px) {
          .cgv-grid { grid-template-columns: 160px 1fr 200px !important; gap: 10px !important; padding: 10px 8px !important; }
        }
        @media (max-width: 768px) {
          .cgv-grid { grid-template-columns: 110px 1fr 120px !important; gap: 5px !important; padding: 6px 3px !important; }
          .cgv-left > div, .cgv-right > div { padding: 8px !important; }
          .cgv-left span, .cgv-right span, .cgv-left div, .cgv-right div { font-size: 11px !important; }
          .cgv-left img, .cgv-right img { width: 28px !important; height: 28px !important; }
        }
        @media (max-width: 480px) {
          .cgv-grid { grid-template-columns: 72px 1fr 76px !important; gap: 3px !important; padding: 4px 2px !important; }
          .cgv-left > div, .cgv-right > div { padding: 5px !important; }
          .cgv-left span, .cgv-right span, .cgv-left div, .cgv-right div { font-size: 10px !important; line-height: 1.3 !important; }
          .cgv-left img, .cgv-right img { width: 22px !important; height: 22px !important; }
        }
        @media (max-width: 360px) {
          .cgv-grid { grid-template-columns: 58px 1fr 62px !important; gap: 2px !important; padding: 3px 1px !important; }
          .cgv-left span, .cgv-right span, .cgv-left div, .cgv-right div { font-size: 9px !important; }
          .cgv-left img, .cgv-right img { width: 18px !important; height: 18px !important; }
        }
        .cgv-btn-label { display: none; }
        @media (min-width: 600px) { .cgv-btn-label { display: inline; } }
      `}</style>
    </div>
  );
}

// ============================================================
// POST CARD
// ============================================================
interface PostCardProps {
  post: Post; comments: Comment[]; liked: boolean; expanded: boolean;
  commentInput: string; currentUserAvatar: string;
  onLike: () => void; onToggleComments: () => void;
  onCommentChange: (v: string) => void; onCommentSubmit: () => void;
  onShare: () => void; onReport: () => void;
}

function PostCard({ post, comments, liked, expanded, commentInput, currentUserAvatar, onLike, onToggleComments, onCommentChange, onCommentSubmit, onShare, onReport }: PostCardProps) {
  const ytId = getYoutubeId(post.youtube_url);
  const avatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}&background=8B0000&color=fff`;
  const name = post.profiles?.full_name || 'Người dùng';
  const postText = post.noi_dung || post.content || '';
  const likeCount = post.like_count ?? post.likes ?? 0;

  return (
    <div id={`post-${post.id}`} style={{ background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <img src={avatar} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #f0f2f5' }} alt="" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <button onClick={onReport} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>⋯</button>
      </div>

      <PostContent text={postText} />

      {post.image_url && <img src={post.image_url} style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} alt="" />}
      {ytId && <HoverVideoPost ytId={ytId} />}

      <div style={{ padding: '8px 16px', display: 'flex', gap: 16, fontSize: 13, color: '#888', borderBottom: '1px solid #e4e6ea' }}>
        <span>👍 {formatNum(likeCount)}</span>
        <span>💬 {formatNum(post.comment_count)}</span>
        <span>🔁 {formatNum(post.share_count)}</span>
      </div>

      <div style={{ display: 'flex', padding: '4px 8px' }}>
        {[
          { icon: '👍', label: 'Thích', color: liked ? '#c0392b' : '#65676b', action: onLike },
          { icon: '💬', label: 'Bình luận', color: '#65676b', action: onToggleComments },
          { icon: '🔁', label: 'Chia sẻ', color: '#65676b', action: onShare },
          { icon: '⚠️', label: 'Báo cáo', color: '#65676b', action: onReport },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600, color: btn.color }}>
            <span>{btn.icon}</span>
            <span className="cgv-btn-label">{btn.label}</span>
          </button>
        ))}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e4e6ea', padding: '12px 16px' }}>
          {comments.length === 0 && <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>Chưa có bình luận nào</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=U&background=8B0000&color=fff`}
                style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} alt="" />
              <div style={{ background: '#f0f2f5', borderRadius: 16, padding: '8px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.profiles?.full_name || 'Người dùng'}</div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{c.content}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{timeAgo(c.created_at)}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={currentUserAvatar} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} alt="" />
            <div style={{ flex: 1, display: 'flex', gap: 8, background: '#f0f2f5', borderRadius: 24, padding: '6px 12px', alignItems: 'center' }}>
              <input value={commentInput} onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onCommentSubmit()}
                placeholder="Viết bình luận..." style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14 }} />
              <button onClick={onCommentSubmit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
