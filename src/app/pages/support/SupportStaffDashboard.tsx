import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, MessageSquare, Users, AlertTriangle, FileText,
  Clock, CheckCircle, XCircle, Search, Filter, Eye,
  ArrowLeft, User, Bell, Send, Ban, CheckCheck, Trash2,
  MapPin, Building2, Car, Calendar, DollarSign, Camera,
  Video, Activity, History, AlertCircle, X, ChevronRight,
  Lock, Key
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase.ts';

// --- Interfaces ---
interface CurrentStaff {
  manguoidung: string;
  hoten: string;
  anhdaidien: string;
  mabaido: string;
  tenbaido: string;
  maadmin: string;
  mapinnguoidung: string;
}

interface UserProfile {
  manguoidung: string;
  tennguoidung: string;
  chucnang: string;
  email: string;
  anhdaidien: string;
}

interface CommunityMember {
  mabaido: string;
  manguoidung: string;
  block: boolean;
  profile?: UserProfile;
}

interface ModerationPost {
  mabangcongdong: string;
  manguoidung: string;
  tieude: string;
  noidung: string;
  phanloai: string;
  created_at: string;
  is_deleted: boolean;
  duyet?: {
    maduyet: string;
    trangthaiduyet: boolean;
  };
  authorName: string;
  authorAvatar: string;
}

interface ParkingHistoryRow {
  maxevao: string;
  bienso: string;
  thoigianvao: string;
  mavitri: string;
  ketthuc: boolean;
  tenvitri: string;
  tenkhuvuc: string;
  maxera?: string;
  thoigianra?: string;
  hinhthucthanhtoan?: string;
  suco?: boolean;
  tongtien?: number;
}

export const SupportStaffDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'moderation' | 'members' | 'history' | 'finance'>('moderation');
  
  const [loading, setLoading] = useState(true);
  const [currentStaff, setCurrentStaff] = useState<CurrentStaff | null>(null);

  // Data states
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [history, setHistory] = useState<ParkingHistoryRow[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in' | 'out'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');

  // Incident Pin Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [targetIncidentRow, setTargetIncidentRow] = useState<ParkingHistoryRow | null>(null);

  // Load Initial Data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        toast.error('Không xác thực được tài khoản');
        navigate('/login');
        return;
      }

      const userId = authData.user.id;

      // 1. Load Support Staff Profile & PIN
      const [{ data: staffData, error: staffError }, { data: userData }] = await Promise.all([
        supabase.from('ctnhanvien').select('hoten, anhdaidien, mabaido, maadmin').eq('manguoidung', userId).maybeSingle(),
        supabase.from('nguoidung').select('mapinnguoidung').eq('manguoidung', userId).maybeSingle()
      ]);

      if (staffError || !staffData?.mabaido) {
        toast.error('Nhân viên chưa được phân công bãi đỗ');
        setLoading(false);
        return;
      }

      const { data: lotData } = await supabase
        .from('baido')
        .select('tenbaido')
        .eq('mabaido', staffData.mabaido)
        .maybeSingle();

      setCurrentStaff({
        manguoidung: userId,
        hoten: staffData.hoten || 'Nhân viên hỗ trợ',
        anhdaidien: staffData.anhdaidien || '',
        mabaido: staffData.mabaido,
        tenbaido: lotData?.tenbaido || 'Bãi đỗ xe',
        maadmin: staffData.maadmin || '',
        mapinnguoidung: userData?.mapinnguoidung || ''
      });

      const currentLotId = staffData.mabaido;

      // 2. Load Moderation Posts
      const { data: postsData } = await supabase
        .from('baicongdong')
        .select(`
          mabangcongdong, manguoidung, tieude, noidung, phanloai, created_at, is_deleted,
          duyet (maduyet, trangthaiduyet)
        `)
        .eq('mabaido', currentLotId)
        .in('phanloai', ['trai_nghiem', 'chung', 'thong_bao', 'su_kien', 'hoi_dap', 'canh_bao']);

      // 3. Load Members
      const { data: membersData } = await supabase
        .from('thanhviencongdong')
        .select('*')
        .eq('mabaido', currentLotId);

      // Fetch profiles for posts and members
      const userIdsToFetch = new Set<string>();
      postsData?.forEach(p => userIdsToFetch.add(p.manguoidung));
      membersData?.forEach(m => userIdsToFetch.add(m.manguoidung));

      const { data: usersData } = await supabase
        .from('nguoidung')
        .select('manguoidung, tennguoidung, chucnang, email')
        .in('manguoidung', Array.from(userIdsToFetch));

      // Fetch specific avatars based on roles
      const userProfilesMap = new Map<string, UserProfile>();
      
      for (const u of (usersData || [])) {
        let avatarUrl = '';
        if (u.chucnang === 'owner') {
          const { data: cx } = await supabase.from('ctchuxe').select('anhdaidien').eq('manguoidung', u.manguoidung).maybeSingle();
          avatarUrl = cx?.anhdaidien || '';
        } else if (u.chucnang === 'support' || u.chucnang === 'supervisor') {
          const { data: nv } = await supabase.from('ctnhanvien').select('anhdaidien').eq('manguoidung', u.manguoidung).maybeSingle();
          avatarUrl = nv?.anhdaidien || '';
        } else if (u.chucnang === 'admin') {
          const { data: ad } = await supabase.from('ctadmin').select('anhdaidien').eq('manguoidung', u.manguoidung).maybeSingle();
          avatarUrl = ad?.anhdaidien || '';
        } else if (u.chucnang === 'provider') {
          const { data: pr } = await supabase.from('ctnhacungcap').select('anhdaidien').eq('manguoidung', u.manguoidung).maybeSingle();
          avatarUrl = pr?.anhdaidien || '';
        }

        userProfilesMap.set(u.manguoidung, {
          manguoidung: u.manguoidung,
          tennguoidung: u.tennguoidung || u.email?.split('@')[0] || 'Người dùng',
          chucnang: u.chucnang || 'owner',
          email: u.email || '',
          anhdaidien: avatarUrl
        });
      }

      const mappedPosts: ModerationPost[] = (postsData || []).map((p: any) => ({
        ...p,
        duyet: Array.isArray(p.duyet) ? p.duyet[0] : p.duyet,
        authorName: userProfilesMap.get(p.manguoidung)?.tennguoidung || 'Người dùng ẩn danh',
        authorAvatar: userProfilesMap.get(p.manguoidung)?.anhdaidien || ''
      }));

      const mappedMembers: CommunityMember[] = (membersData || []).map(m => ({
        mabaido: m.mabaido,
        manguoidung: m.manguoidung,
        block: m.block,
        profile: userProfilesMap.get(m.manguoidung)
      }));

      setPosts(mappedPosts);
      setMembers(mappedMembers);

      // 4. Load History (Lịch sử ra vào)
      const { data: zoneData } = await supabase.from('khuvudo').select('makhuvuc, tenkhuvuc').eq('mabaido', currentLotId);
      const zoneIds = (zoneData || []).map(z => z.makhuvuc);
      
      if (zoneIds.length > 0) {
        const { data: spotData } = await supabase.from('vitrido').select('mavitri, tenvitri, makhuvuc').in('makhuvuc', zoneIds);
        const spotMap = new Map((spotData || []).map(s => [s.mavitri, s]));
        const zoneMap = new Map((zoneData || []).map(z => [z.makhuvuc, z.tenkhuvuc]));
        const spotIds = (spotData || []).map(s => s.mavitri);

        if (spotIds.length > 0) {
          const { data: entryData } = await supabase
            .from('lichsuxevao')
            .select('maxevao, bienso, thoigianvao, mavitri, ketthuc')
            .in('mavitri', spotIds)
            .order('thoigianvao', { ascending: false })
            .limit(300);

          const entryIds = (entryData || []).map(e => e.maxevao);
          let exitDataMap = new Map();
          let paymentMap = new Map();

          if (entryIds.length > 0) {
            const { data: exitData } = await supabase
              .from('lichsuxera')
              .select('maxera, maxevao, thoigianra, hinhthucthanhtoan, suco')
              .in('maxevao', entryIds);
            
            exitData?.forEach(ex => exitDataMap.set(ex.maxevao, ex));

            const exitIds = (exitData || []).map(ex => ex.maxera);
            if (exitIds.length > 0) {
              const { data: paymentData } = await supabase.from('thanhtoan').select('maxera, tongtien').in('maxera', exitIds);
              paymentData?.forEach(p => paymentMap.set(p.maxera, p.tongtien));
            }
          }

          const mappedHistory: ParkingHistoryRow[] = (entryData || []).map(entry => {
            const spot = spotMap.get(entry.mavitri);
            const exit = exitDataMap.get(entry.maxevao);
            return {
              maxevao: entry.maxevao,
              bienso: entry.bienso,
              thoigianvao: entry.thoigianvao,
              mavitri: entry.mavitri,
              ketthuc: entry.ketthuc,
              tenvitri: spot?.tenvitri || 'N/A',
              tenkhuvuc: spot ? (zoneMap.get(spot.makhuvuc) || 'N/A') : 'N/A',
              maxera: exit?.maxera,
              thoigianra: exit?.thoigianra,
              hinhthucthanhtoan: exit?.hinhthucthanhtoan,
              suco: exit?.suco || false,
              tongtien: exit ? (paymentMap.get(exit.maxera) || 0) : undefined
            };
          });
          setHistory(mappedHistory);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  // Handlers
  const handleApprovePost = async (post: ModerationPost) => {
    try {
      if (post.duyet?.maduyet) {
        await supabase.from('duyet').update({ trangthaiduyet: true }).eq('maduyet', post.duyet.maduyet);
      } else {
        await supabase.from('duyet').insert({ mabangcongdong: post.mabangcongdong, trangthaiduyet: true });
      }
      toast.success('✅ Đã duyệt bài viết');
      await loadDashboardData();
    } catch (error) {
      toast.error('Lỗi khi duyệt bài');
    }
  };

  const handleRejectPost = async (postId: string) => {
    try {
      await supabase.from('baicongdong').update({ is_deleted: true }).eq('mabangcongdong', postId);
      toast.success('❌ Đã từ chối (ẩn) bài viết');
      await loadDashboardData();
    } catch (error) {
      toast.error('Lỗi khi từ chối bài');
    }
  };

  const handleToggleBlock = async (member: CommunityMember) => {
    const role = member.profile?.chucnang;
    if (role === 'admin' || role === 'support' || role === 'supervisor') {
      toast.error('Không thể chặn nhân sự nội bộ');
      return;
    }
    
    try {
      const newStatus = !member.block;
      await supabase
        .from('thanhviencongdong')
        .update({ block: newStatus })
        .eq('mabaido', member.mabaido)
        .eq('manguoidung', member.manguoidung);
      
      toast.success(newStatus ? '🚫 Đã chặn người dùng' : '✅ Đã bỏ chặn người dùng');
      setMembers(members.map(m => m.manguoidung === member.manguoidung ? { ...m, block: newStatus } : m));
    } catch (error) {
      toast.error('Lỗi khi thay đổi trạng thái');
    }
  };

  // Toggle Incident PIN Request
  const initiateToggleSuco = (row: ParkingHistoryRow) => {
    if (!row.maxera) {
      toast.error('Chỉ đánh dấu sự cố cho xe đã ra');
      return;
    }
    if (!row.thoigianra) return;

    const outDate = new Date(row.thoigianra);
    const today = new Date();
    
    if (
      outDate.getDate() !== today.getDate() || 
      outDate.getMonth() !== today.getMonth() || 
      outDate.getFullYear() !== today.getFullYear()
    ) {
      toast.error('Chỉ có thể thay đổi trạng thái sự cố trong ngày xe ra');
      return;
    }

    if (!currentStaff?.mapinnguoidung) {
      toast.error('Bạn chưa cấu hình mã PIN. Vui lòng cập nhật ở Hồ sơ cá nhân.');
      return;
    }

    setTargetIncidentRow(row);
    setPinInput('');
    setShowPinModal(true);
  };

  // Confirm Incident Update
  const confirmToggleSuco = async () => {
    if (!targetIncidentRow || !currentStaff) return;
    
    if (pinInput !== currentStaff.mapinnguoidung) {
      toast.error('Mã PIN không chính xác');
      return;
    }

    try {
      const newStatus = !targetIncidentRow.suco;
      
      const { error } = await supabase.from('lichsuxera').update({ suco: newStatus }).eq('maxera', targetIncidentRow.maxera);
      if (error) throw error;

      const { error: logError } = await supabase.from('thuchiensuco').insert({
        manguoidung: currentStaff.manguoidung,
        hanhdong: newStatus ? 'Bật sự cố' : 'Tắt sự cố',
        maxera: targetIncidentRow.maxera
      });
      if (logError) throw logError;

      toast.success(newStatus ? 'Đã đánh dấu sự cố' : 'Đã gỡ đánh dấu sự cố');
      setHistory(history.map(h => h.maxera === targetIncidentRow.maxera ? { ...h, suco: newStatus } : h));
      setShowPinModal(false);
      setTargetIncidentRow(null);
      setPinInput('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi cập nhật sự cố');
    }
  };

  // Filters setup
  const filteredPosts = posts.filter(post => {
    const isPending = !post.duyet?.trangthaiduyet && !post.is_deleted;
    const isApproved = post.duyet?.trangthaiduyet && !post.is_deleted;
    const isRejected = post.is_deleted;

    const matchesSearch = post.tieude.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.noidung.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.authorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      selectedStatus === 'all' || 
      (selectedStatus === 'pending' && isPending) ||
      (selectedStatus === 'approved' && isApproved) ||
      (selectedStatus === 'rejected' && isRejected);

    return matchesSearch && matchesStatus;
  });

  const validHistory = history.filter(h => !(h.ketthuc && !h.maxera));

  const filteredHistory = validHistory.filter(h => {
    if (historyFilter === 'in' && h.ketthuc) return false;
    if (historyFilter === 'out' && !h.ketthuc) return false;

    if (historyDateFilter) {
      const entryDate = h.thoigianvao ? h.thoigianvao.startsWith(historyDateFilter) : false;
      const exitDate = h.thoigianra ? h.thoigianra.startsWith(historyDateFilter) : false;
      
      if (!entryDate && !exitDate) {
         return false;
      }
    }

    return true;
  });

  // Calculate Finance & Stats
  const historyStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let cash = 0;
    let transfer = 0;
    let reservationCount = 0;

    filteredHistory.forEach(h => {
      const isEntryMatch = !historyDateFilter || (h.thoigianvao && h.thoigianvao.startsWith(historyDateFilter));
      const isExitMatch = !historyDateFilter || (h.thoigianra && h.thoigianra.startsWith(historyDateFilter));

      if (isEntryMatch) totalIn++;
      if (h.ketthuc && isExitMatch) totalOut++;

      if (h.ketthuc && !h.suco && isExitMatch) {
        const amt = Number(h.tongtien || 0);
        if (h.hinhthucthanhtoan === 'tiền mặt') cash += amt;
        else if (h.hinhthucthanhtoan === 'chuyển khoản') transfer += amt;
        else if (h.hinhthucthanhtoan === 'đặt chỗ trước') reservationCount++;
      }
    });

    return { totalIn, totalOut, cash, transfer, reservationCount, totalRevenue: cash + transfer };
  }, [filteredHistory, historyDateFilter]);

  if (loading || !currentStaff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-700 font-semibold">Đang tải không gian làm việc...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/50">
                  {currentStaff.anhdaidien ? (
                    <img src={currentStaff.anhdaidien} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold">{currentStaff.hoten.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {currentStaff.hoten}
                  </h1>
                  <div className="flex items-center gap-2 text-purple-100 text-sm mt-1">
                    <Shield className="w-4 h-4" />
                    <span>Hỗ trợ viên</span>
                    <span className="text-white/50">•</span>
                    <Building2 className="w-4 h-4" />
                    <span className="font-semibold">{currentStaff.tenbaido}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => window.location.href = '/internal-chat'}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition font-semibold text-sm"
              >
                <MessageSquare className="w-5 h-5" />
                Chat nội bộ
              </button>
              <button
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition font-semibold text-sm"
              >
                <MessageSquare className="w-5 h-5" />
                Cộng đồng
              </button>
              <button
                onClick={() => navigate('/support/profile')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition font-semibold text-sm"
              >
                <User className="w-5 h-5" />
                Hồ sơ cá nhân
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-md mb-8 p-2 flex flex-wrap md:flex-nowrap gap-2 border border-gray-200">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'moderation'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCheck className="w-5 h-5" />
            Duyệt bài
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            Thành viên
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-5 h-5" />
            Thống kê Ra/Vào
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'finance'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Video className="w-5 h-5" />
            Camera
          </button>
        </div>

        {/* Tab Content: Moderation */}
        {activeTab === 'moderation' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tiêu đề, nội dung, người đăng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition border ${
                        selectedStatus === status 
                          ? 'bg-purple-50 border-purple-500 text-purple-700' 
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {status === 'all' && 'Tất cả'}
                      {status === 'pending' && 'Chờ duyệt'}
                      {status === 'approved' && 'Đã duyệt'}
                      {status === 'rejected' && 'Đã ẩn'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <div className="text-lg font-bold text-gray-600 mb-1">Không có bài viết nào</div>
                  <div className="text-gray-500 text-sm">Thử thay đổi bộ lọc tìm kiếm</div>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const isPending = !post.duyet?.trangthaiduyet && !post.is_deleted;
                  const isApproved = post.duyet?.trangthaiduyet && !post.is_deleted;
                  
                  return (
                    <div key={post.mabangcongdong} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                            {post.authorAvatar ? (
                              <img src={post.authorAvatar} alt="author" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-purple-700 font-bold">{post.authorName.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{post.authorName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">#{post.phanloai}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          {isPending && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><Clock className="w-4 h-4"/> Chờ duyệt</span>}
                          {isApproved && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Đã duyệt</span>}
                          {post.is_deleted && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> Đã ẩn</span>}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2">{post.tieude}</h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-xl mb-4 whitespace-pre-wrap text-sm leading-relaxed border border-gray-100">
                        {post.noidung}
                      </p>

                      {isPending && (
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleApprovePost(post)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2.5 rounded-xl font-bold hover:shadow-md transition flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Duyệt bài
                          </button>
                          <button
                            onClick={() => handleRejectPost(post.mabangcongdong)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2.5 rounded-xl font-bold hover:shadow-md transition flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-5 h-5" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Members */}
        {activeTab === 'members' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Danh sách thành viên cộng đồng</h2>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold text-sm">{members.length} người</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const role = member.profile?.chucnang || 'owner';
                const isInternal = ['admin', 'support', 'supervisor'].includes(role);
                
                return (
                  <div key={member.manguoidung} className={`bg-white rounded-2xl shadow-sm p-5 border-2 transition ${member.block ? 'border-red-200 opacity-75' : 'border-transparent'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                          {member.profile?.anhdaidien ? (
                            <img src={member.profile.anhdaidien} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-600 font-bold text-lg">
                              {member.profile?.tennguoidung?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 line-clamp-1">{member.profile?.tennguoidung}</h3>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              role === 'admin' ? 'bg-red-100 text-red-700' :
                              role === 'support' || role === 'supervisor' ? 'bg-purple-100 text-purple-700' :
                              role === 'provider' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {member.block ? <span className="text-red-600">Đã bị chặn</span> : <span className="text-green-600">Hoạt động</span>}
                      </div>
                      
                      <button
                        onClick={() => handleToggleBlock(member)}
                        disabled={isInternal}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1 ${
                          isInternal 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : member.block 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={isInternal ? 'Không thể chặn nhân sự nội bộ' : ''}
                      >
                        {isInternal ? <Shield className="w-4 h-4"/> : member.block ? <CheckCircle className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                        {isInternal ? 'Nội bộ' : member.block ? 'Bỏ chặn' : 'Chặn'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab Content: History & Stats */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Thống kê Tổng quan */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-gray-500 font-semibold text-sm mb-1">Lượt xe vào</h3>
                <div className="text-2xl font-bold text-blue-600">{historyStats.totalIn}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-gray-500 font-semibold text-sm mb-1">Lượt xe ra</h3>
                <div className="text-2xl font-bold text-green-600">{historyStats.totalOut}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-gray-500 font-semibold text-sm mb-1">Tiền mặt</h3>
                <div className="text-lg font-bold text-gray-900">{historyStats.cash.toLocaleString('vi-VN')}đ</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-gray-500 font-semibold text-sm mb-1">Chuyển khoản</h3>
                <div className="text-lg font-bold text-gray-900">{historyStats.transfer.toLocaleString('vi-VN')}đ</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-gray-500 font-semibold text-sm mb-1">Đặt chỗ trước</h3>
                <div className="text-2xl font-bold text-purple-600">{historyStats.reservationCount}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-md flex flex-col justify-center items-center text-center">
                <h3 className="font-semibold text-green-100 text-sm mb-1">Tổng doanh thu</h3>
                <div className="text-xl font-bold">{historyStats.totalRevenue.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => setHistoryFilter('all')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${historyFilter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  Tất cả lượt
                </button>
                <button 
                  onClick={() => setHistoryFilter('in')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1 ${historyFilter === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <ArrowLeft className="w-4 h-4 transform -rotate-45" /> Đang trong bãi
                </button>
                <button 
                  onClick={() => setHistoryFilter('out')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1 ${historyFilter === 'out' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <ChevronRight className="w-4 h-4" /> Đã ra bãi
                </button>
              </div>

              <div className="w-px h-8 bg-gray-200 hidden md:block mx-2"></div>

              <div className="flex items-center gap-2">
                <select 
                  value={filterMode} 
                  onChange={(e) => {
                    setFilterMode(e.target.value as 'date' | 'month');
                    setHistoryDateFilter('');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-purple-500 font-semibold text-gray-700"
                >
                  <option value="date">Theo ngày</option>
                  <option value="month">Theo tháng</option>
                </select>
                <input 
                  type={filterMode} 
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
                {historyDateFilter && (
                  <button 
                    onClick={() => setHistoryDateFilter('')}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                    title="Xóa bộ lọc"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b">Biển số</th>
                    <th className="p-4 font-semibold border-b">Vị trí</th>
                    <th className="p-4 font-semibold border-b">Thời gian vào</th>
                    <th className="p-4 font-semibold border-b">Thời gian ra</th>
                    <th className="p-4 font-semibold border-b text-right">Tổng tiền</th>
                    <th className="p-4 font-semibold border-b text-center">Trạng thái</th>
                    <th className="p-4 font-semibold border-b text-center">Sự cố</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu thống kê phù hợp</td>
                    </tr>
                  ) : (
                    filteredHistory.map((row) => (
                      <tr key={row.maxevao} className={`hover:bg-gray-50 transition ${row.suco ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                        <td className="p-4">
                          <div className="font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 inline-block bg-white shadow-sm tracking-wider">
                            {row.bienso}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-semibold">{row.tenvitri}</div>
                          <div className="text-xs text-gray-500">{row.tenkhuvuc}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {new Date(row.thoigianvao).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {row.ketthuc && row.thoigianra ? new Date(row.thoigianra).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">
                          {row.ketthuc && row.tongtien !== undefined ? `${row.tongtien.toLocaleString('vi-VN')}đ` : '-'}
                          {row.hinhthucthanhtoan && <div className="text-[10px] text-gray-500 uppercase mt-0.5">{row.hinhthucthanhtoan}</div>}
                        </td>
                        <td className="p-4 text-center">
                          {row.ketthuc ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                              Đã ra
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
                              Đang đỗ
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.ketthuc && (
                            <button
                              onClick={() => initiateToggleSuco(row)}
                              className={`p-2 rounded-lg transition border ${
                                row.suco 
                                  ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' 
                                  : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 hover:text-red-500'
                              }`}
                              title={row.suco ? "Xe đang ghi nhận sự cố (Bấm để gỡ)" : "Báo cáo sự cố xe (Ẩn doanh thu)"}
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Camera */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Camera Grid */}
            <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-800">
              <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-500" />
                  Hệ thống Camera giám sát (Live)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-xs text-gray-400 font-mono">REC</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 bg-black">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="aspect-video bg-gray-800 relative group cursor-pointer border border-gray-700 hover:border-gray-500 transition">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 group-hover:text-gray-400">
                      <Camera className="w-6 h-6 mb-1 opacity-50" />
                      <span className="text-[10px] uppercase tracking-wider">CAM {i + 1 < 10 ? `0${i+1}` : i+1}</span>
                    </div>
                    <div className="absolute top-1 left-2 text-[9px] text-white/50 font-mono">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-600" />
                Xác thực thao tác Sự cố
              </h2>
              <button 
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setTargetIncidentRow(null);
                }} 
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Bạn đang yêu cầu <strong className={targetIncidentRow?.suco ? "text-green-600" : "text-red-600"}>{targetIncidentRow?.suco ? 'GỠ SỰ CỐ' : 'BÁO CÁO SỰ CỐ'}</strong> cho xe có biển số <strong className="text-gray-900 tracking-wider bg-gray-100 px-2 py-0.5 rounded">{targetIncidentRow?.bienso}</strong>.
              </p>
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nhập mã PIN của bạn
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  autoComplete="new-password"
                  inputMode="numeric"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none font-mono tracking-widest text-center text-xl"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setTargetIncidentRow(null);
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmToggleSuco}
                disabled={pinInput.length !== 8}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};