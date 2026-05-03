import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifyChange, listenChange } from '../../utils/realtimeSync';
import {
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  LogOut,
  Camera,
  Wrench,
  BadgeAlert,
  FileUp,
  BriefcaseBusiness,
  Wallet,
  ClipboardList,
  Siren,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Link2,
  Building2,
  Clock3,
  Store,
  BadgeInfo,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase.ts';
import { useAuth } from '../../context/AuthContext.tsx';

type Role = 'admin' | 'support' | 'supervisor';
type TimelineKind =
  | 'text'
  | 'file'
  | 'task'
  | 'finance'
  | 'emergency'
  | 'incident'
  | 'shift_complete';

type NguoidungRow = {
  manguoidung: string;
  email: string | null;
  tennguoidung: string | null;
  updated_at: string | null;
  chucnang: string | null;
  mapinnguoidung: string | null;
};

type CtAdminRow = {
  manguoidung: string;
  sodt: string | null;
  diachi: string | null;
  anhdaidien: string | null;
  mapinadmin: string | null;
};

type CtNhanVienRow = {
  manguoidung: string;
  hoten: string | null;
  manhanvien: string | null;
  sodt: string | null;
  anhdaidien: string | null;
  mabaido: string | null;
  maadmin: string | null;
  ngayvaolam: string | null;
  duocchuyenbai: boolean | null;
  nghiviec: boolean | null;
};

type BaidoRow = {
  mabaido: string;
  tenbaido: string | null;
  mathamgia: string | null;
  diachi: string | null;
  sodienthoai: string | null;
  giohoatdong: string | null;
  mota: string | null;
  hinhanh: string | null;
  manguoidung: string | null;
  congkhai: boolean | null;
  danhgia: boolean | null;
};

type NhomNoiboRow = {
  manhom: string;
  tennhom: string | null;
  manguoidung: string | null;
  created_at: string | null;
};

type ThanhVienNhomRow = {
  mathanhvien: string;
  manhom: string;
  manguoidung: string;
  created_at: string | null;
};

type NoidungNhomRow = {
  id: string;
  manguoidung: string;
  manhom: string;
  noidung: string | null;
  created_at: string | null;
};

type FileNhomRow = {
  id: string;
  manguoidung: string;
  manhom: string;
  duongdan: string | null;
  loaifile: string | null;
  tenfile: string | null;
  created_at: string | null;
};

type GiaoviecRow = {
  magiaoviec: string;
  noidung: string | null;
  manguoidung: string | null;
  manhom: string | null;
  trangthai: string | null;
  created_at: string | null;
};

type KhancapRow = {
  id: string;
  manguoidung: string | null;
  manhom: string | null;
  noidung: string | null;
  mota: string | null;
  created_at: string | null;
};

type DoanhthuRow = {
  id: string;
  manguoidung: string | null;
  manhom: string | null;
  kybaocao: string | null;
  tongthu: number | string | null;
  tongchi: number | string | null;
  lairong: number | string | null;
  created_at: string | null;
};

type BaocaosucoRow = {
  id: string;
  manguoidung: string | null;
  manhom: string | null;
  tensuco: string | null;
  mota: string | null;
  created_at: string | null;
};

type HoanthanhPhienTrucRow = {
  id: string;
  manguoidung: string | null;
  manhom: string | null;
  congtruc: string | null;
  thoigianhoanthanh: string | null;
  suco: number | string | null;
  created_at: string | null;
};

type TeamUser = {
  userId: string;
  role: Role;
  email: string;
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  hoten: string;
  manhanvien: string;
  baidoName: string;
  baidoId: string;
  maadmin: string;
  searchText: string;
  isActive: boolean;
};

type ChatRoom = {
  id: string;
  name: string;
  ownerUserId: string;
  ownerName: string;
  createdAt: string;
  memberIds: string[];
  lastPreview: string;
  lastAt: string | null;
  lastKind: TimelineKind | null;
  lastSenderName: string | null;
  lastSenderAvatar: string | null;
};

type TimelineItem = {
  id: string;
  roomId: string;
  kind: TimelineKind;
  senderId: string;
  senderName: string;
  senderRole: Role;
  avatarUrl: string | null;
  createdAt: string;
  text: string;
  meta?: Record<string, unknown>;
};

type FormValue = {
  taskText: string;
  financePeriod: string;
  financeRevenue: string;
  financeExpense: string;
  emergencyTitle: string;
  emergencyDescription: string;
  incidentTitle: string;
  incidentDescription: string;
  shiftGate: string;
  shiftCompletedAt: string;
  shiftIncidents: string;
};

const allowedRoles = new Set<Role>(['admin', 'support', 'supervisor']);
const AVATAR_BUCKET = 'avatars';
const FILE_BUCKET = 'NhomNoiBo';

const safeText = (value: unknown, fallback = '') => String(value ?? fallback).trim();

const toNumber = (value: unknown) => {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value: unknown) =>
  new Intl.NumberFormat('vi-VN').format(toNumber(value)) + 'đ';

const formatDateTime = (value: string | null | undefined) =>
  new Date(String(value ?? Date.now())).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatTime = (value: string | null | undefined) =>
  new Date(String(value ?? Date.now())).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const escapeFileName = (name: string) => name.replace(/[^\w.\-]+/g, '_');

const isUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeRole = (value: unknown): Role | '' => {
  const v = safeText(value).toLowerCase();
  if (v === 'admin' || v === 'support' || v === 'supervisor') return v;
  return '';
};

const getAvatarUrl = (raw: string | null | undefined) => {
  const value = safeText(raw);
  if (!value) return null;
  if (isUrl(value)) return value;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(value);
  return data?.publicUrl || null;
};

const getFileUrl = (raw: string | null | undefined) => {
  const value = safeText(raw);
  if (!value) return null;
  if (isUrl(value)) return value;
  const { data } = supabase.storage.from(FILE_BUCKET).getPublicUrl(value);
  return data?.publicUrl || null;
};

const getInitials = (name: string) => {
  const parts = safeText(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const roleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Hỗ trợ';
    case 'supervisor':
      return 'Giám sát';
    default:
      return role;
  }
};

const roleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'support':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'supervisor':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const kindLabel = (kind: TimelineKind) => {
  switch (kind) {
    case 'text':
      return 'Tin nhắn';
    case 'file':
      return 'Tệp';
    case 'task':
      return 'Giao việc';
    case 'finance':
      return 'Doanh thu';
    case 'emergency':
      return 'Khẩn cấp';
    case 'incident':
      return 'Sự cố';
    case 'shift_complete':
      return 'Hoàn thành phiên trực';
    default:
      return kind;
  }
};

const kindIcon = (kind: TimelineKind) => {
  switch (kind) {
    case 'text':
      return MessageSquare;
    case 'file':
      return Paperclip;
    case 'task':
      return ClipboardList;
    case 'finance':
      return Wallet;
    case 'emergency':
      return Siren;
    case 'incident':
      return BadgeAlert;
    case 'shift_complete':
      return ShieldCheck;
    default:
      return MessageSquare;
  }
};

const safeArray = <T,>(value: T[] | null | undefined) => (Array.isArray(value) ? value : []);

const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const summarizeText = (value: string, max = 90) => {
  const text = safeText(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const STORAGE_ACCEPT =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,application/*';

export const InternalChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserId = safeText((user as any)?.manguoidung ?? (user as any)?.id);
  const currentUserRole = normalizeRole((user as any)?.chucnang ?? (user as any)?.role);
  const currentUserEmail = safeText((user as any)?.email);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [currentBaidoName, setCurrentBaidoName] = useState('');
  const [currentBaidoId, setCurrentBaidoId] = useState('');

  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const teamUserMap = useMemo(() => new Map(teamUsers.map((u) => [u.userId, u])), [teamUsers]);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [timelineByRoom, setTimelineByRoom] = useState<Record<string, TimelineItem[]>>({});
  const [roomMembersByRoom, setRoomMembersByRoom] = useState<Record<string, string[]>>({});

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  const [composerText, setComposerText] = useState('');

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [createRoomSelectedIds, setCreateRoomSelectedIds] = useState<string[]>([]);

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addRoomSelectedIds, setAddRoomSelectedIds] = useState<string[]>([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [dbRole, setDbRole] = useState<Role | null>(null);

  const [form, setForm] = useState<FormValue>({
    taskText: '',
    financePeriod: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    financeRevenue: '',
    financeExpense: '',
    emergencyTitle: '',
    emergencyDescription: '',
    incidentTitle: '',
    incidentDescription: '',
    shiftGate: '',
    shiftCompletedAt: '',
    shiftIncidents: '0',
  });

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const loadCounterRef = useRef(0);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
const [isSendingMessage, setIsSendingMessage] = useState(false);
const [isMutatingMember, setIsMutatingMember] = useState(false);
const [isDeletingRoom, setIsDeletingRoom] = useState(false);
const [isCompletingTask, setIsCompletingTask] = useState<string | null>(null);

const createRoomLockRef = useRef(false);
const sendMessageLockRef = useRef(false);
const mutateLockRef = useRef(false);
const roomDeleteLockRef = useRef(false);



  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const selectedRoomMembers = useMemo(() => {
    if (!selectedRoom) return [];
    const ids = roomMembersByRoom[selectedRoom.id] ?? [];
    return ids
      .map((id) => teamUserMap.get(id))
      .filter(Boolean) as TeamUser[];
  }, [roomMembersByRoom, selectedRoom, teamUserMap]);

  const selectedRoomTimeline = useMemo(() => {
    if (!selectedRoom) return [];
    return (timelineByRoom[selectedRoom.id] ?? []).slice().sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [selectedRoom, timelineByRoom]);

  const canCreateGroup = allowedRoles.has(currentUserRole as Role);
  const canManageSelectedRoom = Boolean(selectedRoom && selectedRoom.ownerUserId === currentUserId);
  const isMemberOfSelectedRoom = Boolean(
    selectedRoom && (roomMembersByRoom[selectedRoom.id] ?? []).includes(currentUserId),
  );

  const eligibleRoomMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    return teamUsers.filter((u) => {
      if (selectedRoom && (roomMembersByRoom[selectedRoom.id] ?? []).includes(u.userId)) return false;
      if (!q) return true;
      return u.searchText.toLowerCase().includes(q);
    });
  }, [teamUsers, memberSearchQuery, selectedRoom, roomMembersByRoom]);

  const selectableCreateMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    return teamUsers.filter((u) => {
      if (u.userId === currentUserId) return false;
      if (q && !u.searchText.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [teamUsers, memberSearchQuery, currentUserId]);

  const visibleRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      if (!q) return true;
      const memberNames = (roomMembersByRoom[room.id] ?? [])
        .map((id) => teamUserMap.get(id)?.searchText ?? '')
        .join(' ');
      return [room.name, room.lastPreview, room.lastSenderName, memberNames].join(' ').toLowerCase().includes(q);
    });
  }, [rooms, searchQuery, roomMembersByRoom, teamUserMap]);

  const filePreviewSummary = useMemo(() => {
    if (!filesToUpload.length) return '';
    return filesToUpload.map((f) => f.name).join(' • ');
  }, [filesToUpload]);

  const resetForms = () => {
    setNewRoomName('');
    setCreateRoomSelectedIds([]);
    setAddRoomSelectedIds([]);
    setComposerText('');
    setFilesToUpload([]);
    setForm({
      taskText: '',
      financePeriod: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      financeRevenue: '',
      financeExpense: '',
      emergencyTitle: '',
      emergencyDescription: '',
      incidentTitle: '',
      incidentDescription: '',
      shiftGate: '',
      shiftCompletedAt: '',
      shiftIncidents: '0',
    });
    setMemberSearchQuery('');
  };

  const buildTeamUser = (
    row: NguoidungRow,
    role: Role,
    avatar: string | null,
    hoten = '',
    manhanvien = '',
    baidoName = '',
    baidoId = '',
    maadmin = '',
    isActive = true,
  ): TeamUser => {
    const displayName =
      role === 'admin'
        ? safeText(row.tennguoidung, row.email || 'Quản trị viên')
        : safeText(row.tennguoidung, row.email || hoten || manhanvien || 'Nhân viên');

    const subtitleParts = role === 'admin'
      ? [safeText(row.email), 'Quản trị viên']
      : [safeText(hoten), safeText(manhanvien), safeText(baidoName)].filter(Boolean);

    return {
      userId: row.manguoidung,
      role,
      email: safeText(row.email),
      displayName,
      subtitle: subtitleParts.join(' • '),
      avatarUrl: avatar,
      hoten: safeText(hoten),
      manhanvien: safeText(manhanvien),
      baidoName: safeText(baidoName),
      baidoId: safeText(baidoId),
      maadmin: safeText(maadmin),
      searchText: [
        displayName,
        row.email,
        row.tennguoidung,
        hoten,
        manhanvien,
        baidoName,
        roleLabel(role),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      isActive,
    };
  };

const loadAllData = async () => {
    // Chỉ giữ lại check currentUserId
    if (!currentUserId) {
      setLoading(false);
      setAccessDenied(true);
      setErrorMsg('Không xác định được người dùng đăng nhập.');
      return;
    }

   
const loadId = ++loadCounterRef.current;

    try {
      setLoading(true);
      setErrorMsg(null);
      setAccessDenied(false);

      const { data: currentNguoidung, error: nguoidungError } = await supabase
        .from('nguoidung')
        .select('manguoidung,email,tennguoidung,updated_at,chucnang,mapinnguoidung')
        .eq('manguoidung', currentUserId)
        .maybeSingle();

      if (nguoidungError) throw nguoidungError;
      if (!currentNguoidung) throw new Error('Không tìm thấy hồ sơ người dùng.');

      // Lấy Role chuẩn xác 100% từ Database
      const role = normalizeRole(currentNguoidung.chucnang);
      
      // Kiểm tra quyền tại đây (khi đã chắc chắn có dữ liệu thực)
      if (!role || !allowedRoles.has(role)) {
        setAccessDenied(true);
        throw new Error('Tài khoản không thuộc nhóm nội bộ.');
      }

      setDbRole(role);

      setCurrentUserName(
        safeText(currentNguoidung.tennguoidung, currentNguoidung.email || 'Người dùng'),
      );
      setCurrentUserAvatar(null);

      let resolvedAdminId = currentUserId;
      let currentStaffRow: CtNhanVienRow | null = null;
      let currentAdminRow: CtAdminRow | null = null;

      if (role === 'admin') {
        const { data: adminRow, error: adminError } = await supabase
          .from('ctadmin')
          .select('manguoidung,sodt,diachi,anhdaidien,mapinadmin')
          .eq('manguoidung', currentUserId)
          .maybeSingle();
        if (adminError) throw adminError;
        if (!adminRow) {
          throw new Error('Không tìm thấy bản ghi ctadmin tương ứng.');
        }
        currentAdminRow = adminRow as CtAdminRow;
        setCurrentUserAvatar(getAvatarUrl(adminRow.anhdaidien));
        setCurrentAdminId(currentUserId);
        resolvedAdminId = currentUserId;
      } else {
        const { data: staffSelf, error: staffSelfError } = await supabase
          .from('ctnhanvien')
          .select(
            'manguoidung,hoten,manhanvien,sodt,anhdaidien,mabaido,maadmin,ngayvaolam,duocchuyenbai,nghiviec',
          )
          .eq('manguoidung', currentUserId)
          .maybeSingle();

        if (staffSelfError) throw staffSelfError;
        if (!staffSelf) throw new Error('Không tìm thấy bản ghi ctnhanvien tương ứng.');

        currentStaffRow = staffSelf as CtNhanVienRow;
        resolvedAdminId = safeText(staffSelf.maadmin);
        if (!resolvedAdminId) throw new Error('Nhân viên chưa được gán maadmin.');

        setCurrentAdminId(resolvedAdminId);
        setCurrentBaidoId(safeText(staffSelf.mabaido));
        setCurrentUserAvatar(getAvatarUrl(staffSelf.anhdaidien));

        const { data: baidoRow, error: baidoError } = await supabase
          .from('baido')
          .select('mabaido,tenbaido')
          .eq('mabaido', staffSelf.mabaido)
          .maybeSingle();
        if (baidoError) throw baidoError;
        setCurrentBaidoName(safeText(baidoRow?.tenbaido));
      }

      if (role === 'admin') {
        setCurrentBaidoName('');
        setCurrentBaidoId('');
      }

      const [{ data: adminRow }, { data: staffRows }, { data: nguoidungRows }] = await Promise.all([
        supabase
          .from('ctadmin')
          .select('manguoidung,sodt,diachi,anhdaidien,mapinadmin')
          .eq('manguoidung', resolvedAdminId)
          .maybeSingle()
          .then((r) => ({ data: r.data as CtAdminRow | null })),
        supabase
          .from('ctnhanvien')
          .select(
            'manguoidung,hoten,manhanvien,sodt,anhdaidien,mabaido,maadmin,ngayvaolam,duocchuyenbai,nghiviec',
          )
          .eq('maadmin', resolvedAdminId),
        supabase
          .from('nguoidung')
          .select('manguoidung,email,tennguoidung,updated_at,chucnang,mapinnguoidung')
          .in(
            'manguoidung',
            uniq([
              resolvedAdminId,
              ...(currentStaffRow ? [currentStaffRow.manguoidung] : []),
            ]),
          ),
      ]);

      currentAdminRow = adminRow ?? currentAdminRow;

      const staffClean = safeArray(staffRows).filter((row) => !row.nghiviec);
      const userIdsToFetch = uniq([
        resolvedAdminId,
        ...staffClean.map((r) => r.manguoidung),
      ]);

      const { data: teamNguoidungRows, error: teamNguoidungError } = await supabase
        .from('nguoidung')
        .select('manguoidung,email,tennguoidung,updated_at,chucnang,mapinnguoidung')
        .in('manguoidung', userIdsToFetch);

      if (teamNguoidungError) throw teamNguoidungError;

      const baidoIds = uniq(staffClean.map((r) => safeText(r.mabaido)));
      const { data: baidoRows, error: baidoRowsError } = await supabase
        .from('baido')
        .select(
          'mabaido,tenbaido,mathamgia,diachi,sodienthoai,giohoatdong,mota,hinhanh,manguoidung,congkhai,danhgia',
        )
        .in('mabaido', baidoIds.length ? baidoIds : ['00000000-0000-0000-0000-000000000000']);

      if (baidoRowsError) throw baidoRowsError;

      const baidoMap = new Map((baidoRows ?? []).map((b) => [b.mabaido, b]));

      const nextTeamUsers: TeamUser[] = [];

      if (currentAdminRow || role === 'admin') {
        const adminNguoidung =
          (teamNguoidungRows ?? []).find((r) => r.manguoidung === resolvedAdminId) ||
          currentNguoidung;

        nextTeamUsers.push(
          buildTeamUser(
            adminNguoidung,
            'admin',
            getAvatarUrl(currentAdminRow?.anhdaidien ?? null),
            '',
            '',
            '',
            '',
            resolvedAdminId,
            true,
          ),
        );
      }

      staffClean.forEach((staff) => {
        const baseUser = (teamNguoidungRows ?? []).find((r) => r.manguoidung === staff.manguoidung);
        if (!baseUser) return;
        const staffRole = normalizeRole(baseUser.chucnang) || 'support';
        const baido = staff.mabaido ? baidoMap.get(staff.mabaido) : null;
        nextTeamUsers.push(
          buildTeamUser(
            baseUser,
            staffRole,
            getAvatarUrl(staff.anhdaidien),
            staff.hoten || '',
            staff.manhanvien || '',
            baido?.tenbaido || '',
            staff.mabaido || '',
            staff.maadmin || '',
            staff.nghiviec !== true,
          ),
        );
      });

      setTeamUsers(nextTeamUsers);

      
const accessibleGroupIds: string[] = [];

const { data: memberRows, error: memberRowsError } = await supabase
  .from('thanhviennhom')
  .select('mathanhvien,manhom,manguoidung,created_at')
  .eq('manguoidung', currentUserId);

if (memberRowsError) throw memberRowsError;

const memberRoomIds = new Set((memberRows ?? []).map((r) => r.manhom));
accessibleGroupIds.push(...memberRoomIds);

const { data: ownerRoomRows, error: ownerRoomError } = await supabase
  .from('nhomnoibo')
  .select('manhom,tennhom,manguoidung,created_at,is_deleted')
  .eq('manguoidung', resolvedAdminId)
  .eq('is_deleted', false);

if (ownerRoomError) throw ownerRoomError;
accessibleGroupIds.push(...(ownerRoomRows ?? []).map((r) => r.manhom));

const roomIds = uniq(accessibleGroupIds);
if (!roomIds.length) {
  setRooms([]);
  setTimelineByRoom({});
  setRoomMembersByRoom({});
  setSelectedRoomId(null);
  setLoading(false);
  return;
}

const [{ data: roomRows, error: roomRowsError }, { data: allMembershipRows, error: allMemberError }] =
  await Promise.all([
    supabase
      .from('nhomnoibo')
      .select('manhom,tennhom,manguoidung,created_at,is_deleted')
      .in('manhom', roomIds)
      .eq('is_deleted', false),
    supabase
      .from('thanhviennhom')
      .select('mathanhvien,manhom,manguoidung,created_at')
      .in('manhom', roomIds),
  ]);

if (roomRowsError) throw roomRowsError;
if (allMemberError) throw allMemberError;

const memberMap = new Map<string, Set<string>>();
(allMembershipRows ?? []).forEach((row) => {
  const set = memberMap.get(row.manhom) ?? new Set<string>();
  set.add(row.manguoidung);
  memberMap.set(row.manhom, set);
});

const visibleRoomRows = (roomRows ?? []).filter((row) => {
  const members = memberMap.get(row.manhom);
  return row.manguoidung === currentUserId || members?.has(currentUserId) === true;
});

const roomsMap = new Map<string, ChatRoom>();
visibleRoomRows.forEach((row) => {
  const owner = nextTeamUsers.find((u) => u.userId === row.manguoidung);
  roomsMap.set(row.manhom, {
    id: row.manhom,
    name: safeText(row.tennhom, 'Nhóm nội bộ'),
    ownerUserId: safeText(row.manguoidung),
    ownerName: owner?.displayName || owner?.email || 'Quản trị viên',
    createdAt: row.created_at || new Date().toISOString(),
    memberIds: [],
    lastPreview: 'Chưa có tin nhắn',
    lastAt: null,
    lastKind: null,
    lastSenderName: null,
    lastSenderAvatar: null,
  });
});

const roomMemberIdsByRoom: Record<string, string[]> = {};
roomsMap.forEach((room, roomId) => {
  room.memberIds = Array.from(memberMap.get(roomId) ?? []);
  roomMemberIdsByRoom[roomId] = room.memberIds;
});
 

      const [
        { data: textRows, error: textError },
        { data: fileRows, error: fileError },
        { data: taskRows, error: taskError },
        { data: financeRows, error: financeError },
        { data: emergencyRows, error: emergencyError },
        { data: incidentRows, error: incidentError },
        { data: shiftRows, error: shiftError },
      ] = await Promise.all([
        supabase
          .from('noidungnhom')
          .select('id,manguoidung,manhom,noidung,created_at')
          .in('manhom', roomIds),
        supabase
          .from('file_nhom')
          .select('id,manguoidung,manhom,duongdan,loaifile,tenfile,created_at')
          .in('manhom', roomIds),
        supabase
          .from('giaoviec')
          .select('magiaoviec,noidung,manguoidung,manhom,trangthai,created_at')
          .in('manhom', roomIds),
        supabase
          .from('doanhthu')
          .select('id,manguoidung,manhom,kybaocao,tongthu,tongchi,lairong,created_at')
          .in('manhom', roomIds),
        supabase
          .from('khancap')
          .select('id,manguoidung,manhom,noidung,mota,created_at')
          .in('manhom', roomIds),
        supabase
          .from('baocaosuco')
          .select('id,manguoidung,manhom,tensuco,mota,created_at')
          .in('manhom', roomIds),
        supabase
          .from('hoanthanhphientruc')
          .select('id,manguoidung,manhom,congtruc,thoigianhoanthanh,suco,created_at')
          .in('manhom', roomIds),
      ]);

      if (textError) throw textError;
      if (fileError) throw fileError;
      if (taskError) throw taskError;
      if (financeError) throw financeError;
      if (emergencyError) throw emergencyError;
      if (incidentError) throw incidentError;
      if (shiftError) throw shiftError;

      const itemsByRoom: Record<string, TimelineItem[]> = {};

      const pushItem = (item: TimelineItem) => {
        const list = itemsByRoom[item.roomId] ?? [];
        list.push(item);
        itemsByRoom[item.roomId] = list;
      };

      const senderInfo = (userId: string | null | undefined) => {
        const u = teamUsers.find((x) => x.userId === safeText(userId)) || nextTeamUsers.find((x) => x.userId === safeText(userId));
        return {
          name: u?.displayName || u?.email || 'Người dùng',
          role: (u?.role || 'support') as Role,
          avatar: u?.avatarUrl ?? null,
        };
      };

      (textRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `text-${row.id}`,
          roomId: row.manhom,
          kind: 'text',
          senderId: row.manguoidung,
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: safeText(row.noidung),
        });
      });

      (fileRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `file-${row.id}`,
          roomId: row.manhom,
          kind: 'file',
          senderId: row.manguoidung,
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: safeText(row.tenfile, 'Tệp đính kèm'),
          meta: {
            duongdan: row.duongdan,
            loaifile: row.loaifile,
            tenfile: row.tenfile,
          },
        });
      });

      (taskRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `task-${row.magiaoviec}`,
          roomId: row.manhom!,
          kind: 'task',
          senderId: safeText(row.manguoidung),
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: safeText(row.noidung, 'Giao việc'),
          meta: { trangthai: row.trangthai },
        });
      });

      (financeRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        const tongthu = toNumber(row.tongthu);
        const tongchi = toNumber(row.tongchi);
        pushItem({
          id: `finance-${row.id}`,
          roomId: row.manhom!,
          kind: 'finance',
          senderId: safeText(row.manguoidung),
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: `Báo cáo tài chính ${safeText(row.kybaocao, 'chưa đặt kỳ')}`,
          meta: {
            kybaocao: row.kybaocao,
            tongthu,
            tongchi,
            lairong: toNumber(row.lairong) || tongthu - tongchi,
          },
        });
      });

      (emergencyRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `emergency-${row.id}`,
          roomId: row.manhom!,
          kind: 'emergency',
          senderId: safeText(row.manguoidung),
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: safeText(row.noidung, 'Khẩn cấp'),
          meta: { mota: row.mota },
        });
      });

      (incidentRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `incident-${row.id}`,
          roomId: row.manhom!,
          kind: 'incident',
          senderId: safeText(row.manguoidung),
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: safeText(row.tensuco, 'Sự cố'),
          meta: { mota: row.mota },
        });
      });

      (shiftRows ?? []).forEach((row) => {
        const sender = senderInfo(row.manguoidung);
        pushItem({
          id: `shift-${row.id}`,
          roomId: row.manhom!,
          kind: 'shift_complete',
          senderId: safeText(row.manguoidung),
          senderName: sender.name,
          senderRole: sender.role,
          avatarUrl: sender.avatar,
          createdAt: row.created_at || new Date().toISOString(),
          text: `Hoàn thành phiên trực`,
          meta: {
            congtruc: row.congtruc,
            thoigianhoanthanh: row.thoigianhoanthanh,
            suco: toNumber(row.suco),
          },
        });
      });

      const finalRooms = Array.from(roomsMap.values()).map((room) => {
        const list = itemsByRoom[room.id] ?? [];
        const sorted = list.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const last = sorted[sorted.length - 1];
        return {
          ...room,
          memberIds: roomMemberIdsByRoom[room.id] ?? [],
          lastPreview: last ? summarizeTimelineItem(last) : 'Chưa có tin nhắn',
          lastAt: last?.createdAt ?? null,
          lastKind: last?.kind ?? null,
          lastSenderName: last?.senderName ?? null,
          lastSenderAvatar: last?.avatarUrl ?? null,
        };
      });

      if (loadId !== loadCounterRef.current) return;

      setRooms(finalRooms.sort((a, b) => {
        const ta = new Date(a.lastAt || a.createdAt).getTime();
        const tb = new Date(b.lastAt || b.createdAt).getTime();
        return tb - ta;
      }));
      setTimelineByRoom(itemsByRoom);
      setRoomMembersByRoom(roomMemberIdsByRoom);

      if (!selectedRoomId || !finalRooms.some((r) => r.id === selectedRoomId)) {
        setSelectedRoomId(finalRooms[0]?.id ?? null);
      }
    } catch (error: any) {
      console.error('InternalChat load error:', error);
      setErrorMsg(error?.message || 'Không thể tải dữ liệu.');
      toast.error(error?.message || 'Không thể tải dữ liệu.');
    } finally {
      if (loadId === loadCounterRef.current) {
        setLoading(false);
      }
    }
  };

useEffect(() => {
  const stopLocal = listenChange('internal-chat-refresh', () => {
    void loadAllData();
  });

  const channel = supabase
    .channel(`internal-chat-${currentUserId || 'anon'}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'nhomnoibo' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'thanhviennhom' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'noidungnhom' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'file_nhom' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'baocaosuco' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hoanthanhphientruc' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'giaoviec' },
      () => notifyChange('internal-chat-refresh'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'khancap' },
      () => notifyChange('internal-chat-refresh'),
    )
    .subscribe();

  return () => {
    stopLocal();
    supabase.removeChannel(channel);
  };
}, [currentUserId]);





  const summarizeTimelineItem = (item: TimelineItem) => {
    switch (item.kind) {
      case 'text':
        return summarizeText(item.text, 72);
      case 'file':
        return `Tệp: ${summarizeText(String(item.meta?.tenfile || item.text), 60)}`;
      case 'task':
        return `Giao việc: ${summarizeText(item.text, 60)}`;
      case 'finance':
        return `Báo cáo: ${summarizeText(item.text, 52)} • Lãi ${formatMoney(item.meta?.lairong ?? 0)}`;
      case 'emergency':
        return `Khẩn cấp: ${summarizeText(item.text, 56)}`;
      case 'incident':
        return `Sự cố: ${summarizeText(item.text, 60)}`;
      case 'shift_complete':
        return `Hoàn thành phiên trực • ${summarizeText(String(item.meta?.congtruc || ''), 30)}`;
      default:
        return summarizeText(item.text, 72);
    }
  };

  useEffect(() => {
    void loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentUserRole]);

  const refreshAfterMutation = async () => {
    await loadAllData();
  };

  const handleSelectRoom = (roomId: string) => {
  setSelectedRoomId(roomId);
  setShowMembersPanel(false);
};

const sendTextMessage = async () => {
  if (sendMessageLockRef.current) return;
  if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
  if (!isMemberOfSelectedRoom) return toast.error('Bạn không còn trong nhóm này.');

  const content = composerText.trim();
  if (!content) return toast.error('Vui lòng nhập nội dung.');

  sendMessageLockRef.current = true;
  setIsSendingMessage(true);

  try {
    const payload = {
      id: crypto.randomUUID(),
      manguoidung: currentUserId,
      manhom: selectedRoom.id,
      noidung: content,
    };

    const { error } = await supabase.from('noidungnhom').insert(payload);
    if (error) throw error;

    setComposerText('');
    toast.success('Đã gửi tin nhắn.');
    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể gửi tin nhắn.');
  } finally {
    sendMessageLockRef.current = false;
    setIsSendingMessage(false);
  }
};


const handleCreateGroup = async () => {
  if (createRoomLockRef.current) return;

  try {
    if (!canCreateGroup) return toast.error('Bạn không có quyền tạo nhóm.');
    const name = newRoomName.trim();
    if (!name) return toast.error('Vui lòng nhập tên nhóm.');

    const selected = uniq([currentUserId, ...createRoomSelectedIds.filter((id) => id !== currentUserId)]);
    if (selected.length < 2) return toast.error('Vui lòng chọn ít nhất 1 thành viên khác.');

    createRoomLockRef.current = true;
    setIsCreatingRoom(true);

    const groupId = crypto.randomUUID();

    const { error: groupError } = await supabase.from('nhomnoibo').insert({
      manhom: groupId,
      tennhom: name,
      manguoidung: currentUserId,
      is_deleted: false,
    });
    if (groupError) throw groupError;

    const membershipPayload = selected.map((userId) => ({
      mathanhvien: crypto.randomUUID(),
      manhom: groupId,
      manguoidung: userId,
    }));

    const { error: memberError } = await supabase.from('thanhviennhom').insert(membershipPayload);
    if (memberError) throw memberError;

    setShowCreateRoom(false);
    resetForms();
    toast.success('Đã tạo nhóm mới.');

    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
    setSelectedRoomId(groupId);
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể tạo nhóm.');
  } finally {
    createRoomLockRef.current = false;
    setIsCreatingRoom(false);
  }
};



const handleAddMembers = async () => {
  if (mutateLockRef.current) return;

  try {
    if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
    if (!canManageSelectedRoom) return toast.error('Chỉ người tạo nhóm mới được thêm thành viên.');

    mutateLockRef.current = true;
    setIsMutatingMember(true);

    const ids = uniq(addRoomSelectedIds).filter((id) => id !== currentUserId);
    if (!ids.length) return toast.error('Vui lòng chọn thành viên.');

    const { data: existingRows, error: existingError } = await supabase
      .from('thanhviennhom')
      .select('manguoidung')
      .eq('manhom', selectedRoom.id)
      .in('manguoidung', ids);

    if (existingError) throw existingError;

    const existingIds = new Set((existingRows ?? []).map((r) => r.manguoidung));
    const toInsert = ids.filter((id) => !existingIds.has(id));

    if (!toInsert.length) return toast.info('Các thành viên đã có trong nhóm.');

    const { error } = await supabase.from('thanhviennhom').insert(
      toInsert.map((userId) => ({
        mathanhvien: crypto.randomUUID(),
        manhom: selectedRoom.id,
        manguoidung: userId,
      })),
    );
    if (error) throw error;

    setShowAddMembers(false);
    setAddRoomSelectedIds([]);
    toast.success('Đã thêm thành viên.');

    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể thêm thành viên.');
  } finally {
    mutateLockRef.current = false;
    setIsMutatingMember(false);
  }
};

 const handleKickMember = async (memberId: string) => {
  if (mutateLockRef.current) return;

  try {
    if (!selectedRoom) return;
    if (!canManageSelectedRoom) return toast.error('Chỉ người tạo nhóm mới được kick.');
    if (memberId === currentUserId) return toast.error('Hãy dùng rời nhóm để rời chính mình.');

    const confirmed = window.confirm('Xóa thành viên này khỏi nhóm?');
    if (!confirmed) return;

    mutateLockRef.current = true;
    setIsMutatingMember(true);

    const { error } = await supabase
      .from('thanhviennhom')
      .delete()
      .eq('manhom', selectedRoom.id)
      .eq('manguoidung', memberId);

    if (error) throw error;

    toast.success('Đã xóa thành viên.');
    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể xóa thành viên.');
  } finally {
    mutateLockRef.current = false;
    setIsMutatingMember(false);
  }
};

 const handleLeaveGroup = async () => {
  if (mutateLockRef.current) return;

  try {
    if (!selectedRoom) return;

    const confirmed = window.confirm('Bạn muốn rời nhóm này?');
    if (!confirmed) return;

    mutateLockRef.current = true;
    setIsMutatingMember(true);

    const { error } = await supabase
      .from('thanhviennhom')
      .delete()
      .eq('manhom', selectedRoom.id)
      .eq('manguoidung', currentUserId);

    if (error) throw error;

    toast.success('Bạn đã rời nhóm.');
    const nextSelected = rooms.find((r) => r.id !== selectedRoom.id)?.id ?? null;
    setSelectedRoomId(nextSelected);

    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể rời nhóm.');
  } finally {
    mutateLockRef.current = false;
    setIsMutatingMember(false);
  }
};



const handleDeleteRoom = async () => {
  if (roomDeleteLockRef.current) return;

  try {
    if (!selectedRoom) return;
    if (selectedRoom.ownerUserId !== currentUserId) {
      return toast.error('Chỉ người tạo nhóm mới được xóa nhóm.');
    }

    const confirmed = window.confirm('Xóa nhóm này? Nhóm sẽ bị ẩn khỏi tất cả thành viên.');
    if (!confirmed) return;

    roomDeleteLockRef.current = true;
    setIsDeletingRoom(true);

    const { error } = await supabase
      .from('nhomnoibo')
      .update({ is_deleted: true })
      .eq('manhom', selectedRoom.id);

    if (error) throw error;

    toast.success('Đã xóa nhóm.');
    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();

    const nextSelected = rooms.find((r) => r.id !== selectedRoom.id && !r.id)?.id ?? null;
    setSelectedRoomId(nextSelected);
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể xóa nhóm.');
  } finally {
    roomDeleteLockRef.current = false;
    setIsDeletingRoom(false);
  }
};

  const handleTaskSubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      const noidung = form.taskText.trim();
      if (!noidung) return toast.error('Vui lòng nhập nội dung giao việc.');

      const { error } = await supabase.from('giaoviec').insert({
        magiaoviec: crypto.randomUUID(),
        noidung,
        manguoidung: currentUserId,
        manhom: selectedRoom.id,
        trangthai: 'Chưa hoàn thành',
      });
      if (error) throw error;

      setShowTaskModal(false);
      setForm((prev) => ({ ...prev, taskText: '' }));
      toast.success('Đã gửi giao việc.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể gửi giao việc.');
    }
  };

  const handleCompleteTask = async (item: TimelineItem) => {
  if (isCompletingTask) return;
  try {
    if (!selectedRoom) return;
    if (!dbRole || !['support', 'supervisor'].includes(dbRole)) {
      return toast.error('Chỉ support và supervisor mới được hoàn thành công việc.');
    }

    const taskText = safeText(item.text);
    if (!taskText) return toast.error('Không tìm thấy nội dung công việc.');

    setIsCompletingTask(item.id);

    const { error } = await supabase.from('noidungnhom').insert({
      id: crypto.randomUUID(),
      manguoidung: currentUserId,
      manhom: selectedRoom.id,
      noidung: `Đã hoàn thành: ${taskText}`,
    });

    if (error) throw error;

    const { error: updateError } = await supabase
      .from('giaoviec')
      .update({ trangthai: 'Đã hoàn thành' })
      .eq('manhom', selectedRoom.id)
      .eq('noidung', item.text);

    if (updateError) throw updateError;

    toast.success('Đã đánh dấu hoàn thành công việc.');
    notifyChange('internal-chat-refresh');
    await refreshAfterMutation();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || 'Không thể hoàn thành công việc.');
  } finally {
    setIsCompletingTask(null);
  }
};

  const handleFinanceSubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      const kybaocao = form.financePeriod.trim();
      if (!kybaocao) return toast.error('Vui lòng nhập kỳ báo cáo.');

      const tongthu = toNumber(form.financeRevenue);
      const tongchi = toNumber(form.financeExpense);

      const { error } = await supabase.from('doanhthu').insert({
        id: crypto.randomUUID(),
        manguoidung: currentUserId,
        manhom: selectedRoom.id,
        kybaocao,
        tongthu,
        tongchi,
      });
      if (error) throw error;

      setShowFinanceModal(false);
      setForm((prev) => ({
        ...prev,
        financeRevenue: '',
        financeExpense: '',
        financePeriod: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      }));
      toast.success('Đã gửi báo cáo doanh thu.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể gửi báo cáo doanh thu.');
    }
  };

  const handleEmergencySubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      const noidung = form.emergencyTitle.trim();
      const mota = form.emergencyDescription.trim();
      if (!noidung) return toast.error('Vui lòng nhập tiêu đề khẩn cấp.');

      const { error } = await supabase.from('khancap').insert({
        id: crypto.randomUUID(),
        manguoidung: currentUserId,
        manhom: selectedRoom.id,
        noidung,
        mota,
      });
      if (error) throw error;

      setShowEmergencyModal(false);
      setForm((prev) => ({ ...prev, emergencyTitle: '', emergencyDescription: '' }));
      toast.success('Đã gửi khẩn cấp.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể gửi khẩn cấp.');
    }
  };

  const handleIncidentSubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      const tensuco = form.incidentTitle.trim();
      const mota = form.incidentDescription.trim();
      if (!tensuco) return toast.error('Vui lòng nhập tiêu đề sự cố.');

      const { error } = await supabase.from('baocaosuco').insert({
        id: crypto.randomUUID(),
        manguoidung: currentUserId,
        manhom: selectedRoom.id,
        tensuco,
        mota,
      });
      if (error) throw error;

      setShowIncidentModal(false);
      setForm((prev) => ({ ...prev, incidentTitle: '', incidentDescription: '' }));
      toast.success('Đã gửi báo cáo sự cố.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể gửi báo cáo sự cố.');
    }
  };

  const handleShiftSubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      const congtruc = form.shiftGate.trim();
      const thoigianhoanthanh = form.shiftCompletedAt.trim();
      const suco = Math.max(0, Math.floor(toNumber(form.shiftIncidents)));

      if (!congtruc) return toast.error('Vui lòng nhập cổng trực.');
      if (!thoigianhoanthanh) return toast.error('Vui lòng nhập thời gian hoàn thành.');

      const { error } = await supabase.from('hoanthanhphientruc').insert({
        id: crypto.randomUUID(),
        manguoidung: currentUserId,
        manhom: selectedRoom.id,
        congtruc,
        thoigianhoanthanh,
        suco,
      });
      if (error) throw error;

      setShowShiftModal(false);
      setForm((prev) => ({
        ...prev,
        shiftGate: '',
        shiftCompletedAt: '',
        shiftIncidents: '0',
      }));
      toast.success('Đã báo cáo hoàn thành phiên trực.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể báo cáo phiên trực.');
    }
  };

  const uploadFilesToBucket = async (files: File[]) => {
    const uploaded: { path: string; name: string; type: string }[] = [];
    for (const file of files) {
      const safeName = escapeFileName(file.name);
      const path = `${currentAdminId || currentUserId}/${selectedRoom?.id || 'room'}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(FILE_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploaded.push({
        path,
        name: file.name,
        type: file.type || 'application/octet-stream',
      });
    }
    return uploaded;
  };

  const handleFileSubmit = async () => {
    try {
      if (!selectedRoom) return toast.error('Chưa chọn nhóm.');
      if (!filesToUpload.length) return toast.error('Vui lòng chọn tệp.');

      const uploaded = await uploadFilesToBucket(filesToUpload);

      const { error } = await supabase.from('file_nhom').insert(
        uploaded.map((item) => ({
          id: crypto.randomUUID(),
          manguoidung: currentUserId,
          manhom: selectedRoom.id,
          duongdan: item.path,
          loaifile: item.type,
          tenfile: item.name,
        })),
      );
      if (error) throw error;

      setShowFileModal(false);
      setFilesToUpload([]);
      toast.success('Đã tải tệp lên.');
      await refreshAfterMutation();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Không thể tải tệp lên.');
    }
  };

  const renderAvatar = (user: TeamUser | undefined, size = 'w-10 h-10') => {
    const avatar = user?.avatarUrl;
    const name = user?.displayName || user?.email || 'U';
    if (avatar) {
      return (
        <img
          src={avatar}
          alt={name}
          className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm bg-gray-100`}
        />
      );
    }

    return (
      <div className={`${size} rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold`}>
        {getInitials(name)}
      </div>
    );
  };

  const renderTimelineCard = (item: TimelineItem) => {
    const sender = teamUserMap.get(item.senderId);
    const isOwn = item.senderId === currentUserId;
    const alignClass = isOwn ? 'justify-end' : 'justify-start';
    const bubbleClass =
      item.kind === 'text'
        ? isOwn
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
          : 'bg-white border border-gray-200 text-gray-900'
        : 'bg-white border border-gray-200 text-gray-900';

    const kindBg =
      item.kind === 'text'
        ? ''
        : item.kind === 'file'
          ? 'from-slate-50 to-slate-100 border-slate-200'
          : item.kind === 'task'
            ? 'from-violet-50 to-purple-50 border-violet-200'
            : item.kind === 'finance'
              ? 'from-emerald-50 to-green-50 border-emerald-200'
              : item.kind === 'emergency'
                ? 'from-red-50 to-orange-50 border-red-200'
                : item.kind === 'incident'
                  ? 'from-amber-50 to-yellow-50 border-amber-200'
                  : 'from-sky-50 to-blue-50 border-sky-200';

    const Icon = kindIcon(item.kind);

    if (item.kind === 'text') {
      return (
        <div key={item.id} className={`flex ${alignClass}`}>
          <div className={`max-w-3xl w-full ${isOwn ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-2 mb-2 justify-start">
              {!isOwn && renderAvatar(sender, 'w-8 h-8')}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">{item.senderName}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleBadgeClass(item.senderRole)}`}>
                    {roleLabel(item.senderRole)}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
                </div>
              </div>
              {isOwn && renderAvatar(sender, 'w-8 h-8')}
            </div>

            <div className={`inline-block rounded-2xl px-5 py-3 shadow-sm ${bubbleClass}`}>{item.text}</div>
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className={`flex ${alignClass}`}>
        <div className="max-w-3xl w-full">
          <div className="flex items-center gap-2 mb-2 justify-start">
            {!isOwn && renderAvatar(sender, 'w-8 h-8')}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">{item.senderName}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleBadgeClass(item.senderRole)}`}>
                  {roleLabel(item.senderRole)}
                </span>
                <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
              </div>
            </div>
            {isOwn && renderAvatar(sender, 'w-8 h-8')}
          </div>

          <div className={`rounded-2xl border-2 bg-gradient-to-br ${kindBg} p-5 shadow-md`}>
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.kind === 'finance'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.kind === 'emergency'
                      ? 'bg-red-100 text-red-700'
                      : item.kind === 'incident'
                        ? 'bg-amber-100 text-amber-700'
                        : item.kind === 'task'
                          ? 'bg-violet-100 text-violet-700'
                          : item.kind === 'file'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-sky-100 text-sky-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-bold text-gray-900">{kindLabel(item.kind)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 text-gray-700 border border-gray-200">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>

                <div className="text-gray-900 font-semibold mb-2">{item.text}</div>

                {item.kind === 'file' && (
                  <div className="grid gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {safeText(String(item.meta?.tenfile || item.text), 'Tệp đính kèm')}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {safeText(String(item.meta?.loaifile || ''), 'file')}
                        </div>
                      </div>
                      {getFileUrl(String(item.meta?.duongdan || '')) ? (
                        <a
                          href={getFileUrl(String(item.meta?.duongdan || '')) || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold inline-flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Mở file
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

               {item.kind === 'task' && (
  <div className="bg-white rounded-xl border border-violet-200 p-4 space-y-3">
    <div>
      <div className="text-sm text-gray-600 mb-1">Trạng thái</div>
      <div className="font-bold text-violet-700">
        {safeText(String(item.meta?.trangthai), 'Chưa hoàn thành')}
      </div>
    </div>

    {['support', 'supervisor'].includes(currentUserRole) && (
      <button
        onClick={() => handleCompleteTask(item)}
        disabled={isCompletingTask === item.id}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition"
      >
        {isCompletingTask === item.id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        Hoàn thành công việc
      </button>
    )}
  </div>
)}

                {item.kind === 'finance' && (
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-emerald-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Kỳ báo cáo</div>
                      <div className="font-bold text-gray-900">{safeText(String(item.meta?.kybaocao), '-')}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Tổng thu</div>
                      <div className="font-bold text-emerald-700">{formatMoney(item.meta?.tongthu)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Lãi ròng</div>
                      <div className="font-bold text-emerald-700">{formatMoney(item.meta?.lairong)}</div>
                    </div>
                  </div>
                )}

                {item.kind === 'emergency' && (
                  <div className="bg-white rounded-xl border border-red-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Mô tả</div>
                    <div className="text-gray-900">{safeText(String(item.meta?.mota), '-')}</div>
                  </div>
                )}

                {item.kind === 'incident' && (
                  <div className="bg-white rounded-xl border border-amber-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Mô tả</div>
                    <div className="text-gray-900">{safeText(String(item.meta?.mota), '-')}</div>
                  </div>
                )}

                {item.kind === 'shift_complete' && (
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-sky-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Cổng trực</div>
                      <div className="font-bold text-gray-900">{safeText(String(item.meta?.congtruc), '-')}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-sky-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Thời gian hoàn thành</div>
                      <div className="font-bold text-gray-900">{safeText(String(item.meta?.thoigianhoanthanh), '-')}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-sky-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Số sự cố</div>
                      <div className="font-bold text-sky-700">{toNumber(item.meta?.suco)}</div>
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600" />
          <div className="text-lg font-semibold text-gray-700">Đang tải dữ liệu nội bộ...</div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-14 h-14 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-600 mb-6">{errorMsg || 'Tài khoản hiện tại không thuộc nhóm nội bộ.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl px-6 py-5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/20 rounded-xl transition shrink-0"
              title="Quay lại"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Chat nội bộ</h1>
              <p className="text-sm text-white/80 truncate">
                Trao đổi công việc, báo cáo và xử lý nội bộ theo cùng một admin quản lý
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-3 bg-white/15 rounded-2xl px-4 py-2.5">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/70" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  {getInitials(currentUserName || currentUserEmail)}
                </div>
              )}
              <div className="leading-tight">
                <div className="font-semibold">{currentUserName || currentUserEmail}</div>
                <div className="text-xs text-white/80">
                  {roleLabel(currentUserRole)}{currentBaidoName ? ` • ${currentBaidoName}` : ''}
                </div>
              </div>
            </div>

            {canCreateGroup && (
              <button
  onClick={() => setShowCreateRoom(true)}
  disabled={isCreatingRoom}
  className="bg-white/20 hover:bg-white/30 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl flex items-center gap-2 transition font-semibold shadow-lg"
>
  <Plus className="w-5 h-5" />
  Tạo nhóm
</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-lg">
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhóm chat..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleRooms.map((room) => {
              const memberCount = (roomMembersByRoom[room.id] ?? []).length;
              const lastSender = room.lastSenderName || '';
              const lastKindLabel = room.lastKind ? kindLabel(room.lastKind) : '';
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`w-full p-5 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                    selectedRoomId === room.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 text-base truncate">{room.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {room.ownerName ? `Tạo bởi ${room.ownerName}` : 'Nhóm nội bộ'}
                      </div>
                    </div>
                    {room.lastAt ? (
                      <span className="text-xs text-gray-400 shrink-0">{formatTime(room.lastAt)}</span>
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-600 truncate mb-2">
                    {room.lastPreview || 'Chưa có tin nhắn'}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 font-medium truncate">
                        {memberCount} thành viên{lastKindLabel ? ` • ${lastKindLabel}` : ''}
                      </span>
                    </div>
                    {lastSender ? <span className="text-xs text-gray-400 truncate">{lastSender}</span> : null}
                  </div>
                </button>
              );
            })}

            {!visibleRooms.length && (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Không tìm thấy nhóm</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedRoom ? (
            <>
              <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{selectedRoom.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {selectedRoom.ownerName ? `Người quản lý: ${selectedRoom.ownerName}` : 'Nhóm nội bộ'}
                      {currentBaidoName ? ` • Bãi trực: ${currentBaidoName}` : ''}
                    </p>
                  </div>

                 <div className="flex items-center gap-2 shrink-0">
  <button
    onClick={() => setShowMembersPanel((v) => !v)}
    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition font-semibold"
  >
    <Users className="w-4 h-4" />
    Thành viên ({selectedRoomMembers.length})
    {showMembersPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
  </button>

  {canManageSelectedRoom && (
    <button
      onClick={() => {
        setShowAddMembers(true);
        setAddRoomSelectedIds([]);
        setMemberSearchQuery('');
      }}
      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 transition font-semibold"
    >
      <UserPlus className="w-4 h-4" />
      Thêm thành viên
    </button>
  )}

  {selectedRoom.ownerUserId === currentUserId && (
    <button
      onClick={handleDeleteRoom}
      disabled={isDeletingRoom}
      className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl flex items-center gap-2 transition font-semibold"
    >
      <Trash2 className="w-4 h-4" />
      Xóa nhóm
    </button>
  )}

  {selectedRoom.ownerUserId !== currentUserId && (
    <button
      onClick={handleLeaveGroup}
      disabled={isMutatingMember}
      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <LogOut className="w-4 h-4" />
      Rời nhóm
    </button>
  )}
</div>
                </div>

                {showMembersPanel && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-800">Danh sách thành viên</div>
                        <div className="text-sm text-gray-500">Chỉ thành viên trong nhóm mới nhìn thấy và chat được</div>
                      </div>
                      {selectedRoom.ownerUserId === currentUserId && (
                        <div className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          Bạn là người tạo nhóm
                        </div>
                      )}
                    </div>

                    <div className="max-h-40 overflow-y-auto grid gap-2">
                      {selectedRoomMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {renderAvatar(member, 'w-10 h-10')}
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{member.displayName}</div>
                              <div className="text-xs text-gray-500 truncate">{member.subtitle || member.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] px-2 py-1 rounded-full border ${roleBadgeClass(member.role)}`}>
                              {roleLabel(member.role)}
                            </span>
                            {canManageSelectedRoom && member.userId !== currentUserId && (
                              <button
                                onClick={() => handleKickMember(member.userId)}
                                className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition"
                                title="Kick khỏi nhóm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {!selectedRoomMembers.length && (
                        <div className="text-sm text-gray-500 py-6 text-center">Nhóm chưa có thành viên</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedRoomTimeline.map((item) => renderTimelineCard(item))}
                {!selectedRoomTimeline.length && (
                  <div className="h-full flex items-center justify-center py-20">
                    <div className="text-center">
                      <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                      <div className="text-xl font-semibold text-gray-500">Chưa có nội dung trong nhóm</div>
                      <div className="text-sm text-gray-400 mt-1">Bắt đầu bằng một tin nhắn hoặc một card nghiệp vụ</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedRoom.ownerUserId === currentUserId && dbRole === 'admin' && (
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="px-4 py-2 rounded-lg font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition inline-flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Giao việc
                    </button>
                  )}

                  {dbRole === 'support' && (
                    <>
                      <button
                        onClick={() => setShowFinanceModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition inline-flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Doanh thu
                      </button>
                      <button
                        onClick={() => setShowEmergencyModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-2"
                      >
                        <Siren className="w-4 h-4" />
                        Khẩn cấp
                      </button>
                      <button
                        onClick={() => setShowIncidentModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition inline-flex items-center gap-2"
                      >
                        <BadgeAlert className="w-4 h-4" />
                        Sự cố
                      </button>
                    </>
                  )}

                  {dbRole === 'supervisor' && (
                    <>
                      <button
                        onClick={() => setShowIncidentModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition inline-flex items-center gap-2"
                      >
                        <BadgeAlert className="w-4 h-4" />
                        Sự cố
                      </button>
                      <button
                        onClick={() => setShowShiftModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 transition inline-flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Hoàn thành phiên trực
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setShowFileModal(true)}
                    className="px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    Tệp / Ảnh / Video
                  </button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void sendTextMessage();
                      }}
                      placeholder="Nhập tin nhắn..."
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                 <button
  onClick={sendTextMessage}
  disabled={isSendingMessage || !composerText.trim()}
  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-2 transition"
>
  {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
  Gửi
</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-24 h-24 mx-auto mb-6 text-gray-300" />
                <p className="text-xl text-gray-500 font-medium">Chọn nhóm để bắt đầu chat</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Tạo nhóm chat mới</h3>
                <p className="text-sm text-gray-500 mt-1">Chỉ admin mới được tạo nhóm</p>
              </div>
              <button onClick={() => setShowCreateRoom(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-2">Tên nhóm</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="VD: Nhóm quản lý - Bãi A"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-bold text-gray-700">Chọn thành viên</label>
                <span className="text-xs text-gray-500">Bạn sẽ luôn được thêm vào nhóm</span>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, mã NV, email, bãi..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-gray-200 rounded-xl p-3">
                {selectableCreateMembers.map((staff) => {
                  const checked =
                    staff.userId === currentUserId || createRoomSelectedIds.includes(staff.userId);
                  const isSelf = staff.userId === currentUserId;
                  return (
                    <label
                      key={staff.userId}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSelf}
                        onChange={(e) => {
                          if (isSelf) return;
                          if (e.target.checked) {
                            setCreateRoomSelectedIds((prev) => uniq([...prev, staff.userId]));
                          } else {
                            setCreateRoomSelectedIds((prev) => prev.filter((id) => id !== staff.userId));
                          }
                        }}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {renderAvatar(staff, 'w-10 h-10')}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">{staff.displayName}</div>
                          <div className="text-xs text-gray-500 truncate">{staff.subtitle || staff.email}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full border ${roleBadgeClass(staff.role)}`}>
                              {roleLabel(staff.role)}
                            </span>
                            {staff.manhanvien ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                {staff.manhanvien}
                              </span>
                            ) : null}
                            {staff.baidoName ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                                {staff.baidoName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMembers && selectedRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Thêm thành viên</h3>
                <p className="text-sm text-gray-500 mt-1">Chỉ người tạo nhóm mới được thêm / kick</p>
              </div>
              <button onClick={() => setShowAddMembers(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, mã NV, email, bãi..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-gray-200 rounded-xl p-3">
              {eligibleRoomMembers.map((staff) => {
                const checked = addRoomSelectedIds.includes(staff.userId);
                return (
                  <label
                    key={staff.userId}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAddRoomSelectedIds((prev) => uniq([...prev, staff.userId]));
                        } else {
                          setAddRoomSelectedIds((prev) => prev.filter((id) => id !== staff.userId));
                        }
                      }}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {renderAvatar(staff, 'w-10 h-10')}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{staff.displayName}</div>
                        <div className="text-xs text-gray-500 truncate">{staff.subtitle || staff.email}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full border ${roleBadgeClass(staff.role)}`}>
                            {roleLabel(staff.role)}
                          </span>
                          {staff.manhanvien ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {staff.manhanvien}
                            </span>
                          ) : null}
                          {staff.baidoName ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                              {staff.baidoName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}

              {!eligibleRoomMembers.length && (
                <div className="text-center py-10 text-gray-500">Không còn thành viên phù hợp để thêm</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMembers(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleAddMembers}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Xác nhận thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Giao việc</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bảng giaoviec</p>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-2">Nội dung giao việc</label>
              <textarea
                value={form.taskText}
                onChange={(e) => setForm((prev) => ({ ...prev, taskText: e.target.value }))}
                rows={5}
                placeholder="Nhập nội dung giao việc..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleTaskSubmit}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Gửi giao việc
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinanceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Báo cáo doanh thu</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bảng doanhthu</p>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Kỳ báo cáo</label>
                <input
                  type="text"
                  value={form.financePeriod}
                  onChange={(e) => setForm((prev) => ({ ...prev, financePeriod: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tổng thu (VNĐ)</label>
                <input
                  type="number"
                  value={form.financeRevenue}
                  onChange={(e) => setForm((prev) => ({ ...prev, financeRevenue: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tổng chi (VNĐ)</label>
                <input
                  type="number"
                  value={form.financeExpense}
                  onChange={(e) => setForm((prev) => ({ ...prev, financeExpense: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Lợi nhuận</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {(toNumber(form.financeRevenue) - toNumber(form.financeExpense)).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinanceModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleFinanceSubmit}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Khẩn cấp</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bảng khancap</p>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={form.emergencyTitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyTitle: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={form.emergencyDescription}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyDescription: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleEmergencySubmit}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Gửi khẩn cấp
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Báo cáo sự cố</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bảng baocaosuco</p>
              </div>
              <button onClick={() => setShowIncidentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên sự cố</label>
                <input
                  type="text"
                  value={form.incidentTitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, incidentTitle: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={form.incidentDescription}
                  onChange={(e) => setForm((prev) => ({ ...prev, incidentDescription: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleIncidentSubmit}
                className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Gửi sự cố
              </button>
            </div>
          </div>
        </div>
      )}

      {showShiftModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Hoàn thành phiên trực</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bảng hoanthanhphientruc</p>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Cổng trực</label>
                <input
                  type="text"
                  value={form.shiftGate}
                  onChange={(e) => setForm((prev) => ({ ...prev, shiftGate: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian hoàn thành</label>
                <input
                  type="text"
                  value={form.shiftCompletedAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, shiftCompletedAt: e.target.value }))}
                  placeholder="VD: 02/05/2026 18:00"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số sự cố</label>
                <input
                  type="number"
                  min={0}
                  value={form.shiftIncidents}
                  onChange={(e) => setForm((prev) => ({ ...prev, shiftIncidents: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShiftModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleShiftSubmit}
                className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Báo cáo hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {showFileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Tải tệp lên nhóm</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu vào bucket NhomNoiBo và bảng file_nhom</p>
              </div>
              <button onClick={() => setShowFileModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chọn ảnh / video / file</label>
                <input
                  type="file"
                  accept={STORAGE_ACCEPT}
                  multiple
                  onChange={(e) => setFilesToUpload(Array.from(e.target.files ?? []))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              {filesToUpload.length > 0 && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-800 mb-2">Đã chọn</div>
                  <div className="space-y-2">
                    {filesToUpload.map((f) => (
                      <div key={`${f.name}-${f.size}`} className="flex items-center gap-2 text-sm text-gray-700">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!filesToUpload.length && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-sm text-gray-500">
                  Tệp sẽ được lưu vào bucket <b>NhomNoiBo</b> và hiển thị như một card trong hội thoại.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFileModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleFileSubmit}
                className="flex-1 bg-gradient-to-r from-slate-700 to-gray-900 hover:from-slate-800 hover:to-black text-white py-3 rounded-xl font-bold transition shadow-lg"
              >
                Tải lên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};