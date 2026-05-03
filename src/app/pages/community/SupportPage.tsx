import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeInfo,
  ChevronRight,
  Edit3,
  EyeOff,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  Shield,
  Smile,
  Trash2,
  Unlock,
  User,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Wrench,
  DollarSign,
  Coins,
  PackageMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { listenChange, notifyChange } from '../../utils/realtimeSync';
import { useAuth } from '../../context/AuthContext.tsx';
import { supabase } from '../../utils/supabase.ts';
import { X } from 'lucide-react';

type Category = 'finance' | 'coin' | 'account' | 'security' | 'lost' | 'technical' | 'other';
type EmojiSize = 'sm' | 'md' | 'lg';
type MediaType = 'image' | 'video' | 'file';

type Role = string;

type LoadedUser = {
  manguoidung: string;
  email: string;
  tennguoidung: string;
  chucnang: string;
};

type BaidoRow = {
  mabaido: string;
  manguoidung: string;
  tenbaido: string;
  mathamgia: string;
  diachi?: string | null;
  sodienthoai?: string | null;
  giohoatdong?: string | null;
  mota?: string | null;
  hinhanh?: string | null;
  congkhai?: boolean | null;
  danhgia?: boolean | null;
};

type SupportMember = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

type FeedMedia = {
  id: string;
  url: string;
  type: MediaType;
  name: string;
  uploadedBy?: string | null;
};

type PostEmoji = {
  reactionId: string;
  emojiId: string;
  emoji: string;
  size: EmojiSize;
};

type CommentEmoji = {
  reactionId: string;
  emojiId: string;
  emoji: string;
  size: EmojiSize;
};

type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  isRecalled: boolean;
  emotes: CommentEmoji[];
  attachments: FeedMedia[];
};

type PostItem = {
  id: string;
  authorId: string;
  authorName: string;
  communityId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  category: Category;
  media: FeedMedia[];
  comments: CommentItem[];
  postEmotes: PostEmoji[];
  isDeleted: boolean;
  isLocked: boolean;
  isPrivate: boolean;
  members: SupportMember[];
  memberUserIds: string[];
  replyCount: number;
  lastActivityAt: string;
};

type EmojiItem = {
  id: string;
  character: string;
  slug?: string | null;
  unicodeName?: string | null;
  codePoint?: string | null;
  group?: string | null;
  subGroup?: string | null;
};

type PendingEmoji = {
  emojiId: string;
  size: EmojiSize;
};

type CategoryMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  sidebarActive: string;
  sidebarIdle: string;
};

const CATEGORY_ORDER: Category[] = ['finance', 'coin', 'account', 'security', 'lost', 'technical', 'other'];




const CATEGORY_META: Record<Category, CategoryMeta> = {
  finance: {
    label: 'Tài chính',
    icon: DollarSign,
    badge: 'bg-emerald-100 text-emerald-700',
    sidebarActive: 'bg-emerald-100 text-emerald-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  coin: {
    label: 'Xu ảo',
    icon: Coins,
    badge: 'bg-amber-100 text-amber-700',
    sidebarActive: 'bg-amber-100 text-amber-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  account: {
    label: 'Tài khoản',
    icon: User,
    badge: 'bg-blue-100 text-blue-700',
    sidebarActive: 'bg-blue-100 text-blue-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  security: {
    label: 'Bảo mật',
    icon: Shield,
    badge: 'bg-red-100 text-red-700',
    sidebarActive: 'bg-red-100 text-red-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  lost: {
    label: 'Mất cắp',
    icon: PackageMinus,
    badge: 'bg-orange-100 text-orange-700',
    sidebarActive: 'bg-orange-100 text-orange-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  technical: {
    label: 'Kỹ thuật',
    icon: Wrench,
    badge: 'bg-purple-100 text-purple-700',
    sidebarActive: 'bg-purple-100 text-purple-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
  other: {
    label: 'Khác',
    icon: HelpCircle,
    badge: 'bg-gray-100 text-gray-700',
    sidebarActive: 'bg-gray-100 text-gray-700',
    sidebarIdle: 'hover:bg-gray-50 text-gray-700',
  },
};

const EMOJI_SIZE_CLASS: Record<EmojiSize, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

const EMOJI_BUTTON_CLASS: Record<EmojiSize, string> = {
  sm: 'h-8 w-8 text-lg',
  md: 'h-10 w-10 text-xl',
  lg: 'h-12 w-12 text-2xl',
};

const allowedRoles = new Set(['admin', 'support', 'provider']);
const MAX_ATTACHMENTS = 5;
const STORAGE_BUCKET = 'CongDong';

const nowIso = () => new Date().toISOString();
const safeText = (value: unknown, fallback = '') => String(value ?? fallback).trim();
const isImageFile = (file: File) => file.type.startsWith('image/');
const isVideoFile = (file: File) => file.type.startsWith('video/');
const normalizeMediaType = (value?: string | null): MediaType => {
  const v = String(value ?? '').toLowerCase();
  if (v.startsWith('video')) return 'video';
  if (v.startsWith('image')) return 'image';
  return 'file';
};
const formatDate = (value: string | null | undefined) =>
  new Date(String(value ?? nowIso())).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const mapEmoji = (row: any): EmojiItem => ({
  id: String(row.macamxuc),
  character: String(row.bieutuong ?? ''),
  slug: row.slug ?? null,
  unicodeName: row.unicode_name ?? null,
  codePoint: row.code_point ?? null,
  group: row.nhom ?? null,
  subGroup: row.nhom_con ?? null,
});

const mapMedia = (row: any): FeedMedia => ({
  id: String(row.mahinhanh ?? row.id ?? crypto.randomUUID()),
  url: String(row.hinhanh ?? ''),
  type: normalizeMediaType(row.loaifile),
  name: String(row.ten_file ?? 'file'),
  uploadedBy: row.uploaded_by ?? null,
});

const summarizeAttachments = (items: FeedMedia[]) => {
  const count = { image: 0, video: 0, file: 0 };
  items.forEach((item) => count[item.type]++);
  const parts: string[] = [];
  if (count.image) parts.push(`${count.image} ảnh`);
  if (count.video) parts.push(`${count.video} video`);
  if (count.file) parts.push(`${count.file} tệp`);
  return parts.join(' • ');
};

const summarizeComment = (comment?: CommentItem | null) => {
  if (!comment) return 'Chưa có bình luận';
  if (comment.isRecalled) return 'Bình luận đã được thu hồi';
  const text = comment.content.trim();
  const attach = summarizeAttachments(comment.attachments);
  const emotes = comment.emotes.map((e) => e.emoji).slice(0, 4).join(' ');
  if (text && attach) return `${text.slice(0, 70)}${text.length > 70 ? '…' : ''} • ${attach}`;
  if (text) return `${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`;
  if (attach) return attach;
  if (emotes) return emotes;
  return 'Chưa có nội dung';
};

const uploadFilesToBucket = async (files: File[], prefix: string): Promise<FeedMedia[]> => {
  const results: FeedMedia[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    results.push({
      id: crypto.randomUUID(),
      url: data.publicUrl,
      type: isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : 'file',
      name: file.name,
    });
  }
  return results;
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const toSetMap = (rows: any[], keyA: string, keyB: string) => {
  const map = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const a = String(row?.[keyA] ?? '');
    const b = String(row?.[keyB] ?? '');
    if (!a || !b) return;
    const set = map.get(a) ?? new Set<string>();
    set.add(b);
    map.set(a, set);
  });
  return map;
};

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const communityCode = safeText(searchParams.get('code'));
  const fixedType = safeText(searchParams.get('type')).toLowerCase();
  const forcedCategory = (CATEGORY_ORDER.includes(fixedType as Category) ? fixedType : '') as Category | '';

  const currentUserId = safeText((user as any)?.manguoidung ?? (user as any)?.id);
  const currentUserName = safeText((user as any)?.tennguoidung ?? (user as any)?.name, 'Người dùng');
  const currentUserEmail = safeText((user as any)?.email);
  const currentUserRole = safeText((user as any)?.chucnang ?? (user as any)?.role, 'owner').toLowerCase();
  const isElevated = allowedRoles.has(currentUserRole);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [baido, setBaido] = useState<BaidoRow | null>(null);
  const [canManageConfig, setCanManageConfig] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(forcedCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMemberPanel, setShowMemberPanel] = useState(true);

  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState<Category>(forcedCategory || 'other');
  const [createPrivate, setCreatePrivate] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createEmojis, setCreateEmojis] = useState<PendingEmoji[]>([]);
  const [createEmojiSize, setCreateEmojiSize] = useState<EmojiSize>('md');
  const [showCreateEmojiPicker, setShowCreateEmojiPicker] = useState(false);

  const [composerText, setComposerText] = useState('');
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerEmojis, setComposerEmojis] = useState<PendingEmoji[]>([]);
  const [composerEmojiSize, setComposerEmojiSize] = useState<EmojiSize>('md');
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);








const [memberEmail, setMemberEmail] = useState('');
const [editingPostId, setEditingPostId] = useState<string | null>(null);
const [editingTitle, setEditingTitle] = useState('');
const [editingContent, setEditingContent] = useState('');
const [actionLoading, setActionLoading] = useState(false);

const [editMedia, setEditMedia] = useState<FeedMedia[]>([]);
const [editFiles, setEditFiles] = useState<File[]>([]);
const [editEmojis, setEditEmojis] = useState<PendingEmoji[]>([]);
const [editEmojiSize, setEditEmojiSize] = useState<EmojiSize>('md');
const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);






  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number; size: EmojiSize }[]>([]);

  const composerFileRef = useRef<HTMLInputElement | null>(null);
  const createFileRef = useRef<HTMLInputElement | null>(null);
  const realtimeRef = useRef<any>(null);
  const refreshInFlight = useRef(false);
  const refreshQueued = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);
  const emojiCatalogRef = useRef<EmojiItem[]>([]);

  const [editingFiles, setEditingFiles] = useState<File[]>([]);
const [editingEmojis, setEditingEmojis] = useState<{ emojiId: string; size: EmojiSize }[]>([]);

  const emojiMap = useMemo(() => new Map(emojis.map((e) => [e.id, e.character])), [emojis]);
  const getEmojiById = (emojiId: string) =>
  emojiMap.get(emojiId) ||
  emojiCatalogRef.current.find((e) => e.id === emojiId)?.character ||
  '🙂';
  const selectedPost = useMemo(() => posts.find((p) => p.id === selectedPostId) ?? null, [posts, selectedPostId]);

  const currentBaidoId = baido?.mabaido ?? null;


  

  const canManageThreadConfig = (post?: PostItem | null) => {
    if (!post || !baido) return false;
    if (String(post.communityId) !== String(baido.mabaido)) return false;
    if (isElevated) return true;
    return false;
  };
  const clearPostExtras = async (postId: string) => {
  const { error: emoteError } = await supabase
    .from('camxuc_baidang')
    .delete()
    .eq('mabangcongdong', postId);

  if (emoteError) throw emoteError;

  const { error: mediaError } = await supabase
    .from('hinhanh')
    .delete()
    .eq('mabangcongdong', postId);

  if (mediaError) throw mediaError;
};

const clearCommentExtras = async (commentId: string) => {
  const { data: reactionRows, error: reactionSelectError } = await supabase
    .from('ct_baicongdong_camxuc')
    .select('id')
    .eq('mactbaicongdong', commentId);

  if (reactionSelectError) throw reactionSelectError;

  const reactionIds = (reactionRows ?? [])
    .map((row: any) => String(row.id))
    .filter(Boolean);

  const { error: mediaError } = await supabase
    .from('hinhanh_binhluan')
    .delete()
    .eq('mactbaicongdong', commentId);

  if (mediaError) throw mediaError;

  const { error: emoteError } = await supabase
    .from('ct_baicongdong_camxuc')
    .delete()
    .eq('mactbaicongdong', commentId);

  if (emoteError) throw emoteError;

  if (reactionIds.length > 0) {
    const { error: sizeError } = await supabase
      .from('kichthuoccamxuc')
      .delete()
      .in('ct_camxuc_id', reactionIds);

    if (sizeError) throw sizeError;
  }
};




  const canEditOwnPost = (post: PostItem) => !post.isDeleted && post.authorId === currentUserId;
  const canDeleteOwnPost = (post: PostItem) => !post.isDeleted && post.authorId === currentUserId;
  const canViewPost = (post: PostItem) => !post.isPrivate || isElevated || post.memberUserIds.includes(currentUserId);
  const canChatPost = (post: PostItem) => !post.isDeleted && !post.isLocked && canViewPost(post);

  const visiblePosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedCategory !== 'all' && post.category !== selectedCategory) return false;
      if (q) {
        const haystack = [
          post.title,
          post.content,
          post.authorName,
          post.comments.map((c) => c.userName).join(' '),
          post.comments.map((c) => c.content).join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [posts, selectedCategory, searchQuery]);

  const activePost = useMemo(() => {
    if (!selectedPostId) return null;
    return visiblePosts.find((p) => p.id === selectedPostId) ?? posts.find((p) => p.id === selectedPostId) ?? null;
  }, [posts, selectedPostId, visiblePosts]);

  const selectedPostVisible = activePost ? canViewPost(activePost) : false;
  const selectedPostChatable = activePost ? canChatPost(activePost) : false;
  const selectedPostManageable = activePost ? canManageThreadConfig(activePost) : false;

  const requestRefresh = () => {
    if (!aliveRef.current) return;
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return;
    }
    void loadAllData(true);
  };

  const flashEmoji = (emoji: string, size: EmojiSize = 'md') => {
    const item = {
      id: crypto.randomUUID(),
      emoji,
      x: Math.random() * 70 + 15,
      y: Math.random() * 55 + 18,
      size,
    };
    setFloatingEmojis((prev) => [...prev, item]);
    window.setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((x) => x.id !== item.id));
    }, 1400);
  };

  const loadEmojiCatalog = async () => {
    const { data, error } = await supabase
      .from('camxuc')
      .select('macamxuc,bieutuong,slug,unicode_name,code_point,nhom,nhom_con')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const mapped = (data ?? []).map(mapEmoji);
    setEmojis(mapped);
    emojiCatalogRef.current = mapped;
  };

  const loadAllData = async (silent = false) => {
    if (!communityCode) return;
    if (!currentUserId) {
      setLoading(false);
      setErrorMsg('Không xác định được người dùng đăng nhập');
      return;
    }

    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return;
    }
    refreshInFlight.current = true;

    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);

      const { data: baidoRow, error: baidoError } = await supabase
        .from('baido')
        .select('mabaido,manguoidung,tenbaido,mathamgia,diachi,sodienthoai,giohoatdong,mota,hinhanh,congkhai,danhgia')
        .eq('mathamgia', communityCode)
        .maybeSingle();
      if (baidoError) throw baidoError;
      if (!baidoRow) throw new Error('Không tìm thấy bãi đỗ tương ứng');

      const currentBaido = baidoRow as BaidoRow;
      setBaido(currentBaido);

      const supportQuery = supabase
        .from('ctnhanvien')
        .select('manguoidung,mabaido,duocchuyenbai,nghiviec')
        .eq('mabaido', currentBaido.mabaido)
        .eq('manguoidung', currentUserId)
        .maybeSingle();

      const adminQuery = supabase
        .from('ctadmin')
        .select('manguoidung')
        .eq('manguoidung', currentUserId)
        .maybeSingle();

      const [{ data: supportRow, error: supportError }, { data: adminRow, error: adminError }] = await Promise.all([
        supportQuery,
        adminQuery,
      ]);
      if (supportError) throw supportError;
      if (adminError) throw adminError;

      const isOwner = String(currentBaido.manguoidung ?? '') === currentUserId;
      const isSupport = Boolean((supportRow as any)?.duocchuyenbai) && !Boolean((supportRow as any)?.nghiviec);
      const isAdmin = Boolean(adminRow);
      setCanManageConfig(Boolean(isAdmin || isSupport || isOwner));

      const postSelect = [
        'mabangcongdong',
        'manguoidung',
        'mabaido',
        'tieude',
        'noidung',
        'hinhanh',
        'luotthich',
        'created_at',
        'phanloai',
        'updated_at',
        'is_deleted',
        'is_locked',
      ].join(',');

      let postQuery = supabase
        .from('baicongdong')
        .select(postSelect)
        .eq('mabaido', currentBaido.mabaido)
        .eq('is_deleted', false)
        .in('phanloai', CATEGORY_ORDER);

      if (forcedCategory) postQuery = postQuery.eq('phanloai', forcedCategory);

      const { data: postRows, error: postError } = await postQuery
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (postError) throw postError;

      const postList = (postRows ?? []) as any[];
      const postIds = postList.map((row) => String(row.mabangcongdong ?? '')).filter(Boolean);
      if (postIds.length === 0) {
        setPosts([]);
        setSelectedPostId(null);
        return;
      }

      const [
        { data: privateRows, error: privateError },
        { data: memberRows, error: memberError },
        { data: commentRows, error: commentError },
        { data: postMediaRows, error: postMediaError },
        { data: commentMediaRows, error: commentMediaError },
        { data: postEmojiRows, error: postEmojiError },
        { data: commentEmojiRows, error: commentEmojiError },
        { data: emojiSizeRows, error: emojiSizeError },
      ] = await Promise.all([
        supabase.from('riengtu').select('mabangcongdong,riengtu').in('mabangcongdong', postIds),
        supabase.from('thanhvienhopthoai').select('manguoidung,mabangcongdong').in('mabangcongdong', postIds),
        supabase
          .from('ct_baicongdong')
          .select('mactbaicongdong,manguoidung,mabangcongdong,noidung,created_at,updated_at,is_recalled,recalled_at')
          .in('mabangcongdong', postIds)
          .order('created_at', { ascending: true }),
        supabase.from('hinhanh').select('mahinhanh,hinhanh,created_at,mabangcongdong,uploaded_by,loaifile,ten_file').in('mabangcongdong', postIds).order('created_at', { ascending: true }),
        supabase.from('hinhanh_binhluan').select('mahinhanh,mactbaicongdong,hinhanh,uploaded_by,loaifile,ten_file,created_at').order('created_at', { ascending: true }),
        supabase.from('camxuc_baidang').select('id,mabangcongdong,macamxuc,size,created_at').order('created_at', { ascending: true }),
        supabase.from('ct_baicongdong_camxuc').select('id,mactbaicongdong,macamxuc,created_at').order('created_at', { ascending: true }),
        supabase.from('kichthuoccamxuc').select('id,ct_camxuc_id,kichthuoc,created_at').order('created_at', { ascending: true }),
      ]);

      if (privateError) throw privateError;
      if (memberError) throw memberError;
      if (commentError) throw commentError;
      if (postMediaError) throw postMediaError;
      if (commentMediaError) throw commentMediaError;
      if (postEmojiError) throw postEmojiError;
      if (commentEmojiError) throw commentEmojiError;
      if (emojiSizeError) throw emojiSizeError;

      const privateMap = new Map<string, boolean>();
      (privateRows ?? []).forEach((row: any) => privateMap.set(String(row.mabangcongdong), Boolean(row.riengtu)));

      const memberMap = toSetMap(memberRows ?? [], 'mabangcongdong', 'manguoidung');
      const commentsByPost = new Map<string, any[]>();
      (commentRows ?? []).forEach((row: any) => {
        const postId = String(row.mabangcongdong ?? '');
        if (!postId) return;
        const arr = commentsByPost.get(postId) ?? [];
        arr.push(row);
        commentsByPost.set(postId, arr);
      });

      const postMediaMap = new Map<string, FeedMedia[]>();
      (postMediaRows ?? []).forEach((row: any) => {
        const postId = String(row.mabangcongdong ?? '');
        if (!postId) return;
        const arr = postMediaMap.get(postId) ?? [];
        arr.push(mapMedia(row));
        postMediaMap.set(postId, arr);
      });

      const commentMediaMap = new Map<string, FeedMedia[]>();
      (commentMediaRows ?? []).forEach((row: any) => {
        const commentId = String(row.mactbaicongdong ?? '');
        if (!commentId) return;
        const arr = commentMediaMap.get(commentId) ?? [];
        arr.push(mapMedia(row));
        commentMediaMap.set(commentId, arr);
      });


const postEmojiMap = new Map<string, PostEmoji[]>();
(postEmojiRows ?? []).forEach((row: any) => {
  const postId = String(row.mabangcongdong ?? '');
  const emojiId = String(row.macamxuc ?? '');
  if (!postId || !emojiId) return;

  const arr = postEmojiMap.get(postId) ?? [];
  arr.push({
    reactionId: String(row.id ?? crypto.randomUUID()),
    emojiId,
    emoji: getEmojiById(emojiId),
    size: (row.size === 'sm' || row.size === 'lg' ? row.size : 'md') as EmojiSize,
  });
  postEmojiMap.set(postId, arr);
});

      const sizeByReactionId = new Map<string, EmojiSize>();
      (emojiSizeRows ?? []).forEach((row: any) => {
        const reactionId = String(row.ct_camxuc_id ?? '');
        if (!reactionId) return;
        const size = String(row.kichthuoc ?? 'md') as EmojiSize;
        sizeByReactionId.set(reactionId, size === 'sm' || size === 'lg' ? size : 'md');
      });

      const commentEmojiMap = new Map<string, CommentEmoji[]>();
      (commentEmojiRows ?? []).forEach((row: any) => {
        const reactionId = String(row.id ?? '');
        const commentId = String(row.mactbaicongdong ?? '');
        const emojiId = String(row.macamxuc ?? '');
        if (!reactionId || !commentId || !emojiId) return;
        const arr = commentEmojiMap.get(commentId) ?? [];
        arr.push({
          reactionId,
          emojiId,
          emoji: getEmojiById(emojiId),
          size: sizeByReactionId.get(reactionId) ?? 'md',
        });
        commentEmojiMap.set(commentId, arr);
      });

      const userIds = uniq([
        ...postList.map((row) => String(row.manguoidung ?? '')).filter(Boolean),
        ...(commentRows ?? []).map((row: any) => String(row.manguoidung ?? '')).filter(Boolean),
        ...(memberRows ?? []).map((row: any) => String(row.manguoidung ?? '')).filter(Boolean),
        currentUserId,
      ]);

      const { data: userRows, error: userError } = await supabase
        .from('nguoidung')
        .select('manguoidung,email,tennguoidung,updated_at,chucnang,mapinnguoidung')
        .in('manguoidung', userIds);
      if (userError) throw userError;

      const userMap = new Map<string, LoadedUser>();
      (userRows ?? []).forEach((row: any) => {
        userMap.set(String(row.manguoidung), {
          manguoidung: String(row.manguoidung),
          email: String(row.email ?? ''),
          tennguoidung: String(row.tennguoidung ?? 'Người dùng'),
          chucnang: String(row.chucnang ?? 'owner'),
        });
      });

      const mappedPosts: PostItem[] = postList.map((row) => {
        const postId = String(row.mabangcongdong ?? '');
        const postComments = (commentsByPost.get(postId) ?? []).map((comment: any) => {
          const commentId = String(comment.mactbaicongdong ?? '');
          const author = userMap.get(String(comment.manguoidung ?? '')) ?? {
            manguoidung: String(comment.manguoidung ?? ''),
            email: '',
            tennguoidung: 'Người dùng',
            chucnang: 'owner',
          };
          return {
            id: commentId,
            postId,
            userId: String(comment.manguoidung ?? ''),
            userName: author.tennguoidung,
            content: String(comment.noidung ?? ''),
            createdAt: String(comment.created_at ?? nowIso()),
            updatedAt: comment.updated_at ?? null,
            isRecalled: Boolean(comment.is_recalled),
            emotes: commentEmojiMap.get(commentId) ?? [],
            attachments: commentMediaMap.get(commentId) ?? [],
          } as CommentItem;
        });

        const memberIds = Array.from(memberMap.get(postId) ?? new Set<string>());
        const members = memberIds.map((uid) => {
          const u = userMap.get(uid) ?? {
            manguoidung: uid,
            email: '',
            tennguoidung: 'Người dùng',
            chucnang: 'owner',
          };
          return { userId: uid, email: u.email, name: u.tennguoidung, role: u.chucnang } as SupportMember;
        });

        const lastComment = postComments.at(-1) ?? null;
        const category = CATEGORY_ORDER.includes(String(row.phanloai) as Category) ? (String(row.phanloai) as Category) : 'other';
        return {
          id: postId,
          authorId: String(row.manguoidung ?? ''),
          authorName: userMap.get(String(row.manguoidung ?? ''))?.tennguoidung ?? 'Người dùng',
          communityId: String(row.mabaido ?? currentBaido.mabaido),
          title: String(row.tieude ?? ''),
          content: String(row.noidung ?? ''),
          createdAt: String(row.created_at ?? nowIso()),
          updatedAt: row.updated_at ?? null,
          category,
          media: postMediaMap.get(postId) ?? [],
          comments: postComments,
          postEmotes: postEmojiMap.get(postId) ?? [],
          isDeleted: Boolean(row.is_deleted),
          isLocked: Boolean(row.is_locked),
          isPrivate: Boolean(privateMap.get(postId)),
          members,
          memberUserIds: memberIds,
          replyCount: postComments.length,
          lastActivityAt: String(lastComment?.createdAt ?? row.updated_at ?? row.created_at ?? nowIso()),
        };
      });

      mappedPosts.sort((a, b) => +new Date(b.lastActivityAt) - +new Date(a.lastActivityAt));
      setPosts(mappedPosts);
      setSelectedPostId((prev) => {
        if (prev && mappedPosts.some((p) => p.id === prev && canViewPost(p))) return prev;
        const firstVisible = mappedPosts.find((p) => canViewPost(p));
        return firstVisible?.id ?? mappedPosts[0]?.id ?? null;
      });
    } catch (err: any) {
      console.error('LOAD DATA ERROR:', err);
      setPosts([]);
      setSelectedPostId(null);
      setErrorMsg(err?.message ?? 'Không tải được dữ liệu.');
    } finally {
      if (!silent) setLoading(false);
      refreshInFlight.current = false;
      if (refreshQueued.current) {
        refreshQueued.current = false;
        void loadAllData(true);
      }
    }
  };

  const openPost = (post: PostItem) => {
    if (!canViewPost(post)) {
      toast.error('Bạn không có quyền xem bài này');
      return;
    }
  setSelectedPostId((prev) => (prev === post.id ? null : post.id));
  setShowSettings(false);
  setEditingPostId(null);
  };

const startEditPost = (post: PostItem) => {
  if (!canEditOwnPost(post)) {
    toast.error('Bạn chỉ được sửa bài của chính mình');
    return;
  }

  setSelectedPostId(post.id);
  setShowSettings(false);

  setEditingPostId(post.id);
  setEditingTitle(post.title);
  setEditingContent(post.content);

  setEditMedia(post.media.map((item) => ({ ...item })));
  setEditFiles([]);
  setEditEmojis((post.postEmotes ?? []).map((item) => ({
    emojiId: item.emojiId,
    size: item.size ?? 'md',
  })));
  setEditEmojiSize(post.postEmotes?.[0]?.size ?? 'md');
  setShowEditEmojiPicker(false);
};

const removeEditMedia = (index: number) => {
  setEditMedia((prev) => prev.filter((_, i) => i !== index));
};

const removeEditEmoji = (index: number) => {
  setEditEmojis((prev) => prev.filter((_, i) => i !== index));
};

const pickEditEmoji = (emojiId: string) => {
  const emoji = emojiMap.get(emojiId);
  if (!emoji) return;

  setEditEmojis((prev) => {
    if (prev.length >= 10) return prev;
    return [...prev, { emojiId, size: editEmojiSize }];
  });

  flashEmoji(emoji, editEmojiSize);
};



const applyPostEdit = async (post: PostItem) => {
  if (!canEditOwnPost(post)) return toast.error('Bạn chỉ được sửa bài của chính mình');

  const title = editingTitle.trim();
  const content = editingContent.trim();
  if (!title || !content) return toast.error('Vui lòng nhập tiêu đề và nội dung');

  setActionLoading(true);
  try {
    const uploaded = editFiles.length > 0
      ? await uploadFilesToBucket(editFiles.slice(0, Math.max(0, MAX_ATTACHMENTS - editMedia.length)), `posts/${post.id}`)
      : [];

    const { error: postUpdateError } = await supabase
      .from('baicongdong')
      .update({ tieude: title, noidung: content, updated_at: nowIso() })
      .eq('mabangcongdong', post.id);

    if (postUpdateError) throw postUpdateError;

    const { error: emoteDeleteError } = await supabase
      .from('camxuc_baidang')
      .delete()
      .eq('mabangcongdong', post.id);

    if (emoteDeleteError) throw emoteDeleteError;

    if (editEmojis.length > 0) {
      const { error: emoteInsertError } = await supabase.from('camxuc_baidang').insert(
        editEmojis.map((item) => ({
          mabangcongdong: post.id,
          macamxuc: item.emojiId,
          size: item.size,
        })),
      );
      if (emoteInsertError) throw emoteInsertError;
    }

    const { error: mediaDeleteError } = await supabase
      .from('hinhanh')
      .delete()
      .eq('mabangcongdong', post.id);

    if (mediaDeleteError) throw mediaDeleteError;

    const mediaRows = [
      ...editMedia.map((item) => ({
        hinhanh: item.url,
        mabangcongdong: post.id,
        uploaded_by: item.uploadedBy ?? currentUserId,
        loaifile: item.type,
        ten_file: item.name,
      })),
      ...uploaded.map((item) => ({
        hinhanh: item.url,
        mabangcongdong: post.id,
        uploaded_by: currentUserId,
        loaifile: item.type,
        ten_file: item.name,
      })),
    ];

    if (mediaRows.length > 0) {
      const { error: mediaInsertError } = await supabase.from('hinhanh').insert(mediaRows);
      if (mediaInsertError) throw mediaInsertError;
    }

    setEditingPostId(null);
    setEditingTitle('');
    setEditingContent('');
    setEditMedia([]);
    setEditFiles([]);
    setEditEmojis([]);
    setEditEmojiSize('md');
    setShowEditEmojiPicker(false);

    notifyChange(communityCode);
    requestRefresh();
    toast.success('Đã cập nhật bài viết');
  } catch (err) {
    console.error('UPDATE POST ERROR:', err);
    toast.error('Không sửa được bài viết');
  } finally {
    setActionLoading(false);
  }
};

 
const handleDeletePost = async (postId: string) => {
  try {
    const { error } = await supabase
      .from('baicongdong')
      .update({
        is_deleted: true,
        updated_at: nowIso() // nếu mày có field này
      })
      .eq('mabangcongdong', postId);

    if (error) throw error;

    toast.success('Đã xóa bài');

    requestRefresh(); // nhớ reload lại list
  } catch (err) {
    console.error(err);
    toast.error('Xóa thất bại');
  }
};

  
  const setPrivacy = async (post: PostItem, nextValue: boolean) => {
    if (!canManageThreadConfig(post)) return toast.error('Bạn không có quyền cấu hình riêng tư');
    setActionLoading(true);
    try {
      const { error } = await supabase.from('riengtu').upsert(
        { mabangcongdong: post.id, riengtu: nextValue },
        { onConflict: 'mabangcongdong' },
      );
      if (error) throw error;
      notifyChange(communityCode);
      requestRefresh();
      toast.success(nextValue ? 'Đã bật riêng tư' : 'Đã tắt riêng tư');
    } catch (err) {
      console.error('PRIVACY ERROR:', err);
      toast.error('Không cập nhật được riêng tư');
    } finally {
      setActionLoading(false);
    }
  };

  const setLock = async (post: PostItem, nextValue: boolean) => {
    if (!canManageThreadConfig(post)) return toast.error('Bạn không có quyền khóa bài');
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('baicongdong')
        .update({ is_locked: nextValue, updated_at: nowIso() })
        .eq('mabangcongdong', post.id);
      if (error) throw error;
      notifyChange(communityCode);
      requestRefresh();
      toast.success(nextValue ? 'Đã khóa bài' : 'Đã mở khóa bài');
    } catch (err) {
      console.error('LOCK ERROR:', err);
      toast.error('Không cập nhật được trạng thái khóa');
    } finally {
      setActionLoading(false);
    }
  };

  const addMemberByEmail = async () => {
    if (!activePost) return;
    if (!canManageThreadConfig(activePost)) return toast.error('Bạn không có quyền quản lý thành viên');
    const email = memberEmail.trim().toLowerCase();
    if (!email) return toast.error('Nhập email cần thêm');
    setActionLoading(true);
    try {
      const { data: userRow, error: userError } = await supabase
        .from('nguoidung')
        .select('manguoidung,email,tennguoidung,chucnang')
        .eq('email', email)
        .maybeSingle();
      if (userError) throw userError;
      if (!userRow) return toast.error('Không tìm thấy email trong bảng người dùng');
      const targetUserId = String((userRow as any).manguoidung);
      if (activePost.memberUserIds.includes(targetUserId)) return toast.info('Thành viên này đã có trong bài viết');
      const { error } = await supabase.from('thanhvienhopthoai').insert({ manguoidung: targetUserId, mabangcongdong: activePost.id });
      if (error) throw error;
      setMemberEmail('');
      notifyChange(communityCode);
      requestRefresh();
      toast.success('Đã thêm thành viên');
    } catch (err) {
      console.error('ADD MEMBER ERROR:', err);
      toast.error('Không thêm được thành viên');
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = async (post: PostItem, userId: string) => {
    if (!canManageThreadConfig(post)) return toast.error('Bạn không có quyền xóa thành viên');
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('thanhvienhopthoai')
        .delete()
        .eq('mabangcongdong', post.id)
        .eq('manguoidung', userId);
      if (error) throw error;
      notifyChange(communityCode);
      requestRefresh();
      toast.success('Đã xóa thành viên');
    } catch (err) {
      console.error('REMOVE MEMBER ERROR:', err);
      toast.error('Không xóa được thành viên');
    } finally {
      setActionLoading(false);
    }
  };

  const createPost = async () => {
    const title = createTitle.trim();
    const content = createContent.trim();
    if (!title || !content) return toast.error('Vui lòng nhập tiêu đề và nội dung');
    if (!communityCode) return toast.error('Thiếu mã cộng đồng');
    if (!currentUserId) return toast.error('Không tìm thấy người dùng đăng nhập');
    if (!baido?.mabaido) return toast.error('Không tìm thấy bãi đỗ');
    setActionLoading(true);
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('baicongdong')
        .insert({
          manguoidung: currentUserId,
          mabaido: baido.mabaido,
          tieude: title,
          noidung: content,
          hinhanh: null,
          luotthich: 0,
          phanloai: createCategory,
          is_deleted: false,
          is_locked: false,
          updated_at: nowIso(),
        })
        .select('mabangcongdong')
        .single();
      if (insertError) throw insertError;
      const postId = String((inserted as any).mabangcongdong);

      const privacyRows = [
        { mabangcongdong: postId, riengtu: createPrivate },
      ];
      const memberRows = [{ manguoidung: currentUserId, mabangcongdong: postId }];

      const [{ error: privacyError }, { error: memberError }] = await Promise.all([
        supabase.from('riengtu').upsert(privacyRows, { onConflict: 'mabangcongdong' }),
        supabase.from('thanhvienhopthoai').upsert(memberRows, { onConflict: 'manguoidung,mabangcongdong' }),
      ]);
      if (privacyError) throw privacyError;
      if (memberError) throw memberError;

      if (createEmojis.length > 0) {
  const { error: emojiError } = await supabase.from('camxuc_baidang').insert(
    createEmojis.map((item) => ({
      mabangcongdong: postId,
      macamxuc: item.emojiId,
      size: item.size,
    })),
  );
  if (emojiError) console.error('POST EMOJI ERROR:', emojiError);
}

      if (createFiles.length > 0) {
        const uploaded = await uploadFilesToBucket(createFiles.slice(0, MAX_ATTACHMENTS), `posts/${postId}`);
        const { error: mediaError } = await supabase.from('hinhanh').insert(
          uploaded.map((item) => ({
            hinhanh: item.url,
            mabangcongdong: postId,
            uploaded_by: currentUserId,
            loaifile: item.type,
            ten_file: item.name,
          })),
        );
        if (mediaError) console.error('POST MEDIA ERROR:', mediaError);
      }

      setShowCreateModal(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateCategory(forcedCategory || 'other');
      setCreatePrivate(false);
      setCreateFiles([]);
      setCreateEmojis([]);
      setShowCreateEmojiPicker(false);
      notifyChange(communityCode);
      requestRefresh();
      toast.success('Đã tạo bài viết');
    } catch (err) {
      console.error('CREATE POST ERROR:', err);
      toast.error('Không tạo được bài viết');
    } finally {
      setActionLoading(false);
    }
  };

  const sendComment = async () => {
    if (!activePost) return;
    if (!canChatPost(activePost)) return toast.error(activePost.isLocked ? 'Bài đang bị khóa' : 'Bạn không có quyền chat');
    const content = composerText.trim();
    const files = composerFiles.slice(0, MAX_ATTACHMENTS);
    const selectedEmojis = composerEmojis.slice();
    if (!content && !files.length && !selectedEmojis.length) return toast.error('Nhập nội dung hoặc chọn emoji / tệp');
    if (!currentUserId) return toast.error('Không tìm thấy người dùng đăng nhập');
    setActionLoading(true);
    const optimisticId = crypto.randomUUID();
    const optimistic: CommentItem = {
      id: optimisticId,
      postId: activePost.id,
      userId: currentUserId,
      userName: currentUserName,
      content,
      createdAt: nowIso(),
      updatedAt: null,
      isRecalled: false,
      emotes: selectedEmojis.map((item) => ({ reactionId: crypto.randomUUID(), emojiId: item.emojiId, emoji: getEmojiById(item.emojiId), size: item.size })),
      attachments: files.map((file) => ({ id: crypto.randomUUID(), url: '', type: isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : 'file', name: file.name })),
    };

    setPosts((prev) => prev.map((post) => (post.id === activePost.id ? { ...post, comments: [...post.comments, optimistic], replyCount: post.replyCount + 1, lastActivityAt: optimistic.createdAt } : post)));
    setComposerText('');
    setComposerFiles([]);
    setComposerEmojis([]);
    setShowComposerEmojiPicker(false);

    try {
      const { data: commentRow, error: commentError } = await supabase
        .from('ct_baicongdong')
        .insert({
          manguoidung: currentUserId,
          mabangcongdong: activePost.id,
          noidung: content,
          updated_at: nowIso(),
        })
        .select('mactbaicongdong,manguoidung,mabangcongdong,noidung,created_at,updated_at,is_recalled,recalled_at')
        .single();
      if (commentError) throw commentError;
      const commentId = String((commentRow as any).mactbaicongdong);

      // bảo đảm người gửi có trong thành viên bài viết
      const { error: memberUpsertError } = await supabase.from('thanhvienhopthoai').upsert(
        { manguoidung: currentUserId, mabangcongdong: activePost.id },
        { onConflict: 'manguoidung,mabangcongdong' },
      );
      if (memberUpsertError) throw memberUpsertError;

      if (files.length > 0) {
        const uploaded = await uploadFilesToBucket(files, `comments/${commentId}`);
        const { error: mediaError } = await supabase.from('hinhanh_binhluan').insert(
          uploaded.map((item) => ({
            hinhanh: item.url,
            mactbaicongdong: commentId,
            uploaded_by: currentUserId,
            loaifile: item.type,
            ten_file: item.name,
          })),
        );
        if (mediaError) console.error('COMMENT MEDIA ERROR:', mediaError);
      }

      if (selectedEmojis.length > 0) {
        const { data: emojiInserted, error: emojiError } = await supabase
          .from('ct_baicongdong_camxuc')
          .insert(selectedEmojis.map((item) => ({ mactbaicongdong: commentId, macamxuc: item.emojiId })))
          .select('id,mactbaicongdong,macamxuc,created_at');
        if (emojiError) throw emojiError;
        const inserted = (emojiInserted ?? []) as any[];
        const sizeRows = inserted.map((row, index) => ({ ct_camxuc_id: String(row.id), kichthuoc: selectedEmojis[index]?.size ?? 'md' }));
        if (sizeRows.length > 0) {
          const { error: sizeError } = await supabase.from('kichthuoccamxuc').insert(sizeRows);
          if (sizeError) console.error('EMOJI SIZE ERROR:', sizeError);
        }
      }

      notifyChange(communityCode);
      requestRefresh();
      toast.success('Đã gửi bình luận');
    } catch (err) {
      console.error('SEND COMMENT ERROR:', err);
      setPosts((prev) => prev.map((post) => (post.id === activePost.id ? { ...post, comments: post.comments.filter((c) => c.id !== optimisticId), replyCount: Math.max(0, post.replyCount - 1) } : post)));
      toast.error('Không gửi được bình luận');
    } finally {
      setActionLoading(false);
    }
  };

const recallComment = async (comment: CommentItem) => {
  if (!activePost) return;
  if (
    comment.userId !== currentUserId &&
    activePost.authorId !== currentUserId &&
    !isElevated
  ) {
    return toast.error('Bạn không có quyền thu hồi');
  }

  setActionLoading(true);
  try {
    const { error } = await supabase
      .from('ct_baicongdong')
      .update({
        noidung: 'Tin nhắn đã được thu hồi',
        is_recalled: true,
        recalled_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('mactbaicongdong', comment.id);

    if (error) throw error;

    await clearCommentExtras(comment.id);

    notifyChange(communityCode);
    requestRefresh();
    toast.success('Đã thu hồi bình luận');
  } catch (err) {
    console.error('RECALL COMMENT ERROR:', err);
    toast.error('Không thu hồi được bình luận');
  } finally {
    setActionLoading(false);
  }
};
  const pickEmoji = (emojiId: string, forCreate = false) => {
  const emoji = emojiMap.get(emojiId);
  if (!emoji) return;

  const setter = forCreate ? setCreateEmojis : setComposerEmojis;
  const size = forCreate ? createEmojiSize : composerEmojiSize;

  setter((prev) => {
    if (prev.length >= 10) return prev; // giới hạn
    return [...prev, { emojiId, size }];
  });

  flashEmoji(emoji, size);
};

  const removeEmoji = (index: number, forCreate = false) => {
    const setter = forCreate ? setCreateEmojis : setComposerEmojis;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const renderMedia = (item: FeedMedia) => {
    if (item.type === 'video') return <video key={item.id} controls src={item.url} className="w-full rounded-2xl border border-gray-200 bg-black max-h-80 object-cover" />;
    if (item.type === 'image') return <img key={item.id} src={item.url} alt={item.name} className="w-full rounded-2xl border border-gray-200 object-cover max-h-80" />;
    return (
      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 underline">
        <Paperclip className="h-4 w-4" />
        {item.name}
      </a>
    );
  };

  useEffect(() => {
    aliveRef.current = true;
    if (!communityCode) return;
    void (async () => {
      try {
        await loadEmojiCatalog();
        if (!aliveRef.current) return;
        await loadAllData(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message ?? 'Không tải được dữ liệu');
      }
    })();
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityCode]);

  useEffect(() => {
    if (!communityCode) return;
    const unsub = listenChange(communityCode, () => requestRefresh());
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityCode]);

  useEffect(() => {
    if (!currentBaidoId) return;
    const channel = supabase
      .channel(`support-clean-${currentBaidoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'baicongdong' }, () => requestRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_baicongdong' }, () => requestRefresh())
      .subscribe();
    realtimeRef.current = channel;
    return () => {
      if (realtimeRef.current) {
        void supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBaidoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activePost?.comments.length]);

  useEffect(() => {
    if (activePost && !selectedPostVisible) {
      const firstVisible = visiblePosts.find((p) => canViewPost(p));
      if (firstVisible) setSelectedPostId(firstVisible.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts]);

  if (!communityCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          <h2 className="mb-2 text-xl text-gray-900">Chưa có mã cộng đồng</h2>
          <p className="mb-6 text-gray-600">Vui lòng nhập mã cộng đồng để tiếp tục</p>
          <button onClick={() => navigate('/community')} className="rounded-xl bg-purple-600 px-6 py-3 text-white transition hover:bg-purple-700">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 text-gray-600">Đang tải dữ liệu...</div>;
  }

  if (errorMsg && posts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          <h2 className="mb-2 text-xl text-gray-900">Không tải được dữ liệu</h2>
          <p className="mb-6 text-gray-600">{errorMsg}</p>
          <button onClick={() => navigate('/community')} className="rounded-xl bg-purple-600 px-6 py-3 text-white transition hover:bg-purple-700">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-none fixed z-[70] select-none animate-bounce ${EMOJI_SIZE_CLASS[item.size]}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))' }}
        >
          {item.emoji}
        </div>
      ))}

      <div className="fixed inset-x-0 top-0 z-40 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/community/feed?code=${communityCode}`)} className="rounded-full p-2 transition hover:bg-white/20">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl">Bài đăng cộng đồng</h1>
              <p className="text-sm text-purple-100">
                Mã cộng đồng: {communityCode} • Người dùng: {currentUserName} • Vai trò: {currentUserRole}
              </p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="hidden items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/20 md:inline-flex">
              <Plus className="h-4 w-4" />
              Tạo bài mới
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-24">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start lg:sticky lg:top-24">
            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Bộ lọc</h3>
                {forcedCategory && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">Cố định: {CATEGORY_META[forcedCategory].label}</span>}
              </div>
              <div className="space-y-2">
                <button disabled={Boolean(forcedCategory)} onClick={() => !forcedCategory && setSelectedCategory('all')} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedCategory === 'all' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'} ${forcedCategory ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">Tất cả</span>
                </button>
                {CATEGORY_ORDER.map((key) => {
                  const meta = CATEGORY_META[key];
                  const Icon = meta.icon;
                  return (
                    <button key={key} disabled={Boolean(forcedCategory)} onClick={() => !forcedCategory && setSelectedCategory(key)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedCategory === key ? meta.sidebarActive : meta.sidebarIdle} ${forcedCategory ? 'cursor-not-allowed opacity-60' : ''}`}>
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BadgeInfo className="h-4 w-4 text-purple-600" />
                  Quyền hiển thị
                </div>
                <p className="text-sm leading-6 text-gray-600">Riêng tư chỉ người trong thanhvienhopthoai, support, admin hoặc chủ bãi đỗ mới xem được. Khóa bài sẽ chặn chat cho tất cả.</p>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-5 rounded-3xl border border-white/70 bg-white p-4 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo tiêu đề, nội dung, người đăng, bình luận..." className="w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white transition hover:shadow-lg">
                  <Plus className="h-5 w-5" />
                  Tạo bài
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {visiblePosts.length === 0 ? (
                <div className="rounded-3xl border border-white/70 bg-white p-12 text-center shadow-md">
                  <HelpCircle className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-gray-500">Chưa có bài đăng nào</p>
                </div>
              ) : (
                visiblePosts.map((post) => {
                  const meta = CATEGORY_META[post.category];
                  const Icon = meta.icon;
                  const visible = canViewPost(post);
                  const selected = selectedPostId === post.id;
                  const lastComment = post.comments.at(-1) ?? null;
                  const preview = summarizeComment(lastComment);
                  return (
                    <div key={post.id} className="space-y-3">
                      <button onClick={() => openPost(post)} type="button" className={`w-full rounded-3xl border bg-white p-5 text-left shadow-md transition ${selected ? 'border-purple-300 ring-2 ring-purple-100' : 'border-white/70 hover:shadow-lg'} ${visible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${meta.badge}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            {post.isLocked && <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow"><Lock className="h-3.5 w-3.5" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs ${post.isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{post.isPrivate ? 'Riêng tư' : 'Công khai'}</span>
                              <span className={`rounded-full px-3 py-1 text-xs ${post.isLocked ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{post.isLocked ? 'Đã khóa' : 'Đang mở'}</span>
                              <span className={`rounded-full px-3 py-1 text-xs ${meta.badge}`}>{meta.label}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="truncate text-xl font-bold text-gray-900">{post.title}</h3>
                              <div className="flex items-center gap-2">
                                {canEditOwnPost(post) && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      startEditPost(post);
    }}
    className="p-2 rounded-full hover:bg-gray-100"
    title="Sửa"
  >
    <Edit3 className="h-4 w-4 text-gray-600" />
  </button>
)}

{canDeleteOwnPost(post) && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      void handleDeletePost(post.id);
    }}
    className="p-2 rounded-full hover:bg-red-100"
    title="Xóa"
  >
    <Trash2 className="h-4 w-4 text-red-600" />
  </button>
)}
                                
                                {visible ? <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" /> : <EyeOff className="h-5 w-5 shrink-0 text-gray-400" />}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                              <span>{post.authorName}</span><span>•</span><span>{formatDate(post.createdAt)}</span><span>•</span><span>{post.replyCount} bình luận</span>
                            </div>
                            <div className="mt-3 line-clamp-2 text-sm text-gray-600">{visible ? preview : <span className="tracking-[0.3em] text-gray-400">{' '.repeat(12)}</span>}</div>
                            {!visible && <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">Chỉ thành viên được phép xem nội dung này.</div>}
                          </div>
                        </div>
                      </button>

                      {selected && visible && (
                        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-xl">
                          <div className="flex flex-col gap-5 xl:flex-row">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${meta.badge}`}>
                                  <Icon className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    
                                    <h2 className="text-2xl font-bold text-gray-900">{post.title}</h2>
                                    
                                    <span className={`rounded-full px-3 py-1 text-xs ${post.isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{post.isPrivate ? 'Riêng tư' : 'Công khai'}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs ${post.isLocked ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{post.isLocked ? 'Đã khóa' : 'Đang mở'}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                    <span>{post.authorName}</span><span>•</span><span>{formatDate(post.createdAt)}</span>{post.updatedAt && (<><span>•</span><span>sửa {formatDate(post.updatedAt)}</span></>)}
                                    
                                  </div>
{editingPostId === post.id ? (
  <div className="mt-4 space-y-4">
    <input
      value={editingTitle}
      onChange={(e) => setEditingTitle(e.target.value)}
      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
    />

    <textarea
      value={editingContent}
      onChange={(e) => setEditingContent(e.target.value)}
      rows={5}
      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
    />

    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Emoji / ảnh / tệp</div>
        <button
          type="button"
          onClick={() => setShowEditEmojiPicker((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm"
        >
          <Smile className="h-4 w-4" />
          {showEditEmojiPicker ? 'Đóng' : 'Chọn emoji'}
        </button>
      </div>

      {editEmojis.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {editEmojis.map((item, index) => (
            <button
              key={`${item.emojiId}-${index}`}
              type="button"
              onClick={() => removeEditEmoji(index)}
              className="rounded-full border border-purple-200 bg-white px-3 py-2 text-purple-700"
            >
              <span className={EMOJI_SIZE_CLASS[item.size]}>
                {getEmojiById(item.emojiId)}
              </span>
            </button>
          ))}
        </div>
      )}

      {showEditEmojiPicker && (
        <div className="space-y-3">
          <div className="flex gap-1 rounded-2xl bg-white p-1">
            {(['sm', 'md', 'lg'] as EmojiSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setEditEmojiSize(size)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${
                  editEmojiSize === size ? 'bg-gray-900 text-white' : 'text-gray-600'
                }`}
              >
                {size === 'sm' ? 'Nhỏ' : size === 'md' ? 'Vừa' : 'Lớn'}
              </button>
            ))}
          </div>

          <div className="grid max-h-48 grid-cols-8 gap-2 overflow-y-auto">
            {emojis.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                onClick={() => pickEditEmoji(emoji.id)}
                className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-white transition active:scale-95 hover:bg-purple-50 ${EMOJI_BUTTON_CLASS[editEmojiSize]}`}
                title={emoji.slug ?? emoji.unicodeName ?? emoji.character}
              >
                <span className={EMOJI_SIZE_CLASS[editEmojiSize]}>{emoji.character}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Ảnh / tệp hiện có</div>
          <label className="cursor-pointer rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
            Thêm file
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setEditFiles((prev) => {
                  const merged = [...prev, ...files];
                  const unique = merged.filter(
                    (file, index, self) =>
                      index === self.findIndex((f) => f.name === file.name && f.size === file.size),
                  );
                  return unique.slice(0, MAX_ATTACHMENTS);
                });
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        {editMedia.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editMedia.map((item, index) => (
              <div key={item.id} className="relative">
                {renderMedia(item)}
                <button
                  type="button"
                  onClick={() => removeEditMedia(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {editFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {editFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <span className="max-w-[160px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setEditFiles((prev) => prev.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => void applyPostEdit(post)} className="rounded-2xl bg-purple-600 px-4 py-2 text-white">
          Lưu
        </button>
        <button
          onClick={() => {
            setEditingPostId(null);
            setEditMedia([]);
            setEditFiles([]);
            setEditEmojis([]);
            setShowEditEmojiPicker(false);
          }}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-gray-700"
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
) : (
  <p className="mt-4 whitespace-pre-wrap text-gray-700">{post.content}</p>
)}

                                  {post.postEmotes.length > 0 && (
  <div className="mt-4 flex flex-wrap gap-2">
    {post.postEmotes.map((item) => (
      <span
        key={item.reactionId}
        className={`inline-flex items-center justify-center rounded-full border border-purple-200 bg-purple-50 px-3 py-2 text-purple-700 ${EMOJI_BUTTON_CLASS[item.size]}`}
      >
        <span className={EMOJI_SIZE_CLASS[item.size]}>{item.emoji}</span>
      </span>
    ))}
  </div>
)}

                                  {post.media.length > 0 && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{post.media.map(renderMedia)}</div>}
                                </div>
                              </div>
                            </div>

                            {selectedPostManageable && editingPostId !== post.id && (
                              <div className="shrink-0 xl:w-[340px]">
                                <button onClick={() => setShowSettings((v) => !v)} className="mb-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800 shadow-sm">
                                  <Settings2 className="mr-2 inline h-4 w-4" />
                                  {showSettings ? 'Ẩn cấu hình' : 'Mở cấu hình'}
                                </button>

                                {showSettings && (
                                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                      <BadgeInfo className="h-4 w-4 text-purple-600" />
                                      Cấu hình bài viết
                                    </div>

                                    <button onClick={() => void setPrivacy(post, !post.isPrivate)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm">
                                      <span>{post.isPrivate ? 'Chuyển sang công khai' : 'Chuyển sang riêng tư'}</span>
                                      {post.isPrivate ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                    </button>
                                    <button onClick={() => void setLock(post, !post.isLocked)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm">
                                      <span>{post.isLocked ? 'Mở khóa bài' : 'Khóa bài'}</span>
                                      {post.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                    </button>

                                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <Users className="h-4 w-4 text-purple-600" />
                                        Thành viên bài viết
                                      </div>
                                      <div className="flex gap-2">
                                        <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="Email người dùng" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                        <button onClick={() => void addMemberByEmail()} className="rounded-xl bg-purple-600 px-3 py-2 text-sm text-white">Thêm</button>
                                      </div>
                                      <div className="mt-3 max-h-52 space-y-2 overflow-auto">
                                        {post.members.length === 0 ? (
                                          <p className="text-sm text-gray-500">Chưa có thành viên</p>
                                        ) : (
                                          post.members.map((member) => (
                                            <div key={member.userId} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                                              <div className="min-w-0">
                                                <div className="truncate font-medium text-gray-900">{member.name}</div>
                                                <div className="truncate text-gray-500">{member.email}</div>
                                              </div>
                                              <button onClick={() => void removeMember(post, member.userId)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Xóa thành viên">
                                                <UserMinus className="h-4 w-4" />
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {editingPostId === post.id && (
  <div className="mt-3 flex flex-wrap gap-2">
    
    {/* MEDIA CŨ */}
    {editMedia.map((item, index) => (
      <div key={index} className="relative">
        {renderMedia(item)}
        <button
          onClick={() =>
            setEditMedia((prev) => prev.filter((_, i) => i !== index))
          }
          className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ))}

    {/* FILE MỚI */}
    {editFiles.map((file, index) => (
      <div key={index} className="flex items-center gap-2 rounded bg-gray-100 px-2 py-1">
        <span className="text-xs">{file.name}</span>
        <button
          onClick={() =>
            setEditFiles((prev) => prev.filter((_, i) => i !== index))
          }
        >
          <X className="h-3 w-3 text-red-500" />
        </button>
      </div>
    ))}
  </div>
)}


                          </div>

                          <div className="mt-6 border-t border-gray-100 pt-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">Bình luận ({post.replyCount})</div>
                              <div className="text-sm text-gray-500">{post.isLocked ? 'Bài đang khóa' : 'Đang mở chat'}</div>
                            </div>

                            <div className="space-y-3">
                              {post.comments.map((comment) => (
                                <div key={comment.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-semibold text-gray-900">{comment.userName}</div>
                                      <div className="text-xs text-gray-500">{formatDate(comment.createdAt)}</div>
                                    </div>
                                    {(comment.userId === currentUserId) && (
  <button
    onClick={() => void recallComment(comment)}
    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700"
  >
    Thu hồi
  </button>
)}
                                  </div>
                                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                                  {comment.emotes.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {comment.emotes.map((item) => (
                                        <span key={item.reactionId} className={`inline-flex items-center justify-center rounded-full border border-purple-200 bg-white px-3 py-1.5 text-purple-700 ${EMOJI_BUTTON_CLASS[item.size]}`}>
                                          <span className={EMOJI_SIZE_CLASS[item.size]}>{item.emoji}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {comment.attachments.length > 0 && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{comment.attachments.map(renderMedia)}</div>}
                                </div>
                              ))}
                              <div ref={bottomRef} />
                            </div>

                            <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
{(composerFiles.length > 0 || composerEmojis.length > 0) && (
  <div className="mb-3 flex flex-wrap items-center gap-2">
    
    {/* FILE */}
    {composerFiles.map((file, index) => (
      <div
        key={`file-${index}`}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
      >
        <span className="max-w-[120px] truncate">{file.name}</span>
        <button
          type="button"
          onClick={() =>
            setComposerFiles((prev) => prev.filter((_, i) => i !== index))
          }
          className="text-red-500 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))}

    {/* EMOJI */}
    {composerEmojis.map((item, index) => (
      <button
        key={`emoji-${index}`}
        type="button"
        onClick={() =>
          setComposerEmojis((prev) => prev.filter((_, i) => i !== index))
        }
        className="rounded-full border border-purple-200 bg-white px-3 py-2"
      >
        <span className={EMOJI_SIZE_CLASS[item.size]}>
          {getEmojiById(item.emojiId)}
        </span>
      </button>
    ))}
  </div>
)}

                              <div className="flex items-end gap-2 relative">
                                <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                                  <Paperclip className="h-4 w-4" />
                                  <span>Tải tệp</span>
                                  <input
                                    ref={composerFileRef}
                                    type="file"
                                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                                    multiple
                                    className="hidden"
                                    disabled={!selectedPostChatable}
                                   onChange={(e) => {
  const newFiles = Array.from(e.target.files ?? []);

  setComposerFiles((prev) => {
    const merged = [...prev, ...newFiles];

    // loại trùng tên + size
    const unique = merged.filter(
      (file, index, self) =>
        index === self.findIndex(
          (f) => f.name === file.name && f.size === file.size
        )
    );

    return unique.slice(0, MAX_ATTACHMENTS);
  });

  e.currentTarget.value = '';
}}
                                  />
                                </label>

                                <button onClick={() => setShowComposerEmojiPicker((v) => !v)} className="shrink-0 rounded-2xl bg-gray-100 p-3 text-gray-700 transition hover:bg-gray-200" title="Chọn emoji" disabled={!selectedPostChatable}>
                                  <Smile className="h-5 w-5" />
                                </button>

                                <textarea
                                  value={composerText}
                                  onChange={(e) => setComposerText(e.target.value)}
                                  placeholder={selectedPostChatable ? 'Nhắn gì đó...' : post.isLocked ? 'Bài đang bị khóa' : 'Không có quyền chat'}
                                  rows={1}
                                  disabled={!selectedPostChatable}
                                  className="min-h-[52px] max-h-32 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      void sendComment();
                                    }
                                  }}
                                />
                                

                                <button onClick={() => void sendComment()} disabled={!selectedPostChatable} className="shrink-0 rounded-2xl bg-purple-600 p-3 text-white shadow-lg transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50" title="Gửi">
                                  <Send className="h-5 w-5" />
                                </button>

                                {
                                
                                
                                showComposerEmojiPicker && selectedPostChatable && (
                                  <div className="absolute bottom-16 right-0 z-[60] w-[360px] max-h-72 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl">
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="text-sm font-semibold text-gray-900">Chọn emoji</div>
                                      <button onClick={() => setShowComposerEmojiPicker(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                                    </div>
                                    <div className="mb-3 flex items-center gap-1 rounded-2xl bg-gray-50 p-1">
                                      {(['sm', 'md', 'lg'] as EmojiSize[]).map((size) => (
                                        <button key={size} onClick={() => setComposerEmojiSize(size)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${composerEmojiSize === size ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>
                                          {size === 'sm' ? 'Nhỏ' : size === 'md' ? 'Vừa' : 'Lớn'}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-8 gap-2">
                                      {emojis.map((emoji) => (
                                        <button key={emoji.id} onClick={() => pickEmoji(emoji.id, false)} className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-white transition active:scale-95 hover:bg-purple-50 ${EMOJI_BUTTON_CLASS[composerEmojiSize]}`} title={emoji.slug ?? emoji.unicodeName ?? emoji.character}>
                                          <span className={EMOJI_SIZE_CLASS[composerEmojiSize]}>{emoji.character}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tạo bài mới</h2>
                <p className="mt-1 text-sm text-gray-500">Bài đăng sẽ đồng bộ ngay lập tức qua realtime.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Danh mục</label>
                <select value={createCategory} onChange={(e) => setCreateCategory(e.target.value as Category)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500">
                  {CATEGORY_ORDER.map((key) => (
                    <option key={key} value={key}>{CATEGORY_META[key].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Riêng tư</label>
                <div className="flex gap-3">
                  <button onClick={() => setCreatePrivate(false)} className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium ${!createPrivate ? 'border-green-200 bg-green-100 text-green-700' : 'border-gray-300 bg-white text-gray-700'}`}>Công khai</button>
                  <button onClick={() => setCreatePrivate(true)} className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium ${createPrivate ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-gray-300 bg-white text-gray-700'}`}>Riêng tư</button>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tiêu đề</label>
                <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Mô tả ngắn gọn" className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Nội dung</label>
                <textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} rows={5} className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

             <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
  {/* HEADER */}
  <div className="mb-3 flex items-center justify-between">
    <div className="text-sm font-semibold text-gray-900">Emoji bài đăng</div>

    <button
      type="button"
      onClick={() => setShowCreateEmojiPicker((v) => !v)}
      className="flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-sm shadow-sm"
    >
      <Smile className="h-4 w-4" />
      {showCreateEmojiPicker ? 'Đóng' : 'Chọn emoji'}
    </button>
  </div>

  {/* EMOJI ĐÃ CHỌN */}
  {createEmojis.length > 0 && (
    <div className="mb-3 flex flex-wrap gap-2">
      {createEmojis.map((item, index) => (
        <button
          key={`${item.emojiId}-${index}`}
          type="button"
          onClick={() => removeEmoji(index, true)}
          className="rounded-full border border-purple-200 bg-white px-3 py-2 text-purple-700"
        >
          <span className={EMOJI_SIZE_CLASS[item.size]}>
            {getEmojiById(item.emojiId)}
          </span>
        </button>
      ))}
    </div>
  )}

  {/* PICKER (CHỈ HIỆN KHI BẤM) */}
  {showCreateEmojiPicker && (
    <div className="space-y-3">
      {/* SIZE */}
      <div className="flex gap-1 rounded-2xl bg-white p-1">
        {(['sm', 'md', 'lg'] as EmojiSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setCreateEmojiSize(size)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
              createEmojiSize === size
                ? 'bg-gray-900 text-white'
                : 'text-gray-600'
            }`}
          >
            {size === 'sm' ? 'Nhỏ' : size === 'md' ? 'Vừa' : 'Lớn'}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
        {emojis.map((emoji) => (
          <button
            key={emoji.id}
            type="button"
            onClick={() => pickEmoji(emoji.id, true)}
            className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-white transition active:scale-95 hover:bg-purple-50 ${EMOJI_BUTTON_CLASS[createEmojiSize]}`}
            title={emoji.slug ?? emoji.unicodeName ?? emoji.character}
          >
            <span className={EMOJI_SIZE_CLASS[createEmojiSize]}>
              {emoji.character}
            </span>
          </button>
        ))}
      </div>
    </div>
  )}
</div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Ảnh / tệp</div>
                  <label className="cursor-pointer rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                    Chọn file
                    <input ref={createFileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []).slice(0, MAX_ATTACHMENTS); setCreateFiles((prev) => [...prev, ...files].slice(0, MAX_ATTACHMENTS)); e.currentTarget.value = ''; }} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {createFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <FileText className="h-4 w-4" />
                      <span className="max-w-[220px] truncate">{file.name}</span>
                      <button onClick={() => setCreateFiles((prev) => prev.filter((_, i) => i !== index))} className="rounded p-1 hover:bg-gray-100"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">Hủy</button>
                <button onClick={() => void createPost()} className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-purple-700">Đăng bài</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
