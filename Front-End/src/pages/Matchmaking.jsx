import { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, Users, Flame, MapPin, Clock, Trash2, PlusCircle, Send, X } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, getCurrentUser } from '../lib/api';
import { getSocket, joinMatchmakingChatRoom } from '../lib/realtime';

export default function Matchmaking() {
  const [matches, setMatches] = useState([]);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
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

  // chat states
  const [activeChat, setActiveChat] = useState(null); // { id, title }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const currentUser = getCurrentUser();
  const showNotif = (msg, type = 'success') => setNotif({ show: true, msg, type });

  const activeChatId = useMemo(() => activeChat?.id || null, [activeChat]);

  useEffect(() => {
    fetchMatchmakings();
    fetchFields();
  }, []);

  // RTC untuk list matchmaking (create/update/delete)
  useEffect(() => {
    const socket = getSocket();
    const onChanged = () => {
      fetchMatchmakings();
    };

    socket.on('matchmaking:changed', onChanged);
    return () => socket.off('matchmaking:changed', onChanged);
  }, []);

  // RTC khusus chat room aktif (dengan penanganan deduplikasi & penggantian bubble optimistik)
  useEffect(() => {
    if (!activeChatId) return;

    const socket = getSocket();
    joinMatchmakingChatRoom(activeChatId);

    const onNewMsg = (msg) => {
      if (Number(msg?.matchmaking_id) !== Number(activeChatId)) return;

      setChatMessages((prev) => {
        // 1) Kalau ID server aslinya sudah ada di state, lewati (hindari duplikat)
        if (prev.some((m) => String(m.id) === String(msg.id))) return prev;

        // 2) Jika ini merupakan ack/broadcast dari pesan sendiri, ganti bubble sementara (tmp)
        const optimisticIndex = prev.findIndex(
          (m) =>
            String(m.id).startsWith('tmp-') &&
            Number(m.sender_id) === Number(msg.sender_id) &&
            String(m.message).trim() === String(msg.message).trim()
        );

        if (optimisticIndex !== -1) {
          const next = [...prev];
          next[optimisticIndex] = msg; // ganti data sementara menjadi data riil dari server
          return next;
        }

        // 3) Pesan baru dari orang lain
        return [...prev, msg];
      });
    };

    socket.on('matchmaking:message:new', onNewMsg);
    return () => socket.off('matchmaking:message:new', onNewMsg);
  }, [activeChatId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchFields = async () => {
    const { ok, data } = await apiFetch('/fields?page=1&limit=100');
    if (ok && data.success) setFields(data.data || []);
  };

  const fetchMatchmakings = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/matchmakings?page=1&limit=30');
    if (ok && data.success) setMatches(data.data || []);
    setLoading(false);
  };

  const openChat = async (match) => {
    if (!currentUser) {
      showNotif('Silakan login terlebih dahulu', 'error');
      return;
    }

    setActiveChat({
      id: match.id,
      title: `${match.field_name || `Lapangan ${match.field_id}`} • ${match.time_schedule}`
    });

    setChatLoading(true);
    const { ok, data } = await apiFetch(`/matchmakings/${match.id}/messages?page=1&limit=100`);
    if (ok && data.success) {
      setChatMessages(data.data || []);
    } else {
      setChatMessages([]);
      showNotif(data?.message || 'Gagal memuat chat', 'error');
    }
    setChatLoading(false);
  };

  const closeChat = () => {
    setActiveChat(null);
    setChatMessages([]);
    setChatInput('');
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!activeChatId) return;
    const message = chatInput.trim();
    if (!message) return;

    // Membuat UI optimistik sementara agar chat langsung muncul tanpa delay api
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      matchmaking_id: activeChatId,
      sender_id: currentUser?.id,
      sender_name: currentUser?.name || 'Anda',
      message,
      created_at: new Date().toISOString()
    };

    setChatMessages((prev) => [...prev, optimistic]);
    setChatInput('');

    const { ok, data } = await apiFetch(`/matchmakings/${activeChatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (!ok || !data?.success) {
      // Hapus kembali bubble sementara jika API gagal mengirimkan data
      setChatMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      showNotif(data?.message || 'Gagal mengirim pesan', 'error');
    }
    // Catatan: tidak melakukan append data secara manual di sini, 
    // karena sinkronisasi ID rill ditangani penuh oleh event socket di atas.
  };

  const handleDeleteMatchmaking = async (id) => {
    const { ok, data } = await apiFetch(`/matchmakings/${id}`, { method: 'DELETE' });
    if (ok && data.success) {
      showNotif('Postingan berhasil dihapus');
      if (Number(activeChatId) === Number(id)) closeChat();
    } else {
      showNotif(data?.message || 'Gagal menghapus postingan', 'error');
    }
  };

  const handleCreateMatchmaking = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showNotif('Silakan login terlebih dahulu', 'error');
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
      showNotif('Ajakan mabar berhasil diposting!');
      setForm({ field_id: '', skill_level: '', looking_for: 1, time_schedule: '', note: '' });
      setShowCreateForm(false);
    } else {
      showNotif(data?.errors?.[0]?.message || data?.message || 'Gagal memposting mabar', 'error');
    }
  };

  return (
    <div className="space-y-10">
      <Notification message={notif.msg} type={notif.type} isVisible={notif.show} onClose={() => setNotif({ show: false, msg: '', type: 'success' })} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-gray-900 to-black dark:from-luxury-cardDark dark:to-black p-6 sm:p-8 rounded-3xl shadow-xl text-white">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-3">
            <Flame className="text-luxury-gold w-7 h-7 sm:w-8 sm:h-8" /> Mading Matchmaking
          </h1>
          <p className="text-gray-400 mt-2">Kekurangan pemain? Temukan skuadmu di sini (Realtime Chat Aktif).</p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) return showNotif('Login dulu untuk membuat ajakan main', 'error');
            setShowCreateForm((prev) => !prev);
          }}
          className="px-6 py-3 bg-luxury-gold text-white font-bold rounded-full hover:scale-105 transition-all duration-300 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" /> {showCreateForm ? 'Tutup Form' : 'Buat Ajakan Main'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateMatchmaking} className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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

          <div>
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

          <div>
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

          <div>
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
                onClick={() => openChat(match)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-900 hover:bg-black dark:hover:bg-white text-gray-900 dark:text-gray-100 hover:text-white dark:hover:text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Join Skuad (Live Chat)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Chat */}
      {activeChat && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-2xl bg-white dark:bg-luxury-cardDark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Team Chat</h3>
                <p className="text-xs text-gray-500">{activeChat.title}</p>
              </div>
              <button onClick={closeChat} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-[50vh] sm:h-[55vh] overflow-y-auto p-4 space-y-3 bg-gray-50/60 dark:bg-gray-950/20">
              {chatLoading ? (
                <p className="text-sm text-gray-500">Memuat chat...</p>
              ) : chatMessages.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada pesan. Jadilah yang pertama menyapa tim 👋</p>
              ) : (
                chatMessages.map((m) => {
                  const mine = Number(m.sender_id) === Number(currentUser?.id);
                  return (
                    <div key={`${m.id}-${m.created_at || ''}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 border ${
                        mine
                          ? 'bg-black text-white border-black'
                          : 'bg-white dark:bg-luxury-cardDark border-gray-200 dark:border-gray-700'
                      }`}>
                        <p className={`text-[11px] mb-1 ${mine ? 'text-white/80' : 'text-gray-500'}`}>
                          {mine ? 'Anda' : m.sender_name}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChat} className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tulis pesan ke tim..."
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-luxury-gold"
                maxLength={1000}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Kirim
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}