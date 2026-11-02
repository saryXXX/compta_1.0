/**
 * Header Navigation Bar with Tenant Switcher, Sidebar Toggle, Language & Theme Controls.
 * High-precision financial workstation header with crisp razor-sharp styling.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useI18n } from '../../context/I18nContext.js';
import { useSidebar } from '../../context/SidebarContext.js';
import {
  Building2,
  Sun,
  Moon,
  Globe2,
  LogOut,
  ChevronDown,
  Coins,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Tenant } from '../../types/index.js';

export const Navbar: React.FC = () => {
  const { user, logout, switchTenant, authFetch } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useI18n();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await authFetch('/api/auth/tenants');
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants || []);
        }
      } catch (err) {
        console.error('Failed to load tenants:', err);
      }
    };
    fetchTenants();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 shadow-subtle transition-colors">
      {/* Left: Sidebar Toggle + Active Tenant */}
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
          aria-label="Basculer la barre latérale"
          className="size-8 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4 text-tn-carmin-primary" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>

        {/* Active Tenant / Company Info */}
        <div className="relative">
          <button
            onClick={() => setIsTenantDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-subtle"
          >
            <div className="size-6 rounded bg-tn-red/10 dark:bg-tn-red/20 text-tn-red flex items-center justify-center shrink-0">
              <Building2 className="size-3.5" />
            </div>
            <div className="text-left">
              <span className="font-bold block max-w-[190px] truncate leading-tight">
                {user?.tenantName || 'Société Principale'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight block">
                MF : {user?.tenantTaxId || '1485962B/A/M/000'}
              </span>
            </div>
            <ChevronDown className="size-3.5 text-slate-400 ml-1 transition-transform duration-150" />
          </button>

          {isTenantDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-lg bg-white dark:bg-slate-900 p-2 shadow-elevated border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Dossiers Comptables (Multi-Sociétés)
              </div>
              <div className="mt-1 space-y-1">
                {tenants.map((ten) => {
                  const isCurrent = ten.id === user?.tenantId;
                  return (
                    <button
                      key={ten.id}
                      onClick={async () => {
                        await switchTenant(ten.id);
                        setIsTenantDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                        isCurrent
                          ? 'bg-red-50 dark:bg-red-950/40 text-tn-red font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{ten.name}</span>
                        <span className="text-[10px] opacity-60 font-mono block">{ten.taxId}</span>
                      </div>
                      {isCurrent && <Check className="size-3.5 shrink-0 text-tn-red" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Currency Standard Badge */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Coins className="size-3 text-amber-500" />
          <span>1 TND = 1 000 Millimes</span>
        </div>
      </div>

      {/* Right Controls: Language, Theme, User, Logout */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          title="Changer de langue (FR / EN)"
          aria-label="Changer de langue"
          className="flex items-center gap-1.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-subtle"
        >
          <Globe2 className="size-3.5 text-slate-400" />
          <span className="uppercase text-[11px] font-bold">{language}</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Mode Clair' : 'Mode Sombre'}
          aria-label="Basculer le thème clair/sombre"
          className="rounded-md border border-slate-200/80 dark:border-slate-700/80 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-subtle"
        >
          {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-slate-600" />}
        </button>

        {/* User Info & Logout */}
        <div className="ml-2 flex items-center gap-2.5 border-l border-slate-200 dark:border-slate-800 pl-3">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {user?.fullName || 'Utilisateur'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              {user?.role || 'Admin'}
            </span>
          </div>

          <button
            onClick={() => logout()}
            title={t('logout')}
            aria-label="Déconnexion"
            className="flex items-center justify-center size-8 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
