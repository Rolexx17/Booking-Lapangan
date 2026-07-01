import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users, CalendarClock, Search, MapPinned, Plus, Pencil, Trash, X } from 'lucide-react';
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

  const [fields, setFields] = useState([]);
  const [fieldForm, setFieldForm] = useState({ id: null, name: '', type: '', price: '', image: '' });
  const [deleteFieldModal, setDeleteFieldModal] = useState({ open: false, field: null });

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

  const fetchFields = async () => {
    const { ok, data } = await apiFetch('/fields?page=1&limit=100');
    if (ok && data.success) setFields(data.data || []);
  };

  const updateBookingStatus = async (id, status) => {
    const prev = [...bookings];
    setBookings((curr) =>
      curr.map((b) =>
        Number(b.id) === Number(id)
          ? {
              ...b,
              status,
              payment_status: status === 'Success' ? 'Verified' : status === 'Cancelled' ? 'Unpaid' : b.payment_status
            }
          : b
      )
    );

    const { ok, data } = await apiFetch(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (ok && data.success) {
      showNotif(`Status booking #${id} diubah ke ${status}`);
    } else {
      setBookings(prev);
      showNotif(data?.message || 'Gagal update status booking', 'error');
    }
  };

  const saveField = async () => {
    const payload = {
      name: fieldForm.name,
      type: fieldForm.type,
      price: Number(fieldForm.price),
      image: fieldForm.image
    };

    const isEdit = !!fieldForm.id;
    const endpoint = isEdit ? `/fields/${fieldForm.id}` : '/fields';
    const method = isEdit ? 'PUT' : 'POST';

    // Simpan data lama untuk cadangan rollback jika gagal
    const prevFields = [...fields];

    // Optimistic UI Update untuk Lapangan
    if (isEdit) {
      setFields((curr) =>
        curr.map((f) => (Number(f.id) === Number(fieldForm.id) ? { ...f, ...payload } : f))
      );
    } else {
      // Temp ID sementara menunggu respons server asli
      const tempId = Date.now();
      setFields((curr) => [...curr, { id: tempId, ...payload }]);
    }

    const { ok, data } = await apiFetch(endpoint, { method, body: JSON.stringify(payload) });

    if (ok && data.success) {
      showNotif(isEdit ? 'Lapangan berhasil diupdate' : 'Lapangan berhasil ditambahkan');
      setFieldForm({ id: null, name: '', type: '', price: '', image: '' });
      
      // Sinkronisasi ID asli dari server jika operasi baru (POST)
      if (!isEdit && data.data?.id) {
        setFields((curr) => curr.map((f) => (f.id >= 1000000000000 ? { ...f, id: data.data.id } : f)));
      }
    } else {
      setFields(prevFields); // Rollback state jika server gagal memproses
      showNotif(data?.message || 'Gagal simpan lapangan', 'error');
    }
  };

  const confirmDeleteField = async () => {
    const id = deleteFieldModal.field?.id;
    if (!id) return;

    const prev = [...fields];
    setFields((curr) => curr.filter((f) => Number(f.id) !== Number(id)));

    const { ok, data } = await apiFetch(`/fields/${id}`, { method: 'DELETE' });
    if (ok && data.success) {
      showNotif('Lapangan berhasil dihapus');
    } else {
      setFields(prev);
      showNotif(data?.message || 'Gagal hapus lapangan', 'error');
    }

    setDeleteFieldModal({ open: false, field: null });
  };

  useEffect(() => {
    fetchUsers();
    fetchBookings();
    fetchFields();

    const socket = getSocket();

    const onBookingChanged = (payload) => {
      if (!payload) return;

      setBookings((prev) => {
        if (payload.action === 'deleted' && payload.booking_id) {
          return prev.filter((b) => Number(b.id) !== Number(payload.booking_id));
        }

        if (payload.action === 'status_updated' && payload.booking_id) {
          return prev.map((b) =>
            Number(b.id) === Number(payload.booking_id)
              ? {
                  ...b,
                  status: payload.status ?? b.status,
                  payment_status: payload.payment_status ?? b.payment_status
                }
              : b
          );
        }

        if (payload.action === 'payment_updated' && payload.booking_id) {
          return prev.map((b) =>
            Number(b.id) === Number(payload.booking_id)
              ? { ...b, payment_status: payload.payment_status ?? b.payment_status }
              : b
          );
        }

        if (payload.action === 'created' && payload.booking_id) {
          const exists = prev.some((x) => Number(x.id) === Number(payload.booking_id));
          if (exists) return prev;
          if (!payload.field_name || !payload.user_name) return prev;

          return [
            {
              id: payload.booking_id,
              user_id: payload.user_id,
              field_id: payload.field_id,
              booking_date: payload.booking_date,
              time_slot: payload.time_slot,
              total_price: payload.total_price,
              status: payload.status || 'Pending',
              payment_status: payload.payment_status || 'Unpaid',
              payment_proof: payload.payment_proof || null,
              user_name: payload.user_name,
              field_name: payload.field_name
            },
            ...prev
          ];
        }

        return prev;
      });
    };

    socket.on('booking:changed', onBookingChanged);

    return () => {
      socket.off('booking:changed', onBookingChanged);
    };
  }, []);

  return (
    <div className="space-y-8">
      <Notification
        message={notif.msg}
        type={notif.type}
        isVisible={notif.show}
        onClose={() => setNotif({ show: false, msg: '', type: 'success' })}
      />

      {deleteFieldModal.open && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">Konfirmasi Hapus</h3>
              <button onClick={() => setDeleteFieldModal({ open: false, field: null })} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-700 dark:text-gray-300">Apakah Anda yakin ingin menghapus lapangan ini?</p>
              {deleteFieldModal.field?.name && <p className="mt-2 text-sm font-semibold">{deleteFieldModal.field.name}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setDeleteFieldModal({ open: false, field: null })} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm">
                  Batal
                </button>
                <button onClick={confirmDeleteField} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-luxury-gold" /> Admin & Kasir Panel
        </h1>
        <p className="text-gray-300 mt-2 text-sm sm:text-base">Kelola user dan status booking real-time.</p>
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
                  <th className="py-3">ID</th><th>Nama</th><th>Email</th><th>Role</th>
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
                    <a href={`${apiHost}${b.payment_proof}`} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs px-3 py-1 rounded-lg bg-slate-700 text-white font-semibold">
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

                  <button onClick={() => updateBookingStatus(b.id, 'Success')} className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold">
                    Success
                  </button>

                  <button onClick={() => updateBookingStatus(b.id, 'Cancelled')} className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-sm text-gray-500">Tidak ada data booking</p>}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><MapPinned className="w-5 h-5" /> Manajemen Lapangan</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <input placeholder="Nama" value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
          <input placeholder="Tipe" value={fieldForm.type} onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
          <input placeholder="Harga" type="number" value={fieldForm.price} onChange={(e) => setFieldForm({ ...fieldForm, price: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
          <input placeholder="Image URL" value={fieldForm.image} onChange={(e) => setFieldForm({ ...fieldForm, image: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>

        <button onClick={saveField} className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> {fieldForm.id ? 'Update Lapangan' : 'Tambah Lapangan'}
        </button>

        <div className="mt-4 space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <div>
                <p className="font-semibold">{f.name} • {f.type}</p>
                <p className="text-xs text-gray-500">Rp {Number(f.price).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFieldForm({ id: f.id, name: f.name, type: f.type, price: f.price, image: f.image || '' })}
                  className="px-3 py-2 text-xs rounded-lg bg-yellow-500 text-white"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setDeleteFieldModal({ open: true, field: f })}
                  className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white"
                >
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-gray-500">Belum ada data lapangan</p>}
        </div>
      </section>
    </div>
  );
}