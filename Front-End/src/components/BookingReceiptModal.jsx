import { X, CalendarDays, Clock3, Wallet, BadgeCheck } from 'lucide-react';

export default function BookingReceiptModal({ open, onClose, booking }) {
  if (!open || !booking) return null;

  // Menggabungkan logika warna status dari versi pertama
  const statusColor =
    booking.status === 'Success' ? 'text-emerald-600' :
    booking.status === 'Cancelled' ? 'text-red-600' : 'text-yellow-600';

  // Menggabungkan logika penentuan label pembayaran dari versi kedua
  const paymentLabel =
    booking.status === 'Success' ? 'Paid' :
    booking.status === 'Cancelled' ? 'Unpaid' : 'WaitingVerification';

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-luxury-cardDark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Booking Receipt</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p><strong>ID Booking:</strong> #{booking.id}</p>
          <p><strong>Lapangan:</strong> {booking.field_name || `Lapangan ${booking.field_id}`}</p>
          
          <p className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" /> 
            {new Date(booking.booking_date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          
          <p className="flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-gray-400" /> 
            {booking.time_slot}
          </p>
          
          <p className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-400" /> 
            Rp {Number(booking.total_price).toLocaleString('id-ID')}
          </p>
          
          <p className={`flex items-center gap-2 font-bold ${statusColor}`}>
            <BadgeCheck className="w-4 h-4" /> 
            {booking.status}
          </p>
          
          <p>
            <strong>Payment:</strong>{' '}
            <span className={`font-semibold ${
              paymentLabel === 'Paid' ? 'text-emerald-600' : 
              paymentLabel === 'Unpaid' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {paymentLabel}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}