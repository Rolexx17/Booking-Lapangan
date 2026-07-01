import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';

const fallbackFields = [];

export default function Home() {
  const [fields, setFields] = useState(fallbackFields);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { ok, data } = await apiFetch(`/fields?q=${encodeURIComponent(search)}&limit=6&page=1`);
      if (ok && data.success && Array.isArray(data.data)) {
        setFields(data.data);
      }
      setLoading(false);
    };

    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 dark:border-gray-800 pb-8">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Pesan Lapangan <br />Berstandar Internasional.</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg">Temukan arena terbaik untuk performa maksimal tim Anda dengan fasilitas VVIP.</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari lokasi atau nama lapangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-luxury-gold focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {loading && <p className="text-center text-gray-500">Memuat data lapangan...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {!loading && fields.length > 0 ? fields.map(field => (
          <Link to={`/field/${field.id}`} key={field.id} className="group rounded-3xl overflow-hidden bg-white dark:bg-luxury-cardDark border border-gray-100 dark:border-gray-800 shadow-lg hover:shadow-2xl transition-all">
            <div className="relative h-64 overflow-hidden">
              <img src={field.image} alt={field.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Star className="w-4 h-4 text-luxury-gold fill-luxury-gold" /> {field.rating || '0'}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-sm text-luxury-gold mb-2 font-medium">
                <MapPin className="w-4 h-4" /> Jakarta Selatan
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">{field.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{field.type}</p>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-500">Mulai dari</span>
                  <p className="font-bold text-lg">
                    Rp {Number(field.price).toLocaleString()} <span className="text-sm font-normal text-gray-500">/ jam</span>
                  </p>
                </div>
                <button className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full font-medium hover:bg-luxury-gold dark:hover:bg-luxury-gold hover:text-white transition">
                  Pesan
                </button>
              </div>
            </div>
          </Link>
        )) : !loading && (
          <p className="text-center col-span-full py-20 text-gray-500">Belum ada lapangan yang cocok dengan pencarian.</p>
        )}
      </div>
    </div>
  );
}