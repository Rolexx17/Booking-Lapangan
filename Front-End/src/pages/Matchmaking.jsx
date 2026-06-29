import { useState, useEffect } from 'react';
import { MessageCircle, Users, Flame, MapPin, Clock, Trash2, PlusCircle } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';

export default function Matchmaking() {
  const [matches, setMatches] = useState([]);
  const [notif, setNotif] = useState({ show: false, msg: '' });
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({
    field_id: '',
    skill_level: '',
    looking_for: 1,
    time_schedule: '',
    note: ''
  });

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchMatchmakings();
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const { ok, data } = await apiFetch('/fields?page=1&limit=100');
    if (ok && data.success) {
      setFields(data.data || []);
    }
  };

  const fetchMatchmakings = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/matchmakings?page=1&limit=30');
    if (ok && data.success) {
      setMatches(data.data || []);
    }
    setLoading(false);
  };

  const handleDeleteMatchmaking = async (id) => {
    const { ok, data } = await apiFetch(`/matchmakings/${id}`, { method: 'DELETE' });
    if (ok && data.success) {
      setNotif({ show: true, msg: 'Postingan berhasil dihapus' });
      fetchMatchmakings();
    } else {
      setNotif({ show: true, msg: data?.message || 'Gagal menghapus postingan' });
    }
  };

  const handleCreateMatchmaking = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setNotif({ show: true, msg: 'Silakan login terlebih dahulu' });
      return;
    }

    const payload = {
      field_id: Number(form.field_id),
      skill_level: form.skill_level,
      looking_for: Number(form.looking_for),
      time_schedule: form.time_schedule,
      note: form.note
    };

    const { ok, data } = await apiFetch('/matchmakings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (ok && data.success) {
      setNotif({ show: true, msg: 'Ajakan mabar berhasil diposting!' });
      setForm({
        field_id: '',
        skill_level: '',
        looking_for: 1,
        time_schedule: '',
        note: ''
      });
      setShowCreateForm(false);
      fetchMatchmakings();
    } else {
      setNotif({ show: true, msg: data?.errors?.[0]?.message || data?.message || 'Gagal memposting mabar' });
    }
  };

  return (
    <div className="space-y-10">
      <Notification message={notif.msg} isVisible={notif.show} onClose={() => setNotif({ show: false, msg: '' })} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-gray-900 to-black dark:from-luxury-cardDark dark:to-black p-6 sm:p-8 rounded-3xl shadow-xl text-white">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-3">
            <Flame className="text-luxury-gold w-7 h-7 sm:w-8 sm:h-8" /> Mading Matchmaking
          </h1>
          <p className="text-gray-400 mt-2">Kekurangan pemain? Temukan skuadmu di sini.</p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) return setNotif({ show: true, msg: 'Login dulu untuk membuat ajakan main' });
            setShowCreateForm((prev) => !prev);
          }}
          className="px-6 py-3 bg-luxury-gold text-white font-bold rounded-full hover:scale-105 transition-all duration-300 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" /> {showCreateForm ? 'Tutup Form' : 'Buat Ajakan Main'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateMatchmaking} className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <label className="text-sm font-medium">Pilih Lapangan</label>
            <select
              value={form.field_id}
              onChange={(e) => setForm({ ...form, field_id: e.target.value })}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              required
            >
              <option value="">-- Pilih Lapangan --</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">Level Skill</label>
            <select
              value={form.skill_level}
              onChange={(e) => setForm({ ...form, skill_level: e.target.value })}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              required
            >
              <option value="">-- Pilih Level --</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">Butuh Berapa Pemain</label>
            <input
              type="number"
              min={1}
              value={form.looking_for}
              onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">Jadwal</label>
            <input
              type="text"
              placeholder="Contoh: Sabtu 19:00 - 21:00"
              value={form.time_schedule}
              onChange={(e) => setForm({ ...form, time_schedule: e.target.value })}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Catatan</label>
            <textarea
              rows="3"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Contoh: main santai, butuh kiper"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90">
              Posting Ajakan
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-10">Memuat data matchmaking...</p>
      ) : matches.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Belum ada ajakan bermain (mabar). Jadilah yang pertama!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => (
            <div key={match.id} className="group relative bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all">

              {(match.user_id === currentUser?.id || currentUser?.role === 'admin') && (
                <button onClick={() => handleDeleteMatchmaking(match.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition z-10">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <div>
                <div className="flex justify-between items-start mb-4 pr-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-500">
                      {match.host_name ? match.host_name.charAt(0) : 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold">{match.host_name || 'User'}</h3>
                      <span className="text-xs text-luxury-gold font-medium">{match.skill_level}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Users className="w-3 h-3" /> Butuh {match.looking_for}
                  </span>
                </div>

                <div className="mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
                  <p className="font-medium flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-gray-400" /> {match.field_name || `Lapangan ID ${match.field_id}`}</p>
                  <p className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {match.time_schedule}</p>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-6 leading-relaxed">"{match.note || '-'}"</p>
              </div>

              <button
                onClick={() => setNotif({ show: true, msg: 'Fitur chat tim akan segera hadir 🚀' })}
                className="w-full py-3 bg-gray-100 dark:bg-gray-900 hover:bg-black dark:hover:bg-white text-gray-900 dark:text-gray-100 hover:text-white dark:hover:text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Join Skuad
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}