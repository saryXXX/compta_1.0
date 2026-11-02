/**
 * Payroll Router: Employee management & Tunisian payroll processing.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import { TunisianPayrollEngine, TunisianSalaryCalculationInput } from '../services/payrollEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/payroll/employees - List all active employees
router.get('/employees', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    res.json(employees);
  } catch (err: any) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: err.message || 'Error fetching employees' });
  }
});

// POST /api/payroll/employees - Create employee
router.post('/employees', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const {
      cinNumber,
      cnssNumber,
      fullName,
      jobTitle,
      baseSalary,
      maritalStatus,
      dependentChildren,
      hireDate,
    } = req.body;

    if (!cinNumber || !fullName || baseSalary === undefined) {
      res.status(400).json({ error: 'cinNumber, fullName and baseSalary are required' });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        cinNumber,
        cnssNumber: cnssNumber || undefined,
        fullName,
        jobTitle: jobTitle || 'Employé',
        baseSalary: parseFloat(baseSalary),
        maritalStatus: maritalStatus || 'CELIBATAIRE',
        dependentChildren: parseInt(dependentChildren || '0', 10),
        hireDate: hireDate || new Date().toISOString().split('T')[0],
      },
    });

    res.status(201).json(employee);
  } catch (err: any) {
    console.error('Error creating employee:', err);
    res.status(500).json({ error: err.message || 'Error creating employee' });
  }
});

// PUT /api/payroll/employees/:id - Update employee
router.put('/employees/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;
    const {
      cinNumber,
      cnssNumber,
      fullName,
      jobTitle,
      baseSalary,
      maritalStatus,
      dependentChildren,
      hireDate,
    } = req.body;

    const updated = await prisma.employee.updateMany({
      where: { id, tenantId },
      data: {
        cinNumber: cinNumber !== undefined ? cinNumber : undefined,
        cnssNumber: cnssNumber !== undefined ? cnssNumber : undefined,
        fullName: fullName !== undefined ? fullName : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle : undefined,
        baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : undefined,
        maritalStatus: maritalStatus !== undefined ? maritalStatus : undefined,
        dependentChildren: dependentChildren !== undefined ? parseInt(dependentChildren, 10) : undefined,
        hireDate: hireDate !== undefined ? hireDate : undefined,
      },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    res.json(employee);
  } catch (err: any) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: err.message || 'Error updating employee' });
  }
});

// DELETE /api/payroll/employees/:id - Soft delete employee
router.delete('/employees/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('employee', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Employee not found or could not be deleted' });
      return;
    }

    res.json({ success: true, message: 'Employee soft-deleted' });
  } catch (err: any) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: err.message || 'Error deleting employee' });
  }
});

// POST /api/payroll/simulate - Simulate payroll calculations without saving
router.post('/simulate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { baseSalary, maritalStatus, dependentChildren, tfpRate, foprolosRate, cssRate } = req.body;
    if (baseSalary === undefined) {
      res.status(400).json({ error: 'baseSalary is required' });
      return;
    }

    const input: TunisianSalaryCalculationInput = {
      baseSalary: parseFloat(baseSalary),
      maritalStatus: maritalStatus || 'CELIBATAIRE',
      dependentChildren: parseInt(dependentChildren || '0', 10),
      tfpRate: tfpRate !== undefined ? parseFloat(tfpRate) : undefined,
      foprolosRate: foprolosRate !== undefined ? parseFloat(foprolosRate) : undefined,
      cssRate: cssRate !== undefined ? parseFloat(cssRate) : undefined,
    };

    const result = TunisianPayrollEngine.calculatePayroll(input);
    res.json(result);
  } catch (err: any) {
    console.error('Error calculating payroll simulation:', err);
    res.status(500).json({ error: err.message || 'Error simulating payroll' });
  }
});

// GET /api/payroll/slips - List payroll slips
router.get('/slips', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const where: any = {
      tenantId,
      isDeleted: false,
    };
    if (month !== undefined) where.month = month;
    if (year !== undefined) where.year = year;

    const slips = await prisma.payrollSlip.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(slips);
  } catch (err: any) {
    console.error('Error fetching payroll slips:', err);
    res.status(500).json({ error: err.message || 'Error fetching slips' });
  }
});

// POST /api/payroll/slips - Generate and save a payroll slip
router.post('/slips', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { employeeId, month, year, postVoucher } = req.body;

    if (!employeeId || !month || !year) {
      res.status(400).json({ error: 'employeeId, month, and year are required' });
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, isDeleted: false },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const calcResult = TunisianPayrollEngine.calculatePayroll({
      baseSalary: employee.baseSalary,
      maritalStatus: employee.maritalStatus as any,
      dependentChildren: employee.dependentChildren,
    });

    // Save or upsert slip
    const slip = await prisma.payrollSlip.upsert({
      where: {
        tenantId_employeeId_month_year: {
          tenantId,
          employeeId,
          month: m,
          year: y,
        },
      },
      update: {
        grossSalary: calcResult.grossSalary,
        cnssEmployee: calcResult.cnssEmployee,
        taxableSalary: calcResult.taxableSalary,
        irppWithheld: calcResult.irppWithheld,
        cssAmount: calcResult.cssAmount,
        cnssEmployer: calcResult.cnssEmployer,
        tfpAmount: calcResult.tfpAmount,
        foprolosAmount: calcResult.foprolosAmount,
        netSalary: calcResult.netSalary,
        isDeleted: false,
      },
      create: {
        tenantId,
        employeeId,
        month: m,
        year: y,
        grossSalary: calcResult.grossSalary,
        cnssEmployee: calcResult.cnssEmployee,
        taxableSalary: calcResult.taxableSalary,
        irppWithheld: calcResult.irppWithheld,
        cssAmount: calcResult.cssAmount,
        cnssEmployer: calcResult.cnssEmployer,
        tfpAmount: calcResult.tfpAmount,
        foprolosAmount: calcResult.foprolosAmount,
        netSalary: calcResult.netSalary,
        isAccounted: false,
      },
      include: {
        employee: true,
      },
    });

    // Optionally post double-entry voucher
    if (postVoucher && !slip.isAccounted) {
      const padM = String(m).padStart(2, '0');
      const periodLabel = `${padM}/${y}`;
      const voucherLines = TunisianPayrollEngine.generateAccountingVoucher(
        calcResult,
        employee.fullName,
        periodLabel
      );

      const entry = await prisma.accountingEntry.create({
        data: {
          tenantId,
          journalCode: 'OD',
          entryDate: `${y}-${padM}-28`,
          referenceNumber: `PAIE-${y}${padM}-${employee.cinNumber}`,
          description: `Bulletin de paie ${periodLabel} - ${employee.fullName}`,
          lines: {
            create: voucherLines.map((vl) => ({
              accountCode: vl.accountCode,
              debit: vl.debit,
              credit: vl.credit,
              description: vl.accountName,
            })),
          },
        },
      });

      await prisma.payrollSlip.update({
        where: { id: slip.id },
        data: { isAccounted: true },
      });

      slip.isAccounted = true;
    }

    res.status(201).json(slip);
  } catch (err: any) {
    console.error('Error creating payroll slip:', err);
    res.status(500).json({ error: err.message || 'Error creating payroll slip' });
  }
});

// POST /api/payroll/slips/:id/post-voucher - Post voucher for existing slip
router.post('/slips/:id/post-voucher', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const slip = await prisma.payrollSlip.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { employee: true },
    });

    if (!slip) {
      res.status(404).json({ error: 'Payroll slip not found' });
      return;
    }

    if (slip.isAccounted) {
      res.status(400).json({ error: 'This payroll slip is already accounted for' });
      return;
    }

    const calcResult = TunisianPayrollEngine.calculatePayroll({
      baseSalary: slip.grossSalary,
      maritalStatus: slip.employee.maritalStatus as any,
      dependentChildren: slip.employee.dependentChildren,
    });

    const padM = String(slip.month).padStart(2, '0');
    const periodLabel = `${padM}/${slip.year}`;
    const voucherLines = TunisianPayrollEngine.generateAccountingVoucher(
      calcResult,
      slip.employee.fullName,
      periodLabel
    );

    const entry = await prisma.accountingEntry.create({
      data: {
        tenantId,
        journalCode: 'OD',
        entryDate: `${slip.year}-${padM}-28`,
        referenceNumber: `PAIE-${slip.year}${padM}-${slip.employee.cinNumber}`,
        description: `Bulletin de paie ${periodLabel} - ${slip.employee.fullName}`,
        lines: {
          create: voucherLines.map((vl) => ({
            accountCode: vl.accountCode,
            debit: vl.debit,
            credit: vl.credit,
            description: vl.accountName,
          })),
        },
      },
    });

    await prisma.payrollSlip.update({
      where: { id: slip.id },
      data: { isAccounted: true },
    });

    res.json({ success: true, entryId: entry.id, message: 'Accounting voucher created successfully' });
  } catch (err: any) {
    console.error('Error posting payroll voucher:', err);
    res.status(500).json({ error: err.message || 'Error posting voucher' });
  }
});

export default router;

