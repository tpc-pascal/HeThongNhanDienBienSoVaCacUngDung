import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Spot {
  id: string;
  status: 'available' | 'occupied' | 'reserved';
}

export const SpotSelection = () => {
  const navigate = useNavigate();
  const { lotId, zoneId, vehicleId } = useParams();
  const [selectedSpot, setSelectedSpot] = useState<string>('');

  // Mock data
  const zone = {
    name: 'Sân A - Xe máy',
    totalSpots: 30,
  };

  const vehicle = {
    licensePlate: '59A-12345',
    type: 'Xe máy',
    price: '5.000đ',
    coinPrice: '5 xu',
  };

  // Generate spots
  const spots: Spot[] = Array.from({ length: zone.totalSpots }, (_, i) => {
    const spotNumber = String(i + 1).padStart(3, '0');
    const random = Math.random();
    let status: Spot['status'] = 'available';
    if (random < 0.3) status = 'occupied';
    else if (random < 0.4) status = 'reserved';
    
    return {
      id: `A${spotNumber}`,
      status,
    };
  });

  const handleConfirm = () => {
    if (!selectedSpot) {
      toast.error('Vui lòng chọn vị trí đỗ!');
      return;
    }

    toast.success('Đã chọn vị trí đỗ!');
    // Navigate to payment/booking confirmation
    navigate(`/owner/booking/confirm`, {
      state: {
        lotId,
        zoneId,
        vehicleId,
        spotId: selectedSpot,
        vehicle,
      },
    });
  };

  const availableCount = spots.filter(s => s.status === 'available').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl mb-2 tracking-tight">Chọn vị trí đỗ</h1>
              <p className="text-blue-100 text-sm">{zone.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Vehicle Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Biển số xe</div>
              <div className="text-xl font-bold text-gray-900">{vehicle.licensePlate}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Loại xe</div>
              <div className="text-xl font-bold text-gray-900">{vehicle.type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Giá đỗ</div>
              <div className="text-xl font-bold text-green-600">{vehicle.price}</div>
              <div className="text-sm text-yellow-600">hoặc {vehicle.coinPrice}</div>
            </div>
          </div>
        </div>

        {/* Availability Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{availableCount}</div>
            <div className="text-sm text-gray-600">Còn trống</div>
          </div>
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-600">
              {spots.filter(s => s.status === 'occupied').length}
            </div>
            <div className="text-sm text-gray-600">Đã đỗ</div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {spots.filter(s => s.status === 'reserved').length}
            </div>
            <div className="text-sm text-gray-600">Đã đặt trước</div>
          </div>
        </div>

        {/* Spot Map */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sơ đồ vị trí đỗ</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Còn trống</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700">Đã đỗ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gray-700">Đã đặt trước</span>
              </div>
            </div>
          </div>

          {/* Spots Grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {spots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => spot.status === 'available' && setSelectedSpot(spot.id)}
                disabled={spot.status !== 'available'}
                className={`aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition border-2 ${
                  selectedSpot === spot.id
                    ? 'bg-blue-500 text-white border-blue-700 scale-110 shadow-lg'
                    : spot.status === 'available'
                    ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 hover:scale-105'
                    : spot.status === 'occupied'
                    ? 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed opacity-60'
                    : 'bg-yellow-100 text-yellow-700 border-yellow-300 cursor-not-allowed opacity-60'
                }`}
              >
                {spot.id}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Spot Info */}
        {selectedSpot && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-bold text-gray-900">Đã chọn vị trí: <span className="text-blue-600">{selectedSpot}</span></h4>
                <p className="text-sm text-gray-600">Vui lòng xác nhận để tiếp tục đặt chỗ</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-gray-900 mb-2">💡 Hướng dẫn</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Chọn vị trí còn trống (màu xanh lá)</li>
                <li>✓ Vị trí đỏ đã có xe đỗ, vàng đã được đặt trước</li>
                <li>✓ Sau khi chọn vị trí, bạn sẽ xác nhận và thanh toán</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedSpot}
          className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${
            selectedSpot
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Xác nhận và tiếp tục
        </button>
      </div>
    </div>
  );
};
