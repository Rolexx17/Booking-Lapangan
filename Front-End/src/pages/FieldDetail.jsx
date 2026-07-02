import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar as CalIcon, Clock, Star, Send, User } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';
import { getSocket } from '../lib/realtime';

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

export default function FieldDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [now, setNow] = useState(new Date());

  const [field, setField] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  // update clock lokal tiap 30 detik agar slot expired realtime
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchFieldDetail = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch(`/fields/${id}`);
    if (ok && data.success) setField(data.data);
    setLoading(false);
  };

  const fetchBookedSlots = async () => {
    const { ok, data } = await apiFetch(`/fields/${id}/booked-slots?date=${selectedDate}`);
    if (ok && data.success) setBookedSlots(Array.isArray(data.data) ? data.data : []);
    else setBookedSlots([]);
  };

  const fetchReviews = async () => {
    const { ok, data } = await apiFetch(`/fields/${id}/reviews?page=1&limit=20`);
    if (ok && data.success) setReviews(data.data || []);
  };

  useEffect(() => {
    fetchFieldDetail();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    fetchBookedSlots();

    const socket = getSocket();
    const roomName = `field:${id}:date:${selectedDate}`;
    socket.emit('join-room', roomName);

    const onSlotChanged = () => fetchBookedSlots();

    socket.on('slot:changed', onSlotChanged);
    socket.on('booking:changed', onSlotChanged);

    return () => {
      socket.off('slot:changed', onSlotChanged);
      socket.off('booking:changed', onSlotChanged);
    };
  }, [id, selectedDate]);

  // lock slot berdasar jam device untuk tanggal hari ini
  // rule: disable jika startHour < currentHour
  // contoh 20:30 slot 20:00 masih bisa, jam 21:00 baru disable
  const expiredSlots = useMemo(() => {
    const set = new Set();
    const selected = new Date(`${selectedDate}T00:00:00`);

    if (isSameLocalDate(now, selected)) {
      const currentHour = now.getHours();
      for (const slot of baseTimeSlots) {
        const startHour = parseStartHour(slot);
        if (startHour < currentHour) set.add(slot);
      }
    }

    return set;
  }, [selectedDate, now]);

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!newReview.comment) return;

    const user = getCurrentUser();
    if (!user) {
      showNotif('Silakan login untuk memberi ulasan', 'error');
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    const { ok, data } = await apiFetch(`/fields/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating: newReview.rating, comment: newReview.comment })
    });

    if (ok && data.success) {
      showNotif('Ulasan berhasil diposting!');
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
      fetchFieldDetail();
    } else {
      showNotif(data?.errors?.[0]?.message || data?.message || 'Gagal posting ulasan', 'error');
    }
  };

  if (loading || !field) return <div className="text-center py-20 text-gray-500">Memuat detail lapangan...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <Notification message={notif.msg} type={notif.type} isVisible={notif.show} onClose={() => setNotif({ show: false, msg: '', type: 'success' })} />

      <div className="w-full h-[250px] sm:h-[320px] lg:h-[400px] rounded-3xl overflow-hidden relative bg-gray-900 shadow-lg">
        <img
          src={field.image || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1200'}
          className="w-full h-full object-cover"
          alt={field.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{field.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-luxury-cardDark border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-serif font-bold mb-4">Deskripsi Fasilitas</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Tipe Lapangan: <strong className="text-gray-900 dark:text-white">{field.type}</strong>. Rasakan pengalaman berolahraga dengan fasilitas premium standar internasional.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Ulasan Pemain</h2>

            <form onSubmit={handlePostReview} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-500">Rating Anda:</span>
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} type="button" onClick={() => setNewReview({ ...newReview, rating: num })} className="transition transform hover:scale-110">
                    <Star className={`w-5 h-5 ${num <= newReview.rating ? 'text-luxury-gold fill-luxury-gold' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Tulis pengalaman main di sini..."
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm focus:outline-none focus:border-luxury-gold"
                />
                <button type="submit" className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-xl flex items-center gap-2 font-bold text-sm hover:opacity-90 transition">
                  <Send className="w-4 h-4" /> Kirim
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-white dark:bg-luxury-cardDark border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">{rev.reviewer_name || 'Anonim'}</h4>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'text-luxury-gold fill-luxury-gold' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{rev.comment}</p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-400 text-sm text-center py-6">Belum ada ulasan untuk lapangan ini.</p>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-xl font-bold font-serif flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-luxury-gold" /> Pilih Jadwal
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Tanggal Main</label>
              <input
                type="date"
                min={todayISO}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-medium focus:outline-none focus:border-luxury-gold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Slot Waktu Tersedia</label>
              <div className="grid grid-cols-2 gap-2">
                {baseTimeSlots.map((slot, index) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isExpired = expiredSlots.has(slot);

                  return (
                    <div
                      key={index}
                      className={`py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition border ${
                        isBooked || isExpired
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-400 border-red-200 dark:border-red-900/40 opacity-70'
                          : 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {slot}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Slot pada hari ini otomatis terkunci jika jam mulai slot sudah lewat dari jam device saat ini.
              </p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Harga / Jam</span>
                <span className="font-bold text-xl text-luxury-gold">Rp {Number(field.price).toLocaleString()}</span>
              </div>

              <Link
                to="/booking-form"
                state={{ field, selectedDate }}
                className="w-full block text-center py-4 rounded-xl font-bold shadow-lg transition-all bg-black dark:bg-white text-white dark:text-black hover:-translate-y-0.5"
              >
                Pilih Jadwal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}