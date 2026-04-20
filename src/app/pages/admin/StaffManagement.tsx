import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Shield,
  Users,
  MapPin,
  Trash2,
  Key,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase';

type StaffRole = 'owner' | 'supervisor' | 'support' | 'admin' | 'provider';
type SelectableRole = 'supervisor' | 'support';

interface ParkingLot {
  code: string;
  name: string;
  joinCode: string;
}

interface StaffRecord {
  manguoidung: string;
  email: string;
  displayName: string;
  role: StaffRole;
  parkingLot: ParkingLot | null;
  canSwitchLots: boolean;
  maadmin: string;
}

interface StaffRow {
  manguoidung: string;
  mabaido: string | null;
  maadmin: string | null;
  duocchuyenbai: boolean | null;

  nguoidung?: {
    email: string | null;
    tennguoidung: string | null;
    chucnang: StaffRole | null;
  }[];

  baido?: {
    mabaido: string | null;
    tenbaido: string | null;
    mathamgia: string | null;
  }[];
}

interface UserRow {
  manguoidung: string;
  email: string | null;
  tennguoidung: string | null;
  chucnang: StaffRole | null;
}

interface InvitePayload {
  action: 'invite_staff';
  targetRole: SelectableRole;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotJoinCode: string;
  customName: string;
  canSwitchLots: boolean;
}

export const StaffManagement = () => {
  const navigate = useNavigate();

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | SelectableRole>('all');

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<SelectableRole>('support');
  const [selectedParkingLot, setSelectedParkingLot] = useState<string>('');
  const [canSwitchLots, setCanSwitchLots] = useState(false);

  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<SelectableRole>('support');
  const [editParkingLot, setEditParkingLot] = useState<string>('');
  const [editCanSwitchLots, setEditCanSwitchLots] = useState(false);

  const roleLabels: Record<SelectableRole, string> = {
    supervisor: 'Giám sát viên',
    support: 'Nhân viên hỗ trợ',
  };

  const roleColors: Record<SelectableRole, string> = {
    supervisor: 'bg-green-100 text-green-700',
    support: 'bg-blue-100 text-blue-700',
  };

  const resetForm = () => {
    setNewEmail('');
    setNewName('');
    setNewRole('support');
    setSelectedParkingLot('');
    setCanSwitchLots(false);
  };

  const resetEditForm = () => {
    setEditingStaff(null);
    setEditDisplayName('');
    setEditRole('support');
    setEditParkingLot('');
    setEditCanSwitchLots(false);
  };

  const getRoleLabel = (role: StaffRole) => {
    if (role === 'supervisor') return 'Giám sát viên';
    if (role === 'support') return 'Nhân viên hỗ trợ';
    if (role === 'owner') return 'Chủ xe';
    if (role === 'admin') return 'Admin';
    if (role === 'provider') return 'Nhà cung cấp';
    return role;
  };

  const getRoleBadgeClass = (role: StaffRole) => {
    if (role === 'supervisor') return 'bg-green-100 text-green-700';
    if (role === 'support') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const fetchParkingLots = async (adminId: string) => {
    const { data, error } = await supabase
      .from('baido')
      .select('mabaido, tenbaido, mathamgia')
      .eq('manguoidung', adminId)
      .order('tenbaido', { ascending: true });

    if (error) {
      console.error('FETCH PARKING LOTS ERROR:', error);
      toast.error('Lỗi load bãi đỗ');
      return;
    }

    const mapped: ParkingLot[] = (data ?? []).map((item: any) => ({
      code: item.mabaido,
      name: item.tenbaido,
      joinCode: item.mathamgia,
    }));

    setParkingLots(mapped);
  };

const fetchStaff = async (adminId: string) => {
  const { data, error } = await supabase
    .from('ctnhanvien')
    .select(`
      manguoidung,
      mabaido,
      maadmin,
      duocchuyenbai,
      nguoidung (
        email,
        tennguoidung,
        chucnang
      )
    `)
    .eq('maadmin', adminId);

  if (error) {
    console.error(error);
    toast.error('Lỗi load nhân viên');
    return;
  }

  // 🔥 Lấy toàn bộ bãi đỗ
  const { data: lots } = await supabase
    .from('baido')
    .select('mabaido, tenbaido, mathamgia');

  const lotMap = new Map(
    (lots || []).map((l) => [l.mabaido, l])
  );

  const mapped: StaffRecord[] = (data || []).map((item: any) => {
    const user = Array.isArray(item.nguoidung)
  ? item.nguoidung[0]
  : item.nguoidung;

    // 🔥 Lấy bãi đỗ bằng mabaido từ ctnhanvien
    const lot = lotMap.get(item.mabaido);

    return {
      manguoidung: item.manguoidung,
      email: user?.email || 'unknown',

      // ✅ FIX NAME
      displayName:
        user?.tennguoidung?.trim() ||
        user?.email ||
        'Không tên',

      role: user?.chucnang || 'support',

      // ✅ FIX PARKING LOT
      parkingLot: lot
        ? {
            code: lot.mabaido,
            name: lot.tenbaido,
            joinCode: lot.mathamgia,
          }
        : null,

      canSwitchLots: item.duocchuyenbai ?? false,
      maadmin: item.maadmin || '',
    };
  });

  setStaffList(mapped);
};

  const loadData = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('AUTH ERROR:', authError);
      toast.error('Không thể xác thực phiên đăng nhập');
      return;
    }

    const user = authData.user;
    if (!user) {
      toast.error('Bạn chưa đăng nhập');
      navigate('/login');
      return;
    }

    setCurrentAdminId(user.id);
    await Promise.all([fetchParkingLots(user.id), fetchStaff(user.id)]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      if (filterRole !== 'all' && staff.role !== filterRole) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        staff.displayName.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        (staff.parkingLot?.name || '').toLowerCase().includes(q) ||
        (staff.parkingLot?.joinCode || '').toLowerCase().includes(q)
      );
    });
  }, [staffList, filterRole, searchQuery]);

  const checkTargetUser = async (): Promise<UserRow | null> => {
    const email = newEmail.trim().toLowerCase();

    if (!email) {
      toast.error('Vui lòng nhập email tài khoản');
      return null;
    }

    const { data, error } = await supabase
      .from('nguoidung')
      .select('manguoidung, email, tennguoidung, chucnang')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('LOOKUP USER ERROR:', error);
      toast.error('Không tìm thấy người dùng');
      return null;
    }

    if (!data) {
      toast.error('Email không tồn tại trong hệ thống');
      return null;
    }

    return data as UserRow;
  };

  const handleSendInvite = async () => {
    if (!currentAdminId) {
      toast.error('Bạn chưa đăng nhập');
      return;
    }

    if (!newEmail.trim()) {
      toast.error('Vui lòng nhập email tài khoản');
      return;
    }

    if (!newName.trim()) {
      toast.error('Vui lòng nhập tên hiển thị');
      return;
    }

    if (!selectedParkingLot) {
      toast.error('Vui lòng chọn 1 bãi đỗ');
      return;
    }

    const lot = parkingLots.find((item) => item.code === selectedParkingLot);
    if (!lot) {
      toast.error('Bãi đỗ không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      const targetUser = await checkTargetUser();
      if (!targetUser) return;

      if (targetUser.chucnang === 'admin') {
        toast.error('Không thể thêm tài khoản admin');
        return;
      }

      if (targetUser.chucnang === 'provider') {
        toast.error('Không thể thêm nhà cung cấp');
        return;
      }

      if (targetUser.chucnang !== 'owner') {
        toast.error('Chỉ có thể mời chủ xe');
        return;
      }

      const { data: existingStaff, error: existingError } = await supabase
        .from('ctnhanvien')
        .select('manguoidung, maadmin')
        .eq('manguoidung', targetUser.manguoidung)
        .maybeSingle();

      if (existingError) {
        console.error('CHECK EXISTING STAFF ERROR:', existingError);
        toast.error('Không thể kiểm tra nhân viên hiện tại');
        return;
      }

      if (existingStaff) {
        if (existingStaff.maadmin === currentAdminId) {
          toast.error('Nhân viên đã có trong hệ thống của bạn');
        } else {
          toast.error('Người này đang thuộc hệ thống khác');
        }
        return;
      }

      const payload: InvitePayload = {
        action: 'invite_staff',
        targetRole: newRole,
        parkingLotId: lot.code,
        parkingLotName: lot.name,
        parkingLotJoinCode: lot.joinCode,
        customName: newName.trim(),
        canSwitchLots,
      };

      const { error: notifyError } = await supabase.from('thongbao').insert({
        manguoigui: currentAdminId,
        manguoinhan: targetUser.manguoidung,
        loai: 'role_request',
        tieude: 'Lời mời trở thành nhân viên',
        noidung: JSON.stringify(payload),
        dadoc: false,
      });

      if (notifyError) {
        console.error('INSERT THONGBAO ERROR:', notifyError);
        toast.error('Lỗi gửi lời mời');
        return;
      }

      toast.success('Đã gửi lời mời đến chủ xe');
      resetForm();
      setShowAddStaff(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSwitchPermission = async (staff: StaffRecord) => {
    const { error } = await supabase
      .from('ctnhanvien')
      .update({ duocchuyenbai: !staff.canSwitchLots })
      .eq('manguoidung', staff.manguoidung)
      .eq('maadmin', currentAdminId);

    if (error) {
      console.error('TOGGLE SWITCH PERMISSION ERROR:', error);
      toast.error('Lỗi cập nhật quyền');
      return;
    }

    toast.success(staff.canSwitchLots ? 'Đã thu hồi quyền đổi bãi' : 'Đã cấp quyền đổi bãi');
    await fetchStaff(currentAdminId);
  };

  const handleDeleteStaff = async (staff: StaffRecord) => {
    if (!confirm('Xóa nhân viên khỏi bãi đỗ này?')) return;

    const { error: deleteError } = await supabase
      .from('ctnhanvien')
      .delete()
      .eq('manguoidung', staff.manguoidung)
      .eq('maadmin', currentAdminId);

    if (deleteError) {
      console.error('DELETE STAFF ERROR:', deleteError);
      toast.error('Xóa thất bại');
      return;
    }

    const { error: revertRoleError } = await supabase
      .from('nguoidung')
      .update({ chucnang: 'owner' })
      .eq('manguoidung', staff.manguoidung);

    if (revertRoleError) {
      console.error('REVERT ROLE ERROR:', revertRoleError);
      toast.error('Đã xóa nhân viên nhưng lỗi trả vai trò về owner');
      await fetchStaff(currentAdminId);
      return;
    }

    toast.success('Đã xóa nhân viên và trả vai trò về chủ xe');
    await fetchStaff(currentAdminId);
  };

  const handleOpenEditStaff = (staff: StaffRecord) => {
    setEditingStaff(staff);
    setEditDisplayName(staff.displayName || '');
    setEditRole(staff.role === 'supervisor' ? 'supervisor' : 'support');
    setEditParkingLot(staff.parkingLot?.code || '');
    setEditCanSwitchLots(staff.canSwitchLots);
    setShowEditStaff(true);
  };

  const handleSaveEditStaff = async () => {
    if (!editingStaff) return;

    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      toast.error('Tên hiển thị không được để trống');
      return;
    }

    if (!editParkingLot) {
      toast.error('Vui lòng chọn bãi đỗ');
      return;
    }

    setIsLoading(true);
    try {
      const { error: userError } = await supabase
        .from('nguoidung')
        .update({
          tennguoidung: trimmedName,
          chucnang: editRole,
        })
        .eq('manguoidung', editingStaff.manguoidung);

      if (userError) {
        console.error('UPDATE USER ERROR:', userError);
        toast.error('Không thể cập nhật thông tin người dùng');
        return;
      }

      const { error: staffError } = await supabase
        .from('ctnhanvien')
        .update({
          mabaido: editParkingLot,
          duocchuyenbai: editCanSwitchLots,
        })
        .eq('manguoidung', editingStaff.manguoidung)
        .eq('maadmin', currentAdminId);

      if (staffError) {
        console.error('UPDATE STAFF ERROR:', staffError);
        toast.error('Không thể cập nhật bãi đỗ / quyền đổi bãi');
        return;
      }

      toast.success('Đã cập nhật nhân viên');
      setShowEditStaff(false);
      resetEditForm();
      await fetchStaff(currentAdminId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl mb-1 flex items-center gap-2">
                <Users className="w-7 h-7" />
                Quản lý nhân viên
              </h1>
              <p className="text-purple-100 text-sm">
                Phân quyền theo bãi đỗ, không dùng zone
              </p>
            </div>
            <button
              onClick={() => setShowAddStaff(true)}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Mời chủ xe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/80 text-sm mb-1">Tổng nhân viên</div>
              <div className="text-2xl">{staffList.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/80 text-sm mb-1">Giám sát viên</div>
              <div className="text-2xl">{staffList.filter((s) => s.role === 'supervisor').length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/80 text-sm mb-1">Nhân viên hỗ trợ</div>
              <div className="text-2xl">{staffList.filter((s) => s.role === 'support').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex gap-3 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, email, tên bãi hoặc mã tham gia..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | SelectableRole)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="all">Tất cả chức vụ</option>
              <option value="supervisor">Giám sát viên</option>
              <option value="support">Nhân viên hỗ trợ</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Không tìm thấy nhân viên</p>
            </div>
          ) : (
            filteredStaff.map((staff) => (
              <div key={staff.manguoidung} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl ${
                        staff.role === 'supervisor' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    >
                      {staff.displayName?.[0] || 'U'}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl text-gray-900">{staff.displayName}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm ${getRoleBadgeClass(staff.role)}`}>
                          {getRoleLabel(staff.role)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                          {staff.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 flex-wrap">
                        <Key className="w-4 h-4" />
                        <span className="font-mono">{staff.email}</span>
                        <span className="text-gray-400">•</span>
                        <span>{staff.manguoidung}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">Bãi đỗ được phân quyền:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {staff.parkingLot ? (
                                <>
                                  <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                                    {staff.parkingLot.name}
                                  </span>
                                  <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                                    Mã tham gia: {staff.parkingLot.joinCode || 'N/A'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                  Chưa gán bãi đỗ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Key className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm text-gray-700">Quyền đổi bãi:</span>
                          {staff.canSwitchLots ? (
                            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                              ✅ Đã cấp phép
                            </span>
                          ) : (
                            <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                              ❌ Chưa cấp phép
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleSwitchPermission(staff)}
                            className={`text-xs px-3 py-1 rounded-lg transition-all ${
                              staff.canSwitchLots
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {staff.canSwitchLots ? 'Thu hồi' : 'Cấp phép'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditStaff(staff)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 flex items-center gap-2">
                <UserPlus className="w-7 h-7 text-purple-600" />
                Mời chủ xe trở thành nhân viên
              </h2>
              <button
                onClick={() => {
                  setShowAddStaff(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Email tài khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="VD: user@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Tên hiển thị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Chức vụ <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewRole('support')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      newRole === 'support'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-medium">Nhân viên hỗ trợ</div>
                        <div className="text-xs text-gray-600">Xử lý hỗ trợ, quản lý cộng đồng</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setNewRole('supervisor')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      newRole === 'supervisor'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-medium">Giám sát viên</div>
                        <div className="text-xs text-gray-600">Quản lý bãi đỗ được phân quyền</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Chọn bãi đỗ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {parkingLots.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">
                      Chưa có bãi đỗ nào thuộc tài khoản admin này
                    </div>
                  ) : (
                    parkingLots.map((lot) => (
                      <div key={lot.code} className="border border-gray-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="parkingLot"
                            checked={selectedParkingLot === lot.code}
                            onChange={() => setSelectedParkingLot(lot.code)}
                            className="mt-1 w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="text-gray-900 font-medium mb-1">{lot.name}</div>
                            <div className="text-sm text-gray-600">Mã tham gia: {lot.joinCode || 'N/A'}</div>
                            <div className="text-sm text-gray-600">Mã bãi đỗ: {lot.code}</div>
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Key className="w-6 h-6 text-indigo-600" />
                    <div>
                      <div className="font-bold text-gray-900">Cấp quyền đổi bãi</div>
                      <div className="text-sm text-gray-600">
                        Cho phép nhân viên chuyển bãi khi cần
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCanSwitchLots(!canSwitchLots)}
                    className={`relative w-16 h-8 rounded-full transition ${
                      canSwitchLots ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition transform ${
                        canSwitchLots ? 'translate-x-8' : ''
                      }`}
                    />
                  </button>
                </div>
                {canSwitchLots && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                    ⚠️ Quyền này sẽ được lưu ở bảng <strong>ctnhanvien</strong> trong trường{' '}
                    <strong>duocchuyenbai</strong>.
                  </div>
                )}
              </div>

              <div className={`rounded-lg p-4 ${
                newRole === 'supervisor'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`text-sm ${newRole === 'supervisor' ? 'text-green-800' : 'text-blue-800'}`}>
                  {newRole === 'supervisor' ? (
                    <>
                      <strong>Giám sát viên</strong> sẽ được gửi thông báo chờ xác nhận. Khi chủ xe xác nhận, hệ thống sẽ:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Đổi <strong>chucnang</strong> từ <strong>owner</strong> sang <strong>supervisor</strong></li>
                        <li>Gán vào bãi đỗ đã chọn</li>
                        <li>Lưu quyền đổi bãi nếu đã bật</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <strong>Nhân viên hỗ trợ</strong> sẽ được gửi thông báo chờ xác nhận. Khi chủ xe xác nhận, hệ thống sẽ:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Đổi <strong>chucnang</strong> từ <strong>owner</strong> sang <strong>support</strong></li>
                        <li>Gán vào bãi đỗ đã chọn</li>
                        <li>Lưu quyền đổi bãi nếu đã bật</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStaff(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSendInvite}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-60"
              >
                {isLoading ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStaff && editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 flex items-center gap-2">
                <Pencil className="w-7 h-7 text-blue-600" />
                Chỉnh sửa nhân viên
              </h2>
              <button
                onClick={() => {
                  setShowEditStaff(false);
                  resetEditForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Tên hiển thị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Nhập tên hiển thị mới"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="text"
                    value={editingStaff.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Chức vụ <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditRole('support')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editRole === 'support'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-medium">Nhân viên hỗ trợ</div>
                        <div className="text-xs text-gray-600">Xử lý hỗ trợ, quản lý cộng đồng</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setEditRole('supervisor')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editRole === 'supervisor'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-medium">Giám sát viên</div>
                        <div className="text-xs text-gray-600">Quản lý bãi đỗ được phân quyền</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Chọn bãi đỗ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {parkingLots.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">
                      Chưa có bãi đỗ nào thuộc tài khoản admin này
                    </div>
                  ) : (
                    parkingLots.map((lot) => (
                      <div key={lot.code} className="border border-gray-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="editParkingLot"
                            checked={editParkingLot === lot.code}
                            onChange={() => setEditParkingLot(lot.code)}
                            className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-gray-900 font-medium mb-1">{lot.name}</div>
                            <div className="text-sm text-gray-600">Mã tham gia: {lot.joinCode || 'N/A'}</div>
                            <div className="text-sm text-gray-600">Mã bãi đỗ: {lot.code}</div>
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Key className="w-6 h-6 text-indigo-600" />
                    <div>
                      <div className="font-bold text-gray-900">Cấp quyền đổi bãi</div>
                      <div className="text-sm text-gray-600">
                        Cho phép nhân viên chuyển bãi khi cần
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditCanSwitchLots(!editCanSwitchLots)}
                    className={`relative w-16 h-8 rounded-full transition ${
                      editCanSwitchLots ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition transform ${
                        editCanSwitchLots ? 'translate-x-8' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                editRole === 'supervisor'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`text-sm ${editRole === 'supervisor' ? 'text-green-800' : 'text-blue-800'}`}>
                  {editRole === 'supervisor' ? (
                    <>
                      <strong>Giám sát viên</strong> sẽ được cập nhật trực tiếp:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Đổi <strong>chucnang</strong> sang <strong>supervisor</strong></li>
                        <li>Đổi bãi đỗ đang phụ trách</li>
                        <li>Cập nhật quyền đổi bãi nếu bật</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <strong>Nhân viên hỗ trợ</strong> sẽ được cập nhật trực tiếp:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Đổi <strong>chucnang</strong> sang <strong>support</strong></li>
                        <li>Đổi bãi đỗ đang phụ trách</li>
                        <li>Cập nhật quyền đổi bãi nếu bật</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditStaff(false);
                  resetEditForm();
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEditStaff}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-60"
              >
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};