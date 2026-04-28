import { Link } from 'react-router-dom';
import { Search, Star, MapPin } from 'lucide-react';

const fields = [
  { id: 1, name: 'Grand Emerald Pitch', type: 'Vinyl Premium', price: 'Rp 250.000', rating: 4.9, image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800' },
  { id: 2, name: 'Royal Synthetic Arena', type: 'Rumput Sintetis', price: 'Rp 300.000', rating: 4.8, image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=800' },
  { id: 3, name: 'Onyx Indoor Stadium', type: 'Interlock Futsal', price: 'Rp 200.000', rating: 4.7, image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800' },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 dark:border-gray-800 pb-8">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Pesan Lapangan <br/>Berstandar Internasional.</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg">Temukan arena terbaik untuk performa maksimal tim Anda dengan fasilitas VVIP.</p>
        </div>
        
        {/* Search Bar Elegant */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari lokasi atau nama lapangan..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-luxury-gold focus:outline-none shadow-sm transition"
          />
        </div>
      </div>

      {/* Grid Katalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {fields.map(field => (
          <Link to={`/field/${field.id}`} key={field.id} className="group rounded-3xl overflow-hidden bg-white dark:bg-luxury-cardDark border border-gray-100 dark:border-gray-800 shadow-lg hover:shadow-2xl transition duration-500">
            <div className="relative h-64 overflow-hidden">
              <img src={field.image} alt={field.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Star className="w-4 h-4 text-luxury-gold fill-luxury-gold" /> {field.rating}
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
                  <p className="font-bold text-lg">{field.price} <span className="text-sm font-normal text-gray-500">/ jam</span></p>
                </div>
                <button className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full font-medium hover:bg-luxury-gold dark:hover:bg-luxury-gold hover:text-white transition">
                  Pesan
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}