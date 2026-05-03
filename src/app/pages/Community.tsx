import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Key,
  Info,
  Map,
  Car,
  ShieldCheck,
  Users,
  Sparkles,
  CircleDashed,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ParkingLot } from '../types/community.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { getHomeRoute, shouldSkipCommunityCodeEntry } from '../utils/navigation.ts';
import { supabase } from '../utils/supabase.ts';


export interface SupportTicket {
  id: number;
  message: string;
  userId: number;
  status: string;
}

export const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const locationState = location.state as {
    communityCode?: string;
    skipCodeEntry?: boolean;
  } | null;

  const [communityCode, setCommunityCode] = useState<string>(locationState?.communityCode || '');
  const [hasCommunityAccess, setHasCommunityAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

 

  const skipCodeEntry =
    locationState?.skipCodeEntry || shouldSkipCommunityCodeEntry(user?.role);

  const joinCommunityByCode = useCallback(
    async (rawCode: string, isAutoJoin = false) => {
      const normalizedCode = rawCode.toUpperCase().trim();

      if (!normalizedCode) {
        toast.error('Vui lòng nhập mã cộng đồng!');
        return;
      }

      const currentUserId = (user as any)?.manguoidung ?? (user as any)?.id;

      if (!currentUserId) {
        toast.error('Không tìm thấy thông tin người dùng!');
        return;
      }

      const { data: baido, error: baidoError } = await supabase
        .from('baido')
        .select('mabaido, tenbaido, mathamgia, congkhai')
        .eq('mathamgia', normalizedCode)
        .maybeSingle();

      if (baidoError) {
        console.error('BAIDO ERROR:', baidoError);
        toast.error('Không thể kiểm tra mã cộng đồng!');
        return;
      }

      if (!baido) {
        toast.error('Mã cộng đồng không tồn tại!');
        return;
      }

      const { error: insertError } = await supabase
        .from('thanhviencongdong')
        .upsert(
          {
            mabaido: baido.mabaido,
            manguoidung: currentUserId,
          },
          {
            onConflict: 'mabaido,manguoidung',
          }
        );

      if (insertError) {
        console.error('THANHVIENCONGDONG ERROR:', insertError);
        toast.error('Không thể thêm vào danh sách thành viên cộng đồng!');
        return;
      }

      setHasCommunityAccess(true);
      setCommunityCode(normalizedCode);
      localStorage.setItem('communityCode', normalizedCode);

      toast.success(`Đã vào cộng đồng ${baido.tenbaido}!`);

      navigate(`/community/feed?code=${normalizedCode}`, {
        replace: isAutoJoin,
      });
    },
    [navigate, user]
  );

  useEffect(() => {
    if (locationState?.skipCodeEntry && locationState?.communityCode && !hasCommunityAccess) {
      void joinCommunityByCode(locationState.communityCode, true);
    }
  }, [
    locationState?.skipCodeEntry,
    locationState?.communityCode,
    hasCommunityAccess,
    joinCommunityByCode,
  ]);



  const handleEnterCode = () => {
    void joinCommunityByCode(communityCode);
  };

  const handleViewParkingLot = (lot: ParkingLot) => {
    navigate(`/community/reviews?parking=${lot.code}`);
  };

  const handleBackButton = () => {
    navigate(getHomeRoute(user?.role));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBackButton}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl mb-1">Cộng đồng bãi đỗ xe</h1>
              <p className="text-purple-100 text-sm">Tìm kiếm và kết nối với cộng đồng</p>
            </div>
            <button
              onClick={() => navigate('/shared/parking-lots')}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <Map className="w-5 h-5" />
              Tìm bãi đỗ xe
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-sm shadow-xl border border-white/60 mb-8">
  <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-200/50 blur-3xl" />
  <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />

  <div className="relative p-8 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-purple-700 text-sm mb-5">
        <Sparkles className="w-4 h-4" />
        Kết nối cộng đồng bãi đỗ xe
      </div>

      <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 leading-tight">
        Vào cộng đồng của bãi đỗ xe bạn đang sử dụng
      </h2>

      <p className="text-gray-600 leading-relaxed mb-6 max-w-xl">
        Nhập đúng mã cộng đồng để tham gia, xem trao đổi và tự động ghi bạn vào danh sách thành viên của bãi đỗ.
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-3 text-purple-700">
          <Car className="w-5 h-5" />
          <span className="text-sm">Xe ra vào tiện lợi</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-blue-700">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm">Truy cập an toàn</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
          <Users className="w-5 h-5" />
          <span className="text-sm">Kết nối thành viên</span>
        </div>
      </div>
    </div>

    <div className="relative flex items-center justify-center">
      <div className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 opacity-50 blur-2xl" />
      <div className="relative bg-white/90 border border-gray-100 shadow-2xl rounded-3xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Community Access</p>
              <p className="text-lg font-semibold text-gray-900">Cộng đồng bãi xe</p>
            </div>
          </div>
          <CircleDashed className="w-8 h-8 text-purple-300" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-purple-50 p-4">
            <p className="text-xs text-purple-500 mb-1">Mã cộng đồng</p>
            <p className="text-lg font-semibold text-gray-900">COMM001</p>
          </div>
          <div className="rounded-2xl bg-pink-50 p-4">
            <p className="text-xs text-pink-500 mb-1">Trạng thái</p>
            <p className="text-lg font-semibold text-gray-900">Sẵn sàng</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs text-blue-500 mb-1">Thành viên</p>
            <p className="text-lg font-semibold text-gray-900">Đồng bộ</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs text-emerald-500 mb-1">Bảo mật</p>
            <p className="text-lg font-semibold text-gray-900">An toàn</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
        {/* Enter Community Code Card - Hidden for Supervisor & Support Staff */}
        {!skipCodeEntry && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Key className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl text-gray-900">Nhập mã cộng đồng</h2>
                  <p className="text-gray-600 text-sm">Mã do quản trị viên bãi xe cung cấp</p>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={communityCode}
                  onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã cộng đồng (VD: COMM001)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none uppercase"
                />
                <button
                  onClick={handleEnterCode}
                  disabled={!communityCode.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vào cộng đồng
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">Để tham gia cộng đồng, bạn cần:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Mã cộng đồng do quản trị viên bãi xe tạo</li>
                      <li>Đã đăng ký đỗ xe tại bãi đó ít nhất 1 lần</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message for Supervisor & Support Staff */}
        

        {/* Optional Code Entry for Staff */}
        {skipCodeEntry && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-lg text-gray-900 mb-4">Theo dõi cộng đồng khác</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã cộng đồng (tùy chọn)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none uppercase"
              />
              <button
                onClick={handleEnterCode}
                disabled={!communityCode.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vào
              </button>
            </div>
          </div>
        )}

   
        

        {/* Parking Lots List */}
           <div className="mt-8 rounded-3xl border border-dashed border-purple-200 bg-white/60 p-8 text-center">
  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
    <Car className="w-8 h-8" />
  </div>
  <p className="text-lg font-semibold text-gray-900 mb-2">
    Chưa có nội dung hiển thị thêm
  </p>
  <p className="text-sm text-gray-500">
    Bạn có thể thêm danh sách cộng đồng thật, thông báo mới, hoặc hoạt động gần đây sau.
  </p>
</div>
      </div>
    </div>
  );
};