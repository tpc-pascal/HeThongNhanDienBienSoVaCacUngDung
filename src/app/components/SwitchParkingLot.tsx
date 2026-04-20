import { useState } from 'react';
import { Building2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SwitchParkingLotProps {
  role: 'support' | 'supervisor';
  currentLot: string;
  canSwitch: boolean; // Admin có cấp quyền đổi bãi không
}

export const SwitchParkingLot = ({ role, currentLot, canSwitch }: SwitchParkingLotProps) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState('');
  const [pin, setPin] = useState('');

  // Danh sách bãi đỗ có sẵn (demo)
  const availableLots = [
    { code: 'PARK-A001', name: 'Bãi đỗ xe Hùng Vương', pin: '1234' },
    { code: 'PARK-B002', name: 'Bãi xe Thống Nhất', pin: '5678' },
    { code: 'PARK-C003', name: 'Bãi xe An Phú', pin: '9999' },
  ];

  const handleRequestSwitch = (lotCode: string) => {
    if (!canSwitch) {
      toast.error('❌ Bạn không có quyền đổi bãi! Liên hệ Admin để được cấp quyền.');
      return;
    }

    setSelectedLot(lotCode);
    setShowPinModal(true);
  };

  const handleVerifyPin = () => {
    const lot = availableLots.find((l) => l.code === selectedLot);

    if (!lot) {
      toast.error('Không tìm thấy bãi đỗ!');
      return;
    }

    if (pin === lot.pin) {
      toast.success(`✅ Đã chuyển sang ${lot.name}!`);
      setShowPinModal(false);
      setPin('');
      setSelectedLot('');
    } else {
      toast.error('❌ Mã PIN không đúng! Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-100 p-3 rounded-lg">
          <Building2 className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Đổi bãi xe</h3>
          <p className="text-sm text-gray-600">
            {role === 'support' ? 'Nhân viên hỗ trợ' : 'Giám sát'}
          </p>
        </div>
      </div>

      {/* Current Lot */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border-2 border-blue-300">
        <div className="text-sm text-gray-600 mb-1">Bãi đỗ hiện tại</div>
        <div className="text-2xl font-bold text-gray-900">{currentLot}</div>
      </div>

      {/* Permission Status */}
      <div className={`rounded-lg p-4 mb-4 border-2 ${
        canSwitch 
          ? 'bg-green-50 border-green-300' 
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center gap-2">
          {canSwitch ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-700">Có quyền đổi bãi linh hoạt</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-700">Chỉ làm việc tại bãi hiện tại</span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {canSwitch
            ? 'Admin đã cấp quyền cho bạn đổi bãi. Bạn cần mã PIN để chuyển bãi.'
            : 'Admin chưa cấp quyền đổi bãi. Liên hệ Admin nếu cần.'}
        </p>
      </div>

      {/* Available Lots */}
      {canSwitch && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Các bãi đỗ khả dụng</h4>
          <div className="space-y-2">
            {availableLots.map((lot) => (
              <button
                key={lot.code}
                onClick={() => handleRequestSwitch(lot.code)}
                disabled={lot.name === currentLot}
                className={`w-full p-4 rounded-lg border-2 text-left transition ${
                  lot.name === currentLot
                    ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{lot.name}</div>
                    <div className="text-sm text-gray-600">Mã: {lot.code}</div>
                  </div>
                  {lot.name === currentLot && (
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Đang làm
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!canSwitch && (
        <div className="text-center py-6">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">
            Liên hệ Admin để được cấp quyền đổi bãi
          </p>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Nhập mã PIN</h2>
              <p className="text-gray-600">
                Nhập mã PIN do Admin cung cấp để chuyển sang bãi mới
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mã PIN bãi đỗ
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN (4 số)"
                maxLength={4}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-center text-2xl font-bold tracking-widest"
              />
              <p className="text-sm text-gray-500 mt-2">
                Bãi đổ: <strong>{availableLots.find((l) => l.code === selectedLot)?.name}</strong>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                  setSelectedLot('');
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleVerifyPin}
                disabled={pin.length !== 4}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận
              </button>
            </div>

            <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
              <p className="text-sm text-gray-700 text-center">
                💡 Mã PIN được cung cấp bởi Admin của bãi đỗ
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
