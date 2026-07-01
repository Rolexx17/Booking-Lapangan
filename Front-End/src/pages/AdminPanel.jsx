import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users, CalendarClock, Search, MapPinned, Plus, Pencil, Trash, XCircle, X } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch } from '../lib/api';
import { getSocket } from '../lib/realtime';

export default function AdminPanel() {
  // State Manajemen User & Booking
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [userQ, setUserQ] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // State Manajemen Lapangan
  const [fields, setFields] = useState([]);
  const [fieldForm, setFieldForm] = useState({ id: null, name: '', type: '', price: '', image: '' });

  // State Modal Konfirmasi Hapus Lapangan (Custom Modal)
  const [deleteFieldModal, setDeleteFieldModal] = useState({ open: false, field: null });

  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });
  
  const apiHost = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', ''),
    []
  );

  // Fetching Data Functions
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

  const fetchFields = async () => {
    const { ok, data } = await apiFetch('/fields?page=1&limit=100');
    if (ok && data.success) setFields(data.data || []);
  };

  // Lifecycle & Real-time Subscriptions
  useEffect(() => {
    fetchUsers();
    fetchBookings();
    fetchFields();

    const socket = getSocket();
    const onBookingChanged = () => {
      fetchBookings(); // Smooth refresh tanpa re-render total halaman
    };

    socket.on('booking:changed', onBookingChanged);
    return () => socket.off('booking:changed', onBookingChanged);
  }, []);

  // Actions: Booking
  const updateBookingStatus = async (id, status) => {
    const { ok, data } = await apiFetch(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (ok && data.success) {
      showNotif(`Status booking #${id} diubah ke ${status}`);
    } else {
      showNotif(data?.message || 'Gagal update status booking', 'error');
    }
  };

  // Actions: Lapangan
  const saveField = async () => {
    if (!fieldForm.name || !fieldForm.type || !fieldForm.price) {
      showNotif('Nama, Tipe, dan Harga lapangan wajib diisi', 'error');
      return;
    }

    const payload = { 
      name: fieldForm.name, 
      type: fieldForm.type, 
      price: Number(fieldForm.price), 
      image: fieldForm.image 
    };
    
    const endpoint = fieldForm.id ? `/fields/${fieldForm.id}` : '/fields';
    const method = fieldForm.id ? 'PUT' : 'POST';
    
    const { ok, data } = await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
    
    if (ok && data.success) {
      showNotif(fieldForm.id ? 'Lapangan berhasil diupdate' : 'Lapangan berhasil ditambahkan');
      setFieldForm({ id: null, name: '', type: '', price: '', image: '' });
      fetchFields();
    } else {
      showNotif(data?.message || 'Gagal simpan lapangan', 'error');
    }
  };

  // Eksekusi delete dari Modal Konfirmasi
  const confirmDeleteField = async () => {
    const id = deleteFieldModal.field?.id;
    if (!id) return;

    const { ok, data } = await apiFetch(`/fields/${id}`, { method: 'DELETE' });
    if (ok && data.success) { 
      showNotif('Lapangan berhasil dihapus'); 
      fetchFields(); 
    } else {
      showNotif(data?.message || 'Gagal hapus lapangan', 'error');
    }

    setDeleteFieldModal({ open: false, field: null });
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <Notification
        message={notif.msg}
        type={notif.type}
        isVisible={notif.show}
        onClose={() => setNotif({ show: false, msg: '', type: 'success' })}
      />

      {/* Modal Konfirmasi Hapus Lapangan */}
      {deleteFieldModal.open && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Konfirmasi Hapus</h3>
              <button
                onClick={() => setDeleteFieldModal({ open: false, field: null })}
                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus lapangan berikut? Tindakan ini tidak dapat dibatalkan.
              </p>
              {deleteFieldModal.field?.name && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {deleteFieldModal.field.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tipe: {deleteFieldModal.field.type}
                  </p>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteFieldModal({ open: false, field: null })}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteField}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-luxury-gold" /> Admin & Kasir Panel
        </h1>
        <p className="text-gray-300 mt-2 text-sm sm:text-base">
          Kelola user, lapangan, dan status booking real-time.
        </p>
      </div>

      {/* SECTION 1: DAFTAR USER */}
      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100"><Users className="w-5 h-5" /> Daftar User</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder="Cari nama/email..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-900 dark:text-gray-100"
              />
            </div>
            <button onClick={fetchUsers} className="px-4 py-2 rounded-xl bg-black dark:bg-gray-800 text-white text-sm font-semibold hover:opacity-90 transition">Cari</button>
          </div>
        </div>

        {loadingUsers ? (
          <p className="text-sm text-gray-500 py-6 text-center">Memuat data user...</p>
        ) : (
          <div className="overflow-auto border dark:border-gray-800 rounded-2xl">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-900 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition">
                    <td className="py-3 px-4">{u.id}</td>
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-gray-500 text-center">Tidak ada data user</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: MANAJEMEN LAPANGAN */}
      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-gray-100"><MapPinned className="w-5 h-5" /> Manajemen Lapangan</h2>

        {/* Form Lapangan (Premium Style) */}
        <div className="bg-gray-50 dark:bg-gray-900/40 border dark:border-gray-800/80 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            {fieldForm.id ? `Edit Lapangan (ID: ${fieldForm.id})` : 'Tambah Lapangan Baru'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <input 
              placeholder="Nama Lapangan (e.g. Lapangan A)" 
              value={fieldForm.name} 
              onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} 
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-900 dark:text-gray-100" 
            />
            <input 
              placeholder="Tipe (e.g. Vinyl / Interlock)" 
              value={fieldForm.type} 
              onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })} 
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-900 dark:text-gray-100" 
            />
            <input 
              placeholder="Harga per Jam" 
              type="number" 
              value={fieldForm.price} 
              onChange={(e) => setFieldForm({ ...fieldForm, price: e.target.value })} 
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-900 dark:text-gray-100" 
            />
            <input 
              placeholder="Image URL" 
              value={fieldForm.image} 
              onChange={(e) => setFieldForm({ ...fieldForm, image: e.target.value })} 
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-900 dark:text-gray-100" 
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={saveField} 
              className="px-4 py-2 rounded-xl bg-black dark:bg-luxury-gold text-white dark:text-black text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> {fieldForm.id ? 'Update Lapangan' : 'Tambah Lapangan'}
            </button>
            {fieldForm.id && (
              <button 
                onClick={() => setFieldForm({ id: null, name: '', type: '', price: '', image: '' })} 
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <XCircle className="w-4 h-4" /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Grid List Lapangan (Premium Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-800/80 rounded-2xl p-4 bg-white dark:bg-gray-900/20 hover:shadow-sm transition">
              <div>
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100">{f.name} <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded ml-1">{f.type}</span></p>
                <p className="text-sm font-bold text-luxury-gold mt-1">Rp {Number(f.price).toLocaleString()}<span className="text-xs font-normal text-gray-400"> / jam</span></p>
                {f.image && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[200px] mt-1">{f.image}</p>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button 
                  onClick={() => setFieldForm({ id: f.id, name: f.name, type: f.type, price: f.price, image: f.image || '' })} 
                  className="p-2 text-xs rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                  title="Edit Lapangan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setDeleteFieldModal({ open: true, field: f })} 
                  className="p-2 text-xs rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
                  title="Hapus Lapangan"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 col-span-full py-4 text-center">Belum ada data lapangan yang tersedia.</p>
          )}
        </div>
      </section>

      {/* SECTION 3: MANAJEMEN BOOKING */}
      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100"><CalendarClock className="w-5 h-5" /> Manajemen Booking</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-luxury-gold text-gray-800 dark:text-gray-200"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Success">Success</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button onClick={fetchBookings} className="px-4 py-2 rounded-xl bg-black dark:bg-gray-800 text-white text-sm font-semibold hover:opacity-90 transition">Filter</button>
          </div>
        </div>

        {loadingBookings ? (
          <p className="text-sm text-gray-500 py-6 text-center">Memuat data booking...</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900/10">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Booking #{b.id} - {b.field_name || `Lapangan ID ${b.field_id}`}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{b.user_name || 'Pelanggan'} • {new Date(b.booking_date).toLocaleDateString()} • {b.time_slot}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Rp {Number(b.total_price).toLocaleString()}</p>

                  {b.payment_proof ? (
                    <a
                      href={`${apiHost}${b.payment_proof}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-medium transition shadow-sm"
                    >
                      Lihat Bukti Pembayaran
                    </a>
                  ) : (
                    <p className="text-xs mt-2 text-gray-400 italic">Belum ada bukti pembayaran</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                  <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
                    b.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50' :
                    b.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' :
                    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
                  }`}>{b.status}</span>

                  {b.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => updateBookingStatus(b.id, 'Success')}
                        className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-sm"
                      >
                        Set Success
                      </button>
                      <button
                        onClick={() => updateBookingStatus(b.id, 'Cancelled')}
                        className="text-xs px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition shadow-sm"
                      >
                        Set Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Tidak ada data booking</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}