import { useState, useEffect } from 'react';
import { User, Settings, Clock, MapPin, XCircle, Trash2, Edit2, CheckCircle2, ReceiptText } from 'lucide-react';
import Notification from '../components/Notification';
import BookingReceiptModal from '../components/BookingReceiptModal';
import { apiFetch, getCurrentUser, setSession } from '../lib/api';
import { getSocket } from '../lib/realtime';

export default function Dashboard() {
  const [historyData, setHistoryData] = useState([]);
  const [profile, setProfile] = useState({ name: '', email: '', role: 'customer' });
  const [isEditing, setIsEditing] = useState(false);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  
  // State untuk modal receipt
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const currentUser = getCurrentUser();
  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  const fetchProfile = async () => {
    const { ok, data } = await apiFetch('/auth/me');
    if (ok && data.success && data.data) setProfile(data.data);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/bookings/me');
    if (ok && data.success && data.data) setHistoryData(data.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchProfile();
    fetchBookings();

    const socket = getSocket();
    const onBookingChanged = () => fetchBookings();

    // Mendengarkan event real-time dari server untuk pembaruan data otomatis
    socket.on('booking:changed', onBookingChanged);
    
    return () => {
      socket.off('booking:changed', onBookingChanged);
    };
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    const { ok, data } = await apiFetch(`/users/${currentUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: profile.name, email: profile.email })
    });

    if (ok && data.success) {
      const updatedUser = { ...(currentUser || {}), name: profile.name, email: profile.email, role: profile.role };
      setSession({ user: updatedUser });
      setIsEditing(false);
      showNotif('Profil berhasil diperbarui');
    } else {
      showNotif(data?.errors?.[0]?.message || data?.message || 'Gagal update profil', 'error');
    }
  };

  const handleCancelBooking = async (id) => {
    const { ok, data } = await apiFetch(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Cancelled' })
    });

    if (ok && data.success) {
      showNotif('Booking berhasil dibatalkan');
    } else {
      showNotif(data?.message || 'Gagal membatalkan booking', 'error');
    }
  };

  const handleDeleteBooking = async (id) => {
    const { ok, data } = await apiFetch(`/bookings/${id}`, { method: 'DELETE' });
    if (ok && data.success) {
      showNotif('Riwayat berhasil dihapus');
    } else {
      showNotif(data?.message || 'Gagal menghapus riwayat', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Toast Notification */}
      <Notification 
        message={notif.msg} 
        type={notif.type} 
        isVisible={notif.show} 
        onClose={() => setNotif({ show: false, msg: '', type: 'success' })} 
      />

      {/* Booking Receipt Modal */}
      <BookingReceiptModal 
        open={receiptOpen} 
        onClose={() => setReceiptOpen(false)} 
        booking={selectedBooking} 
      />

      {/* Bagian Kiri: Profil & Navigasi */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center shadow-lg relative">
          <button onClick={() => setIsEditing(!isEditing)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-luxury-gold transition">
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-luxury-gold to-yellow-200 rounded-full mb-4 flex items-center justify-center p-1 shadow-lg">
            <div className="w-full h-full bg-white dark:bg-luxury-cardDark rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-3 mt-4 text-left">
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm"
                required
              />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm"
                required
              />
              <button type="submit" className="w-full py-2 bg-luxury-gold text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Simpan
              </button>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-bold font-serif mb-1">{profile.name || '-'}</h2>
              <p className="text-xs text-gray-500 mb-2">{profile.email || '-'}</p>
              <span className="px-3 py-1 bg-gradient-to-r from-gray-900 to-black dark:from-luxury-gold dark:to-yellow-600 text-white dark:text-black text-xs font-bold rounded-full uppercase">
                {profile.role || 'customer'}
              </span>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-4 shadow-sm">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-luxury-gold font-medium mb-2 transition-all">
            <Clock className="w-5 h-5" /> Riwayat Booking
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
            <Settings className="w-5 h-5" /> Pengaturan
          </button>
        </div>
      </div>

      {/* Bagian Kanan: List Riwayat Pemesanan */}
      <div className="lg:col-span-3 space-y-6">
        <h2 className="text-3xl font-serif font-bold border-b border-gray-200 dark:border-gray-800 pb-4">Riwayat Pemesanan</h2>

        {loading ? (
          <p className="text-gray-500 text-center py-10">Memuat riwayat...</p>
        ) : (
          <div className="space-y-4">
            {historyData.length > 0 ? historyData.map((item) => (
              <div key={item.id} className="group bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{item.field_name || `Lapangan ID ${item.field_id}`}</h3>
                    <p className="text-sm text-gray-500">{new Date(item.booking_date).toLocaleDateString()} • {item.time_slot}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: BKG-{item.id}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                  <div className="flex gap-3 items-center flex-wrap">
                    <span className="font-bold text-lg">Rp {Number(item.total_price).toLocaleString()}</span>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                      item.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                      item.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    {/* Tombol Struk/Receipt */}
                    <button
                      onClick={() => { setSelectedBooking(item); setReceiptOpen(true); }}
                      className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-950/80 transition"
                    >
                      <ReceiptText className="w-3 h-3" /> Receipt
                    </button>

                    {item.status === 'Pending' && (
                      <button onClick={() => handleCancelBooking(item.id)} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-lg transition font-medium">
                        <XCircle className="w-3 h-3" /> Batalkan
                      </button>
                    )}
                    {(item.status === 'Success' || item.status === 'Cancelled') && (
                      <button onClick={() => handleDeleteBooking(item.id)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg transition font-medium">
                        <Trash2 className="w-3 h-3" /> Hapus Riwayat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-10">Belum ada riwayat pemesanan.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}