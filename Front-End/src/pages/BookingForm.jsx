import { useState, useRef } from 'react';
import { Check, UploadCloud, FileText } from 'lucide-react';
import Notification from '../components/Notification';

export default function BookingForm() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFinish = () => {
    setShowNotif(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Notification message="Pembayaran berhasil diunggah! Menunggu konfirmasi admin." isVisible={showNotif} onClose={() => setShowNotif(false)} />
      
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-12 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 -z-10 rounded-full"></div>
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-luxury-gold -z-10 rounded-full transition-all duration-500`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
        
        {['Detail', 'Pembayaran', 'Selesai'].map((label, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-lg ${step > idx ? 'bg-luxury-gold text-white scale-110 shadow-luxury-gold/40' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
              {step > idx + 1 ? <Check className="w-5 h-5" /> : idx + 1}
            </div>
            <span className={`text-sm font-medium ${step >= idx + 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Card Content */}
      <div className="bg-white dark:bg-luxury-cardDark rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl transition-all">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-serif font-bold">Ringkasan Pesanan</h2>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between mb-4"><span className="text-gray-500">Lapangan</span> <span className="font-bold">Grand Emerald Pitch</span></div>
              <div className="flex justify-between mb-4"><span className="text-gray-500">Jadwal</span> <span className="font-bold">28 April 2026, 19:00 - 21:00</span></div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between text-lg">
                <span className="text-gray-500">Total Pembayaran</span> <span className="font-bold text-luxury-gold">Rp 500.000</span>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-serif font-bold">Upload Bukti Transfer</h2>
            <p className="text-sm text-gray-500 mb-4">Transfer ke BCA 123456789 a.n Lumina Arena sebesar <strong className="text-gray-900 dark:text-white">Rp 500.000</strong></p>
            
            <div 
              onDragOver={handleDragOver} 
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-luxury-gold dark:hover:border-luxury-gold rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-900 group"
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files[0])} accept="image/*" />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-luxury-gold" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-emerald-500 font-bold">File terpilih. Klik untuk ganti.</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-gray-400 group-hover:text-luxury-gold group-hover:-translate-y-1 transition-all mb-3" />
                  <p className="font-medium text-gray-600 dark:text-gray-300">Drag & drop gambar ke sini</p>
                  <p className="text-sm text-gray-400">atau klik untuk browse file</p>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Kembali</button>
              <button onClick={handleFinish} disabled={!file} className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg ${file ? 'bg-black dark:bg-white text-white dark:text-black hover:-translate-y-1 hover:shadow-xl' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Selesaikan Pembayaran
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}