/**
 * Sidebar Navigation Menu with Strict Role-Based Access Control (RBAC).
 * Separates Commercial (Ventes / Achats) from Accountant (Cabinet / DAF / Fiscalité G50) & Superadmin.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useI18n } from '../../context/I18nContext.js';
import { useSidebar } from '../../context/SidebarContext.js';
import {
  LayoutDashboard,
  Users,
  Truck,
  FileSpreadsheet,
  Receipt,
  Coins,
  FileCheck2,
  PieChart,
  Trash2,
  Scale,
  Keyboard,
  Briefcase,
  Building2,
  Landmark,
  Calculator,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [navMode, setNavMode] = useState<'ALL' | 'ACCOUNTANT' | 'COMMERCIAL'>('ALL');

  const role = (user?.role || 'ACCOUNTANT').toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN' || role === 'ADMIN';
  const isAccountant = role === 'ACCOUNTANT' || isSuperAdmin;
  const isCommercial = role === 'COMMERCIAL';

  // Commercial navigation: strictly Clients, Suppliers, Invoices & Dashboard. NO G50!
  const commercialNavItems = [
    { to: '/', label: t('navDashboard'), icon: LayoutDashboard },
    { to: '/clients', label: t('navClients'), icon: Users },
    { to: '/suppliers', label: t('navSuppliers'), icon: Truck },
    { to: '/invoices', label: t('navInvoices'), icon: FileSpreadsheet },
  ];

  // Fiscal Declarations: STRICTLY RESERVED FOR ACCOUNTANT / DAF
  const fiscalNavItems = [
    { to: '/fiscal/g50', label: t('navMonthlyG50'), icon: Receipt, badge: 'DGI' },
    { to: '/fiscal/ap', label: t('navProvisionalAP'), icon: Coins, badge: 'AP' },
    { to: '/fiscal/employer', label: t('navEmployerDec'), icon: FileCheck2, badge: 'TEJ' },
  ];

  // General Accounting & Finance: STRICTLY RESERVED FOR ACCOUNTANT / DAF
  const accountantNavItems = [
    { to: '/accountant/journal', label: t('navJournalGrid'), icon: Keyboard, badge: 'Rapide' },
    { to: '/accounting/statements', label: t('navFinancialReports'), icon: PieChart },
    { to: '/accountant/payroll', label: t('navPayroll'), icon: Briefcase },
    { to: '/accountant/assets', label: t('navAssets'), icon: Building2 },
    { to: '/accountant/reconciliation', label: t('navBankReconciliation'), icon: Landmark },
    { to: '/accountant/tax-package', label: t('navTaxPackage'), icon: Calculator },
    { to: '/accountant/closing', label: t('navFiscalClosing'), icon: Lock },
  ];

  // SuperAdmin Only: Tenants and Granular Permissions Management
  const adminNavItems = [
    { to: '/admin/permissions', label: t('navPermissions'), icon: ShieldCheck, badge: 'Admin' },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-subtle select-none transition-all duration-200 ${
        isCollapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`flex h-16 items-center border-b border-slate-200/80 dark:border-slate-800/80 ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-tn-carmin-primary text-white shadow-sm shrink-0">
            <Scale className="size-4.5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white block leading-tight">
                FINANCE <span className="text-tn-carmin-primary">TUNISIE</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                LOI 96-112 & NCT
              </span>
            </div>
          )}
        </div>

        {/* Toggle Button in Header */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Déplier le menu (Sidebar)' : 'Replier le menu (Sidebar)'}
          aria-label={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          className={`size-7 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors ${
            isCollapsed ? 'mt-1' : ''
          }`}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Role Pill Banner for Accountant vs Commercial */}
      {!isCollapsed && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Rôle Actif :</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              isSuperAdmin
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                : isAccountant
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
            }`}>
              {role}
            </span>
          </div>
        </div>
      )}

      {/* Mode Switcher Pill (Only for Accountant & Superadmin who have multiple view capabilities) */}
      {!isCommercial && !isCollapsed ? (
        <div className="px-3 pt-1 pb-1">
          <div className="p-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-3 text-[10px] font-bold text-center">
            <button
              onClick={() => setNavMode('ALL')}
              className={`py-1 rounded-sm transition-all ${
                navMode === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setNavMode('ACCOUNTANT')}
              className={`py-1 rounded-sm transition-all ${
                navMode === 'ACCOUNTANT'
                  ? 'bg-amber-500 text-white shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              DAF
            </button>
            <button
              onClick={() => setNavMode('COMMERCIAL')}
              className={`py-1 rounded-sm transition-all ${
                navMode === 'COMMERCIAL'
                  ? 'bg-tn-carmin-primary text-white shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ventes
            </button>
          </div>
        </div>
      ) : !isCommercial ? (
        <div className="px-2 pt-2 pb-1 flex justify-center">
          <button
            onClick={() => {
              if (navMode === 'ALL') setNavMode('ACCOUNTANT');
              else if (navMode === 'ACCOUNTANT') setNavMode('COMMERCIAL');
              else setNavMode('ALL');
            }}
            title={`Filtre vue : ${navMode} (cliquer pour basculer)`}
            className="size-8 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </div>
      ) : undefined}

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3 scrollbar-thin">
        {/* SUPERADMIN SECTION: Tenants & Permission Granting */}
        {isSuperAdmin && (
          <div className="pb-1">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                <span>Superadmin</span>
                <span className="size-1.5 rounded-full bg-purple-500" />
              </div>
            )}
            <div className="space-y-0.5 mt-0.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                        isCollapsed ? 'justify-center' : 'justify-between'
                      } ${
                        isActive
                          ? 'bg-purple-600/15 text-purple-700 dark:text-purple-300 font-bold border-l-2 border-purple-600 shadow-subtle'
                          : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge ? (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                        {item.badge}
                      </span>
                    ) : undefined}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* ACCOUNTANT / CFO SECTION: Only for Accountant & Superadmin */}
        {isAccountant && (navMode === 'ALL' || navMode === 'ACCOUNTANT') && (
          <div>
            {/* Fiscalité Tunisienne (DGI) */}
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                <span>Fiscalité DGI & G50</span>
                <span className="size-1.5 rounded-full bg-rose-500" />
              </div>
            )}
            <div className="space-y-0.5 mt-0.5">
              {fiscalNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                        isCollapsed ? 'justify-center' : 'justify-between'
                      } ${
                        isActive
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border-l-2 border-rose-600 shadow-subtle'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge ? (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400">
                        {item.badge}
                      </span>
                    ) : undefined}
                  </NavLink>
                );
              })}
            </div>

            {/* Comptabilité Générale (SCE / NCT) */}
            {!isCollapsed && (
              <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center justify-between">
                <span>{t('accountantSuiteSection')}</span>
                <span className="size-1.5 rounded-full bg-amber-500" />
              </div>
            )}
            <div className="space-y-0.5 mt-0.5">
              {accountantNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                        isCollapsed ? 'justify-center' : 'justify-between'
                      } ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border-l-2 border-amber-600 shadow-subtle'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge ? (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {item.badge}
                      </span>
                    ) : undefined}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* COMMERCIAL SECTION: Clients, Suppliers, Invoices */}
        {(isCommercial || navMode === 'ALL' || navMode === 'COMMERCIAL') && (
          <div className={!isCommercial && !isCollapsed ? 'pt-2 border-t border-slate-100 dark:border-slate-800/60' : ''}>
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Gestion Commerciale
              </div>
            )}
            <div className="space-y-0.5 mt-0.5">
              {commercialNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                        isCollapsed ? 'justify-center' : 'gap-2.5'
                      } ${
                        isActive
                          ? 'bg-red-50 dark:bg-red-950/40 text-tn-carmin-primary dark:text-red-400 font-bold border-l-2 border-tn-carmin-primary shadow-subtle'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* System & Archive */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Dossier & Archive
            </div>
          )}
          <div className="mt-0.5">
            <NavLink
              to="/archive"
              title={isCollapsed ? t('navArchive') : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                  isCollapsed ? 'justify-center' : 'gap-2.5'
                } ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Trash2 className="size-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{t('navArchive')}</span>}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 p-2.5">
        {!isCollapsed ? (
          <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 p-2 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Monnaie Légale</span>
              <span className="font-mono font-bold text-tn-carmin-primary">TND</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">1 DT = 1 000 Millimes</p>
          </div>
        ) : (
          <div className="flex justify-center" title="1 DT = 1 000 Millimes (TND)">
            <span className="px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-tn-carmin-primary">
              TND
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
