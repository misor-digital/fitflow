'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { isValidEmail } from '@/lib/catalog';

// ============================================================================
// Types
// ============================================================================

type AuthTab = 'register' | 'login';
type AuthPhase = 'form' | 'otp' | 'done';

interface InlineAuthProps {
  onAuthenticated: () => void;
  onBack: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function InlineAuth({ onAuthenticated, onBack }: InlineAuthProps) {
  const [tab, setTab] = useState<AuthTab>('register');
  const [phase, setPhase] = useState<AuthPhase>('form');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // OTP fields
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timers & state
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // ------------------------------------------------------------------
  // Countdown timer
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'otp' || expiresAt === 0) return;

    function tick() {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, expiresAt]);

  // ------------------------------------------------------------------
  // Tab switching resets to form phase
  // ------------------------------------------------------------------
  function switchTab(newTab: AuthTab) {
    setTab(newTab);
    setPhase('form');
    setError(null);
    setOtpDigits(['', '', '', '', '', '']);
  }

  // ------------------------------------------------------------------
  // Send OTP
  // ------------------------------------------------------------------
  const handleSendOtp = useCallback(async () => {
    setError(null);

    // Client-side validation
    if (tab === 'register' && !fullName.trim()) {
      setError('Моля, въведете вашето име.');
      return;
    }

    if (!email.trim() || !isValidEmail(email)) {
      setError('Моля, въведете валиден имейл адрес.');
      return;
    }

    setSending(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: tab === 'register' ? fullName.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Възникна грешка.');
        return;
      }

      // Transition to OTP phase
      setExpiresAt(Date.now() + (data.expiresInSeconds ?? 600) * 1000);
      setOtpDigits(['', '', '', '', '', '']);
      setPhase('otp');

      // Focus first OTP input after render
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch {
      setError('Възникна грешка. Моля, опитайте по-късно.');
    } finally {
      setSending(false);
    }
  }, [email, fullName, tab]);

  // ------------------------------------------------------------------
  // Verify OTP
  // ------------------------------------------------------------------
  const handleVerifyOtp = useCallback(
    async (code: string) => {
      setError(null);
      setVerifying(true);

      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: code,
            fullName: tab === 'register' ? fullName.trim() : undefined,
            intent: tab,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Невалиден код.');
          setOtpDigits(['', '', '', '', '', '']);
          setTimeout(() => otpRefs.current[0]?.focus(), 50);
          return;
        }

        // Establish browser session via Supabase client
        const supabase = createClient();
        const { error: authError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink',
        });

        if (authError) {
          console.error('[InlineAuth] verifyOtp failed:', authError);
          setError('Грешка при влизане. Моля, опитайте отново.');
          return;
        }

        // Session established — AuthProvider will pick up the change
        setPhase('done');
        setTimeout(() => onAuthenticated(), 400);
      } catch {
        setError('Възникна грешка. Моля, опитайте по-късно.');
      } finally {
        setVerifying(false);
      }
    },
    [email, fullName, tab, onAuthenticated],
  );

  // ------------------------------------------------------------------
  // OTP input handlers
  // ------------------------------------------------------------------
  function handleOtpChange(index: number, value: string) {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (digit && index === 5) {
      const code = next.join('');
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        handleVerifyOtp(code);
      }
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    // Focus last filled input or first empty
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();

    // Auto-submit if all 6 digits pasted
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  }

  // ------------------------------------------------------------------
  // Format countdown
  // ------------------------------------------------------------------
  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const isExpired = phase === 'otp' && secondsLeft === 0;

  // ==================================================================
  // Render: Done phase
  // ==================================================================
  if (phase === 'done') {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)] mb-2">
          Готово!
        </h3>
        <p className="text-sm text-gray-600">
          {tab === 'register' ? 'Акаунтът е създаден.' : 'Влязохте успешно.'}
        </p>
      </div>
    );
  }

  // ==================================================================
  // Render: Form + OTP phases
  // ==================================================================
  return (
    <div>
      {/* Auth requirement notice */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg">
        <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
          Абонаментните кутии изискват акаунт. Влез или създай нов, за да продължиш.
        </p>

        {/* Tab toggle */}
        <div className="flex gap-2 sm:gap-3 mb-6">
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 py-3 px-4 border-2 rounded-xl font-semibold text-sm sm:text-base transition-all ${
              tab === 'register'
                ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)]'
            }`}
          >
            Нов акаунт
          </button>
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 px-4 border-2 rounded-xl font-semibold text-sm sm:text-base transition-all ${
              tab === 'login'
                ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-navy)]'
            }`}
          >
            Вече имам акаунт
          </button>
        </div>

        {/* ---- FORM PHASE ---- */}
        {phase === 'form' && (
          <div className="space-y-4">
            {tab === 'register' && (
              <div>
                <label htmlFor="inline-auth-name" className="block text-sm font-semibold text-[var(--color-brand-navy)] mb-1">
                  Имена <span className="text-red-500">*</span>
                </label>
                <input
                  id="inline-auth-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:outline-none focus:border-[var(--color-brand-orange)] transition-colors"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label htmlFor="inline-auth-email" className="block text-sm font-semibold text-[var(--color-brand-navy)] mb-1">
                Имейл <span className="text-red-500">*</span>
              </label>
              <input
                id="inline-auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:outline-none focus:border-[var(--color-brand-orange)] transition-colors"
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sending}
              className="w-full bg-[var(--color-brand-orange)] text-white py-3 rounded-xl font-semibold text-sm sm:text-base hover:bg-[#e67100] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Изпращане...
                </span>
              ) : (
                'Изпрати код за потвърждение'
              )}
            </button>
          </div>
        )}

        {/* ---- OTP PHASE ---- */}
        {phase === 'otp' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm sm:text-base text-[var(--color-brand-navy)]">
                Изпратихме 6-цифрен код на
              </p>
              <p className="font-semibold text-[var(--color-brand-navy)]">{email}</p>
            </div>

            {/* OTP digit inputs */}
            <div
              role="group"
              aria-label="Код за потвърждение"
              className="flex justify-center gap-2 sm:gap-3"
            >
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  disabled={isExpired || verifying}
                  aria-label={`Цифра ${i + 1} от 6`}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-xl
                    focus:outline-none transition-colors
                    ${isExpired
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:border-[var(--color-brand-orange)] text-[var(--color-brand-navy)]'
                    }
                    ${verifying ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                />
              ))}
            </div>

            {/* Verifying spinner */}
            {verifying && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <span className="animate-spin h-4 w-4 border-2 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
                  Проверка...
                </span>
              </div>
            )}

            {/* Timer / Expired state */}
            {!verifying && (
              <div className="text-center">
                {isExpired ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 font-semibold">Кодът изтече.</p>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sending}
                      className="text-sm font-semibold text-[var(--color-brand-orange)] hover:underline disabled:opacity-50"
                    >
                      {sending ? 'Изпращане...' : 'Изпрати нов код'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Кодът изтича след:{' '}
                    <span className="font-mono font-semibold text-[var(--color-brand-navy)]">
                      {formatTime(secondsLeft)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg text-center">{error}</p>
            )}

            {/* Change email */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setPhase('form');
                  setError(null);
                  setOtpDigits(['', '', '', '', '', '']);
                }}
                className="text-sm text-gray-500 hover:text-[var(--color-brand-navy)] hover:underline transition-colors"
              >
                ← Смени имейл
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
        >
          Назад
        </button>
      </div>
    </div>
  );
}
