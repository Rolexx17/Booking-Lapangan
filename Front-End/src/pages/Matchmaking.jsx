import { MessageCircle, Users, Flame, MapPin, Clock } from 'lucide-react';

const matches = [
  { id: 1, host: 'Alex Danu', skill: 'Intermediate', lookingFor: 2, field: 'Grand Emerald Pitch', time: 'Malam ini, 19:00', note: 'Kekurangan 2 orang buat main santai 5v5. Patungan Rp 50k/orang.' },
  { id: 2, host: 'FC Sudirman', skill: 'Advanced', lookingFor: 1, field: 'Royal Synthetic Arena', time: 'Besok, 16:00', note: 'Butuh 1 kiper jago buat latih tanding. Free entry buat kiper!' },
  { id: 3, host: 'Startup FC', skill: 'Beginner', lookingFor: 4, field: 'Onyx Indoor', time: 'Jumat, 20:00', note: 'Cari teman main fun futsal setelah ngantor. Chill aja no hard tackle.' },
];

export default function Matchmaking() {
  const [fields, setFields] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Fitur: Pencarian (q) dan Pagination (limit/page)
    fetch(`http://localhost:5000/api/fields?q=${search}&limit=6&page=1`)
      .then(res => res.json())
      .then(res => setFields(res.data))
      .catch(err => console.error(err));
  }, [search]);
  return (
    <div className="space-y-10">
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
        {matches.map(match => (
          <div key={match.id} className="group bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-luxury-gold/10 transition-all duration-500 flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-500">
                    {match.host.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{match.host}</h3>
                    <span className="text-xs text-luxury-gold font-medium">{match.skill}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Users className="w-3 h-3" /> Butuh {match.lookingFor}
                </span>
              </div>
              
              <div className="mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
                <p className="font-medium flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-gray-400"/> {match.field}</p>
                <p className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/> {match.time}</p>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-6 leading-relaxed">"{match.note}"</p>
            </div>

            <button className="w-full py-3 bg-gray-100 dark:bg-gray-900 hover:bg-black dark:hover:bg-white text-gray-900 dark:text-gray-100 hover:text-white dark:hover:text-black rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Join Skuad
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}