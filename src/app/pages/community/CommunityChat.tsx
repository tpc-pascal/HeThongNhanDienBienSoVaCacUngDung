import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listenChange, notifyChange } from '../../utils/realtimeSync';
import {
  ArrowLeft,
  Paperclip,
  Send,
  Smile,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.tsx';
import { supabase } from '../../utils/supabase.ts';

type MediaType = 'image' | 'video' | 'file';
type EmojiSize = 'sm' | 'md' | 'lg';

interface FeedMedia {
  id: string;
  url: string;
  type: MediaType;
  name: string;
}

interface CommentEmoji {
  reactionId: string;
  emojiId: string;
  emoji: string;
  size: EmojiSize;
}

interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  isRecalled: boolean;
  emotes: CommentEmoji[];
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
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
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

interface PendingEmoji {
  emojiId: string;
  size: EmojiSize;
}

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

const GROUP_CHAT_TYPE = 'group_chat';
const MAX_ATTACHMENTS = 3;

const normalizeMediaType = (value?: string | null): MediaType => {
  const v = String(value ?? '').toLowerCase();
  if (v.startsWith('video')) return 'video';
  if (v.startsWith('image')) return 'image';
  return 'file';
};

const mapEmojiRow = (row: any): EmojiItem => ({
  id: String(row.macamxuc),
  character: String(row.bieutuong ?? ''),
  slug: row.slug ?? undefined,
  unicodeName: row.unicode_name ?? undefined,
  codePoint: row.code_point ?? undefined,
  group: row.nhom ?? undefined,
  subGroup: row.nhom_con ?? undefined,
});

const mapMediaRow = (row: any): FeedMedia => ({
  id: String(row.mahinhanh ?? row.id ?? crypto.randomUUID()),
  url: String(row.hinhanh ?? ''),
  type: normalizeMediaType(row.loaifile),
  name: String(row.ten_file ?? 'file'),
});




const EMOJI_SIZE_CLASS: Record<EmojiSize, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

const EMOJI_BTN_CLASS: Record<EmojiSize, string> = {
  sm: 'h-8 w-8 text-lg',
  md: 'h-10 w-10 text-xl',
  lg: 'h-12 w-12 text-2xl',
};

export const CommunityChat = () => {
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
  const [thread, setThread] = useState<FeedPost | null>(null);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);

  const [composerText, setComposerText] = useState('');
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerEmojis, setComposerEmojis] = useState<PendingEmoji[]>([]);
  const [composerEmojiSize, setComposerEmojiSize] = useState<EmojiSize>('md');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<
    { id: string; emoji: string; x: number; y: number; size: EmojiSize }[]
  >([]);

  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
 



  const reloadTimerRef = useRef<number | null>(null);

const scheduleThreadReload = (refreshEmoji = false) => {
  if (reloadTimerRef.current) {
    window.clearTimeout(reloadTimerRef.current);
  }

  reloadTimerRef.current = window.setTimeout(async () => {
    try {
      if (refreshEmoji) {
        await loadEmojiCatalog();
      }
      await loadThread(true);
    } catch (error) {
      console.error('SCHEDULED RELOAD ERROR:', error);
    }
  }, 180);
};
  const emojiById = useMemo(() => {
    const map = new Map<string, string>();
    emojis.forEach((emoji) => map.set(emoji.id, emoji.character));
    return map;
  }, [emojis]);

  const spawnEmojiBurst = (emoji: string, size: EmojiSize = 'md') => {
    const burst = {
      id: crypto.randomUUID(),
      emoji,
      x: Math.random() * 70 + 15,
      y: Math.random() * 55 + 18,
      size,
    };

    setFloatingEmojis((prev) => [...prev, burst]);

    window.setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== burst.id));
    }, 1600);
  };

  const uploadFilesToBucket = async (files: File[], prefix: string): Promise<FeedMedia[]> => {
    const result: FeedMedia[] = [];

    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('CongDong')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('CongDong').getPublicUrl(path);

      result.push({
        id: crypto.randomUUID(),
        url: data.publicUrl,
        type: isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : 'file',
        name: file.name,
      });
    }

    return result;
  };

const loadEmojiCatalog = async () => {
  try {
    const { data, error } = await supabase
      .from('camxuc')
      .select('macamxuc,bieutuong,slug,unicode_name,code_point,nhom,nhom_con,nguon,created_at')
      .order('created_at', { ascending: true })
      .order('macamxuc', { ascending: true });

    if (error) throw error;

    setEmojis((data ?? []).map(mapEmojiRow));
  } catch (error) {
    console.error('LOAD EMOJI ERROR:', error);
    setEmojis([]);
  }
};

const loadThread = async (silent = false) => {
  try {
    if (!silent) setLoading(true);
    setLoadError(null);

    if (!communityCode) {
      throw new Error('Chưa có mã cộng đồng.');
    }

    if (!currentUserId) {
      throw new Error('Không xác định được người dùng đăng nhập.');
    }

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

    const { data: threadRows, error: threadError } = await supabase
      .from('baicongdong')
      .select('mabangcongdong,manguoidung,mabaido,tieude,noidung,hinhanh,luotthich,created_at,phanloai,updated_at,is_deleted')
      .eq('mabaido', lotId)
      .eq('phanloai', GROUP_CHAT_TYPE)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (threadError) throw threadError;

    let threadRow = threadRows?.[0] ?? null;

    if (!threadRow) {
      const { data: createdThread, error: createThreadError } = await supabase
        .from('baicongdong')
        .insert({
          manguoidung: currentUserId,
          mabaido: lotId,
          tieude: GROUP_CHAT_TYPE,
          noidung: '',
          hinhanh: null,
          luotthich: 0,
          phanloai: GROUP_CHAT_TYPE,
          is_deleted: false,
        })
        .select('mabangcongdong,manguoidung,mabaido,tieude,noidung,hinhanh,luotthich,created_at,phanloai,updated_at,is_deleted')
        .single();

      if (createThreadError) throw createThreadError;
      threadRow = createdThread ?? null;
    }

    if (!threadRow) {
      throw new Error('Không tạo được nhóm chat chung.');
    }

    const threadId = String(threadRow.mabangcongdong);

    const { data: commentRows, error: commentError } = await supabase
      .from('ct_baicongdong')
      .select('mactbaicongdong,manguoidung,mabangcongdong,noidung,created_at,is_recalled,recalled_at,updated_at')
      .eq('mabangcongdong', threadId)
      .order('created_at', { ascending: true });

    if (commentError) throw commentError;

    const commentIds = (commentRows ?? [])
      .map((row: any) => String(row.mactbaicongdong ?? ''))
      .filter(Boolean);

    const authorIds = new Set<string>();
    if (threadRow.manguoidung) authorIds.add(String(threadRow.manguoidung));
    (commentRows ?? []).forEach((row: any) => {
      if (row.manguoidung) authorIds.add(String(row.manguoidung));
    });

    const [
      postMediaResult,
      commentMediaResult,
      commentEmojiResult,
      userResult,
      emojiResult,
      emojiSizeResult,
    ] = await Promise.all([
      supabase
        .from('hinhanh')
        .select('mahinhanh,hinhanh,created_at,mabangcongdong,uploaded_by,loaifile,ten_file')
        .eq('mabangcongdong', threadId)
        .order('created_at', { ascending: true }),

      commentIds.length
        ? supabase
            .from('hinhanh_binhluan')
            .select('mahinhanh,mactbaicongdong,hinhanh,uploaded_by,loaifile,ten_file,created_at')
            .in('mactbaicongdong', commentIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),

      commentIds.length
        ? supabase
            .from('ct_baicongdong_camxuc')
            .select('id,mactbaicongdong,macamxuc,created_at')
            .in('mactbaicongdong', commentIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),

      authorIds.size
        ? supabase
            .from('nguoidung')
            .select('manguoidung,email,tennguoidung,updated_at,chucnang,mapinnguoidung')
            .in('manguoidung', Array.from(authorIds))
        : Promise.resolve({ data: [] as any[], error: null as any }),

      supabase
        .from('camxuc')
        .select('macamxuc,bieutuong,created_at,slug,unicode_name,code_point,nhom,nhom_con,nguon')
        .order('created_at', { ascending: true }),

      commentIds.length
        ? supabase
            .from('kichthuoccamxuc')
            .select('id,ct_camxuc_id,kichthuoc,created_at')
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null as any }),
    ]);

    if (postMediaResult.error) throw postMediaResult.error;
    if (commentMediaResult.error) throw commentMediaResult.error;
    if (commentEmojiResult.error) throw commentEmojiResult.error;
    if (userResult.error) throw userResult.error;
    if (emojiResult.error) throw emojiResult.error;
    if (emojiSizeResult.error) throw emojiSizeResult.error;

    const userMap = new Map<string, string>();
    (userResult.data ?? []).forEach((row: any) => {
      userMap.set(String(row.manguoidung), String(row.tennguoidung ?? 'Người dùng'));
    });

    const emojiMap = new Map<string, string>();
    (emojiResult.data ?? []).forEach((row: any) => {
      emojiMap.set(String(row.macamxuc), String(row.bieutuong ?? ''));
    });

    const sizeMap = new Map<string, EmojiSize>();
    (emojiSizeResult.data ?? []).forEach((row: any) => {
      const reactionId = String(row.ct_camxuc_id ?? '');
      const size = String(row.kichthuoc ?? 'md') as EmojiSize;
      if (!reactionId) return;
      sizeMap.set(reactionId, size === 'sm' || size === 'lg' ? size : 'md');
    });

    const mediaByPost = new Map<string, FeedMedia[]>();
    (postMediaResult.data ?? []).forEach((row: any) => {
      const postId = String(row.mabangcongdong ?? '');
      if (!postId) return;

      const current = mediaByPost.get(postId) ?? [];
      current.push(mapMediaRow(row));
      mediaByPost.set(postId, current);
    });

    const mediaByComment = new Map<string, FeedMedia[]>();
    (commentMediaResult.data ?? []).forEach((row: any) => {
      const commentId = String(row.mactbaicongdong ?? '');
      if (!commentId) return;

      const current = mediaByComment.get(commentId) ?? [];
      current.push(mapMediaRow(row));
      mediaByComment.set(commentId, current);
    });

    const emotesByComment = new Map<string, CommentEmoji[]>();
    (commentEmojiResult.data ?? []).forEach((row: any) => {
      const reactionId = String(row.id ?? '');
      const commentId = String(row.mactbaicongdong ?? '');
      const emojiId = String(row.macamxuc ?? '');

      if (!reactionId || !commentId || !emojiId) return;

      const current = emotesByComment.get(commentId) ?? [];
      current.push({
        reactionId,
        emojiId,
        emoji: emojiMap.get(emojiId) ?? '❓',
        size: sizeMap.get(reactionId) ?? 'md',
      });
      emotesByComment.set(commentId, current);
    });

    const comments: FeedComment[] = (commentRows ?? []).map((row: any) => {
      const commentId = String(row.mactbaicongdong);

      return {
        id: commentId,
        postId: threadId,
        userId: String(row.manguoidung ?? ''),
        userName: userMap.get(String(row.manguoidung ?? '')) ?? 'Người dùng',
        content: String(row.noidung ?? ''),
        createdAt: row.created_at ?? new Date().toISOString(),
        isRecalled: Boolean(row.is_recalled),
        emotes: emotesByComment.get(commentId) ?? [],
        attachments: mediaByComment.get(commentId) ?? [],
      };
    });

    const mappedThread: FeedPost = {
      id: threadId,
      dbId: threadId,
      authorId: String(threadRow.manguoidung ?? ''),
      authorName: userMap.get(String(threadRow.manguoidung ?? '')) ?? 'Người dùng',
      parkingLotId: lotId,
      parkingLotCode: String(lotRow.mathamgia ?? communityCode),
      parkingLotName: String(lotRow.tenbaido ?? 'Bãi đỗ xe'),
      title: String(threadRow.tieude ?? GROUP_CHAT_TYPE),
      content: String(threadRow.noidung ?? ''),
      createdAt: threadRow.created_at ?? new Date().toISOString(),
      updatedAt: threadRow.updated_at ?? null,
      media: mediaByPost.get(threadId) ?? [],
      comments,
      coverUrl: threadRow.hinhanh ?? null,
      isDeleted: Boolean(threadRow.is_deleted),
    };

    setThread(mappedThread);
  } catch (error: any) {
    console.error('LOAD THREAD ERROR:', error);
    setLoadError(error?.message ?? 'Không tải được dữ liệu.');
    setThread(null);
  } finally {
    if (!silent) setLoading(false);
  }
};

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      if (!communityCode) return;
      await loadEmojiCatalog();
      if (!alive) return;
      await loadThread();
    };

    void bootstrap();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityCode]);

useEffect(() => {
  if (!communityCode) return;

  return listenChange(communityCode, () => {
    void loadThread(true);
  });
}, [communityCode]);
  
useEffect(() => {
  if (!communityCode) return;

  let alive = true;

  const scheduleReload = (refreshEmoji = false) => {
    if (!alive) return;
    scheduleThreadReload(refreshEmoji);
  };

  if (realtimeChannelRef.current) {
    void supabase.removeChannel(realtimeChannelRef.current);
    realtimeChannelRef.current = null;
  }

  const channel = supabase.channel(`community-chat-${communityCode}`);
  realtimeChannelRef.current = channel;

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'baicongdong' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_baicongdong' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_baicongdong_camxuc' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hinhanh' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hinhanh_binhluan' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nguoidung' }, () => scheduleReload(false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'camxuc' }, () => scheduleReload(true))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kichthuoccamxuc' }, () => scheduleReload(false))
    .subscribe((status) => {
      console.log('[community-chat] realtime status:', status);
    });

  return () => {
    alive = false;

    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }

    if (realtimeChannelRef.current) {
      void supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };
}, [communityCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread?.comments.length]);

  const handlePickEmoji = (emojiId: string) => {
    const emoji = emojiById.get(emojiId);
    if (!emoji) return;

    setComposerEmojis((prev) => [...prev, { emojiId, size: composerEmojiSize }]);
    spawnEmojiBurst(emoji, composerEmojiSize);
  };

  const handleRemovePendingEmoji = (index: number) => {
    setComposerEmojis((prev) => prev.filter((_, i) => i !== index));
  };

const handleSendComment = async () => {
  const content = composerText.trim();
  const selectedEmojiItems = composerEmojis.slice();
  const files = composerFiles.slice(0, MAX_ATTACHMENTS);

  if (!content && selectedEmojiItems.length === 0 && files.length === 0) {
    toast.error('Nhập nội dung, chọn emoji hoặc thêm file trước khi gửi');
    return;
  }

  if (!currentUserId) {
    toast.error('Không tìm thấy người dùng đăng nhập');
    return;
  }

  if (!thread) {
    toast.error('Chưa có bài đăng để bình luận');
    return;
  }

  const optimisticId = crypto.randomUUID();

  const optimisticComment: FeedComment = {
    id: optimisticId,
    postId: thread.dbId,
    userId: currentUserId,
    userName: currentUserName,
    content: content || '',
    createdAt: new Date().toISOString(),
    isRecalled: false,
    emotes: selectedEmojiItems.map((item) => ({
      reactionId: crypto.randomUUID(),
      emojiId: item.emojiId,
      emoji: emojiById.get(item.emojiId) ?? '',
      size: item.size,
    })),
    attachments: files.map((file) => ({
      id: crypto.randomUUID(),
      url: '',
      type: isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : 'file',
      name: file.name,
    })),
  };

  setThread((prev) =>
    prev
      ? {
          ...prev,
          comments: [...prev.comments, optimisticComment],
        }
      : prev,
  );

  setComposerText('');
  setComposerEmojis([]);
  setComposerFiles([]);
  setShowEmojiPicker(false);

  try {
    const { data, error } = await supabase
      .from('ct_baicongdong')
      .insert({
        manguoidung: currentUserId,
        mabangcongdong: thread.dbId,
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

      const { error: mediaError } = await supabase.from('hinhanh_binhluan').insert(commentMediaRows);
      if (mediaError) {
        console.error('ADD COMMENT MEDIA ERROR:', mediaError);
        toast.error('Không lưu được file của bình luận');
      }
    }

    let emotePayload: CommentEmoji[] = [];

    if (selectedEmojiItems.length > 0) {
      const emojiRows = selectedEmojiItems.map((item) => ({
        mactbaicongdong: commentId,
        macamxuc: item.emojiId,
      }));

      const { data: emojiData, error: emoteError } = await supabase
        .from('ct_baicongdong_camxuc')
        .insert(emojiRows)
        .select('id,mactbaicongdong,macamxuc,created_at');

      if (emoteError) {
        console.error('ADD COMMENT EMOTE ERROR:', emoteError);
        toast.error('Không lưu được emoji của bình luận');
      } else {
        const insertedEmojiRows = emojiData ?? [];

        const sizeRows = insertedEmojiRows.map((row: any, index: number) => ({
          ct_camxuc_id: String(row.id),
          kichthuoc: selectedEmojiItems[index]?.size ?? 'md',
        }));

        if (sizeRows.length > 0) {
          const { error: sizeError } = await supabase.from('kichthuoccamxuc').insert(sizeRows);
          if (sizeError) {
            console.error('ADD COMMENT EMOJI SIZE ERROR:', sizeError);
            toast.error('Không lưu được kích thước emoji');
          }
        }

        emotePayload = insertedEmojiRows.map((row: any, index: number) => ({
          reactionId: String(row.id),
          emojiId: String(row.macamxuc),
          emoji: emojiById.get(String(row.macamxuc)) ?? '',
          size: selectedEmojiItems[index]?.size ?? 'md',
        }));
      }
    }

    setThread((prev) =>
      prev
        ? {
            ...prev,
            comments: prev.comments.map((c) =>
              c.id === optimisticId
                ? {
                    ...c,
                    id: commentId,
                    emotes: emotePayload,
                    attachments: uploadedAttachments,
                    createdAt: data.created_at ?? c.createdAt,
                  }
                : c,
            ),
          }
        : prev,
    );

      await supabase
      .from('ct_baicongdong')
      .update({ updated_at: new Date().toISOString() })
      .eq('mactbaicongdong', commentId);

    notifyChange(communityCode);

    await loadThread(true);

    toast.success('Đã thêm bình luận');
  } catch (error) {
    console.error('ADD COMMENT ERROR:', error);

    setThread((prev) =>
      prev
        ? {
            ...prev,
            comments: prev.comments.filter((c) => c.id !== optimisticId),
          }
        : prev,
    );
    notifyChange(communityCode);
    toast.error('Không gửi được bình luận');
  }
};

const handleRecallComment = async (postId: string, commentId: string) => {
  const post = thread;
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

  setThread((prev) =>
    prev
      ? {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId
              ? { ...c, content: 'Tin nhắn đã được thu hồi', emotes: [], attachments: [], isRecalled: true }
              : c,
          ),
        }
      : prev,
  );
  scheduleThreadReload(false);
  toast.success('Đã thu hồi tin nhắn');
};





  if (!communityCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl text-gray-900 mb-2">Chưa có mã cộng đồng</h2>
          <p className="text-gray-600 mb-6">Vui lòng nhập mã cộng đồng để tiếp tục</p>
          <button
            onClick={() => navigate('/community')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
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

  if (loadError || !parkingLot || !thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl text-gray-900 mb-2">Không tải được nhóm chat</h2>
          <p className="text-gray-600 mb-6">{loadError ?? 'Dữ liệu không tồn tại'}</p>
          <button
            onClick={() => navigate('/community')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative overflow-hidden">
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-none fixed z-[70] select-none animate-bounce ${EMOJI_SIZE_CLASS[item.size]}`}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))',
          }}
        >
          {item.emoji}
        </div>
      ))}

     <div className="fixed inset-x-0 top-0 z-40 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl">
  <div className="max-w-6xl mx-auto px-4 py-4">
    <div className="flex items-center gap-4">
      <button
        onClick={() => navigate(`/community/feed?code=${communityCode}`)}
        className="p-2 hover:bg-white/20 rounded-full transition-all"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl mb-1 truncate">{parkingLot.name}</h1>
        <p className="text-purple-100 text-sm">Nhóm chat chung • Mã: {communityCode}</p>
      </div>
    </div>
  </div>
</div>

      <div className="max-w-6xl mx-auto px-4 py-6 pt-24 pb-40">
        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-white/60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl font-semibold shrink-0">
              {thread.authorName?.[0] ?? 'U'}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-gray-900 font-medium">{thread.authorName}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Nhóm chat chung</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>{formatDate(thread.createdAt)}</span>
                {thread.updatedAt && <span>• sửa {formatDate(thread.updatedAt)}</span>}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mt-3 mb-2">{thread.title}</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{thread.content}</p>
            </div>
          </div>

          {thread.media.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {thread.media.map((item) =>
                item.type === 'video' ? (
                  <video
                    key={item.id}
                    controls
                    className="w-full rounded-2xl border border-gray-200 bg-black max-h-80 object-cover"
                    src={item.url}
                  />
                ) : item.type === 'image' ? (
                  <img
                    key={item.id}
                    src={item.url}
                    alt={item.name}
                    className="w-full rounded-2xl border border-gray-200 object-cover max-h-80"
                  />
                ) : (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 underline"
                  >
                    <Paperclip className="w-4 h-4" />
                    {item.name}
                  </a>
                ),
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {thread.comments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Smile className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Chưa có tin nhắn nào</p>
            </div>
          ) : (
            thread.comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-2xl shadow-md p-4 border border-white/60">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm shrink-0">
                    {comment.userName?.[0] ?? 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm text-gray-900 font-medium truncate">{comment.userName}</div>
                      <div className="text-xs text-gray-400 shrink-0">{formatDate(comment.createdAt)}</div>
                    </div>

                   {comment.isRecalled ? (
  <p className="text-sm italic text-gray-500">Tin nhắn đã được thu hồi</p>
) : (
  <>
    {comment.content && (
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
    )}

    {comment.emotes.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-2">
        {comment.emotes.map((item) => (
          <span
            key={item.reactionId}
            className="inline-flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm px-3 py-1.5 leading-none whitespace-nowrap"
            title={item.emoji}
          >
            <span className={`${EMOJI_SIZE_CLASS[item.size]} leading-none`}>{item.emoji}</span>
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
              className="w-full max-h-60 rounded-2xl object-cover border border-gray-200"
            />
          ) : item.type === 'image' ? (
            <img
              key={item.id}
              src={item.url}
              alt={item.name}
              className="w-full max-h-60 rounded-2xl object-cover border border-gray-200"
            />
          ) : (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 underline"
            >
              <Paperclip className="w-4 h-4" />
              {item.name}
            </a>
          ),
        )}
      </div>
    )}

    {(String(comment.userId) === String(currentUserId) || isAdmin) && (
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => handleRecallComment(thread.id, comment.id)}
          className="text-xs text-red-600 hover:underline"
        >
          Thu hồi
        </button>
      </div>
    )}
  </>
)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/70 shadow-2xl rounded-3xl p-3 md:p-4">
            {(composerFiles.length > 0 || composerEmojis.length > 0) && (
              <div className="space-y-3 mb-3">
                {composerFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {composerFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-2"
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
                          onClick={() => setComposerFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-gray-500 hover:text-red-600"
                          title="Xóa tệp"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {composerEmojis.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {composerEmojis.map((item, index) => (
                      <button
                        key={`${item.emojiId}-${index}`}
                        onClick={() => handleRemovePendingEmoji(index)}
                        className={`inline-flex items-center justify-center gap-2 rounded-full bg-purple-50 px-3 py-2 text-purple-700 border border-purple-200 ${EMOJI_BTN_CLASS[item.size]}`}
                        title="Bỏ emoji này"
                      >
                        <span className={EMOJI_SIZE_CLASS[item.size]}>{emojiById.get(item.emojiId) ?? ''}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}

                    <div className="flex items-center gap-1 ml-1 rounded-full border border-gray-200 bg-white px-1 py-1">
                      <button
                        onClick={() => setComposerEmojiSize('sm')}
                        className={`px-2 py-1 text-xs rounded-full ${
                          composerEmojiSize === 'sm' ? 'bg-gray-900 text-white' : 'text-gray-600'
                        }`}
                      >
                        S
                      </button>
                      <button
                        onClick={() => setComposerEmojiSize('md')}
                        className={`px-2 py-1 text-xs rounded-full ${
                          composerEmojiSize === 'md' ? 'bg-gray-900 text-white' : 'text-gray-600'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => setComposerEmojiSize('lg')}
                        className={`px-2 py-1 text-xs rounded-full ${
                          composerEmojiSize === 'lg' ? 'bg-gray-900 text-white' : 'text-gray-600'
                        }`}
                      >
                        L
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end gap-2 relative">
              <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                <Paperclip className="w-4 h-4" />
                <span>Tải tệp</span>
                <input
                  ref={composerFileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, MAX_ATTACHMENTS);
                   setComposerFiles((prev) => [...prev, ...files].slice(0, MAX_ATTACHMENTS));
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="shrink-0 rounded-2xl bg-gray-100 text-gray-700 p-3 hover:bg-gray-200 transition-all"
                title="Chọn emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="Nhắn gì đó..."
                rows={1}
                className="min-h-[52px] max-h-32 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendComment();
                  }
                }}
              />

              <button
                onClick={() => void handleSendComment()}
                className="shrink-0 bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition-all shadow-lg"
                title="Gửi"
              >
                <Send className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-16 right-0 z-[60] w-[360px] max-h-72 overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">Chọn emoji</div>
                    <button onClick={() => setShowEmojiPicker(false)} className="p-1 rounded-lg hover:bg-gray-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 mb-3 rounded-2xl bg-gray-50 p-1">
                    <button
                      onClick={() => setComposerEmojiSize('sm')}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${
                        composerEmojiSize === 'sm' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      Nhỏ
                    </button>
                    <button
                      onClick={() => setComposerEmojiSize('md')}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${
                        composerEmojiSize === 'md' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      Vừa
                    </button>
                    <button
                      onClick={() => setComposerEmojiSize('lg')}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${
                        composerEmojiSize === 'lg' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      Lớn
                    </button>
                  </div>

                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji.id}
                        onClick={() => handlePickEmoji(emoji.id)}
                        className={`rounded-2xl border border-gray-200 bg-white hover:bg-purple-50 active:scale-95 transition-all flex items-center justify-center ${EMOJI_BTN_CLASS[composerEmojiSize]}`}
                        title={emoji.slug ?? emoji.unicodeName ?? emoji.character}
                      >
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
    </div>
  );
};