'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Star, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setToken(res.data.token);
      setUser({ id: res.data.id, email: res.data.email, role: res.data.role });
      router.push('/dashboard');
    } catch {
      toast.error('Geçersiz email veya şifre.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Star className="text-purple-400 w-6 h-6" />
          <span className="text-white text-xl font-semibold">Mystic Admin</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-white text-lg font-semibold mb-6">Giriş Yap</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="admin@mysticai.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
