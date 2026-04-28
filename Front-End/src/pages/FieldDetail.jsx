import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar as CalIcon, Clock, CheckCircle2, XCircle } from 'lucide-react';

const timeSlots = [
  { time: '16:00', status: 'available' },
  { time: '17:00', status: 'available' },
  { time: '18:00', status: 'booked' },
  { time: '19:00', status: 'booked' },
  { time: '20:00', status: 'available' },
  { time: '21:00', status: 'available' },
];

export default function FieldDetail() {
  const { id } = useParams();
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Hero Image */}
      <div className="w-full h-[400px] rounded-3xl overflow-hidden relative">
        <img src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" alt="Field" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
          <h1 className="text-5xl font-serif text-white font-bold">Grand Emerald Pitch</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Info & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">Deskripsi Fasilitas VVIP</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Lapangan vinyl premium dengan standar internasional. Dilengkapi dengan ruang ganti ber-AC, shower air panas, tribun penonton eksklusif, dan pencahayaan 1000 lux yang anti-silau.
            </p>
          </section>

          {/* Review Estetik */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Ulasan Pemain</h2>
            <div className="space-y-6">
              <div className="bg-white dark:bg-luxury-cardDark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-luxury-gold to-yellow-300 rounded-full"></div>
                    <div>
                      <p className="font-bold">Rolexx17</p>
                      <p className="text-xs text-gray-500">Member Platinum</p>
                    </div>
                  </div>
                  <div className="flex text-luxury-gold text-sm">★★★★★</div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 italic">"Gila sih vibenya dapet banget, rumputnya empuk, kamar mandinya kaya hotel bintang 5. Worth the price!"</p>
              </div>
            </div>
          </section>
        </div>

        {/* Interactive Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CalIcon className="w-5 h-5 text-luxury-gold"/> Jadwal Hari Ini</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  disabled={slot.status === 'booked'}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    slot.status === 'booked' 
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-400 border border-red-200 dark:border-red-900/50 cursor-not-allowed opacity-60' 
                      : selectedSlot === slot.time
                        ? 'bg-luxury-gold text-white shadow-lg shadow-luxury-gold/30'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {slot.time}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Harga / Jam</span>
                <span className="font-bold text-lg">Rp 250.000</span>
              </div>
              <Link 
                to={selectedSlot ? "/booking-form" : "#"} 
                className={`w-full block text-center py-4 rounded-full font-bold transition-all ${
                  selectedSlot 
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] shadow-xl' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                Lanjutkan Pembayaran
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}