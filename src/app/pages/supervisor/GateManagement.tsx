import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, X, DollarSign, MapPin, Upload, Users,
  Clock, AlertCircle, Video, Coins, BadgeCheck
} from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback.tsx';
import { toast } from 'sonner';
import { processLicensePlate } from '../../service/lprService.ts';
import { supabase } from '../../utils/supabase.ts';

interface ScannedVehicle {
  plateNumber: string;
  plateImage: string;
  driverImage: string;
  possibleOwners?: Array<{
    id: string;
    name: string;
    phone: string;
    lastUsed: Date;
  }>;
}
interface ParkingSpotView {
  mavitri: string;
  tenvitri: string;
  makhuvuc: string;
  tenkhuvuc: string;
  mabanggia: string | null;
  loaixe: string;
  kieuxe: 'car' | 'motorcycle' | string | null;
  thanhtien: number | string | null;
  trangthai: number | string | null; // 0 = trống, 1 = đã đỗ, 2 = đặt trước
}

interface PreBookingRow {
  mabang: string;
  manguoidung: string | null;
  mabaido: string | null;
  makhuvuc: string | null;
  mavitri: string | null;
  loaithanhtoan: string | null;
  thanhtien: number | string | null;
  ngayhethan: string | null;
  trangthai: string | null;
  maphuongtien: string | null;
  mathanhtoan: string | null;
}

type VehicleKind = 'car' | 'motorcycle' | 'other';

const normalizeStatus = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const normalizePlate = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');

const getSpotStatus = (value: unknown): 0 | 1 | 2 => {
  const n = Number(value);
  return n === 0 || n === 1 || n === 2 ? n : 0;
};

const getSpotStyle = (status: unknown) => {
  const s = getSpotStatus(status);
if (s === 0) return 'border-green-600 bg-green-50'; // trống
if (s === 2) return 'border-yellow-500 bg-yellow-50'; // đã đặt
if (s === 1) return 'border-red-600 bg-red-50'; // đã đỗ
  return 'border-gray-300 bg-white';
};

const getSpotLabel = (status: unknown) => {
  const s = getSpotStatus(status);
if (s === 0) return 'Trống';
if (s === 2) return 'Đã đặt';
if (s === 1) return 'Đã đỗ';
  return 'Không rõ';
};

export const GateManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'entry';

  const plateInputRef = useRef<HTMLInputElement>(null);
  const driverInputRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedVehicle | null>(null);
 
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'coins'>('cash');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [parkingDuration, setParkingDuration] = useState({ hours: 3, minutes: 30 });
 const [currentUserId, setCurrentUserId] = useState('');
const [currentLotId, setCurrentLotId] = useState('');
const [loadingData, setLoadingData] = useState(true);
const [savingEntry, setSavingEntry] = useState(false);

const [plateFile, setPlateFile] = useState<File | null>(null);
const [driverFile, setDriverFile] = useState<File | null>(null);

const [parkingSpots, setParkingSpots] = useState<ParkingSpotView[]>([]);
const [selectedSpot, setSelectedSpot] = useState('');
const [selectedZone, setSelectedZone] = useState('all');

const [onlyReservedSpots, setOnlyReservedSpots] = useState(false);
const [selectedVehicleKinds, setSelectedVehicleKinds] = useState<string[]>([]);
const [reservationCode, setReservationCode] = useState('');
const [selectedSpotStatus, setSelectedSpotStatus] = useState<number | null>(null);


const zoneOptions = useMemo(() => {
  const map = new Map<string, string>();
  parkingSpots.forEach((spot) => {
    if (spot.makhuvuc && !map.has(spot.makhuvuc)) {
      map.set(spot.makhuvuc, spot.tenkhuvuc);
    }
  });
  return Array.from(map.entries()).map(([makhuvuc, tenkhuvuc]) => ({
    makhuvuc,
    tenkhuvuc,
  }));
}, [parkingSpots]);

const vehicleKindOptions = useMemo(() => {
  const set = new Set<string>();
  parkingSpots.forEach((spot) => {
    if (spot.loaixe) set.add(spot.loaixe);
  });
  return Array.from(set);
}, [parkingSpots]);

const filteredSpots = useMemo(() => {
  return parkingSpots.filter((spot) => {
    const matchZone = selectedZone === 'all' || spot.makhuvuc === selectedZone;
    const matchVehicle =
      selectedVehicleKinds.length === 0 ||
      selectedVehicleKinds.includes(spot.loaixe);
    const matchReserved =
      !onlyReservedSpots || getSpotStatus(spot.trangthai) === 2;

    return matchZone && matchVehicle && matchReserved;
  });
}, [parkingSpots, selectedZone, selectedVehicleKinds, onlyReservedSpots]);

const toggleVehicleKind = (kind: string) => {
  setSelectedVehicleKinds((prev) =>
    prev.includes(kind) ? prev.filter((x) => x !== kind) : [...prev, kind]
  );
};

const getVehicleKindLabel = (kieuxe: string | null | undefined) => {
  if (kieuxe === 'car') return 'Ô tô';
  if (kieuxe === 'motorcycle') return 'Xe máy';
  return 'Khác';
};
const loadEntryData = async () => {
  setLoadingData(true);
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('AUTH ERROR:', authError);
      toast.error('Không xác thực được phiên đăng nhập');
      navigate('/login');
      return;
    }

    const user = authData.user;
    if (!user) {
      toast.error('Bạn chưa đăng nhập');
      navigate('/login');
      return;
    }

    setCurrentUserId(user.id);

    const { data: staffRow, error: staffError } = await supabase
      .from('ctnhanvien')
      .select('mabaido, hoten')
      .eq('manguoidung', user.id)
      .maybeSingle();

    if (staffError) {
      console.error('LOAD CTNHANVIEN ERROR:', staffError);
      toast.error('Lỗi tải thông tin nhân viên');
      return;
    }

    if (!staffRow?.mabaido) {
      toast.error('Nhân viên này chưa được gán bãi đỗ');
      return;
    }

    const lotId = staffRow.mabaido;
setCurrentLotId(lotId);

    const [{ data: lotRow, error: lotError }, { data: zoneRows, error: zoneError }, { data: priceRows, error: priceError }] =
      await Promise.all([
        supabase
          .from('baido')
          .select('mabaido, tenbaido, mathamgia, diachi')
          .eq('mabaido', lotId)
          .maybeSingle(),

        supabase
          .from('khuvudo')
          .select('makhuvuc, tenkhuvuc, mabaido')
          .eq('mabaido', lotId),

        supabase
  .from('banggia')
  .select('mabanggia, loaixe, kieuxe, thanhtien, thanhtoanxuao, mabaido')
  .eq('mabaido', lotId),
      ]);

    if (lotError) console.error('LOAD BAIDO ERROR:', lotError);
    if (zoneError) console.error('LOAD KHUVUDO ERROR:', zoneError);
    if (priceError) console.error('LOAD BANGGIA ERROR:', priceError);

    const zoneMap = new Map(
      (zoneRows ?? []).map((zone) => [zone.makhuvuc, zone])
    );

    const priceMap = new Map(
      (priceRows ?? []).map((price) => [price.mabanggia, price])
    );

    const { data: spotRows, error: spotError } = await supabase
      .from('vitrido')
      .select('mavitri, tenvitri, trangthai, makhuvuc, mabanggia')
      .in(
        'makhuvuc',
        (zoneRows ?? []).map((z) => z.makhuvuc)
      )
      .order('tenvitri', { ascending: true });

    if (spotError) {
      console.error('LOAD VITRIDO ERROR:', spotError);
      toast.error('Lỗi tải danh sách vị trí đỗ');
      return;
    }

 const mappedSpots: ParkingSpotView[] = (spotRows ?? []).map((spot) => {
  const zone = zoneMap.get(spot.makhuvuc);
  const price = spot.mabanggia ? priceMap.get(spot.mabanggia) : null;

  return {
    mavitri: spot.mavitri,
    tenvitri: spot.tenvitri,
    makhuvuc: spot.makhuvuc,
    tenkhuvuc: zone?.tenkhuvuc || 'Khu vực',
    mabanggia: spot.mabanggia || null,
    loaixe: price?.loaixe || 'Chưa có loại xe',
    kieuxe: price?.kieuxe || null,
    thanhtien: price?.thanhtien ?? null,
    trangthai: spot.trangthai ?? null,
  };
});

    setParkingSpots(mappedSpots);
  } finally {
    setLoadingData(false);
  }
};
useEffect(() => {
  void loadEntryData();
}, []);
  // Handle image selection from device
const handlePlateImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setPlateFile(file);

  const reader = new FileReader();
  reader.onloadend = async () => {
    const previewImage = reader.result as string;
    setScanning(true);
    try {
      const plateNumber = await processLicensePlate(file);
      setScannedData({
        plateNumber,
        plateImage: previewImage,
        driverImage: '',
      });
      toast.success('Đã nhận diện biển số thành công!');
    } catch (error) {
      console.error('Lỗi nhận diện biển số:', error);
      toast.error('Lỗi khi gọi API nhận diện biển số. Vui lòng thử lại.');
    } finally {
      setScanning(false);
    }
  };
  reader.readAsDataURL(file);
};

const handleDriverImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setDriverFile(file);

  const reader = new FileReader();
  reader.onloadend = () => {
    if (scannedData) {
      setScannedData({
        ...scannedData,
        driverImage: reader.result as string,
      });
      toast.success('Đã chụp ảnh người lái!');
    }
  };
  reader.readAsDataURL(file);
};
const uploadVehicleImage = async (file: File, folder: string) => {
  if (!currentUserId) {
    throw new Error('Chưa có mã người dùng để upload');
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${folder}/${currentUserId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('PhuongTien').upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('PhuongTien').getPublicUrl(filePath);
  return {
    filePath,
    publicUrl: data.publicUrl,
  };
};
const handleConfirmEntry = async () => {
  if (!scannedData) {
    
    toast.error('Vui lòng quét biển số xe');
    return;
  }

  if (!plateFile) {
    toast.error('Vui lòng chọn ảnh biển số');
    return;
  }

  if (!driverFile) {
    toast.error('Vui lòng chụp ảnh người lái');
    return;
  }

  if (!selectedSpot) {
    toast.error('Vui lòng chọn vị trí đỗ');
    return;
  }

  const spot = parkingSpots.find((item) => item.mavitri === selectedSpot);
  if (!spot) {
    toast.error('Không tìm thấy vị trí đã chọn');
    return;
  }

  const spotStatus = getSpotStatus(spot.trangthai);
  const code = reservationCode.trim().toUpperCase();

  if (spotStatus === 1) {
    toast.error('Vị trí này đã có xe');
    return;
  }

  if (spotStatus === 2 && !/^[A-Z0-9]{8}$/.test(code)) {
    toast.error('Mã phải gồm 8 ký tự (chữ in hoa + số)');
    return;
  }

  let matchedBooking: PreBookingRow | null = null;

  if (spotStatus === 2) {
    if (!currentLotId) {
      toast.error('Chưa xác định được bãi đỗ');
      return;
    }

    const { data: bookingRow, error: bookingError } = await supabase
      .from('bangdatchotruoc')
      .select(
        'mabang, manguoidung, mabaido, makhuvuc, mavitri, loaithanhtoan, thanhtien, ngayhethan, trangthai, maphuongtien, mathanhtoan'
      )
      .eq('mathanhtoan', code)
      .eq('mabaido', currentLotId)
      .maybeSingle();

    if (bookingError) {
      console.error('LOAD BANGDATCHOTRUOC ERROR:', bookingError);
      toast.error('Lỗi khi kiểm tra mã đặt chỗ');
      return;
    }

    if (!bookingRow) {
      toast.error('Không tìm thấy mã đặt chỗ');
      return;
    }

    const booking = bookingRow as PreBookingRow;
    const bookingStatus = normalizeStatus(booking.trangthai);

    if (booking.ngayhethan && new Date(booking.ngayhethan) < new Date()) {
      toast.error('Mã này đã hết hạn');
      return;
    }

    if (bookingStatus === 'hết hạn') {
      toast.error('Mã này đã hết hạn');
      return;
    }

    if (bookingStatus === 'hoàn thành' || bookingStatus === 'đã nhận chỗ') {
      toast.error('Mã đã được sử dụng');
      return;
    }

    if (bookingStatus !== 'đã đặt chỗ') {
      toast.error('Mã không ở trạng thái đã đặt chỗ');
      return;
    }

if (booking.mavitri !== selectedSpot) {
  toast.error('Mã này không khớp với vị trí đang chọn');
  return;
}

if (!booking.maphuongtien) {
  toast.error('Mã đặt chỗ chưa gắn phương tiện');
  return;
}

const { data: vehicleRow, error: vehicleError } = await supabase
  .from('phuongtien')
  .select('id, bienso')
  .eq('id', booking.maphuongtien)
  .maybeSingle();

if (vehicleError) {
  console.error('LOAD PHUONGTIEN ERROR:', vehicleError);
  toast.error('Lỗi khi kiểm tra phương tiện đặt chỗ');
  return;
}

if (!vehicleRow?.bienso) {
  toast.error('Không tìm thấy biển số của phương tiện đặt chỗ');
  return;
}

const scannedPlate = normalizePlate(scannedData.plateNumber);
const bookedPlate = normalizePlate(vehicleRow.bienso);

if (scannedPlate !== bookedPlate) {
  toast.error('Biển số không khớp với phương tiện đã đặt chỗ');
  return;
}

matchedBooking = booking;
  }

  setSavingEntry(true);
  try {
    const [plateUpload, driverUpload] = await Promise.all([
      uploadVehicleImage(plateFile, 'biensovao'),
      uploadVehicleImage(driverFile, 'nguoivao'),
    ]);

    const { error: insertError } = await supabase.from('lichsuxevao').insert({
      bienso: scannedData.plateNumber.trim().toUpperCase(),
      thoigianvao: new Date().toISOString(),
      mavitri: selectedSpot,
      anhbiensovao: plateUpload.publicUrl,
      anhnguoivao: driverUpload.publicUrl,
    });

    if (insertError) {
      console.error('INSERT LICHSUXEVAO ERROR:', insertError);
      toast.error('Không thể lưu lịch sử xe vào');
      return;
    }

    const { error: updateSpotError } = await supabase
      .from('vitrido')
      .update({ trangthai: 1 })
      .eq('mavitri', selectedSpot)
      .eq('trangthai', spotStatus === 2 ? 2 : 0);

    if (updateSpotError) {
      console.error('UPDATE VITRIDO ERROR:', updateSpotError);
      toast.error('Đã lưu xe vào nhưng không cập nhật được trạng thái vị trí');
      return;
    }

    if (matchedBooking) {
      const { error: updateBookingError } = await supabase
        .from('bangdatchotruoc')
        .update({ trangthai: 'đã nhận chỗ' })
        .eq('mabang', matchedBooking.mabang);

      if (updateBookingError) {
        console.error('UPDATE BANGDATCHOTRUOC ERROR:', updateBookingError);
        toast.error('Đã lưu xe vào nhưng không cập nhật được trạng thái đặt chỗ');
        return;
      }
    }

    toast.success(`✅ Đã cho xe ${scannedData.plateNumber} vào bãi`);

    setScannedData(null);
    setSelectedSpot('');
    setSelectedSpotStatus(null);
    setSelectedOwner('');
    setPlateFile(null);
    setDriverFile(null);
    setReservationCode('');

    await loadEntryData();
  } catch (error) {
    console.error('CONFIRM ENTRY ERROR:', error);
    toast.error('Lỗi khi lưu xe vào bãi');
  } finally {
    setSavingEntry(false);
  }
};

  const handleConfirmExit = () => {
    if (!scannedData) {
      toast.error('Vui lòng quét biển số xe');
      return;
    }
    if (!scannedData.driverImage) {
      toast.error('Vui lòng chụp ảnh người lái');
      return;
    }

    toast.success(`✅ Đã cho phép xe ${scannedData.plateNumber} ra bãi`, { duration: 3000 });
    // Reset form
    setScannedData(null);
    setPaymentMethod('cash');
  };

  const calculateAmount = () => {
    const pricePerHour = 20000; // 20k/hour for car
    return parkingDuration.hours * pricePerHour + Math.floor((parkingDuration.minutes / 60) * pricePerHour);
  };

  const renderEntryGate = () => (
    <div className="space-y-6">
      {/* Camera View - Upload Image */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Camera className="w-6 h-6 text-green-600" />
          Camera cổng vào - Nhận diện biển số
        </h3>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden border-4 border-green-500">
          {scannedData?.plateImage ? (
            <img src={scannedData.plateImage} alt="Scanned Plate" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Camera trực tiếp - Cổng vào</p>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/30 backdrop-blur-sm">
              <div className="text-white text-2xl animate-pulse font-bold">
                🔍 Đang nhận diện biển số...
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            ref={plateInputRef}
            type="file"
            accept="image/*"
            onChange={handlePlateImageSelect}
            className="hidden"
          />
          <button
            onClick={() => plateInputRef.current?.click()}
            disabled={scanning}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            <Upload className="w-5 h-5" />
            {scanning ? 'Đang xử lý...' : 'Chọn ảnh biển số'}
          </button>

          <input
            ref={driverInputRef}
            type="file"
            accept="image/*"
            onChange={handleDriverImageSelect}
            className="hidden"
          />
          <button
            onClick={() => driverInputRef.current?.click()}
            disabled={!scannedData}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            <Camera className="w-5 h-5" />
            Chụp ảnh người lái
          </button>
        </div>
      </div>

      {/* Duplicate Owner Selection */}
      {scannedData?.possibleOwners && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg p-6 border-2 border-orange-300">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                ⚠️ Phát hiện trùng biển số!
              </h3>
              <p className="text-sm text-gray-600">
                Có {scannedData.possibleOwners.length} Người dùng cùng biển số này. Vui lòng chọn Người dùng đúng dựa trên thông tin người vào bãi.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {scannedData.possibleOwners.map((owner) => (
              <button
                key={owner.id}
                onClick={() => setSelectedOwner(owner.id)}
                className={`w-full p-4 rounded-xl border-2 transition text-left ${
                  selectedOwner === owner.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {owner.name}
                      {selectedOwner === owner.id && (
                        <BadgeCheck className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">SĐT: {owner.phone}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Sử dụng gần nhất: {owner.lastUsed.toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scanned Info */}
      {scannedData && (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin xe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Biển số đã nhận diện (có thể chỉnh sửa)
                </label>
                <input
                  type="text"
                  value={scannedData.plateNumber}
                  onChange={(e) =>
                    setScannedData({ ...scannedData, plateNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-xl font-bold text-center"
                  placeholder="Chỉnh sửa nếu sai"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  {scannedData.plateImage ? (
                    <img
                      src={scannedData.plateImage}
                      alt="Plate"
                      className="w-full h-40 object-cover rounded-xl border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    📷 Biển số xe
                  </div>
                </div>
                <div className="relative">
                  {scannedData.driverImage ? (
                    <img
                      src={scannedData.driverImage}
                      alt="Driver"
                      className="w-full h-40 object-cover rounded-xl border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    👤 Người lái xe
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Parking Spot Selection */}
{/* Parking Spot Selection */}
<div className="bg-white rounded-2xl shadow-lg p-6">
  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    <MapPin className="w-6 h-6 text-blue-600" />
    Chọn khu vực và vị trí đỗ
  </h3>

<div className="mb-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-2">
      Lọc theo khu vực
    </label>
    <select
      value={selectedZone}
      onChange={(e) => {
        setSelectedZone(e.target.value);
        setSelectedSpot('');
        setSelectedSpotStatus(null);
        setReservationCode('');
      }}
      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="all">Tất cả khu vực</option>
      {zoneOptions.map((zone) => (
        <option key={zone.makhuvuc} value={zone.makhuvuc}>
          {zone.tenkhuvuc}
        </option>
      ))}
    </select>
  </div>

  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
    <div className="font-semibold mb-1">Chú thích</div>
    <div>Trạng thái vị trí: <b>0</b> = trống, <b>1</b> = đã đỗ, <b>2</b> = đặt trước.</div>
<div>Chỉ khi bấm vào vị trí trạng thái <b>2</b> mới hiện ô nhập mã.</div>
  </div>
</div>

<div className="mb-5 rounded-xl bg-white border border-gray-200 p-4">
  <div className="text-sm font-semibold text-gray-700 mb-3">Lọc theo loại xe trong bảng giá</div>
  <div className="flex flex-wrap gap-3">
    {vehicleKindOptions.length === 0 ? (
      <span className="text-sm text-gray-500">Chưa có dữ liệu loại xe</span>
    ) : (
      vehicleKindOptions.map((kind) => (
        <label
          key={kind}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selectedVehicleKinds.includes(kind)}
            onChange={() => toggleVehicleKind(kind)}
          />
          <span className="text-sm font-medium text-gray-700">{kind}</span>
        </label>
      ))
    )}
    {selectedVehicleKinds.length > 0 && (
      <button
        type="button"
        onClick={() => setSelectedVehicleKinds([])}
        className="text-sm font-semibold text-blue-600 hover:underline"
      >
        Bỏ lọc
      </button>
    )}
  </div>

  <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
    <input
      type="checkbox"
      checked={onlyReservedSpots}
      onChange={(e) => setOnlyReservedSpots(e.target.checked)}
    />
    Chỉ hiện vị trí trạng thái 2
  </label>
</div>
{selectedSpotStatus === 2 && (
  <div className="mb-5">
    <label className="block text-sm font-medium text-gray-600 mb-2">
      Mã thanh toán
    </label>
    <input
      type="text"
      value={reservationCode}
      onChange={(e) =>
        setReservationCode(
          e.target.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 8)
        )
      }
      placeholder="VD: AB12CD34"
      className="w-full px-4 py-3 border-2 border-yellow-500 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500"
    />
  </div>
)}
  {filteredSpots.length === 0 ? (
    <div className="text-sm text-gray-500 text-center py-8">
      Không có vị trí nào trong khu vực này
    </div>
  ) : (
    <div className="space-y-6">
      {(['car', 'motorcycle', 'other'] as VehicleKind[]).map((kind) => {
        const items = filteredSpots.filter((spot) => {
          if (kind === 'car') return spot.kieuxe === 'car';
          if (kind === 'motorcycle') return spot.kieuxe === 'motorcycle';
          return !spot.kieuxe || (spot.kieuxe !== 'car' && spot.kieuxe !== 'motorcycle');
        });

        if (items.length === 0) return null;

        return (
          <div key={kind} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">
                {kind === 'car' ? 'Ô tô' : kind === 'motorcycle' ? 'Xe máy' : 'Khác'}
              </h4>
              <span className="text-xs text-gray-500">{items.length} vị trí</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((spot) => (
<button
  key={spot.mavitri}
  onClick={() => {
    const status = getSpotStatus(spot.trangthai);

    if (status === 1) {
      toast.error('Vị trí này đã có xe');
      return;
    }

    setSelectedSpot(spot.mavitri);
    setSelectedSpotStatus(status);

    if (status !== 2) {
      setReservationCode('');
    }
  }}
  className={`p-4 rounded-xl border-2 transition text-left shadow-sm ${getSpotStyle(spot.trangthai)} ${
    selectedSpot === spot.mavitri ? 'ring-2 ring-offset-2 ring-blue-500' : ''
  }`}
>
                  <div className="text-lg font-bold text-gray-900">{spot.tenvitri}</div>
                  <div className="text-xs text-gray-500 mt-1">{spot.tenkhuvuc}</div>

<div className="mt-2 text-xs font-semibold">
  {getSpotStatus(spot.trangthai) === 0 && (
    <span className="text-green-700">● Trống</span>
  )}
 {getSpotStatus(spot.trangthai) === 1 && (
  <span className="text-red-700">● Đã đỗ</span>
)}
{getSpotStatus(spot.trangthai) === 2 && (
  <span className="text-yellow-700">● Đặt trước</span>
)}
</div>

                  <div className="text-xs text-gray-600 mt-2">
                    Kiểu xe: <span className="font-semibold">
                      {spot.kieuxe === 'car'
                        ? 'Ô tô'
                        : spot.kieuxe === 'motorcycle'
                        ? 'Xe máy'
                        : 'Khác'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    Loại xe: <span className="font-semibold">{spot.loaixe}</span>
                  </div>

                  {spot.thanhtien !== null && (
                    <div className="text-xs text-gray-600 mt-1">
                      Giá: <span className="font-semibold">{String(spot.thanhtien)}</span>
                    </div>
                  )}

                  {selectedSpot === spot.mavitri && (
                    <div className="mt-2">
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
       onClick={() => {
  setScannedData(null);
  setSelectedSpot('');
  setSelectedSpotStatus(null);
  setSelectedOwner('');
  setPlateFile(null);
  setDriverFile(null);
  setReservationCode('');
}}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-5 rounded-xl hover:from-red-700 hover:to-pink-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg"
            >
              <X className="w-6 h-6" />
              Từ chối
            </button>
           <button
  onClick={() => void handleConfirmEntry()}
  disabled={savingEntry}
  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-xl hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-60"
>
  <Check className="w-6 h-6" />
  {savingEntry ? 'Đang lưu...' : 'Xác nhận vào'}
</button>
          </div>
        </>
      )}
    </div>
  );

  const renderExitGate = () => (
    <div className="space-y-6">
      {/* Camera View - Upload Image */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Camera className="w-6 h-6 text-blue-600" />
          Camera cổng ra - Nhận diện biển số
        </h3>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden border-4 border-blue-500">
          {scannedData?.plateImage ? (
            <img src={scannedData.plateImage} alt="Scanned Plate" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Camera trực tiếp - Cổng ra</p>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-600/30 backdrop-blur-sm">
              <div className="text-white text-2xl animate-pulse font-bold">
                🔍 Đang nhận diện biển số...
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            ref={plateInputRef}
            type="file"
            accept="image/*"
            onChange={handlePlateImageSelect}
            className="hidden"
          />
          <button
            onClick={() => plateInputRef.current?.click()}
            disabled={scanning}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            <Upload className="w-5 h-5" />
            {scanning ? 'Đang xử lý...' : 'Chọn ảnh biển số'}
          </button>

          <input
            ref={driverInputRef}
            type="file"
            accept="image/*"
            onChange={handleDriverImageSelect}
            className="hidden"
          />
          <button
            onClick={() => driverInputRef.current?.click()}
            disabled={!scannedData}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            <Camera className="w-5 h-5" />
            Chụp ảnh người lái
          </button>
        </div>
      </div>

      {/* Scanned Info */}
      {scannedData && (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin xe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Biển số</label>
                <input
                  type="text"
                  value={scannedData.plateNumber}
                  onChange={(e) =>
                    setScannedData({ ...scannedData, plateNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xl font-bold text-center"
                />
              </div>

              {/* Time and duration info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-blue-600 font-medium mb-1">Giờ vào</div>
                  <div className="text-gray-900 font-bold text-lg">08:30 AM</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-purple-600 font-medium mb-1">Thời gian đỗ</div>
                  <div className="text-gray-900 font-bold text-lg">
                    {parkingDuration.hours}h {parkingDuration.minutes}p
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-green-600 font-medium mb-1">Vị trí</div>
                  <div className="text-gray-900 font-bold text-lg">A015</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-orange-300">
                  <div className="text-orange-600 font-bold mb-1">💰 Tổng tiền</div>
                  <div className="text-orange-700 font-bold text-2xl">
                    {calculateAmount().toLocaleString()}đ
                  </div>
                </div>
              </div>

              {/* Comparison images: Entry vs Exit */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">So sánh ảnh vào - ra</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1774576670116-a21417528d54?w=200"
                      alt="Entry Plate"
                      className="w-full h-32 object-cover rounded-xl border-2 border-green-300"
                    />
                    <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ Vào - Biển
                    </div>
                  </div>
                  <div className="relative">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200"
                      alt="Entry Driver"
                      className="w-full h-32 object-cover rounded-xl border-2 border-green-300"
                    />
                    <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ Vào - Lái
                    </div>
                  </div>
                  <div className="relative">
                    {scannedData.plateImage ? (
                      <img
                        src={scannedData.plateImage}
                        alt="Exit Plate"
                        className="w-full h-32 object-cover rounded-xl border-2 border-blue-300"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-xl" />
                    )}
                    <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      → Ra - Biển
                    </div>
                  </div>
                  <div className="relative">
                    {scannedData.driverImage ? (
                      <img
                        src={scannedData.driverImage}
                        alt="Exit Driver"
                        className="w-full h-32 object-cover rounded-xl border-2 border-blue-300"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-xl" />
                    )}
                    <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      → Ra - Lái
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-5 rounded-xl border-2 transition ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-300 hover:border-green-300 bg-white'
                }`}
              >
                <div className="text-4xl mb-2">💵</div>
                <div className="font-semibold">Tiền mặt</div>
              </button>
              <button
                onClick={() => setPaymentMethod('online')}
                className={`p-5 rounded-xl border-2 transition ${
                  paymentMethod === 'online'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="text-4xl mb-2">🏦</div>
                <div className="font-semibold">Chuyển khoản</div>
              </button>
              <button
                onClick={() => setPaymentMethod('coins')}
                className={`p-5 rounded-xl border-2 transition ${
                  paymentMethod === 'coins'
                    ? 'border-yellow-500 bg-yellow-50 shadow-md'
                    : 'border-gray-300 hover:border-yellow-300 bg-white'
                }`}
              >
                <div className="text-4xl mb-2">
                  <Coins className="w-10 h-10 text-yellow-600 mx-auto" />
                </div>
                <div className="font-semibold">Xu ảo</div>
              </button>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-5 rounded-xl text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 text-xl font-bold">
                <Check className="w-6 h-6" />
                Đã xác nhận thanh toán
              </div>
              <div className="text-sm mt-2 text-green-100">
                {paymentMethod === 'cash'
                  ? '💵 Tiền mặt'
                  : paymentMethod === 'online'
                  ? '🏦 Chuyển khoản'
                  : `🪙 ${(calculateAmount() / 1000).toLocaleString()} xu ảo`}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setScannedData(null)}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-5 rounded-xl hover:from-red-700 hover:to-pink-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg"
            >
              <X className="w-6 h-6" />
              Hủy
            </button>
            <button
              onClick={handleConfirmExit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg"
            >
              <Check className="w-6 h-6" />
              Cho ra bãi
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderBothGates = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Cổng vào
          </h3>
        </div>
        {renderEntryGate()}
      </div>
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Cổng ra
          </h3>
        </div>
        {renderExitGate()}
      </div>
    </div>
  );
  if (loadingData) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center gap-3">
        <div className="w-5 h-5 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-700">Đang tải dữ liệu bãi đỗ...</span>
      </div>
    </div>
  );
}

  return ( 
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/supervisor')}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl mb-1 tracking-tight">
                
                {mode === 'entry' ? '🚗 Cổng vào' : mode === 'exit' ? '🚙 Cổng ra' : '🚗🚙 Cả hai cổng'}
              </h1>
              <p className="text-green-100 text-sm">Quản lý phương tiện ra vào bãi</p>
            </div>
            <div className="ml-auto">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {mode === 'entry' && renderEntryGate()}
        {mode === 'exit' && renderExitGate()}
        {mode === 'both' && renderBothGates()}
      </div>
    </div>
  );
};
