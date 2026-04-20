import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Car, Bike, Clock, DollarSign, Info } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  image: string;
  description: string;
  supportedVehicleTypes: string[];
  priceType: 'fixed' | 'hourly';
  pricing: Array<{
    type: string;
    price: string;
    coinPrice: string;
  }>;
  availableSpots: number;
  totalSpots: number;
}

export const ParkingZoneSelection = () => {
  const navigate = useNavigate();
  const { lotId } = useParams();

  // Mock data - sân/khu của bãi đỗ
  const parkingLot = {
    name: 'Bãi đỗ xe Trung tâm A',
    communityCode: 'PARK-A001',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
  };

  const zones: Zone[] = [
    {
      id: 'zone-a',
      name: 'Sân A - Xe máy',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400',
      description: 'Khu vực đỗ xe máy, gần cổng chính, có mái che',
      supportedVehicleTypes: ['Xe máy', 'Xe đạp điện'],
      priceType: 'fixed',
      pricing: [
        { type: 'Xe máy', price: '5.000đ', coinPrice: '5 xu' },
        { type: 'Xe đạp điện', price: '3.000đ', coinPrice: '3 xu' },
      ],
      availableSpots: 15,
      totalSpots: 30,
    },
    {
      id: 'zone-b',
      name: 'Sân B - Ô tô',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=400',
      description: 'Khu vực đỗ ô tô, có mái che, camera 24/7',
      supportedVehicleTypes: ['Xe ô tô 4 chỗ', 'Xe ô tô 7 chỗ'],
      priceType: 'hourly',
      pricing: [
        { type: 'Xe ô tô 4 chỗ', price: '20.000đ/giờ', coinPrice: '20 xu/giờ' },
        { type: 'Xe ô tô 7 chỗ', price: '25.000đ/giờ', coinPrice: '25 xu/giờ' },
      ],
      availableSpots: 8,
      totalSpots: 20,
    },
    {
      id: 'zone-c',
      name: 'Tầng 2 - VIP',
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400',
      description: 'Khu vực VIP, an ninh cao, wifi miễn phí',
      supportedVehicleTypes: ['Xe ô tô cao cấp', 'Xe thể thao'],
      priceType: 'fixed',
      pricing: [
        { type: 'Xe ô tô cao cấp', price: '50.000đ', coinPrice: '50 xu' },
        { type: 'Xe thể thao', price: '100.000đ', coinPrice: '100 xu' },
      ],
      availableSpots: 3,
      totalSpots: 10,
    },
  ];

  const handleSelectZone = (zoneId: string) => {
    navigate(`/owner/parking/${lotId}/zone/${zoneId}/select-vehicle`);
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
              <h1 className="text-3xl mb-2 tracking-tight">Chọn khu vực đỗ</h1>
              <p className="text-blue-100 text-sm">{parkingLot.name} - {parkingLot.communityCode}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Parking Lot Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <img
              src={parkingLot.image}
              alt={parkingLot.name}
              className="w-24 h-24 object-cover rounded-xl"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{parkingLot.name}</h2>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{parkingLot.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition cursor-pointer"
              onClick={() => handleSelectZone(zone.id)}
            >
              {/* Zone Image */}
              <div className="relative h-48">
                <img
                  src={zone.image}
                  alt={zone.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-bold">
                  {zone.priceType === 'fixed' ? '💰 Giá cố định' : '⏱️ Theo giờ'}
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    zone.availableSpots > 5 ? 'bg-green-500' : 'bg-orange-500'
                  } text-white`}>
                    {zone.availableSpots}/{zone.totalSpots} chỗ trống
                  </div>
                </div>
              </div>

              {/* Zone Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{zone.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{zone.description}</p>

                {/* Supported Vehicles */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Loại xe hỗ trợ:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {zone.supportedVehicleTypes.map((type) => (
                      <span
                        key={type}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  {zone.pricing.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{item.type}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{item.price}</div>
                        <div className="text-xs text-yellow-600">hoặc {item.coinPrice}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Select Button */}
                <button
                  onClick={() => handleSelectZone(zone.id)}
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
                >
                  Chọn khu vực này
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-gray-900 mb-2">💡 Hướng dẫn</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Chọn khu vực phù hợp với loại xe của bạn</li>
                <li>✓ Kiểm tra số chỗ trống trước khi chọn</li>
                <li>✓ Sau khi chọn khu vực, bạn sẽ chọn loại xe và vị trí đỗ cụ thể</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
