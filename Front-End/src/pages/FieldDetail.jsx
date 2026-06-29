import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar as CalIcon, Clock, Star, Send } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';

const timeSlots = [
  { time: '16:00', status: 'available' },
  { time: '17:00', status: 'available' },
  { time: '18:00', status: 'booked' },
  { time: '19:00', status: 'booked' },
  { time: '20:00', status: 'available' },
  { time: '21:00', status: 'available' }
];

export default function FieldDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [field, setField] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  useEffect(() => {
    fetchFieldDetail();
    fetchReviews();
  }, [id]);

  const fetchFieldDetail = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch(`/fields/${id}`);
    if (ok && data.success) setField(data.data);
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { ok, data } = await apiFetch(`/fields/${id}/reviews?page=1&limit=20`);
    if (ok && data.success) setReviews(data.data || []);
  };

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

      <div className="w-full h-[250px] sm:h-[320px] lg:h-[400px] rounded-3xl overflow-hidden relative bg-gray-900">
        <img src={field.image || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1200'} className="w-full h-full object-cover" alt={field.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 sm:p-8">
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-bold">{field.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">Deskripsi Fasilitas</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Tipe Lapangan: <strong>{field.type}</strong>.
              <br />Lapangan dengan standar internasional. Dilengkapi fasilitas premium untuk memaksimalkan performa bermain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Ulasan Pemain</h2>

            <form onSubmit={handlePostReview} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl mb-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Rating:</span>
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} type="button" onClick={() => setNewReview({ ...newReview, rating: num })}>
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
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-luxury-cardDark text-sm focus:ring-2 focus:ring-luxury-gold outline-none"
                />
                <button type="submit" className="bg-black dark:bg-luxury-gold text-white dark:text-black px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm hover:opacity-90">
                  <Send className="w-4 h-4" /> Kirim
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-luxury-cardDark p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-tr from-luxury-gold to-yellow-300 rounded-full flex items-center justify-center text-xs font-bold">
                        {review.reviewer_name?.charAt(0) || 'U'}
                      </div>
                      <p className="font-bold text-sm">{review.reviewer_name || 'User'}</p>
                    </div>
                    <div className="flex text-luxury-gold text-xs">
                      {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-luxury-gold" />)}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm italic">"{review.comment}"</p>
                </div>
              )) : (
                <p className="text-gray-500 text-sm">Belum ada ulasan untuk lapangan ini.</p>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CalIcon className="w-5 h-5 text-luxury-gold" /> Jadwal Hari Ini</h3>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  disabled={slot.status === 'booked'}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    slot.status === 'booked'
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-400 border border-red-200 dark:border-red-900/50 cursor-not-allowed opacity-60'
                      : selectedSlot === slot.time
                        ? 'bg-luxury-gold text-white shadow-lg shadow-luxury-gold/30'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {slot.time}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Harga / Jam</span>
                <span className="font-bold text-lg">Rp {Number(field.price).toLocaleString()}</span>
              </div>
              <Link
                to={selectedSlot ? '/booking-form' : '#'}
                state={{ field, selectedSlot }}
                className={`w-full block text-center py-4 rounded-full font-bold transition-all ${
                  selectedSlot
                    ? 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] shadow-xl'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                Lanjutkan Pembayaran
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}