/**
 * Main Application Component with React Router, Role Guards, and Protected Layout.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { useSidebar } from './context/SidebarContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Navbar } from './components/layout/Navbar.js';

import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ClientsPage } from './pages/ClientsPage.js';
import { SuppliersPage } from './pages/SuppliersPage.js';
import { InvoicesPage } from './pages/InvoicesPage.js';
import { MonthlyG50Page } from './pages/MonthlyG50Page.js';
import { ProvisionalAPPage } from './pages/ProvisionalAPPage.js';
import { EmployerDecPage } from './pages/EmployerDecPage.js';
import { FinancialReportsPage } from './pages/FinancialReportsPage.js';
import { ArchivePage } from './pages/ArchivePage.js';

// Accountant & CFO Suite Pages
import { JournalEntryGridPage } from './pages/accountant/JournalEntryGridPage.js';
import { PayrollPage } from './pages/accountant/PayrollPage.js';
import { FixedAssetsPage } from './pages/accountant/FixedAssetsPage.js';
import { BankReconciliationPage } from './pages/accountant/BankReconciliationPage.js';
import { TaxPackagePage } from './pages/accountant/TaxPackagePage.js';
import { FiscalClosingPage } from './pages/accountant/FiscalClosingPage.js';

// Superadmin Pages
import { PermissionsPage } from './pages/admin/PermissionsPage.js';

/**
 * Role-Based Route Guard.
 * Restricts access based on user role (e.g. blocks COMMERCIAL from fiscal/accounting).
 */
const RoleGuard: React.FC<{
  allowedRoles: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ allowedRoles, children, fallbackPath = '/invoices' }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role.toUpperCase();
  // Superadmin or Admin always have unrestricted access
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-tn-red border-t-transparent" />
          <span>Chargement du dossier comptable...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 ${isCollapsed ? 'ml-[68px]' : 'ml-64'} transition-all duration-200 flex flex-col min-h-screen`}>
        <Navbar />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto pb-12">
          {children}
        </main>

        {/* Persistent Accounting Status Bar */}
        <footer className="sticky bottom-0 z-20 h-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-4 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {user.tenantName}
            </span>
            <span className="hidden sm:inline font-mono opacity-70">
              MF: {user.tenantTaxId}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Exercice {new Date().getFullYear()} (Ouvert)
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
            <span className="hidden lg:inline text-slate-400">
              Rôle : <strong className="text-purple-600 dark:text-purple-400 font-bold">{user.role}</strong>
            </span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              TND (1 000 Millimes)
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Commercial & Common Routes */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedLayout>
            <ClientsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/suppliers"
        element={
          <ProtectedLayout>
            <SuppliersPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/invoices"
        element={
          <ProtectedLayout>
            <InvoicesPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/archive"
        element={
          <ProtectedLayout>
            <ArchivePage />
          </ProtectedLayout>
        }
      />

      {/* Fiscal Routes: Restricted to ACCOUNTANT & SUPERADMIN (Commercial Blocked) */}
      <Route
        path="/fiscal/g50"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <MonthlyG50Page />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/fiscal/ap"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <ProvisionalAPPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/fiscal/employer"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <EmployerDecPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      {/* Dedicated Accountant / CFO Suite Routes: Restricted to ACCOUNTANT & SUPERADMIN */}
      <Route
        path="/accounting/statements"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <FinancialReportsPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/journal"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <JournalEntryGridPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/payroll"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <PayrollPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/assets"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <FixedAssetsPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/reconciliation"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <BankReconciliationPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/tax-package"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <TaxPackagePage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route
        path="/accountant/closing"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['ACCOUNTANT', 'SUPERADMIN', 'ADMIN']}>
              <FiscalClosingPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      {/* Superadmin Console Route: Strictly Restricted to SUPERADMIN */}
      <Route
        path="/admin/permissions"
        element={
          <ProtectedLayout>
            <RoleGuard allowedRoles={['SUPERADMIN', 'ADMIN']} fallbackPath="/">
              <PermissionsPage />
            </RoleGuard>
          </ProtectedLayout>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
