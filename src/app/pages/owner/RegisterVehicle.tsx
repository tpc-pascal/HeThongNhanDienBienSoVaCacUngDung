import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Car, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase';


export const RegisterVehicle = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Thông tin chủ xe
    fullName: '',
    phone: '',
    cccd: '',
    driverLicense: '',
    
    // Thông tin xe
    vehicleType: '',
    plateNumber: '',
    brand: '',
    color: '',
    
    // Tài liệu
    cccdImage: null as File | null,
    driverLicenseImage: null as File | null,
    registrationDoc: null as File | null,
  });

  const vehicleTypes = [
    { value: 'car', label: 'Xe ô tô', icon: '🚗' },
    { value: 'motorcycle', label: 'Xe máy', icon: '🏍️' },
  ];

  const handleFileChange = (field: string, file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File quá lớn! Tối đa 5MB');
        return;
      }

      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        toast.error('Chỉ chấp nhận JPG, PNG hoặc PDF');
        return;
      }
    }

    setFormData({ ...formData, [field]: file });
  };

  // ✅ Upload file
  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('PhuongTien')
      .upload(fileName, file);

    if (error) throw error;
    return data.path;
  };

  const handleContinue = async () => {
    // 🔐 Check login
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Bạn cần đăng nhập để đăng ký xe');
      return;
    }

    if (step === 1) {
      if (!formData.fullName || !formData.phone || !formData.cccd) {
        toast.error('Vui lòng nhập đủ thông tin');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.vehicleType || !formData.plateNumber || !formData.brand) {
        toast.error('Thiếu thông tin xe');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.cccdImage || !formData.registrationDoc) {
        toast.error('Thiếu tài liệu');
        return;
      }

      setLoading(true);

      try {
        // Upload file
        const pathCCCD = await uploadFile(formData.cccdImage);
        const pathDKX = await uploadFile(formData.registrationDoc);
        const pathGPLX = formData.driverLicenseImage
          ? await uploadFile(formData.driverLicenseImage)
          : null;

        // Insert DB
        const { error } = await supabase
          .from('phuongtien')
          .insert([
            {
              manguoidung: user.id,
              tenchuphuongtien: formData.fullName,
              sodienthoai: formData.phone,
              socccd: formData.cccd,
              sogplx: formData.driverLicense,
              maloai: formData.vehicleType,
              bienso: formData.plateNumber,
              hangxe: formData.brand,
              mauxe: formData.color,
              anhcccd: pathCCCD,
              anhgplx: pathGPLX,
              anhgiaydangkyxe: pathDKX
            }
          ]);

        if (error) throw error;

        toast.success('Đăng ký thành công!');
        navigate('/owner');

      } catch (error: any) {
        console.error("Supabase Error:", error);

        const message = error?.details
          ? `${error.message} (${error.details})`
          : error?.message || 'Lỗi không xác định';

        toast.error(`Lỗi: ${message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : navigate('/owner'))}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl mb-1">Đăng ký phương tiện</h1>
              <p className="text-blue-100 text-sm">
                Bước {step}/3: {step === 1 ? 'Thông tin chủ xe' : step === 2 ? 'Thông tin xe' : 'Tải lên tài liệu'}
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Thông tin chủ xe */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl text-gray-900">Thông tin chủ xe</h2>
                <p className="text-gray-500 text-sm">Vui lòng cung cấp thông tin chính xác</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0901234567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Số CCCD/CMND <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  placeholder="001234567890"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Số giấy phép lái xe (nếu có)
                </label>
                <input
                  type="text"
                  value={formData.driverLicense}
                  onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                  placeholder="12345678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Lưu ý quan trọng:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Thông tin sẽ được xác thực với cơ sở dữ liệu quốc gia</li>
                      <li>Đảm bảo thông tin chính xác để tránh bị từ chối</li>
                      <li>Dữ liệu được bảo mật theo quy định pháp luật</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Thông tin xe */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl text-gray-900">Thông tin phương tiện</h2>
                <p className="text-gray-500 text-sm">Chi tiết về xe của bạn</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm mb-3 text-gray-700">
                  Loại xe <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {vehicleTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, vehicleType: type.value })}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        formData.vehicleType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <div className="text-sm text-gray-700">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">
                  Biển số xe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="30A-12345"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Hãng xe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Honda, Toyota, Yamaha..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Màu xe
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Đen, Trắng, Xanh..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tải lên tài liệu */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl text-gray-900">Tải lên tài liệu</h2>
                <p className="text-gray-500 text-sm">Ảnh chụp rõ ràng, đầy đủ thông tin</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* CCCD Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-all">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                      formData.cccdImage ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {formData.cccdImage ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : (
                        <Upload className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">
                        Ảnh CCCD/CMND <span className="text-red-500">*</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formData.cccdImage ? formData.cccdImage.name : 'Chụp 2 mặt CCCD/CMND'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange('cccdImage', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Driver License Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-all">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                      formData.driverLicenseImage ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {formData.driverLicenseImage ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : (
                        <Upload className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">Ảnh giấy phép lái xe</h3>
                      <p className="text-sm text-gray-500">
                        {formData.driverLicenseImage ? formData.driverLicenseImage.name : 'Tùy chọn, nếu có'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange('driverLicenseImage', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Registration Doc Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-all">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                      formData.registrationDoc ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {formData.registrationDoc ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : (
                        <Upload className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">
                        Giấy đăng ký xe <span className="text-red-500">*</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formData.registrationDoc ? formData.registrationDoc.name : 'Đăng ký xe chính chủ'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange('registrationDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Yêu cầu về hình ảnh:</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                      <li>Hình ảnh rõ nét, không bị mờ hoặc chói sáng</li>
                      <li>Hiển thị đầy đủ thông tin trên tài liệu</li>
                      <li>Định dạng: JPG, PNG hoặc PDF (tối đa 10MB)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all"
          >
            {loading ? 'Đang xử lý...' : (step === 3 ? '🎉 Hoàn tất đăng ký' : 'Tiếp tục →')}
          </button>
        </div>
      </div>
    </div>
  );
};
