import { useState, useEffect } from 'react';
import { MessageCircle, Users, Flame, MapPin, Clock, Trash2 } from 'lucide-react';
import Notification from '../components/Notification';

export default function Matchmaking() {
  const [matches, setMatches] = useState([]);
  const [notif, setNotif] = useState({ show: false, msg: '' });

  const currentUserId = 1;

  useEffect(() => {
    fetchMatchmakings();
  }, []);

  const fetchMatchmakings = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/matchmakings`);
      const data = await res.json();
      if (data.success) {
        setMatches(data.data);
      }
    } catch (err) {
      console.error("Backend error, menggunakan mode UI only", err);
    }
  };

  const handleDeleteMatchmaking = async (id) => {
    if (!window.confirm("Yakin ingin menghapus postingan mabar ini?")) return;
    try {
      await fetch(`http://localhost:5000/api/matchmakings/${id}`, {
        method: 'DELETE'
      });
      setNotif({ show: true, msg: "Postingan berhasil dihapus" });
      fetchMatchmakings();
    } catch (err) {
      console.error("Gagal menghapus", err);
    }
  };

  return (
    <div className="space-y-10">
      <Notification message={notif.msg} isVisible={notif.show} onClose={() => setNotif({show: false, msg: ''})} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-gray-900 to-black dark:from-luxury-cardDark dark:to-black p-8 rounded-3xl shadow-xl text-white">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3"><Flame className="text-luxury-gold w-8 h-8"/> Mading Matchmaking</h1>
          <p className="text-gray-400 mt-2">Kekurangan pemain? Temukan skuadmu di sini.</p>
        </div>
        <button className="px-6 py-3 bg-luxury-gold text-white font-bold rounded-full hover:scale-105 hover:shadow-lg hover:shadow-luxury-gold/50 transition-all duration-300">
          + Buat Ajakan Main
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.length > 0 ? matches.map(match => (
          <div key={match.id} className="group relative bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-luxury-gold/10 transition-all duration-300 flex flex-col justify-between">
            
            {/* Tampilkan tombol Hapus jika user yang login adalah host postingan */}
            {match.user_id === currentUserId && (
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
                <p className="font-medium flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-gray-400"/> {match.field_name || `Lapangan ID ${match.field_id}`}</p>
                <p className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/> {match.time_schedule}</p>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-6 leading-relaxed">"{match.note}"</p>
            </div>

            <button className="w-full py-3 bg-gray-100 dark:bg-gray-900 hover:bg-black dark:hover:bg-white text-gray-900 dark:text-gray-100 hover:text-white dark:hover:text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <MessageCircle className="w-4 h-4" /> Join Skuad
            </button>
          </div>
        )) : (
          <p className="col-span-full text-center text-gray-500 py-10">Belum ada ajakan bermain (mabar). Jadilah yang pertama!</p>
        )}
      </div>
    </div>
  );
}