import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users, CalendarClock, Search } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch } from '../lib/api';
import { getSocket } from '../lib/realtime';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [userQ, setUserQ] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });
  const apiHost = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', ''),
    []
  );

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { ok, data } = await apiFetch(`/users?page=1&limit=10&q=${encodeURIComponent(userQ)}`);
    if (ok && data.success) setUsers(data.data || []);
    setLoadingUsers(false);
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    const qs = new URLSearchParams({ page: '1', limit: '10' });
    if (bookingStatus) qs.append('status', bookingStatus);

    const { ok, data } = await apiFetch(`/bookings?${qs.toString()}`);
    if (ok && data.success) setBookings(data.data || []);
    setLoadingBookings(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchBookings();

    const socket = getSocket();
    const onBookingChanged = () => {
      // smooth refresh data list only (tanpa full page refresh)
      fetchBookings();
    };

    socket.on('booking:changed', onBookingChanged);
    return () => socket.off('booking:changed', onBookingChanged);
  }, []);

  const updateBookingStatus = async (id, status) => {
    const { ok, data } = await apiFetch(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (ok && data.success) {
      showNotif(`Status booking #${id} diubah ke ${status}`);
      // tidak perlu fetch manual, RTC akan update otomatis
    } else {
      showNotif(data?.message || 'Gagal update status booking', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <Notification
        message={notif.msg}
        type={notif.type}
        isVisible={notif.show}
        onClose={() => setNotif({ show: false, msg: '', type: 'success' })}
      />

      <div className="bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-luxury-gold" /> Admin & Kasir Panel
        </h1>
        <p className="text-gray-300 mt-2 text-sm sm:text-base">
          Kelola user dan status booking real-time.
        </p>
      </div>

      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Daftar User</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder="Cari nama/email..."
                className="pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>
            <button onClick={fetchUsers} className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold">Cari</button>
          </div>
        </div>

        {loadingUsers ? (
          <p className="text-sm text-gray-500 py-6">Memuat users...</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3">ID</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-3">{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="px-2 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-900">{u.role}</span></td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} className="py-6 text-gray-500 text-center">Tidak ada data user</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Manajemen Booking</h2>
          <div className="flex items-center gap-2">
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Success">Success</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button onClick={fetchBookings} className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold">Filter</button>
          </div>
        </div>

        {loadingBookings ? (
          <p className="text-sm text-gray-500 py-6">Memuat bookings...</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Booking #{b.id} - {b.field_name}</p>
                  <p className="text-sm text-gray-500">{b.user_name} • {b.booking_date} • {b.time_slot}</p>
                  <p className="text-sm font-medium mt-1">Rp {Number(b.total_price).toLocaleString()}</p>

                  {b.payment_proof ? (
                    <a
                      href={`${apiHost}${b.payment_proof}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-xs px-3 py-1 rounded-lg bg-slate-700 text-white font-semibold"
                    >
                      Lihat Bukti Pembayaran
                    </a>
                  ) : (
                    <p className="text-xs mt-2 text-gray-500">Belum ada bukti pembayaran</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-3 py-1 rounded-full border ${
                    b.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    b.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>{b.status}</span>

                  <button
                    onClick={() => updateBookingStatus(b.id, 'Success')}
                    className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                  >
                    Success
                  </button>

                  <button
                    onClick={() => updateBookingStatus(b.id, 'Cancelled')}
                    className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-sm text-gray-500">Tidak ada data booking</p>}
          </div>
        )}
      </section>
    </div>
  );
}