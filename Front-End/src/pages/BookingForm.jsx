import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, UploadCloud, FileText } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';

export default function BookingForm() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { field, selectedSlot } = location.state || {};

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFinish = async () => {
    if (!field || !selectedSlot) return;

    const user = getCurrentUser();
    if (!user) {
      showNotif('Silakan login terlebih dahulu', 'error');
      setTimeout(() => navigate('/login'), 900);
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        field_id: field.id,
        booking_date: today,
        time_slot: selectedSlot,
        total_price: field.price,
        payment_proof: file?.name || null
      };

      const { ok, data } = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (ok && data.success) {
        showNotif('Pembayaran berhasil diunggah! Menunggu konfirmasi admin.');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        showNotif(data?.errors?.[0]?.message || data?.message || 'Gagal membuat pesanan', 'error');
      }
    } catch {
      showNotif('Terjadi kesalahan menghubungi server', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!field) return <div className="text-center py-20">Data pemesanan tidak valid. Silakan kembali ke halaman lapangan.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Notification message={notif.msg} type={notif.type} isVisible={notif.show} onClose={() => setNotif({ show: false, msg: '', type: 'success' })} />

      <div className="flex justify-between items-center mb-12 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 -z-10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-luxury-gold -z-10 rounded-full transition-all duration-500"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        />
        {['Detail', 'Pembayaran', 'Selesai'].map((label, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-lg ${
              step > idx ? 'bg-luxury-gold text-white scale-110' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
            }`}>
              {step > idx + 1 ? <Check className="w-5 h-5" /> : idx + 1}
            </div>
            <span className={`text-sm font-medium ${step >= idx + 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-luxury-cardDark rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Ringkasan Pesanan</h2>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between mb-4"><span className="text-gray-500">Lapangan</span> <span className="font-bold">{field.name}</span></div>
              <div className="flex justify-between mb-4"><span className="text-gray-500">Jadwal</span> <span className="font-bold">Hari ini, {selectedSlot}</span></div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between text-lg">
                <span className="text-gray-500">Total Pembayaran</span> <span className="font-bold text-luxury-gold">Rp {Number(field.price).toLocaleString()}</span>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all">
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Upload Bukti Transfer</h2>
            <p className="text-sm text-gray-500 mb-4">
              Transfer ke BCA 123456789 a.n Lumina Arena sebesar <strong className="text-gray-900 dark:text-white">Rp {Number(field.price).toLocaleString()}</strong>
            </p>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-luxury-gold rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer"
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files[0])} accept="image/*" />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-luxury-gold" />
                  <p className="font-medium text-center">{file.name}</p>
                  <p className="text-xs text-emerald-500 font-bold">File terpilih. Klik untuk ganti.</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="font-medium text-gray-600 dark:text-gray-300 text-center">Drag & drop gambar ke sini</p>
                  <p className="text-sm text-gray-400">atau klik untuk browse file</p>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                Kembali
              </button>
              <button
                onClick={handleFinish}
                disabled={!file || loading}
                className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                  !file || loading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:-translate-y-1'
                }`}
              >
                {loading ? 'Memproses...' : 'Selesaikan Pembayaran'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}