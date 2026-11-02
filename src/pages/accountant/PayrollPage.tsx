/**
 * Tunisian Payroll & Social Security (CNSS) Management Page.
 * Implements employee records, monthly payroll slips generation,
 * progressive IRPP, CSS, TFP, FOPROLOS, and automatic double-entry voucher posting.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { Badge } from '../../components/ui/Badge.js';
import { MetricCard } from '../../components/ui/MetricCard.js';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay.js';
import { Employee, PayrollSlip } from '../../types/index.js';
import {
  Briefcase,
  Plus,
  Users,
  FileText,
  Calculator,
  CheckCircle2,
  Send,
  Building,
  UserCheck,
} from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'employees' | 'slips'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isGenerateSlipModalOpen, setIsGenerateSlipModalOpen] = useState<boolean>(false);

  // New Employee Form State
  const [cinNumber, setCinNumber] = useState<string>('');
  const [cnssNumber, setCnssNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<string>('1200.000');
  const [maritalStatus, setMaritalStatus] = useState<string>('CELIBATAIRE');
  const [dependentChildren, setDependentChildren] = useState<string>('0');

  // Slip generation state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [simulation, setSimulation] = useState<any | undefined>(undefined);
  const [autoPostVoucher, setAutoPostVoucher] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchEmployees();
    fetchSlips();
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/payroll/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlips = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/payroll/slips?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlips(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/payroll/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cinNumber,
          cnssNumber: cnssNumber || undefined,
          fullName,
          jobTitle,
          baseSalary: parseFloat(baseSalary),
          maritalStatus,
          dependentChildren: parseInt(dependentChildren, 10),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de la création du salarié');
      }

      setIsEmployeeModalOpen(false);
      setMessage('Salarié enregistré avec succès !');
      // Reset form
      setCinNumber('');
      setCnssNumber('');
      setFullName('');
      setJobTitle('');
      setBaseSalary('1200.000');
      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/payroll/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          baseSalary: emp.baseSalary,
          maritalStatus: emp.maritalStatus,
          dependentChildren: emp.dependentChildren,
        }),
      });
      if (res.ok) {
        const simData = await res.json();
        setSimulation(simData);
        setIsGenerateSlipModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSlip = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/payroll/slips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          month: selectedMonth,
          year: selectedYear,
          postVoucher: autoPostVoucher,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de la génération du bulletin');
      }

      setIsGenerateSlipModalOpen(false);
      setMessage('Bulletin de paie généré et écriture comptabilisée !');
      fetchSlips();
      setActiveTab('slips');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handlePostVoucherForSlip = async (slipId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/payroll/slips/${slipId}/post-voucher`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage('Écriture de paie passée avec succès au Journal OD !');
        fetchSlips();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalGrossSalaries = slips.reduce((s, slip) => s + slip.grossSalary, 0);
  const totalNetSalaries = slips.reduce((s, slip) => s + slip.netSalary, 0);
  const totalCnssDue = slips.reduce((s, slip) => s + (slip.cnssEmployee + slip.cnssEmployer), 0);
  const totalIrppDue = slips.reduce((s, slip) => s + (slip.irppWithheld + slip.cssAmount), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('payrollTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('payrollSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => setIsEmployeeModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('newEmployee')}
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {error}
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Masse Salariale Brute"
          value={<CurrencyDisplay amount={totalGrossSalaries} />}
          description={`Mois ${selectedMonth}/${selectedYear}`}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Salaires Nets à Payer"
          value={<CurrencyDisplay amount={totalNetSalaries} />}
          description="Comptes 421100"
          icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Total CNSS (Sal.+Pat.)"
          value={<CurrencyDisplay amount={totalCnssDue} />}
          description="9.18% + 16.57% (Compte 453100)"
          icon={<Building className="w-5 h-5 text-blue-600" />}
        />
        <MetricCard
          title="IRPP & CSS Retenus"
          value={<CurrencyDisplay amount={totalIrppDue} />}
          description="Compte 432100 (Déclaration G50)"
          icon={<Calculator className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Tab Navigation & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'employees'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('employeesTab')} ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('slips')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'slips'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('paySlipsTab')} ({slips.length})
          </button>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Mois {m < 10 ? `0${m}` : m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Employees List */}
      {activeTab === 'employees' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">CIN & CNSS</th>
                <th className="py-3 px-4">Poste</th>
                <th className="py-3 px-4">Situation / Enfants</th>
                <th className="py-3 px-4 text-right">Salaire de Base Brut</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucun salarié enregistré. Cliquez sur "Nouveau Salarié" pour commencer.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {emp.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      <div>CIN: {emp.cinNumber}</div>
                      {emp.cnssNumber && <div className="text-[10px] text-slate-400">CNSS: {emp.cnssNumber}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {emp.jobTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <Badge variant="neutral">{emp.maritalStatus}</Badge>
                      <span className="ml-2">{emp.dependentChildren} enfant(s)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={emp.baseSalary} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSimulate(emp.id)}
                      >
                        <Calculator className="w-3.5 h-3.5 mr-1" />
                        Générer Bulletin
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Pay Slips */}
      {activeTab === 'slips' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4 text-right">Salaire Brut</th>
                <th className="py-3 px-4 text-right">CNSS Salarié (9.18%)</th>
                <th className="py-3 px-4 text-right">IRPP & CSS</th>
                <th className="py-3 px-4 text-right">Net à Payer</th>
                <th className="py-3 px-4 text-right">Charges Patronales</th>
                <th className="py-3 px-4 text-center">Statut Comptable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {slips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucun bulletin généré pour le mois {selectedMonth}/{selectedYear}.
                  </td>
                </tr>
              ) : (
                slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {slip.employee?.fullName || 'Salarié'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <CurrencyDisplay amount={slip.grossSalary} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      -<CurrencyDisplay amount={slip.cnssEmployee} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600">
                      -<CurrencyDisplay amount={slip.irppWithheld + slip.cssAmount} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      <CurrencyDisplay amount={slip.netSalary} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      <CurrencyDisplay amount={slip.cnssEmployer + slip.tfpAmount + slip.foprolosAmount} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {slip.isAccounted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Comptabilisé
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePostVoucherForSlip(slip.id)}
                        >
                          Comptabiliser OD
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Employee */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title="Créer une Fiche Salarié"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <Input
            label={t('fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ex: Mohamed Ben Ali"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('cinNumber')}
              value={cinNumber}
              onChange={(e) => setCinNumber(e.target.value)}
              placeholder="ex: 08765432"
              required
            />
            <Input
              label={t('cnssNumber')}
              value={cnssNumber}
              onChange={(e) => setCnssNumber(e.target.value)}
              placeholder="ex: 12345678-90"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('jobTitle')}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex: Comptable Unique"
            />
            <Input
              label={t('baseSalary')}
              type="number"
              step="0.001"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('maritalStatus')}
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              options={[
                { value: 'CELIBATAIRE', label: 'Célibataire' },
                { value: 'MARIE', label: 'Marié(e)' },
                { value: 'DIVORCE', label: 'Divorcé(e)' },
                { value: 'VEUF', label: 'Veuf / Veuve' },
              ]}
            />
            <Input
              label={t('dependentChildren')}
              type="number"
              min="0"
              max="10"
              value={dependentChildren}
              onChange={(e) => setDependentChildren(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsEmployeeModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Generate Monthly Slip with Simulation Breakdown */}
      <Modal
        isOpen={isGenerateSlipModalOpen}
        onClose={() => setIsGenerateSlipModalOpen(false)}
        title={`Calcul du Bulletin de Paie - ${selectedMonth}/${selectedYear}`}
      >
        {simulation && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-semibold">
                <span>Salaire Brut de Base :</span>
                <span className="font-mono">{simulation.grossSalary.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>(-) Retenue CNSS Salarié (9.18%) :</span>
                <span className="font-mono">-{simulation.cnssEmployee.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-1">
                <span>(=) Salaire Brut Imposable :</span>
                <span className="font-mono">{simulation.taxableSalary.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Déduction Frais Professionnels (10%) :</span>
                <span className="font-mono">{simulation.professionalDeduction.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Déductions Familiales (Chef + Enfants) :</span>
                <span className="font-mono">{simulation.familyDeduction.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>(-) Retenue IRPP mensuelle :</span>
                <span className="font-mono">-{simulation.irppWithheld.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>(-) Contribution Sociale Solidarité (CSS 1%) :</span>
                <span className="font-mono">-{simulation.cssAmount.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-600 border-t border-slate-300 dark:border-slate-700 pt-1.5">
                <span>(=) Net à Payer au Salarié :</span>
                <span className="font-mono">{simulation.netSalary.toFixed(3)} DT</span>
              </div>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 space-y-1 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-amber-800 dark:text-amber-400">Charges Patronales & Coût Global :</p>
              <div className="flex justify-between">
                <span>CNSS Patronale (16.57%) :</span>
                <span className="font-mono">{simulation.cnssEmployer.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between">
                <span>TFP (2%) :</span>
                <span className="font-mono">{simulation.tfpAmount.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between">
                <span>FOPROLOS (1%) :</span>
                <span className="font-mono">{simulation.foprolosAmount.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-amber-200 pt-1">
                <span>Coût Global Entreprise :</span>
                <span className="font-mono">{simulation.totalEmployerCost.toFixed(3)} DT</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoPostVoucher}
                onChange={(e) => setAutoPostVoucher(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Générer et comptabiliser immédiatement l’écriture d’OD de paie équilibrée</span>
            </label>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={() => setIsGenerateSlipModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="button" variant="primary" onClick={handleGenerateSlip} disabled={loading}>
                {loading ? t('loading') : 'Valider & Émettre Bulletin'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

