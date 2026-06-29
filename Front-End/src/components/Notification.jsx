import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function Notification({ message, isVisible, onClose, type = 'success' }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const isError = type === 'error';

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] animate-bounce-in max-w-[92vw] sm:max-w-sm">
      <div
        className={`border shadow-2xl rounded-2xl p-4 flex items-start gap-3 transition-all duration-300
          ${isError
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'
            : 'bg-white dark:bg-luxury-cardDark border-gray-200 dark:border-gray-800'
          }`}
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
        )}

        <p className="font-medium text-sm pr-4">{message}</p>

        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition ml-auto">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}