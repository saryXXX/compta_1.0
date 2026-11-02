/**
 * Modern Login Page with Three.js 3D Background.
 * Supports Light & Dark mode and French/English switching.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { GeometricWave } from '../components/three/GeometricWave.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Scale, Lock, User as UserIcon, Sun, Moon, Globe2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Identifiants invalides.');
        return;
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-slate-100 p-4">
      {/* Three.js 3D Interactive Wave Background */}
      <GeometricWave />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors backdrop-blur shadow-sm"
        >
          <Globe2 className="h-4 w-4 text-slate-400" />
          <span className="uppercase">{language}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-300 hover:bg-slate-800 transition-colors backdrop-blur shadow-sm"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        {/* Emblem & Title */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-tn-red text-white shadow-md">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            FINANCE <span className="text-tn-red">TUNISIE</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('loginSubtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error ? (
          <div className="mt-5 rounded-md bg-rose-50 dark:bg-rose-950/50 p-3 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : undefined}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={t('username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftIcon={<UserIcon className="h-4 w-4" />}
            required
            autoComplete="username"
          />

          <Input
            label={t('password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightAction={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
            {t('signIn')}
          </Button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 rounded-md bg-slate-50 dark:bg-slate-850 p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            {t('demoAccountHint')}
          </p>
          <div className="mt-1 font-mono text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400">
            <p>Utilisateur : <span className="font-bold text-slate-900 dark:text-white">admin</span></p>
            <p>Mot de passe : <span className="font-bold text-slate-900 dark:text-white">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

