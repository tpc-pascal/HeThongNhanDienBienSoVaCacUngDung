import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  ThumbsUp,
  Hash,
  AlertTriangle,
  Search,
  Filter,
  Bell,
  Gift,
  HelpCircle,
  Star,
  Send,
  LogOut,
  Map as MapIcon,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Video,
  Smile,
  X,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.tsx';
import { getHomeRoute } from '../../utils/navigation.ts';
import { supabase } from '../../utils/supabase.ts';

type PostCategory =
  | 'trai_nghiem'
  | 'chung'
  | 'thong_bao'
  | 'su_kien'
  | 'hoi_dap'
  | 'canh_bao';

type MediaType = 'image' | 'video' | 'file';

interface FeedMedia {
  id: string;
  url: string;
  type: MediaType;
  name: string;
}

interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  isRecalled: boolean;
  emotes: string[];
  attachments: FeedMedia[];
}

interface FeedPost {
  id: string;
  dbId: string;
  authorId: string;
  authorName: string;
  parkingLotId: string;
  parkingLotCode: string;
  parkingLotName: string;
  category: PostCategory;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  likes: number;
  media: FeedMedia[];
  comments: FeedComment[];
  coverUrl?: string | null;
  isDeleted: boolean;
}

interface ParkingLotInfo {
  id: string;
  code: string;
  name: string;
  address?: string;
  image?: string | null;
}

interface EmojiItem {
  id: string;
  slug?: string;
  character: string;
  unicodeName?: string;
  codePoint?: string;
  group?: string;
  subGroup?: string;
}

const categories: Array<{
  value: PostCategory | 'all';
  label: string;
  icon: any;
  color: string;
}> = [
  { value: 'all', label: 'Tất cả', icon: Hash, color: 'bg-gray-100 text-gray-700' },
  { value: 'trai_nghiem', label: 'Trải nghiệm', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  { value: 'chung', label: 'Chung', icon: Hash, color: 'bg-blue-100 text-blue-700' },
  { value: 'thong_bao', label: 'Thông báo', icon: Bell, color: 'bg-amber-100 text-amber-700' },
  { value: 'su_kien', label: 'Sự kiện', icon: Gift, color: 'bg-pink-100 text-pink-700' },
  { value: 'hoi_dap', label: 'Hỏi đáp', icon: HelpCircle, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'canh_bao', label: 'Cảnh báo', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
];

const categoryMeta: Record<PostCategory, { label: string; icon: any; color: string }> = {
  trai_nghiem: { label: 'Trải nghiệm', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  chung: { label: 'Chung', icon: Hash, color: 'bg-blue-100 text-blue-700' },
  thong_bao: { label: 'Thông báo', icon: Bell, color: 'bg-amber-100 text-amber-700' },
  su_kien: { label: 'Sự kiện', icon: Gift, color: 'bg-pink-100 text-pink-700' },
  hoi_dap: { label: 'Hỏi đáp', icon: HelpCircle, color: 'bg-emerald-100 text-emerald-700' },
  canh_bao: { label: 'Cảnh báo', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const normalizeCategory = (value: string | null | undefined): PostCategory | null => {
  const v = String(value ?? '').toLowerCase().trim();

  if (v === 'trai_nghiem' || v === 'experience' || v === 'trải nghiệm') return 'trai_nghiem';
  if (v === 'thong_bao' || v === 'announcement') return 'thong_bao';
  if (v === 'su_kien' || v === 'event') return 'su_kien';
  if (v === 'hoi_dap' || v === 'question' || v === 'qa') return 'hoi_dap';
  if (v === 'canh_bao' || v === 'warning' || v === 'alert') return 'canh_bao';
  if (v === 'chung') return 'chung';

  return 'chung'; // ❗ KHÔNG fallback nữa
};

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const isVideoFile = (file: File) => file.type.startsWith('video/');
const isImageFile = (file: File) => file.type.startsWith('image/');


export const CommunityFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const communityCode = (searchParams.get('code') || '').trim();

  const currentUserId = String((user as any)?.manguoidung ?? (user as any)?.id ?? '');
  const currentUserName = String((user as any)?.tennguoidung ?? (user as any)?.name ?? 'Người dùng');
  const currentUserRole = String((user as any)?.chucnang ?? (user as any)?.role ?? 'owner');
  const isAdmin = ['admin', 'super_admin'].includes(currentUserRole);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [parkingLot, setParkingLot] = useState<ParkingLotInfo | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all');

  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<PostCategory>('trai_nghiem');
  const [newPostFiles, setNewPostFiles] = useState<File[]>([]);

  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState<PostCategory>('chung');
  const [editingFiles, setEditingFiles] = useState<File[]>([]);

const [commentText, setCommentText] = useState<Record<string, string>>({});
const [commentEmotes, setCommentEmotes] = useState<Record<string, string[]>>({});
const [commentFiles, setCommentFiles] = useState<Record<string, File[]>>({});
const [emojiPickerPostId, setEmojiPickerPostId] = useState<string | null>(null);

const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
  try {
    return JSON.parse(localStorage.getItem('communityFeedLikedPosts') ?? '[]');
  } catch {
    return [];
  }
});

const postFileInputRef = useRef<HTMLInputElement | null>(null);
const editFileInputRef = useRef<HTMLInputElement | null>(null);
const postIdsRef = useRef<string[]>([]);
const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

const emojiById = useMemo(() => {
  const map = new Map<string, string>();
  emojis.forEach((emoji) => map.set(emoji.id, emoji.character));
  return map;
}, [emojis]);

const uploadFilesToBucket = async (files: File[], prefix: string): Promise<FeedMedia[]> => {
  const result: FeedMedia[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('CongDong')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('CongDong').getPublicUrl(path);

    result.push({
      id: crypto.randomUUID(), // ✅ thêm dòng này
      url: data.publicUrl,
      type: isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : 'file',
      name: file.name,
    });
  }

  return result;
};
const normalizeEmojiRow = (row: any): EmojiItem => {
  return {
    id: String(row.macamxuc),
    slug: row.slug ?? undefined,
    character: String(row.bieutuong ?? ''),
    unicodeName: row.unicode_name ?? undefined,
    codePoint: row.code_point ?? undefined,
    group: row.nhom ?? undefined,
    subGroup: row.nhom_con ?? undefined,
  };
};

const loadEmojiCatalog = async (): Promise<EmojiItem[]> => {
  try {
    const { data, error } = await supabase
      .from('camxuc')
      .select('macamxuc,bieutuong,slug,unicode_name,code_point,nhom,nhom_con')
      .order('macamxuc', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []).map(normalizeEmojiRow);
    setEmojis(rows);
    return rows;
  } catch (error) {
    console.error('LOAD EMOJI ERROR:', error);
    setEmojis([]);
    return [];
  }
};

const loadFeed = async (silent = false, emojiSource?: EmojiItem[]) => {
  try {
    if (!silent) setLoading(true);
    setLoadError(null);

    if (!communityCode) {
      throw new Error('Chưa có mã cộng đồng.');
    }

    const emojiList = emojiSource ?? emojis;
    const emojiMap = new Map<string, string>();
    emojiList.forEach((e) => emojiMap.set(e.id, e.character));

    const { data: lotRow, error: lotError } = await supabase
      .from('baido')
      .select('mabaido, tenbaido, mathamgia, diachi, hinhanh')
      .eq('mathamgia', communityCode)
      .maybeSingle();

    if (lotError) throw lotError;
    if (!lotRow) throw new Error('Không tìm thấy bãi đỗ theo mã cộng đồng.');

    const lotId = String(lotRow.mabaido);

    setParkingLot({
      id: lotId,
      code: String(lotRow.mathamgia ?? communityCode),
      name: String(lotRow.tenbaido ?? 'Bãi đỗ xe'),
      address: lotRow.diachi ?? '',
      image: lotRow.hinhanh ?? null,
    });

    const { data: postRows, error: postError } = await supabase
  .from('baicongdong')
.select('*, duyet!inner(trangthaiduyet)') // Inner join để bắt buộc phải có bản ghi trong bảng duyet
.eq('mabaido', lotId)
.eq('is_deleted', false)
.eq('duyet.trangthaiduyet', true) // CHỈ lấy những bài đã được support duyệt (true)
.not('phanloai', 'is', null) // ❗ chặn null
.in('phanloai', [
  'trai_nghiem',
  'chung',
  'thong_bao',
  'su_kien',
  'hoi_dap',
  'canh_bao',
])
.order('created_at', { ascending: false });

    if (postError) throw postError;

    const postIds = (postRows ?? []).map((row: any) => String(row.mabangcongdong));
    const authorIds = new Set<string>();

    (postRows ?? []).forEach((row: any) => {
      if (row.manguoidung) authorIds.add(String(row.manguoidung));
    });

    const [
      postMediaResult,
      commentResult,
      commentMediaResult,
      commentEmojiResult,
      userResult,
    ] = await Promise.all([
      postIds.length
        ? supabase
            .from('hinhanh')
            .select('*')
            .in('mabangcongdong', postIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),

      postIds.length
        ? supabase
            .from('ct_baicongdong')
            .select('*')
            .in('mabangcongdong', postIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),

      postIds.length
        ? supabase
            .from('hinhanh_binhluan')
            .select('*')
            .in(
              'mactbaicongdong',
              (await supabase
                .from('ct_baicongdong')
                .select('mactbaicongdong')
                .in('mabangcongdong', postIds)).data?.map((r: any) => String(r.mactbaicongdong)) ?? [],
            )
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),

      postIds.length
        ? supabase
            .from('ct_baicongdong_camxuc')
            .select('id,mactbaicongdong,macamxuc,created_at')
        : Promise.resolve({ data: [] as any[], error: null as any }),

      authorIds.size
        ? supabase
            .from('nguoidung')
            .select('manguoidung,tennguoidung,chucnang')
            .in('manguoidung', Array.from(authorIds))
        : Promise.resolve({ data: [] as any[], error: null as any }),
    ]);

    if (postMediaResult.error) throw postMediaResult.error;
    if (commentResult.error) throw commentResult.error;
    if (commentMediaResult.error) throw commentMediaResult.error;
    if (commentEmojiResult.error) throw commentEmojiResult.error;
    if (userResult.error) throw userResult.error;

    const userMap = new Map<string, string>();
    (userResult.data ?? []).forEach((row: any) => {
      userMap.set(String(row.manguoidung), String(row.tennguoidung ?? 'Người dùng'));
    });

    const mediaByPost = new Map<string, FeedMedia[]>();
    (postMediaResult.data ?? []).forEach((row: any) => {
      const postId = String(row.mabangcongdong ?? '');
      if (!postId) return;

      const current = mediaByPost.get(postId) ?? [];
      current.push({
        id: String(row.mahinhanh ?? row.id ?? crypto.randomUUID()),
        url: String(row.hinhanh ?? ''),
        type: String(row.loaifile ?? '').startsWith('video')
          ? 'video'
          : String(row.loaifile ?? '').startsWith('image')
            ? 'image'
            : 'file',
        name: String(row.ten_file ?? 'file'),
      });
      mediaByPost.set(postId, current);
    });

    const commentMediaByComment = new Map<string, FeedMedia[]>();
    (commentMediaResult.data ?? []).forEach((row: any) => {
      const commentId = String(row.mactbaicongdong ?? '');
      if (!commentId) return;

      const current = commentMediaByComment.get(commentId) ?? [];
      current.push({
        id: String(row.mahinhanh ?? row.id ?? crypto.randomUUID()),
        url: String(row.hinhanh ?? ''),
        type: String(row.loaifile ?? '').startsWith('video')
          ? 'video'
          : String(row.loaifile ?? '').startsWith('image')
            ? 'image'
            : 'file',
        name: String(row.ten_file ?? 'file'),
      });
      commentMediaByComment.set(commentId, current);
    });

    const emotesByComment = new Map<string, string[]>();

    (commentEmojiResult.data ?? []).forEach((row: any) => {
      const commentId = String(row.mactbaicongdong ?? '');
      const emojiId = String(row.macamxuc ?? '');
      if (!commentId || !emojiId) return;

      const emojiText = emojiMap.get(emojiId);
      if (!emojiText) return;

      const current = emotesByComment.get(commentId) ?? [];
      if (!current.includes(emojiText)) current.push(emojiText);
      emotesByComment.set(commentId, current);
    });

    const commentsByPost = new Map<string, FeedComment[]>();
    (commentResult.data ?? []).forEach((row: any) => {
      const postId = String(row.mabangcongdong ?? '');
      const commentId = String(row.mactbaicongdong ?? '');
      if (!postId || !commentId) return;

      const current = commentsByPost.get(postId) ?? [];
      current.push({
        id: commentId,
        postId,
        userId: String(row.manguoidung ?? ''),
        userName: userMap.get(String(row.manguoidung ?? '')) ?? 'Người dùng',
        content: String(row.noidung ?? ''),
        createdAt: row.created_at ?? new Date().toISOString(),
        isRecalled: Boolean(row.is_recalled),
        emotes: emotesByComment.get(commentId) ?? [],
        attachments: commentMediaByComment.get(commentId) ?? [],
      });
      commentsByPost.set(postId, current);
    });

    const mappedPosts: FeedPost[] = (postRows ?? []).map((row: any) => ({
      id: String(row.mabangcongdong),
      dbId: String(row.mabangcongdong),
      authorId: String(row.manguoidung ?? ''),
      authorName: userMap.get(String(row.manguoidung ?? '')) ?? 'Người dùng',
      parkingLotId: lotId,
      parkingLotCode: String(lotRow.mathamgia ?? communityCode),
      parkingLotName: String(lotRow.tenbaido ?? 'Bãi đỗ xe'),
      category: normalizeCategory(row.phanloai)!,
      title: String(row.tieude ?? ''),
      content: String(row.noidung ?? ''),
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? null,
      likes: Number(row.luotthich ?? 0),
      media: mediaByPost.get(String(row.mabangcongdong)) ?? [],
      comments: commentsByPost.get(String(row.mabangcongdong)) ?? [],
      coverUrl: row.hinhanh ?? null,
      isDeleted: Boolean(row.is_deleted),
    }));

    setPosts(mappedPosts);
    postIdsRef.current = mappedPosts.map((p) => p.id);
  } catch (error: any) {
    console.error('LOAD FEED ERROR:', error);
    setLoadError(error?.message ?? 'Không tải được dữ liệu.');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  let alive = true;

  const bootstrap = async () => {
    if (!communityCode) return;

    const emojiRows = await loadEmojiCatalog();
    if (!alive) return;

    await loadFeed(false, emojiRows);
  };

  void bootstrap();

  return () => {
    alive = false;
  };
}, [communityCode]);
  

useEffect(() => {
  if (!communityCode) return;

  let alive = true;

  const reload = async (tableName: string) => {
    if (!alive) return;

    try {
      if (tableName === 'camxuc') {
        const emojiRows = await loadEmojiCatalog();
        await loadFeed(true, emojiRows);
        return;
      }

      await loadFeed(true);
    } catch (error) {
      console.error('REALTIME RELOAD ERROR:', error);
    }
  };

  if (realtimeChannelRef.current) {
    void supabase.removeChannel(realtimeChannelRef.current);
    realtimeChannelRef.current = null;
  }

  const channel = supabase.channel(`community-feed-${communityCode}`);
  realtimeChannelRef.current = channel;

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'baicongdong' }, () => void reload('baicongdong'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_baicongdong' }, () => void reload('ct_baicongdong'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_baicongdong_camxuc' }, () => void reload('ct_baicongdong_camxuc'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hinhanh' }, () => void reload('hinhanh'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hinhanh_binhluan' }, () => void reload('hinhanh_binhluan'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nguoidung' }, () => void reload('nguoidung'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'camxuc' }, () => void reload('camxuc'))
   .subscribe((status) => {
  console.log('REALTIME STATUS:', status);

  if (status === 'SUBSCRIBED') {
    toast.success('Realtime connected ✅');
  }

  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    toast.error('Realtime lỗi, đang reconnect...');

    setTimeout(() => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    }, 1000);
  }

  if (status === 'CLOSED') {
    toast.info('Realtime closed 🔌');
  }
});

  return () => {
    alive = false;
    if (realtimeChannelRef.current) {
      void supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };
}, [communityCode]);


  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedCategory !== 'all' && post.category !== selectedCategory) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery, selectedCategory]);

 const handleLikePost = async (postId: string) => {
  if (likedPostIds.includes(postId)) {
    toast.info('Bạn đã thích bài này rồi');
    return;
  }

  const target = posts.find((p) => p.id === postId);
  if (!target) return;

  const nextLikes = target.likes + 1;

  setPosts((prev) =>
    prev.map((p) => (p.id === postId ? { ...p, likes: nextLikes } : p)),
  );

  setLikedPostIds((prev) => {
    const next = [...prev, postId];
    localStorage.setItem('communityFeedLikedPosts', JSON.stringify(next));
    return next;
  });

  const { error } = await supabase
    .from('baicongdong')
    .update({ luotthich: nextLikes, updated_at: new Date().toISOString() })
    .eq('mabangcongdong', postId);

  if (error) {
    toast.error('Không cập nhật được lượt thích');
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: target.likes } : p)),
    );
    setLikedPostIds((prev) => {
      const next = prev.filter((id) => id !== postId);
      localStorage.setItem('communityFeedLikedPosts', JSON.stringify(next));
      return next;
    });
  }
};

const handleAddComment = async (postId: string) => {
  const content = (commentText[postId] ?? '').trim();
  const selectedEmoteIds = commentEmotes[postId] ?? [];
  const files = (commentFiles[postId] ?? []).slice(0, 3);

  if (!content && selectedEmoteIds.length === 0 && files.length === 0) {
    toast.error('Nhập nội dung, chọn emoji hoặc thêm file trước khi gửi');
    return;
  }

  if (!currentUserId) {
    toast.error('Không tìm thấy người dùng đăng nhập');
    return;
  }

  const tempId = crypto.randomUUID();
  const tempComment: FeedComment = {
    id: tempId,
    postId,
    userId: currentUserId,
    userName: currentUserName,
    content: content || '',
    createdAt: new Date().toISOString(),
    isRecalled: false,
    emotes: selectedEmoteIds
      .map((id) => emojiById.get(id))
      .filter(Boolean) as string[],
    attachments: [],
  };

  setPosts((prev) =>
    prev.map((p) =>
      p.id === postId
        ? {
            ...p,
            comments: [...p.comments, tempComment],
          }
        : p,
    ),
  );

  setCommentText((prev) => ({ ...prev, [postId]: '' }));
  setCommentEmotes((prev) => ({ ...prev, [postId]: [] }));
  setCommentFiles((prev) => ({ ...prev, [postId]: [] }));
  setEmojiPickerPostId(null);

  try {
    const { data, error } = await supabase
      .from('ct_baicongdong')
      .insert({
        manguoidung: currentUserId,
        mabangcongdong: postId,
        noidung: content || '',
      })
      .select('mactbaicongdong,manguoidung,mabangcongdong,noidung,created_at,is_recalled,recalled_at,updated_at')
      .single();

    if (error) throw error;

    const commentId = String(data.mactbaicongdong);

    let uploadedAttachments: FeedMedia[] = [];

    if (files.length > 0) {
      uploadedAttachments = await uploadFilesToBucket(files, `comments/${commentId}`);

      const commentMediaRows = uploadedAttachments.map((item) => ({
        hinhanh: item.url,
        mactbaicongdong: commentId,
        uploaded_by: currentUserId,
        loaifile: item.type,
        ten_file: item.name,
      }));

      const { error: mediaError } = await supabase
        .from('hinhanh_binhluan')
        .insert(commentMediaRows);

      if (mediaError) {
        console.error('ADD COMMENT MEDIA ERROR:', mediaError);
        toast.error('Không lưu được file của bình luận');
      }
    }

    let emotePayload: string[] = selectedEmoteIds
      .map((id) => emojiById.get(id))
      .filter(Boolean) as string[];

    if (selectedEmoteIds.length > 0) {
      const emoteRows = selectedEmoteIds.map((macamxuc) => ({
        mactbaicongdong: commentId,
        macamxuc,
      }));

      const { error: emoteError } = await supabase
        .from('ct_baicongdong_camxuc')
        .insert(emoteRows);

      if (emoteError) {
        console.error('ADD COMMENT EMOTE ERROR:', emoteError);
        toast.error('Không lưu được emoji của bình luận');
      }
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.map((c) =>
                c.id === tempId
                  ? {
                      ...c,
                      id: commentId,
                      createdAt: data.created_at ?? c.createdAt,
                      attachments: uploadedAttachments,
                      emotes: emotePayload,
                    }
                  : c,
              ),
            }
          : p,
      ),
    );

    toast.success('Đã thêm bình luận');
  } catch (error) {
    console.error('ADD COMMENT ERROR:', error);
    toast.error('Không gửi được bình luận');

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.filter((c) => c.id !== tempId),
            }
          : p,
      ),
    );
  }
};

  const handleRecallComment = async (postId: string, commentId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;

    const canRecall = comment.userId === currentUserId || isAdmin;
    if (!canRecall) {
      toast.error('Bạn không có quyền thu hồi bình luận này');
      return;
    }

    const { error } = await supabase
  .from('ct_baicongdong')
  .update({
    noidung: 'Tin nhắn đã được thu hồi',
    is_recalled: true,
    recalled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('mactbaicongdong', commentId);

    if (error) {
      console.error('RECALL COMMENT ERROR:', error);
      toast.error('Không thu hồi được bình luận');
      return;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.map((c) =>
                c.id === commentId
                  ? { ...c, content: 'Tin nhắn đã được thu hồi', emotes: [], attachments: [], isRecalled: true }
                  : c,
              ),
            }
          : p,
      ),
    );

    toast.success('Đã thu hồi tin nhắn');
  };

  const handleCreatePost = async () => {
    if (!parkingLot) return;

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    if (!currentUserId) {
      toast.error('Không tìm thấy người dùng đăng nhập');
      return;
    }

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('baicongdong')
        .insert({
          manguoidung: currentUserId,
          mabaido: parkingLot.id,
          tieude: newPostTitle.trim(),
          noidung: newPostContent.trim(),
          phanloai: newPostCategory,
          luotthich: 0,
          hinhanh: null,
          is_deleted: false,
        })
        .select('*')
        .single();

     if (insertError) throw insertError;

 const postId = String(inserted.mabangcongdong);

 // 1. Tự động ghi vào bảng duyet với trạng thái chưa duyệt
 const { error: duyetError } = await supabase
 .from('duyet')
 .insert({
 mabangcongdong: postId,
 trangthaiduyet: false });

if (duyetError) {
 console.error('INSERT DUYET ERROR:', duyetError);
 }

// 2. Upload media file (nếu có)
const uploaded = newPostFiles.length
? await uploadFilesToBucket(newPostFiles, `baicongdong/${postId}`)
 : [];

 let coverUrl: string | null = null;

 if (uploaded.length > 0) {
 coverUrl = uploaded[0].url;

const mediaRows = uploaded.map((item) => ({
hinhanh: item.url,
mabangcongdong: postId,
 uploaded_by: currentUserId,
loaifile: item.type,
ten_file: item.name,
}));

await supabase.from('hinhanh').insert(mediaRows);

 await supabase
 .from('baicongdong')
 .update({ hinhanh: coverUrl, updated_at: new Date().toISOString() })
 .eq('mabangcongdong', postId);
 }

 toast.success('Đăng bài thành công. Vui lòng chờ quản trị viên duyệt!');
 setShowNewPost(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('trai_nghiem');
      setNewPostFiles([]);
      if (postFileInputRef.current) postFileInputRef.current.value = '';
      await loadFeed();
    } catch (error) {
      console.error('CREATE POST ERROR:', error);
      toast.error('Không tạo được bài đăng');
    }
  };

  const handleOpenEdit = (post: FeedPost) => {
    setEditingPost(post);
    setEditingTitle(post.title);
    setEditingContent(post.content);
    setEditingCategory(post.category);
    setEditingFiles([]);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    if (!editingTitle.trim() || !editingContent.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('baicongdong')
        .update({
          tieude: editingTitle.trim(),
          noidung: editingContent.trim(),
          phanloai: editingCategory,
          updated_at: new Date().toISOString(),
        })
        .eq('mabangcongdong', editingPost.dbId);

      if (updateError) throw updateError;

      if (editingFiles.length > 0) {
        const uploaded = await uploadFilesToBucket(editingFiles, `baicongdong/${editingPost.dbId}/edit`);
        if (uploaded.length > 0) {
         const mediaRows = uploaded.map((item) => ({
  hinhanh: item.url,
  mabangcongdong: editingPost.dbId,
  uploaded_by: currentUserId,
  loaifile: item.type,
  ten_file: item.name,
}));
await supabase.from('hinhanh').insert(mediaRows);
        }
      }

      toast.success('Đã cập nhật bài đăng');
      setEditingPost(null);
      setEditingFiles([]);
      await loadFeed();
    } catch (error) {
      console.error('EDIT POST ERROR:', error);
      toast.error('Không cập nhật được bài đăng');
    }
  };

  const handleDeletePost = async (post: FeedPost) => {
    const canDelete = isAdmin || post.authorId === currentUserId;
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa bài này');
      return;
    }

    const ok = window.confirm('Xóa bài đăng này?');
    if (!ok) return;

    const { error } = await supabase
      .from('baicongdong')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('mabangcongdong', post.dbId);

    if (error) {
      console.error('DELETE POST ERROR:', error);
      toast.error('Không xóa được bài đăng');
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success('Đã xóa bài đăng');
  };

  const handleExitCommunity = () => {
    localStorage.removeItem('communityCode');
    navigate('/community');
    toast.success('Đã rời khỏi cộng đồng');
  };

  if (!communityCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl text-gray-900 mb-2">Chưa có mã cộng đồng</h2>
          <p className="text-gray-600 mb-6">Vui lòng nhập mã cộng đồng để tiếp tục</p>
          <button
            onClick={() => navigate('/community')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (loadError || !parkingLot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl text-gray-900 mb-2">Không tải được cộng đồng</h2>
          <p className="text-gray-600 mb-6">{loadError ?? 'Dữ liệu không tồn tại'}</p>
          <button
            onClick={() => navigate('/community')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleExitCommunity}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl mb-1">{parkingLot.name}</h1>
              <p className="text-purple-100 text-sm">Cộng đồng • Mã: {communityCode}</p>
            </div>
            
           <button
  onClick={() => navigate(`/community/support?code=${communityCode}`)}
  className="bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-xl transition-all flex items-center gap-2"
>
  <HelpCircle className="w-5 h-5" />
  Hỗ trợ
</button>
            <button
              onClick={() => navigate(`/community/chat?code=${communityCode}`)}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
               onClick={() => navigate(`/community/reviews?lotId=${parkingLot.id}`)}
              className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <Star className="w-5 h-5" />
              Đánh giá
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
              <h3 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-600" />
                Phân loại
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const active = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value as any)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                        active ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bài viết..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowNewPost(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Đăng bài
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Chưa có bài viết nào</p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const categoryInfo = categoryMeta[post.category];
                  const canManage = isAdmin || post.authorId === currentUserId;

                  return (
                    <div key={post.id} className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl font-semibold">
                          {post.authorName?.[0] ?? 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-gray-900 font-medium">{post.authorName}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${categoryInfo.color}`}>
                              <categoryInfo.icon className="w-3 h-3 inline-block mr-1" />
                              {categoryInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>{formatDate(post.createdAt)}</span>
                            {post.updatedAt && <span>• sửa {formatDate(post.updatedAt)}</span>}
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(post)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
                      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

                      {post.media.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
    {post.media.map((item) =>
      item.type === 'video' ? (
        <video
          key={item.id}
          controls
          className="w-full rounded-xl border border-gray-200 bg-black max-h-80 object-cover"
          src={item.url}
        />
      ) : item.type === 'image' ? (
        <img
          key={item.id}
          src={item.url}
          alt={item.name}
          className="w-full rounded-xl border border-gray-200 object-cover max-h-80"
        />
      ) : (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 underline"
        >
          <Paperclip className="w-4 h-4" />
          {item.name}
        </a>
      ),
    )}
  </div>
)}

                      {post.coverUrl && post.media.length === 0 && (
                        <img
                          src={post.coverUrl}
                          alt="cover"
                          className="w-full rounded-xl border border-gray-200 object-cover max-h-80 mb-4"
                        />
                      )}

                      <div className="flex items-center gap-6 pt-4 border-t">
                        <button
  onClick={() => handleLikePost(post.id)}
  disabled={likedPostIds.includes(post.id)}
  className={`flex items-center gap-2 transition-all ${
    likedPostIds.includes(post.id)
      ? 'text-purple-600 cursor-not-allowed'
      : 'text-gray-600 hover:text-purple-600'
  }`}
>
  <ThumbsUp className="w-5 h-5" />
  <span>{post.likes}</span>
</button>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MessageSquare className="w-5 h-5" />
                          <span>{post.comments.length}</span>
                        </div>
                      </div>

                 {post.comments.length > 0 && (
  <div className="mt-4 pt-4 border-t space-y-3">
    {post.comments.map((comment) => (
      <div key={comment.id} className="flex gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm">
          {comment.userName?.[0] ?? 'U'}
        </div>

        <div className="flex-1 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-sm text-gray-900 font-medium">{comment.userName}</div>
            <div className="text-xs text-gray-400">{formatDate(comment.createdAt)}</div>
          </div>

          {comment.isRecalled ? (
            <p className="text-sm italic text-gray-500">Tin nhắn đã được thu hồi</p>
          ) : (
            <>
              {comment.content && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              )}

              {comment.emotes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {comment.emotes.map((emoji, idx) => (
                    <span
                      key={`${comment.id}-${emoji}-${idx}`}
                      className="inline-flex items-center rounded-full bg-white px-2 py-1 text-sm border border-gray-200"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {comment.attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {comment.attachments.map((item) =>
                    item.type === 'video' ? (
                      <video
                        key={item.id}
                        controls
                        src={item.url}
                        className="w-full max-h-60 rounded-xl object-cover border border-gray-200"
                      />
                    ) : item.type === 'image' ? (
                      <img
                        key={item.id}
                        src={item.url}
                        alt={item.name}
                        className="w-full max-h-60 rounded-xl object-cover border border-gray-200"
                      />
                    ) : (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        {item.name}
                      </a>
                    ),
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                {comment.userId === currentUserId || isAdmin ? (
                  <button
                    onClick={() => handleRecallComment(post.id, comment.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Thu hồi
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
)}

                   <div className="mt-4 space-y-3">
  {(commentFiles[post.id] ?? []).length > 0 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {(commentFiles[post.id] ?? []).map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            {file.type.startsWith('image/') ? (
              <ImageIcon className="w-4 h-4 text-purple-600" />
            ) : file.type.startsWith('video/') ? (
              <Video className="w-4 h-4 text-purple-600" />
            ) : (
              <Paperclip className="w-4 h-4 text-purple-600" />
            )}
            <span className="text-sm text-gray-700 truncate">{file.name}</span>
          </div>
          <button
            onClick={() => {
              setCommentFiles((prev) => ({
                ...prev,
                [post.id]: (prev[post.id] ?? []).filter((_, i) => i !== index),
              }));
            }}
            className="text-gray-500 hover:text-red-600"
            title="Xóa tệp"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )}

  {(commentEmotes[post.id] ?? []).length > 0 && (
    <div className="flex flex-wrap gap-2">
      {(commentEmotes[post.id] ?? []).map((emojiId) => (
        <button
          key={emojiId}
          onClick={() => {
            setCommentEmotes((prev) => ({
              ...prev,
              [post.id]: (prev[post.id] ?? []).filter((id) => id !== emojiId),
            }));
          }}
          className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700 border border-purple-200"
          title="Bỏ emoji này"
        >
          <span>{emojiById.get(emojiId) ?? ''}</span>
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  )}

  <div className="flex gap-2 relative items-end">
    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-gray-800 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
      <Paperclip className="w-4 h-4" />
      <span>Tải ảnh / file</span>
      <input
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 3);
          setCommentFiles((prev) => ({
            ...prev,
            [post.id]: [...(prev[post.id] ?? []), ...files].slice(0, 3),
          }));
          e.target.value = '';
        }}
      />
    </label>

    <button
      onClick={() => setEmojiPickerPostId((prev) => (prev === post.id ? null : post.id))}
      className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all"
      title="Chọn emoji"
    >
      <Smile className="w-5 h-5" />
    </button>

    <input
      type="text"
      value={commentText[post.id] || ''}
      onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
      placeholder="Nhắn gì đó..."
      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleAddComment(post.id);
        }
      }}
    />

    <button
      onClick={() => handleAddComment(post.id)}
      className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-all"
    >
      <Send className="w-5 h-5" />
    </button>

    {emojiPickerPostId === post.id && (
      <div className="absolute bottom-14 right-0 z-20 w-[340px] max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-900">Chọn emoji</div>
          <button
            onClick={() => setEmojiPickerPostId(null)}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {emojis.map((emoji) => {
            const active = (commentEmotes[post.id] ?? []).includes(emoji.id);
            return (
              <button
                key={emoji.id}
                onClick={() => {
                  setCommentEmotes((prev) => {
                    const current = prev[post.id] ?? [];
                    return current.includes(emoji.id)
                      ? { ...prev, [post.id]: current.filter((id) => id !== emoji.id) }
                      : { ...prev, [post.id]: [...current, emoji.id] };
                  });
                }}
                className={`h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg ${
                  active ? 'bg-purple-100 ring-2 ring-purple-400' : ''
                }`}
                title={emoji.unicodeName ?? emoji.slug ?? emoji.character}
              >
                {emoji.character}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900">Tạo bài đăng mới</h2>
              <button
                onClick={() => setShowNewPost(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Phân loại</label>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => c.value !== 'all')
                    .map((cat) => {
                      const Icon = cat.icon;
                      const active = newPostCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setNewPostCategory(cat.value as PostCategory)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            active ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Nhập tiêu đề bài đăng"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Nội dung</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
  <label className="block text-sm text-gray-700 mb-2">Ảnh / video / file</label>

  <button
    type="button"
    onClick={() => postFileInputRef.current?.click()}
    className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-800 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
  >
    <Paperclip className="w-4 h-4" />
    Tải ảnh / file
  </button>

  <input
    ref={postFileInputRef}
    type="file"
    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
    multiple
    hidden
    onChange={(e) => {
      const files = Array.from(e.target.files ?? []).slice(0, 3);
      setNewPostFiles(files);
    }}
  />

  {newPostFiles.length > 0 ? (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {newPostFiles.map((file) => (
        <div key={file.name} className="rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
          {file.type.startsWith('video') ? (
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {file.name}
            </div>
          ) : file.type.startsWith('image') ? (
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {file.name}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              {file.name}
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-2 text-sm text-gray-500">Chưa có file nào</p>
  )}
</div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Bài đăng sẽ được lưu vào bảng <span className="font-semibold">baicongdong</span> và media vào bucket <span className="font-semibold">CongDong</span> + bảng <span className="font-semibold">hinhanh</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewPost(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreatePost}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg transition-all"
              >
                Đăng bài
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900">Chỉnh sửa bài đăng</h2>
              <button
                onClick={() => setEditingPost(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Phân loại</label>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => c.value !== 'all')
                    .map((cat) => {
                      const Icon = cat.icon;
                      const active = editingCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setEditingCategory(cat.value as PostCategory)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            active ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Nội dung</label>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>

            <div>
  <label className="block text-sm text-gray-700 mb-2">Thêm ảnh / video / file</label>

  <button
    type="button"
    onClick={() => editFileInputRef.current?.click()}
    className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-800 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
  >
    <Paperclip className="w-4 h-4" />
    Tải ảnh / file
  </button>

  <input
    ref={editFileInputRef}
    type="file"
    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
    multiple
    hidden
    onChange={(e) => {
      const files = Array.from(e.target.files ?? []).slice(0, 3);
      setEditingFiles(files);
    }}
  />

  {editingFiles.length > 0 ? (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {editingFiles.map((file) => (
        <div key={file.name} className="rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
          {file.type.startsWith('video') ? (
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {file.name}
            </div>
          ) : file.type.startsWith('image') ? (
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {file.name}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              {file.name}
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-2 text-sm text-gray-500">Chưa chọn file nào</p>
  )}
</div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Chỉnh sửa sẽ cập nhật trực tiếp vào <span className="font-semibold">baicongdong</span>. Media mới sẽ được thêm tiếp vào bucket <span className="font-semibold">CongDong</span> và bảng <span className="font-semibold">hinhanh</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingPost(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg transition-all"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};