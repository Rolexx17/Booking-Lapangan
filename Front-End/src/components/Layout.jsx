import { useContext, useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon, Menu, X, Bell, User, LogOut } from 'lucide-react';
import { clearSession, getCurrentUser, apiFetch } from '../lib/api';
import { getSocket } from '../lib/realtime';
import BookingReceiptModal from './BookingReceiptModal';

export default function Layout() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [me, setMe] = useState(getCurrentUser());
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const notifRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setMe(getCurrentUser());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Sync session data with the backend on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    (async () => {
      const { ok, data } = await apiFetch('/auth/me');
      if (ok && data?.success) {
        localStorage.setItem('user', JSON.stringify(data.data));
        setMe(data.data);
      }
    })();
  }, []);

  // Auto close notification dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!isNotifOpen) return;
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isNotifOpen]);

  // Realtime notification listeners
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { ok, data } = await apiFetch('/bookings/me/notifications');
      if (ok && data?.success) {
        setNotifications(data.data || []);
        setHasUnread((data.data || []).length > 0);
      }
    })();

    const socket = getSocket();
    const onNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setHasUnread(true);
    };
    socket.on('notification:new', onNotif);
    return () => socket.off('notification:new', onNotif);
  }, [me?.id]);

  const handleOpenNotif = () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    if (next) setHasUnread(false);
  };

  const openReceiptFromNotif = async (n) => {
    const booking = n.booking;
    if (booking) {
      setSelectedBooking(booking);
      setReceiptOpen(true);
      return;
    }
    const id = n.booking_id || n.booking?.id;
    if (!id) return;
    const { ok, data } = await apiFetch('/bookings/me');
    if (ok && data?.success) {
      const b = (data.data || []).find((x) => Number(x.id) === Number(id));
      if (b) {
        setSelectedBooking(b);
        setReceiptOpen(true);
      }
    }
  };

  const handleLogout = () => {
    clearSession();
    setMe(null);
    setNotifications([]);
    setHasUnread(false);
    navigate('/login');
  };

  const roleBadge =
    me?.role === 'admin' ? 'Admin' :
    me?.role === 'kasir' ? 'Kasir' :
    me?.role === 'customer' ? 'Customer' : '';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <BookingReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} booking={selectedBooking} />
      
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-luxury-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold bg-gradient-to-r from-luxury-gold to-yellow-600 bg-clip-text text-transparent">
                Lumina Arena
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="hover:text-luxury-gold transition">Katalog</Link>
              <Link to="/matchmaking" className="hover:text-luxury-gold transition">Matchmaking</Link>
              {me && <Link to="/dashboard" className="hover:text-luxury-gold transition">Dashboard</Link>}
              {(me?.role === 'admin' || me?.role === 'kasir') && (
                <Link to="/admin" className="hover:text-luxury-gold transition">Admin Panel</Link>
              )}

              <div className="flex items-center space-x-3 border-l pl-4 border-gray-300 dark:border-gray-700">
                {/* Notification Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleOpenNotif}
                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <Bell className="w-5 h-5" />
                    {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                  </button>

                  {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-luxury-cardDark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-sm">Notifikasi</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">Belum ada notifikasi.</div>
                        ) : (
                          notifications.map((n, idx) => (
                            <button
                              key={idx}
                              onClick={() => openReceiptFromNotif(n)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition block"
                            >
                              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Theme Toggle */}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-luxury-gold" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Auth Controls */}
                {!me ? (
                  <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-full bg-black dark:bg-luxury-gold text-white dark:text-black font-medium hover:opacity-90 transition shadow-lg">
                    <User className="w-4 h-4" /> Sign In
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="hidden lg:block text-right leading-tight">
                      <p className="text-sm font-semibold">{me.name}</p>
                      <p className="text-[11px] text-gray-500">{roleBadge}</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white font-medium hover:opacity-90 transition shadow-lg">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Actions Header */}
            <div className="md:hidden flex items-center gap-4">
              <button onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="w-5 h-5 text-luxury-gold" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-luxury-dark border-b border-gray-200 dark:border-gray-800">
            <div className="px-3 pt-2 pb-3 space-y-2">
              <Link to="/" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Katalog</Link>
              <Link to="/matchmaking" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Matchmaking</Link>
              {me && <Link to="/dashboard" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Dashboard</Link>}
              {(me?.role === 'admin' || me?.role === 'kasir') && (
                <Link to="/admin" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Admin Panel</Link>
              )}

              {!me ? (
                <Link to="/login" className="block px-3 py-2 rounded-md bg-black text-white">Sign In</Link>
              ) : (
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md bg-red-500 text-white">
                  Logout ({roleBadge})
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content View */}
      <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500">
        <p>© 2026 Lumina Arena. Eksklusivitas dalam setiap pertandingan.</p>
      </footer>
    </div>
  );
}