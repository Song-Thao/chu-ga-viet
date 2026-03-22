'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ============================================================
// HELPERS
// ============================================================
function getYoutubeId(raw: string): string | null {
  if (!raw) return null;
  let url = raw;
  if (raw.includes('<iframe')) {
    const m = raw.match(/src=["']([^"']+)["']/);
    if (!m) return null;
    url = m[1];
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
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
  return String(n ?? 0);
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
// POST CONTENT
// ============================================================
function PostContent({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 220;
  const preview = isLong && !expanded ? lines.slice(0, 4).join('\n').slice(0, 220) : text;
  return (
    <div style={{ padding: '0 12px 10px', fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{preview}{isLong && !expanded && '...'}</div>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
          {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// FLOATING VIDEO POPUP — mouse + touch drag, z cao
// ============================================================
function FloatingVideoPopup({ ytId, onClose, startX, startY, popupW }: {
  ytId: string; onClose: () => void;
  startX: number; startY: number; popupW: number;
}) {
  const [pos, setPos] = useState({ x: startX, y: startY });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupH = Math.round(popupW * 0.5625) + 36;

  useEffect(() => {
    // Mouse drag
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - popupW, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - popupH, e.clientY - dragOffset.current.y)),
      });
    }
    function onMouseUp() { dragging.current = false; }

    // Touch drag
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - popupW, t.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - popupH, t.clientY - dragOffset.current.y)),
      });
      e.preventDefault();
    }
    function onTouchEnd() { dragging.current = false; }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [popupW, popupH]);

  function startDragMouse(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  function startDragTouch(e: React.TouchEvent) {
    dragging.current = true;
    const t = e.touches[0];
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, width: popupW,
      zIndex: 9999, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(0,0,0,0.65)', background: '#000',
    }}>
      {/* Thanh kéo — hỗ trợ cả mouse và touch */}
      <div
        onMouseDown={startDragMouse}
        onTouchStart={startDragTouch}
        style={{
          height: 36, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', cursor: 'grab', userSelect: 'none', touchAction: 'none',
        }}
      >
        <span style={{ color: '#888', fontSize: 11 }}>⠿ Kéo để di chuyển</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
          color: '#fff', width: 24, height: 24, cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
      {/* Video — mute=0, controls gốc YouTube */}
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

// ============================================================
// VIDEO SIDEBAR
// ============================================================
function VideoSidebar({ finalId, thumb, title, views }: {
  finalId: string; thumb: string; title: string; views: number;
}) {
  const [popup, setPopup] = useState<{ x: number; y: number; w: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function openPopup() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const w = Math.min(480, window.innerWidth - 16);
    const h = Math.round(w * 0.5625) + 36;
    const x = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
    const y = Math.max(8, Math.min(rect.top + rect.height / 2 - h / 2, window.innerHeight - h - 8));
    setPopup({ x, y, w });
  }

  return (
    <>
      {popup && <FloatingVideoPopup ytId={finalId} onClose={() => setPopup(null)} startX={popup.x} startY={popup.y} popupW={popup.w} />}
      <div ref={ref} style={{ marginBottom: 10 }}>
        <div onMouseEnter={openPopup} onClick={openPopup}
          style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#000', paddingBottom: '56.25%', cursor: 'pointer' }}>
          <img src={thumb || `https://img.youtube.com/vi/${finalId}/mqdefault.jpg`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt={title} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>▶</div>
          </div>
          {views > 0 && (
            <div style={{ position: 'absolute', bottom: 3, right: 5, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 3 }}>
              ▶ {formatNum(views)}
            </div>
          )}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, lineHeight: 1.35, color: '#333' }}>{title}</p>
      </div>
    </>
  );
}

// ============================================================
// VIDEO POST — trong feed
// ============================================================
function VideoPost({ ytId }: { ytId: string }) {
  const [popup, setPopup] = useState<{ x: number; y: number; w: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function openPopup() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const w = Math.min(640, window.innerWidth - 16);
    const h = Math.round(w * 0.5625) + 36;
    const x = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 8));
    const y = Math.max(8, Math.min(rect.top + rect.height / 2 - h / 2, window.innerHeight - h - 8));
    setPopup({ x, y, w });
  }

  return (
    <>
      {popup && <FloatingVideoPopup ytId={ytId} onClose={() => setPopup(null)} startX={popup.x} startY={popup.y} popupW={popup.w} />}
      <div ref={ref} onMouseEnter={openPopup} onClick={openPopup}
        style={{ paddingBottom: '56.25%', position: 'relative', background: '#000', cursor: 'pointer' }}>
        <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="video" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>▶</div>
        </div>
        <div style={{ position: 'absolute', bottom: 6, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>
          👆 Nhấn để xem
        </div>
      </div>
    </>
  );
}

// ============================================================
// POST MENU (3 chấm) — đúng actions
// ============================================================
function PostMenu({ post, currentUserId, onDelete, onReport }: {
  post: Post;
  currentUserId: string | null;
  onDelete: () => void;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.noi_dung || '');
  const [visibility, setVisibility] = useState(post.status === 'private' ? 'private' : 'public');
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthor = currentUserId === post.user_id;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleEdit() {
    if (!editText.trim()) return;
    await supabase.from('posts').update({ noi_dung: editText.trim() }).eq('id', post.id);
    setEditing(false);
    setOpen(false);
    window.location.reload();
  }

  async function handleDelete() {
    if (!confirm('Bạn chắc chắn muốn xóa bài này?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setOpen(false);
    onDelete();
  }

  async function handleVisibility(v: string) {
    setVisibility(v);
    await supabase.from('posts').update({ status: v === 'private' ? 'private' : 'active' }).eq('id', post.id);
    setOpen(false);
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>
        ⋯
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 28, background: '#fff',
          borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: 180, zIndex: 100, overflow: 'hidden',
        }}>
          {isAuthor ? (
            <>
              <button onClick={() => { setEditing(true); setOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✏️ Chỉnh sửa bài viết
              </button>
              <button onClick={() => handleVisibility(visibility === 'public' ? 'private' : 'public')}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                {visibility === 'public' ? '🔒 Chuyển riêng tư' : '🌐 Chuyển công khai'}
              </button>
              <div style={{ borderTop: '1px solid #f0f0f0' }} />
              <button onClick={handleDelete}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: 8 }}>
                🗑️ Xóa bài viết
              </button>
            </>
          ) : (
            <button onClick={() => { onReport(); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Báo cáo bài viết
            </button>
          )}
        </div>
      )}

      {/* Modal chỉnh sửa */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chỉnh sửa bài viết</h3>
              <button onClick={() => setEditing(false)} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={5}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditing(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                Hủy
              </button>
              <button onClick={handleEdit}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// POST CARD
// ============================================================
interface PostCardProps {
  post: Post; comments: Comment[]; liked: boolean; expanded: boolean;
  commentInput: string; currentUserAvatar: string; currentUserId: string | null;
  onLike: () => void; onToggleComments: () => void;
  onCommentChange: (v: string) => void; onCommentSubmit: () => void;
  onShare: () => void; onReport: () => void; onDelete: () => void;
}

function PostCard({ post, comments, liked, expanded, commentInput, currentUserAvatar, currentUserId, onLike, onToggleComments, onCommentChange, onCommentSubmit, onShare, onReport, onDelete }: PostCardProps) {
  const ytId = getYoutubeId(post.youtube_url);
  const avatar = post.profiles?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}&background=8B0000&color=fff`;
  const name = post.profiles?.full_name || 'Người dùng';
  const postText = post.noi_dung || post.content || '';
  const likeCount = post.like_count ?? post.likes ?? 0;

  return (
    <div id={`post-${post.id}`} style={{ background: '#fff', borderRadius: 10, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <img src={avatar} style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #f0f2f5', flexShrink: 0 }} alt="" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {/* Menu 3 chấm đúng */}
        <PostMenu post={post} currentUserId={currentUserId} onDelete={onDelete} onReport={onReport} />
      </div>

      <PostContent text={postText} />

      {post.image_url && (
        <img src={post.image_url} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} alt="" />
      )}
      {ytId && <VideoPost ytId={ytId} />}

      {/* Stats */}
      <div style={{ padding: '6px 12px', display: 'flex', gap: 12, fontSize: 12, color: '#888', borderBottom: '1px solid #e4e6ea' }}>
        <span>👍 {formatNum(likeCount)}</span>
        <span>💬 {formatNum(post.comment_count)}</span>
        <span>🔁 {formatNum(post.share_count)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', padding: '2px 4px' }}>
        {[
          { icon: '👍', label: 'Thích', color: liked ? '#c0392b' : '#65676b', action: onLike },
          { icon: '💬', label: 'Bình luận', color: '#65676b', action: onToggleComments },
          { icon: '🔁', label: 'Chia sẻ', color: '#65676b', action: onShare },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 2px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, fontSize: 12, fontWeight: 600, color: btn.color }}>
            <span>{btn.icon}</span>
            <span className="cgv-btn-label">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Comments */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e4e6ea', padding: '10px 12px' }}>
          {comments.length === 0 && <p style={{ color: '#888', fontSize: 12, margin: '0 0 10px' }}>Chưa có bình luận nào</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=U&background=8B0000&color=fff`}
                style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} alt="" />
              <div style={{ background: '#f0f2f5', borderRadius: 14, padding: '6px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{c.profiles?.full_name || 'Người dùng'}</div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{c.content}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{timeAgo(c.created_at)}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img src={currentUserAvatar} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} alt="" />
            <div style={{ flex: 1, display: 'flex', gap: 6, background: '#f0f2f5', borderRadius: 20, padding: '5px 10px', alignItems: 'center' }}>
              <input value={commentInput} onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onCommentSubmit()}
                placeholder="Viết bình luận..."
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13 }} />
              <button onClick={onCommentSubmit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    const { data: hotData } = await supabase.from('posts')
      .select('id, noi_dung, like_count, likes')
      .eq('status', 'active').order('like_count', { ascending: false }).limit(5);
    if (hotData) setHotPosts(hotData as Post[]);

    const { data: vidData } = await supabase.from('videos').select('*').limit(5);
    if (vidData) setFeaturedVideos(vidData);

    const { data: suKeData } = await supabase.from('profiles')
      .select('id, username, avatar_url, trust_score')
      .order('trust_score', { ascending: false }).limit(5);
    if (suKeData) setTopSuKe(suKeData);

    const { data: bannerData } = await supabase.from('banners').select('*').order('vi_tri');
    if (bannerData && bannerData.length > 0) setBanners(bannerData);
  }

  async function fetchPosts() {
    setLoading(true);
    let query = supabase.from('posts').select('*').eq('status', 'active');
    query = sortBy === 'newest'
      ? query.order('created_at', { ascending: false })
      : query.order('like_count', { ascending: false });
    const { data, error } = await query.limit(30);
    if (error) { console.error(error.message); setLoading(false); return; }
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profilesData } = await supabase.from('profiles')
        .select('id, full_name, avatar_url').in('id', userIds);
      const profileMap: Record<string, any> = {};
      profilesData?.forEach((p: any) => { profileMap[p.id] = p; });
      setPosts(data.map((p: any) => ({ ...p, profiles: profileMap[p.user_id] || null })) as Post[]);
    } else { setPosts([]); }
    setLoading(false);
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase.from('comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('post_id', postId).order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data as Comment[] }));
  }

  async function submitPost() {
    if (!postContent.trim() || !user) return;
    setSubmitting(true);
    let cleanYoutube = postYoutube.trim();
    if (cleanYoutube.includes('<iframe')) {
      const m = cleanYoutube.match(/src=["']([^"']+)["']/);
      cleanYoutube = m ? m[1] : '';
    }
    let uploadedImageUrl = '';
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const fileName = `posts/${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from('images').upload(fileName, imageFile, { upsert: true });
      if (!upErr && up) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        uploadedImageUrl = urlData.publicUrl;
      }
    }
    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id, noi_dung: postContent.trim(), youtube_url: cleanYoutube,
      image_url: uploadedImageUrl || null, comment_count: 0, share_count: 0, report_count: 0, status: 'active',
    }).select().single();
    if (error) { alert(`❌ Lỗi: ${error.message}`); setSubmitting(false); return; }
    if (data) {
      setPosts(prev => [{
        ...data, noi_dung: postContent.trim(), image_url: uploadedImageUrl || null, like_count: 0,
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
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, like_count: (p.like_count ?? p.likes ?? 0) + (already ? -1 : 1) } : p
    ));
    await supabase.rpc('toggle_like', { post_id: postId, delta: already ? -1 : 1 });
  }

  async function submitComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    const { data } = await supabase.from('comments')
      .insert({ post_id: postId, user_id: user.id, content: text })
      .select('*, profiles(full_name, avatar_url)').single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    }
  }

  function deletePost(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  function sharePost(postId: string) {
    const url = `${window.location.origin}/cong-dong?post=${postId}`;
    navigator.clipboard?.writeText(url).then(() => alert('✅ Đã copy link!'));
  }

  async function reportPost(postId: string) {
    if (!user) return;
    await supabase.rpc('report_post', { post_id: postId });
    alert('Đã báo cáo. Cảm ơn!');
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
  const currentUserId = user?.id ?? null;

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── POPUP ĐĂNG BÀI ── */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          <div ref={popupRef} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #e4e6ea', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Tạo bài viết</h3>
              <button onClick={() => setShowPopup(false)} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 17 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img src={userAvatar} style={{ width: 38, height: 38, borderRadius: '50%' }} alt="" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{userName}</span>
            </div>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì về gà của mình? 🐓"
              style={{ width: '100%', minHeight: 100, border: 'none', outline: 'none', resize: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
            {imagePreview ? (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <img src={imagePreview} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} alt="" />
                <button onClick={() => { setImageFile(null); setImagePreview(''); }}
                  style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 13 }}>×</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', marginTop: 8, padding: '8px', border: '1.5px dashed #ddd', borderRadius: 8, background: '#fafafa', color: '#888', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                📷 Thêm ảnh
              </button>
            )}
            <input value={postYoutube} onChange={e => setPostYoutube(e.target.value)}
              placeholder="🎬 Dán link YouTube (không bắt buộc)"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginTop: 8, boxSizing: 'border-box', outline: 'none', color: '#555' }} />
            <button onClick={submitPost} disabled={submitting || !postContent.trim()}
              style={{ width: '100%', marginTop: 12, padding: '12px', background: submitting ? '#e88' : postContent.trim() ? '#c0392b' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: postContent.trim() && !submitting ? 'pointer' : 'not-allowed' }}>
              {submitting ? '⏳ Đang đăng...' : '🚀 Đăng bài'}
            </button>
          </div>
        </div>
      )}

      {/* ── LAYOUT 3 CỘT (desktop) / 1 CỘT (mobile) ── */}
      <div className="cgv-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, padding: '12px 10px' }}>

        {/* CỘT TRÁI */}
        <aside className="cgv-left" style={{ position: 'sticky', top: 72, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 10 }}>
            {[
              { href: '/', icon: '🏠', label: 'Trang chủ' },
              { href: '/cong-dong', icon: '👥', label: 'Cộng đồng', active: true },
              { href: '/cho', icon: '🐓', label: 'Gà đang bán' },
              { href: '/thu-vien', icon: '🎬', label: 'Video' },
              { href: '/thu-vien', icon: '📚', label: 'Kiến thức' },
            ].map((item, idx) => (
              <Link key={`nav-${idx}`} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: item.active ? '#fdf0f0' : 'transparent', borderLeft: item.active ? '3px solid #c0392b' : '3px solid transparent', color: item.active ? '#c0392b' : '#333', fontWeight: item.active ? 700 : 400 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: 12, marginBottom: 10 }}>🏆 Top sự kê uy tín</div>
            {topSuKe.length === 0
              ? <p style={{ color: '#aaa', fontSize: 12 }}>Đang tải...</p>
              : topSuKe.map((sk, i) => {
                const skName = sk.username || 'Người dùng';
                const av = sk.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(skName)}&background=8B0000&color=fff`;
                return (
                  <Link key={sk.id} href={`/ho-so/${sk.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '3px 4px', borderRadius: 6 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={av} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt={skName} />
                        {i === 0 && <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 10 }}>👑</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{skName}</div>
                        {sk.trust_score > 0 && <div style={{ fontSize: 10, color: '#c0392b' }}>⭐ {sk.trust_score}</div>}
                      </div>
                    </div>
                  </Link>
                );
              })
            }
          </div>
        </aside>

        {/* CỘT GIỮA */}
        <main style={{ minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={userAvatar} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} alt="" />
              <div onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập!')}
                style={{ flex: 1, background: '#f0f2f5', borderRadius: 20, padding: '9px 14px', cursor: 'pointer', color: '#888', fontSize: 13, border: '1px solid #e4e6ea', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                Bạn đang nghĩ gì? 🐓
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTop: '1px solid #e4e6ea' }}>
              <button onClick={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập!')}
                style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                ✍️ Viết bài
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
            {([['newest', '🕐 Mới nhất'], ['hot', '🔥 Nổi bật']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                style={{ padding: '6px 14px', borderRadius: 18, border: 'none', background: sortBy === v ? '#c0392b' : '#fff', color: sortBy === v ? '#fff' : '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center', color: '#888', fontSize: 13 }}>⏳ Đang tải...</div>
          ) : posts.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
              <p style={{ color: '#888', marginBottom: 12, fontSize: 14 }}>Chưa có bài viết nào</p>
              <button onClick={() => setShowPopup(true)} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Viết bài đầu tiên
              </button>
            </div>
          ) : posts.map(post => (
            <PostCard
              key={post.id} post={post} comments={comments[post.id] || []}
              liked={!!likedPosts[post.id]} expanded={!!expandedComments[post.id]}
              commentInput={commentInputs[post.id] || ''} currentUserAvatar={userAvatar}
              currentUserId={currentUserId}
              onLike={() => likePost(post.id)} onToggleComments={() => toggleComments(post.id)}
              onCommentChange={v => setCommentInputs(prev => ({ ...prev, [post.id]: v }))}
              onCommentSubmit={() => submitComment(post.id)}
              onShare={() => sharePost(post.id)} onReport={() => reportPost(post.id)}
              onDelete={() => deletePost(post.id)}
            />
          ))}
        </main>

        {/* CỘT PHẢI */}
        <aside className="cgv-right" style={{ position: 'sticky', top: 72, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🎬 Video nổi bật</div>
            {featuredVideos.length === 0
              ? <p style={{ color: '#aaa', fontSize: 12 }}>Chưa có video</p>
              : featuredVideos.map((v: any) => {
                const ytRaw = v.youtube_url || v.embed_url || v.video_url || v.url || v.link || '';
                const ytId = getYoutubeId(ytRaw);
                if (!ytId) return null;
                const title = v.tieu_de || v.title || v.ten || 'Video';
                const views = v.luot_xem || v.views || v.view_count || 0;
                const thumb = v.thumbnail || v.anh_dai_dien || v.image_url || '';
                return <VideoSidebar key={v.id} finalId={ytId} thumb={thumb} title={title} views={views} />;
              })
            }
          </div>

          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#c0392b', marginBottom: 10 }}>🔥 Bài viết hot</div>
            {hotPosts.length === 0
              ? <p style={{ color: '#aaa', fontSize: 12 }}>Chưa có bài viết</p>
              : hotPosts.map(p => {
                const text = p.noi_dung || p.content || '';
                const preview = text.length > 60 ? text.slice(0, 60) + '...' : text;
                return (
                  <div key={p.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => document.getElementById(`post-${p.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
                    <span style={{ color: '#c0392b', marginTop: 2, flexShrink: 0 }}>▪</span>
                    <span style={{ fontSize: 12, color: '#333', lineHeight: 1.4 }}>{preview}</span>
                  </div>
                );
              })
            }
          </div>

          {(banners.length > 0 ? banners : [
            { vi_tri: 1, tieu_de: 'Vitamin B12', tieu_de_phu: 'CHO GÀ', link: '' },
            { vi_tri: 2, tieu_de: 'Máy ấp trứng', tieu_de_phu: 'Tự động', link: '' },
            { vi_tri: 3, tieu_de: 'Thức ăn', tieu_de_phu: 'Cho gà đá', link: '' },
          ] as Banner[]).map((b, idx) => {
            const inner = (
              <div style={{ background: bannerColors[idx] || '#7B1818', borderRadius: 8, padding: '11px 12px', marginBottom: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{bannerEmojis[idx] || '📢'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{b.tieu_de}</div>
                  {b.tieu_de_phu && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{b.tieu_de_phu}</div>}
                </div>
              </div>
            );
            return b.link
              ? <a key={b.vi_tri} href={b.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
              : <div key={b.vi_tri}>{inner}</div>;
          })}
        </aside>
      </div>

      {/* ── CSS RESPONSIVE ── */}
      <style>{`
        /* Tablet */
        @media (max-width: 1100px) {
          .cgv-grid { grid-template-columns: 180px 1fr 220px !important; gap: 10px !important; padding: 10px 8px !important; }
        }
        @media (max-width: 900px) {
          .cgv-grid { grid-template-columns: 140px 1fr 160px !important; gap: 7px !important; padding: 8px 5px !important; }
          .cgv-left > div, .cgv-right > div { padding: 10px !important; }
        }
        /* Mobile — 1 cột, ẩn sidebar trái và phải */
        @media (max-width: 680px) {
          .cgv-grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding: 6px 0 !important;
          }
          .cgv-left { display: none !important; }
          .cgv-right { display: none !important; }
          main {
            width: 100% !important;
            padding: 0 !important;
          }
        }
        .cgv-btn-label { display: none; }
        @media (min-width: 480px) { .cgv-btn-label { display: inline; } }
      `}</style>
    </div>
  );
}
