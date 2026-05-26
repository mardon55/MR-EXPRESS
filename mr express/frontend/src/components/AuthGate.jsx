import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';

const inputClass =
  'glass-subtle w-full rounded-squircle px-4 py-3.5 text-[15px] text-neutral-900 outline-none transition-fluid placeholder:text-neutral-400 focus:ring-2 focus:ring-ios-blue/30';

export default function AuthGate() {
  const { register, login } = useApp();
  const { tg } = useTelegram();
  const [view, setView] = useState('welcome');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const showError = (msg) => {
    setError(msg);
    tg?.showAlert?.(msg);
  };

  const handleLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await login();
    } catch (e) {
      showError(e.message || 'Kirish amalga oshmadi');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      showError("Barcha maydonlarni to'ldiring");
      return;
    }
    setBusy(true);
    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
    } catch (err) {
      showError(err.message || "Ro'yxatdan o'tish amalga oshmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scroll-area flex h-full flex-col items-center justify-center px-5 py-8">
      <div className="glass-float w-full max-w-md p-6 shadow-glass-lg sm:p-8">
        {view === 'welcome' && (
          <>
            <div className="mb-6 text-center">
              <div className="glass-subtle mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-glass">
                🛍
              </div>
              <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
                MR Express
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ios-muted">
                Do&apos;konni ko&apos;rish uchun ro&apos;yxatdan o&apos;ting yoki tizimga kiring
              </p>
            </div>

            {error && (
              <p className="mb-4 rounded-squircle bg-ios-red/10 px-4 py-3 text-center text-sm font-medium text-ios-red">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError('');
                setView('register');
              }}
              className="press-fluid mb-3 w-full rounded-squircle bg-ios-blue py-3.5 font-semibold text-white shadow-glass disabled:opacity-50"
            >
              Ro&apos;yxatdan o&apos;tish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleLogin}
              className="press-fluid glass-subtle w-full rounded-squircle py-3.5 font-semibold text-ios-blue transition-fluid disabled:opacity-50"
            >
              {busy ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
            </button>
          </>
        )}

        {view === 'register' && (
          <>
            <button
              type="button"
              onClick={() => {
                setError('');
                setView('welcome');
              }}
              className="mb-4 flex items-center gap-1 text-sm font-medium text-ios-blue press-fluid"
            >
              ← Orqaga
            </button>

            <h2 className="mb-1 text-[22px] font-bold tracking-tight text-neutral-900">
              Ro&apos;yxatdan o&apos;tish
            </h2>
            <p className="mb-6 text-sm text-ios-muted">
              Ism, familiya va telefon raqamingizni kiriting
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ios-muted">Ism</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Masalan: Ali"
                  className={inputClass}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ios-muted">Familiya</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Masalan: Karimov"
                  className={inputClass}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ios-muted">
                  Telefon raqam
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>

              {error && (
                <p className="rounded-squircle bg-ios-red/10 px-4 py-3 text-center text-sm font-medium text-ios-red">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="press-fluid w-full rounded-squircle bg-ios-blue py-3.5 font-semibold text-white shadow-glass disabled:opacity-50"
              >
                {busy ? 'Saqlanmoqda...' : "Ro'yxatdan o'tish"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs font-medium text-neutral-400">
        Ma&apos;lumotlaringiz profil bo&apos;limida saqlanadi
      </p>
    </div>
  );
}
