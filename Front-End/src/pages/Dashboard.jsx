import { User, Settings, Clock, MapPin } from 'lucide-react';

const historyData = [
  { id: 'INV-001', field: 'Grand Emerald Pitch', date: '28 Apr 2026', time: '19:00 - 21:00', status: 'Pending', price: 'Rp 500.000' },
  { id: 'INV-002', field: 'Onyx Indoor Stadium', date: '25 Apr 2026', time: '16:00 - 17:00', status: 'Success', price: 'Rp 200.000' },
];

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Profile */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-luxury-gold to-yellow-200 rounded-full mb-4 flex items-center justify-center p-1 shadow-lg shadow-luxury-gold/20">
            <div className="w-full h-full bg-white dark:bg-luxury-cardDark rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-serif mb-1">Rolexx17</h2>
          <span className="px-3 py-1 bg-gradient-to-r from-gray-900 to-black dark:from-luxury-gold dark:to-yellow-600 text-white dark:text-black text-xs font-bold rounded-full">
            VIP Member
          </span>
        </div>

        <div className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-3xl p-4 shadow-sm">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-luxury-gold font-medium mb-2 transition-all">
            <Clock className="w-5 h-5" /> Riwayat Booking
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
            <Settings className="w-5 h-5" /> Pengaturan
          </button>
        </div>
      </div>

      {/* Main Content - History */}
      <div className="lg:col-span-3 space-y-6">
        <h2 className="text-3xl font-serif font-bold border-b border-gray-200 dark:border-gray-800 pb-4">Riwayat Pemesanan</h2>
        
        <div className="space-y-4">
          {historyData.map((item, i) => (
            <div key={i} className="group bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-luxury-gold/5 transition-all duration-300 cursor-pointer">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <MapPin className="text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{item.field}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    {item.date} • {item.time}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">ID: {item.id}</p>
                </div>
              </div>
              
              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                  item.status === 'Pending' 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800' 
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {item.status}
                </span>
                <span className="font-bold text-lg">{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}