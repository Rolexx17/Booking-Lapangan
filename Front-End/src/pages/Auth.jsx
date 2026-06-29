import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Notification from '../components/Notification';
import { apiFetch, setSession } from '../lib/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notif, setNotif] = useState({ show: false, msg: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const bodyData = isLogin ? { email, password } : { name, email, password };

      const { ok, data } = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(bodyData)
      });

      if (ok && data.success) {
        if (isLogin) {
          setSession({ token: data.data.token, user: data.data.user });
          setNotif({ show: true, msg: 'Login berhasil!' });
          setTimeout(() => navigate('/'), 900);
        } else {
          setNotif({ show: true, msg: 'Registrasi berhasil! Silakan login.' });
          setIsLogin(true);
          setPassword('');
        }
      } else {
        const errMsg = data?.errors?.[0]?.message || data?.message || 'Terjadi kesalahan';
        setNotif({ show: true, msg: errMsg });
      }
    } catch {
      setNotif({ show: true, msg: 'Gagal menghubungi server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center -mt-6 sm:-mt-10 relative px-2">
      <Notification message={notif.msg} isVisible={notif.show} onClose={() => setNotif({ show: false, msg: '' })} />

      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1518605368461-1e1e114f51e0?auto=format&fit=crop&q=80&w=2000"
          alt="Stadium"
          className="w-full h-full object-cover opacity-20 dark:opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-gray-50 dark:from-luxury-dark/50 dark:to-luxury-dark backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-luxury-cardDark/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold mb-2">
            {isLogin ? 'Selamat Datang' : 'Buat Akun VIP'}
          </h2>
          <p className="text-sm text-gray-500">
            {isLogin ? 'Masuk untuk mengelola reservasi Anda.' : 'Bergabung untuk akses eksklusif.'}
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <button onClick={() => setIsLogin(true)} className={`flex-1 pb-2 text-sm font-medium transition-all ${isLogin ? 'border-b-2 border-luxury-gold text-luxury-gold' : 'border-b-2 border-transparent text-gray-400 hover:text-gray-600'}`}>
            Sign In
          </button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 pb-2 text-sm font-medium transition-all ${!isLogin ? 'border-b-2 border-luxury-gold text-luxury-gold' : 'border-b-2 border-transparent text-gray-400 hover:text-gray-600'}`}>
            Sign Up
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-luxury-gold outline-none"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-luxury-gold outline-none"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-luxury-gold outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-luxury-gold transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-xl font-bold transition-all ${
              loading
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-black dark:bg-white text-white dark:text-black hover:-translate-y-1 hover:shadow-xl'
            }`}
          >
            {loading ? 'Memproses...' : isLogin ? 'Masuk ke Arena' : 'Daftar Sekarang'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}