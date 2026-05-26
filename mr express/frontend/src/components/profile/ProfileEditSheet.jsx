import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import { useTelegram } from '../../hooks/useTelegram';

const inputClass =
  'w-full rounded-xl border border-theme bg-theme-bg px-3.5 py-2.5 text-[15px] text-theme outline-none transition-fluid focus:ring-2 focus:ring-[var(--theme-accent)]';
export default function ProfileEditSheet({ open, onClose, profile, onSaved }) {
  const { updateUser } = useApp();
  const { tg } = useTelegram();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [open, profile]);

  if (!open) return null;

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      tg?.showAlert?.("Barcha maydonlarni to'ldiring");
      return;
    }
    setSaving(true);
    try {
      const p = await api.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      updateUser({
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
      });
      onSaved(p);
      tg?.showAlert?.('Saqlandi!');
      onClose();
    } catch (e) {
      tg?.showAlert?.(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-hidden rounded-t-[20px] bg-theme-card px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-theme-icon" />
        <h3 className="mb-4 text-[17px] font-semibold text-theme">Profilni tahrirlash</h3>        <div className="scroll-area max-h-[50dvh] space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-muted">Ism</label>            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-muted">Familiya</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              autoComplete="family-name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-muted">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className={inputClass}
              autoComplete="tel"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="press-fluid btn-theme-accent mt-4 w-full rounded-xl py-3 text-[15px] font-semibold disabled:opacity-50"        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </div>
  );
}
