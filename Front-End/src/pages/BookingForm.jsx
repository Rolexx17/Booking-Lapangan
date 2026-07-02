import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, UploadCloud, FileText, Copy, Clock } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';
import { getSocket } from '../lib/realtime';

const DUMMY_PAYMENT = {
  bank_name: 'Bank Lumina (Dummy)',
  account_number: '1234567890',
  account_name: 'PT Lumina Arena',
  qris_image: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS-DUMMY-LUMINA-ARENA'
};

const baseTimeSlots = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', 
  '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', 
  '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', 
  '20:00-21:00', '21:00-22:00'
];

function parseStartHour(slot) {
  const [start] = String(slot).split('-');
  const [h] = start.split(':');
  return Number(h);
}

function isSameLocalDate(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export default function BookingForm() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [now, setNow] = useState(new Date());
  const fileInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { field, selectedDate } = location.state || {};

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  // tick tiap 30 detik supaya lock slot by current time selalu update realtime
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!field?.id || !selectedDate) return;

    const fetchBookedSlots = async () => {
      const { ok, data } = await apiFetch(`/fields/${field.id}/booked-slots?date=${selectedDate}`);
      if (ok && data.success) setBookedSlots(Array.isArray(data.data) ? data.data : []);
      else setBookedSlots([]);
    };

    fetchBookedSlots();

    const socket = getSocket();
    const roomName = `field:${field.id}:date:${selectedDate}`;
    socket.emit('join-room', roomName);

    const onSlotChanged = () => fetchBookedSlots();
    socket.on('slot:changed', onSlotChanged);
    socket.on('booking:changed', onSlotChanged);

    return () => {
      socket.off('slot:changed', onSlotChanged);
      socket.off('booking:changed', onSlotChanged);
    };
  }, [field?.id, selectedDate]);

  // RULE BARU:
  // - jika hari ini, slot dengan jam mulai < jam saat ini => disable
  // - contoh 20:30 masih boleh book 20:00-21:00 (karena startHour=20, nowHour=20)
  // - saat sudah 21:00, slot 20:00-21:00 baru disable
  const expiredSlots = useMemo(() => {
    if (!selectedDate) return new Set();

    const today = now;
    const selected = new Date(`${selectedDate}T00:00:00`);
    const set = new Set();

    if (isSameLocalDate(today, selected)) {
      const currentHour = today.getHours();
      for (const slot of baseTimeSlots) {
        const startHour = parseStartHour(slot);
        if (startHour < currentHour) set.add(slot);
      }
    }

    return set;
  }, [selectedDate, now]);

  const discountPercent = useMemo(() => {
    const slots = selectedSlots.length;
    if (slots <= 1) return 0;
    return Math.min((slots - 1) * 5, 20);
  }, [selectedSlots.length]);

  const subtotal = useMemo(() => Number(field?.price || 0) * selectedSlots.length, [field?.price, selectedSlots.length]);
  const total = useMemo(() => subtotal * (1 - discountPercent / 100), [subtotal, discountPercent]);

  const toggleSlot = (slot) => {
    const isBooked = bookedSlots.includes(slot);
    const isExpired = expiredSlots.has(slot);
    if (isBooked || isExpired) return;

    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const okType = droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf';
      if (okType) setFile(droppedFile);
      else showNotif('File harus berupa gambar atau PDF', 'error');
    }
  };

  const handleFinish = async () => {
    if (!field || !selectedDate || selectedSlots.length === 0) return;

    const user = getCurrentUser();
    if (!user) {
      showNotif('Silakan login terlebih dahulu', 'error');
      setTimeout(() => navigate('/login'), 900);
      return;
    }

    setLoading(true);
    try {
      const create = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          field_id: field.id,
          booking_date: selectedDate,
          time_slot: selectedSlots,
          total_price: Number(total),
          payment_proof: null
        })
      });

      if (!create.ok || !create.data?.success) {
        showNotif(create.data?.errors?.[0]?.message || create.data?.message || 'Gagal membuat booking', 'error');
        return;
      }

      const bookingIds = create.data?.data?.booking_ids || [];

      if (file && bookingIds.length > 0) {
        const formData = new FormData();
        formData.append('payment_proof', file);

        const up = await apiFetch(`/bookings/${bookingIds[0]}/payment-proof`, {
          method: 'POST',
          body: formData
        });

        if (!up.ok || !up.data?.success) {
          showNotif(up.data?.message || 'Booking dibuat, tapi upload bukti gagal', 'error');
          return;
        }
      }

      showNotif('Booking berhasil dibuat.');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch {
      showNotif('Terjadi kesalahan menghubungi server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyRek = async () => {
    await navigator.clipboard.writeText(`${DUMMY_PAYMENT.bank_name} - ${DUMMY_PAYMENT.account_number} - ${DUMMY_PAYMENT.account_name}`);
    showNotif('Nomor rekening dummy disalin');
  };

  if (!field || !selectedDate) {
    return <div className="text-center py-20">Data pemesanan tidak valid. Silakan kembali.</div>;
  }

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
            <h2 className="text-2xl font-serif font-bold">Pilih Jadwal</h2>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between mb-4"><span className="text-gray-500">Lapangan</span> <span className="font-bold">{field.name}</span></div>
              <div className="flex justify-between mb-4"><span className="text-gray-500">Tanggal</span> <span className="font-bold">{selectedDate}</span></div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between text-base">
                <span className="text-gray-500">Harga / Slot</span> <span className="font-bold text-luxury-gold">Rp {Number(field.price).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Slot Waktu Tersedia</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {baseTimeSlots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isExpired = expiredSlots.has(slot);
                  const isSelected = selectedSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      disabled={isBooked || isExpired}
                      onClick={() => toggleSlot(slot)}
                      className={`py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition border ${
                        isBooked || isExpired
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-400 border-red-200 dark:border-red-900/40 cursor-not-allowed opacity-60'
                          : isSelected
                            ? 'bg-luxury-gold text-white border-luxury-gold shadow-md'
                            : 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:border-luxury-gold'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {slot}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Slot pada hari ini otomatis terkunci jika jam mulai slot sudah lewat dari jam device saat ini.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1 text-sm">
              <p>Jumlah Slot: <span className="font-bold">{selectedSlots.length}</span></p>
              <p>Diskon: <span className="font-bold">{discountPercent}%</span></p>
              <p>Subtotal: <span className="font-bold">Rp {Number(subtotal).toLocaleString()}</span></p>
              <p>Total Bayar: <span className="font-bold text-luxury-gold">Rp {Number(total).toLocaleString()}</span></p>
            </div>

            <button
              onClick={() => {
                if (selectedSlots.length === 0) {
                  showNotif('Pilih minimal 1 slot terlebih dahulu', 'error');
                  return;
                }
                setStep(2);
              }}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Pembayaran</h2>

            <div className="border rounded-2xl p-4 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm font-bold mb-2">Transfer Dummy</p>
              <p className="text-sm">{DUMMY_PAYMENT.bank_name}</p>
              <p className="text-sm">{DUMMY_PAYMENT.account_number} a/n {DUMMY_PAYMENT.account_name}</p>
              <button onClick={copyRek} type="button" className="mt-2 text-xs px-3 py-1 rounded-lg bg-black text-white flex items-center gap-1">
                <Copy className="w-3 h-3" /> Copy
              </button>

              <div className="mt-4">
                <p className="text-sm font-bold mb-2">Atau QRIS Dummy</p>
                <img src={DUMMY_PAYMENT.qris_image} alt="QRIS Dummy" className="w-40 h-40 rounded-lg border" />
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-luxury-gold rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer"
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files[0])} accept="image/*,application/pdf" />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-luxury-gold" />
                  <p className="font-medium text-center">{file.name}</p>
                  <p className="text-xs text-emerald-500 font-bold">File terpilih. Klik untuk ganti.</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="font-medium text-gray-600 dark:text-gray-300 text-center">Drag & drop gambar/PDF ke sini</p>
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
                disabled={loading}
                className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                  loading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:-translate-y-1'
                }`}
              >
                {loading ? 'Memproses...' : 'Selesaikan Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}