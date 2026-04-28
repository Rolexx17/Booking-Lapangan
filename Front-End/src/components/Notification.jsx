import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function Notification({ message, isVisible, onClose }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-bounce-in">
      <div className="bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-4 flex items-center gap-3 transform transition-all duration-300 hover:scale-105">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        <p className="font-medium text-sm pr-6">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}