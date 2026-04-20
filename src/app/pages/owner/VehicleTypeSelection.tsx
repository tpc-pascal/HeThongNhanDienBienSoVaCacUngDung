import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Car, Bike, DollarSign, Coins, Info } from 'lucide-react';

interface Vehicle {
  id: string;
  type: string;
  licensePlate: string;
  brand: string;
  model: string;
}

export const VehicleTypeSelection = () => {
  const navigate = useNavigate();
  const { lotId, zoneId } = useParams();
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  // Mock data - xe của user
  const myVehicles: Vehicle[] = [
    {
      id: 'v1',
      type: 'Xe máy',
      licensePlate: '59A-12345',
      brand: 'Honda',
      model: 'Wave RSX',
    },
    {
      id: 'v2',
      type: 'Xe ô tô 4 chỗ',
      licensePlate: '51G-67890',
      brand: 'Toyota',
      model: 'Vios',
    },
  ];

  // Mock zone info
  const zone = {
    name: 'Sân A - Xe máy',
    supportedVehicleTypes: ['Xe máy', 'Xe đạp điện'],
    priceType: 'fixed' as const,
    pricing: [
      { type: 'Xe máy', price: '5.000đ', coinPrice: '5 xu' },
      { type: 'Xe đạp điện', price: '3.000đ', coinPrice: '3 xu' },
    ],
  };

  // Lọc xe phù hợp với khu vực
  const compatibleVehicles = myVehicles.filter((v) =>
    zone.supportedVehicleTypes.includes(v.type)
  );

  const handleContinue = () => {
    if (!selectedVehicle) {
      return;
    }
    navigate(`/owner/parking/${lotId}/zone/${zoneId}/vehicle/${selectedVehicle}/select-spot`);
  };

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
              <h1 className="text-3xl mb-2 tracking-tight">Chọn loại xe</h1>
              <p className="text-blue-100 text-sm">{zone.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Zone Pricing Info */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-6 h-6 text-yellow-600" />
            <h3 className="font-bold text-gray-900 text-lg">Bảng giá khu vực này</h3>
          </div>
          <div className="space-y-2">
            {zone.pricing.map((item) => (
              <div key={item.type} className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.type.includes('máy') ? (
                    <Bike className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Car className="w-6 h-6 text-blue-600" />
                  )}
                  <span className="font-semibold text-gray-900">{item.type}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{item.price}</div>
                  <div className="text-sm text-yellow-600 flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    hoặc {item.coinPrice}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Chọn xe của bạn</h2>

          {compatibleVehicles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Không có xe phù hợp</h3>
              <p className="text-gray-600 mb-6">
                Bạn chưa đăng ký loại xe phù hợp với khu vực này.
              </p>
              <button
                onClick={() => navigate('/owner/register-vehicle')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition"
              >
                Đăng ký xe mới
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {compatibleVehicles.map((vehicle) => (
                <label
                  key={vehicle.id}
                  className={`block border-2 rounded-xl p-6 cursor-pointer transition ${
                    selectedVehicle === vehicle.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="vehicle"
                      value={vehicle.id}
                      checked={selectedVehicle === vehicle.id}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {vehicle.type.includes('máy') ? (
                          <Bike className="w-8 h-8 text-blue-600" />
                        ) : (
                          <Car className="w-8 h-8 text-blue-600" />
                        )}
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{vehicle.licensePlate}</div>
                          <div className="text-sm text-gray-600">
                            {vehicle.brand} {vehicle.model} - {vehicle.type}
                          </div>
                        </div>
                      </div>
                      {selectedVehicle === vehicle.id && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-sm text-gray-700">
                            Giá đỗ: <span className="font-bold text-blue-700">
                              {zone.pricing.find(p => p.type === vehicle.type)?.price}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-gray-900 mb-2">💡 Lưu ý</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Chỉ hiển thị xe phù hợp với khu vực này</li>
                <li>✓ Giá đỗ tùy thuộc vào loại xe bạn chọn</li>
                <li>✓ Sau khi chọn xe, bạn sẽ chọn vị trí đỗ cụ thể</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        {compatibleVehicles.length > 0 && (
          <button
            onClick={handleContinue}
            disabled={!selectedVehicle}
            className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${
              selectedVehicle
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Tiếp tục chọn vị trí đỗ
          </button>
        )}
      </div>
    </div>
  );
};
