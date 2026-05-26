import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Trash2, DollarSign, AlertCircle, CheckCircle2, LogOut, BarChart3, Calendar, TrendingDown, Eye, Printer } from 'lucide-react';

const ChefRamMasterPlatform = () => {
  const BRANCH_CONFIG = {
    'Chef Ram Pilar': { rental: 1500, utilities: 800, misc: 300 },
    'Chef Ram Balanga': { rental: 2300, utilities: 1300, misc: 300 },
    'Chef Ram Limay': { rental: 1500, utilities: 800, misc: 300 },
    "Ram's Kitchen 24/7": { rental: 1500, utilities: 800, misc: 300 },
  };

  const defaultRoster = {
    'Chef Ram Pilar': [
      { name: 'Cindy', position: 'Head Cook', rate: 600 },
      { name: 'Maria', position: 'Cook', rate: 500 },
      { name: 'Jun', position: 'Cashier', rate: 450 },
    ],
    'Chef Ram Balanga': [
      { name: 'Alex', position: 'Head Cook', rate: 600 },
      { name: 'Rosa', position: 'Cook', rate: 500 },
      { name: 'Ben', position: 'Server', rate: 450 },
    ],
    'Chef Ram Limay': [
      { name: 'Tom', position: 'Head Cook', rate: 600 },
      { name: 'Luna', position: 'Cook', rate: 500 },
    ],
    "Ram's Kitchen 24/7": [
      { name: 'Mark', position: 'Manager', rate: 700 },
      { name: 'Joy', position: 'Cashier', rate: 450 },
    ],
  };

  const branches = Object.keys(BRANCH_CONFIG);
  const [activeTab, setActiveTab] = useState('daily-report');
  const [selectedBranch, setSelectedBranch] = useState('Chef Ram Pilar');
  const [employeeRoster, setEmployeeRoster] = useState(defaultRoster);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', position: '', rate: 0 });

  // Daily Report State
  const [dailyReports, setDailyReports] = useState([]);
  const [newReport, setNewReport] = useState({
    date: new Date().toISOString().split('T')[0],
    branch: 'Chef Ram Pilar',
    sales: 0,
    submittedBy: '',
    notes: '',
  });

  // Salary Attendance (Daily)
  const [salaryAttendance, setSalaryAttendance] = useState([]);
  const [newSalaryEntry, setNewSalaryEntry] = useState({ employeeName: '', present: true, hours: 8 });

  // CK Items (Daily)
  const [ckItems, setCkItems] = useState([]);
  const [newCkItem, setNewCkItem] = useState({ description: '', quantity: 0, unitPrice: 0, supplier: '' });

  // OpEx Items (Daily)
  const [opexItems, setOpexItems] = useState([]);
  const [newOpexItem, setNewOpexItem] = useState({ category: '', description: '', amount: 0, paidTo: '' });

  // Cash Advances (Daily - against salary fund)
  const [cashAdvances, setCashAdvances] = useState([]);
  const [newCashAdv, setNewCashAdv] = useState({ employeeName: '', amount: 0, reason: '', approvedBy: '' });

  // Historical Data
  const [reports, setReports] = useState([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const reportsResult = await window.storage?.get('chef-ram-daily-reports');
        if (reportsResult?.value) setReports(JSON.parse(reportsResult.value));
      } catch (error) {
        console.error('Load error:', error);
      }
    };
    loadData();
  }, []);

  // Save data
  useEffect(() => {
    const saveData = async () => {
      try {
        if (reports.length > 0) await window.storage?.set('chef-ram-daily-reports', JSON.stringify(reports));
      } catch (error) {
        console.error('Save error:', error);
      }
    };
    saveData();
  }, [reports]);

  // ===== EMPLOYEE MANAGEMENT =====
  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.position && newEmployee.rate > 0) {
      setEmployeeRoster({
        ...employeeRoster,
        [selectedBranch]: [...(employeeRoster[selectedBranch] || []), { ...newEmployee }],
      });
      setNewEmployee({ name: '', position: '', rate: 0 });
      setShowRosterModal(false);
    }
  };

  const handleRemoveEmployee = (name) => {
    setEmployeeRoster({
      ...employeeRoster,
      [selectedBranch]: employeeRoster[selectedBranch]?.filter(e => e.name !== name),
    });
  };

  // ===== CALCULATIONS =====
  const calculateSalaryTotal = () => {
    return salaryAttendance.reduce((total, entry) => {
      const employee = employeeRoster[selectedBranch]?.find(e => e.name === entry.employeeName);
      if (!employee) return total;
      return total + (entry.present ? employee.rate : 0);
    }, 0);
  };

  const calculateCkTotal = () => ckItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculateOpexTotal = () => opexItems.reduce((sum, item) => sum + item.amount, 0);
  const calculateCashAdvTotal = () => cashAdvances.reduce((sum, item) => sum + item.amount, 0);

  const salaryTotal = calculateSalaryTotal();
  const ckTotal = calculateCkTotal();
  const opexTotal = calculateOpexTotal();
  const cashAdvTotal = calculateCashAdvTotal();

  const calculateAllocation = (sales, salaryTotal, ckTotal, opexTotal, cashAdvTotal) => {
    const config = BRANCH_CONFIG[selectedBranch];
    
    let remaining = sales;
    remaining -= salaryTotal;
    remaining -= ckTotal;
    remaining -= config.rental;
    remaining -= config.utilities;
    remaining -= config.misc;
    remaining -= opexTotal;
    remaining -= cashAdvTotal;

    const ownerSavings = Math.max(2000, Math.ceil(sales * 0.20));
    remaining -= ownerSavings;

    const investorPayment = Math.max(1000, remaining > 2000 ? 2000 : 1000);
    remaining -= investorPayment;

    return {
      rental: config.rental,
      utilities: config.utilities,
      misc: config.misc,
      ownerSavings,
      investorPayment,
      netProfit: Math.max(0, remaining),
      shortfall: remaining < 0 ? Math.abs(remaining) : 0,
    };
  };

  const allocation = calculateAllocation(newReport.sales, salaryTotal, ckTotal, opexTotal, cashAdvTotal);

  // ===== ADD SALARY ENTRY =====
  const handleAddSalaryEntry = () => {
    if (newSalaryEntry.employeeName) {
      setSalaryAttendance([...salaryAttendance, { ...newSalaryEntry, id: Date.now() }]);
      setNewSalaryEntry({ employeeName: '', present: true, hours: 8 });
    }
  };

  // ===== ADD CK ITEM =====
  const handleAddCkItem = () => {
    if (newCkItem.description && newCkItem.quantity > 0 && newCkItem.unitPrice > 0) {
      setCkItems([...ckItems, { ...newCkItem, id: Date.now() }]);
      setNewCkItem({ description: '', quantity: 0, unitPrice: 0, supplier: '' });
    }
  };

  // ===== ADD OPEX ITEM =====
  const handleAddOpexItem = () => {
    if (newOpexItem.description && newOpexItem.amount > 0) {
      setOpexItems([...opexItems, { ...newOpexItem, id: Date.now() }]);
      setNewOpexItem({ category: '', description: '', amount: 0, paidTo: '' });
    }
  };

  // ===== ADD CASH ADVANCE =====
  const handleAddCashAdv = () => {
    if (newCashAdv.employeeName && newCashAdv.amount > 0) {
      setCashAdvances([...cashAdvances, { ...newCashAdv, id: Date.now() }]);
      setNewCashAdv({ employeeName: '', amount: 0, reason: '', approvedBy: '' });
    }
  };

  // ===== SUBMIT DAILY REPORT =====
  const handleSubmitDailyReport = (e) => {
    e.preventDefault();
    
    const report = {
      id: Date.now(),
      ...newReport,
      salaryAttendance,
      salaryTotal,
      ckItems,
      ckTotal,
      opexItems,
      opexTotal,
      cashAdvances,
      cashAdvTotal,
      ...allocation,
      submittedAt: new Date().toISOString(),
    };

    setReports([report, ...reports]);

    // Reset
    setNewReport({
      date: new Date().toISOString().split('T')[0],
      branch: selectedBranch,
      sales: 0,
      submittedBy: '',
      notes: '',
    });
    setSalaryAttendance([]);
    setCkItems([]);
    setOpexItems([]);
    setCashAdvances([]);

    alert('Daily report submitted successfully!');
  };

  // ===== PRINT DAILY REPORT =====
  const handlePrintDailyReport = () => {
    const doc = `
╔════════════════════════════════════════════════════════════════╗
║                   CHEF RAM DAILY REMITTANCE                    ║
║                    ${newReport.branch}                          ║
╚════════════════════════════════════════════════════════════════╝

Date: ${newReport.date}
Submitted by: ${newReport.submittedBy}
Notes: ${newReport.notes}

═══════════════════════════════════════════════════════════════════

1. TOTAL SALES
   ₱${newReport.sales.toLocaleString()}

═══════════════════════════════════════════════════════════════════

2. SALARY EXPENSES (₱${salaryTotal.toLocaleString()})
${salaryAttendance.map(entry => {
  const emp = employeeRoster[selectedBranch]?.find(e => e.name === entry.employeeName);
  return `   ${entry.employeeName} (${emp?.position}) - ${entry.present ? '✓ Present' : '✗ Absent'} - ₱${emp?.rate || 0}`;
}).join('\n')}

═══════════════════════════════════════════════════════════════════

3. CK EXPENSES (₱${ckTotal.toLocaleString()})
${ckItems.map(item => `   ${item.description}: ${item.quantity} × ₱${item.unitPrice} = ₱${(item.quantity * item.unitPrice).toLocaleString()} (${item.supplier})`).join('\n')}

═══════════════════════════════════════════════════════════════════

4. OPERATIONAL EXPENSES (₱${opexTotal.toLocaleString()})
${opexItems.map(item => `   ${item.category} - ${item.description}: ₱${item.amount.toLocaleString()} (${item.paidTo})`).join('\n')}

═══════════════════════════════════════════════════════════════════

5. CASH ADVANCES (₱${cashAdvTotal.toLocaleString()})
${cashAdvances.map(item => `   ${item.employeeName}: ₱${item.amount.toLocaleString()} - ${item.reason} (${item.approvedBy})`).join('\n')}

═══════════════════════════════════════════════════════════════════

6. FIXED ALLOCATIONS
   Rental:           ₱${allocation.rental.toLocaleString()}
   Utilities:        ₱${allocation.utilities.toLocaleString()}
   Misc & 13th:      ₱${allocation.misc.toLocaleString()}

═══════════════════════════════════════════════════════════════════

7. SUMMARY
   Total Sales:      ₱${newReport.sales.toLocaleString()}
   Total Expenses:   ₱${(salaryTotal + ckTotal + opexTotal + allocation.rental + allocation.utilities + allocation.misc + cashAdvTotal).toLocaleString()}
   Owner Savings:    ₱${allocation.ownerSavings.toLocaleString()} (20%)
   Investor:         ₱${allocation.investorPayment.toLocaleString()}
   ─────────────────────────────
   Net Profit:       ₱${allocation.netProfit.toLocaleString()}

${allocation.shortfall > 0 ? `   ⚠️  SHORTFALL: ₱${allocation.shortfall.toLocaleString()}` : ''}

═══════════════════════════════════════════════════════════════════
`;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write('<pre style="font-family: monospace; padding: 20px; line-height: 1.6;">' + doc + '</pre>');
    printWindow.document.close();
    printWindow.print();
  };

  // ===== EXPORT TO EXCEL =====
  const handleExportToExcel = () => {
    const csvContent = [
      ['CHEF RAM DAILY REMITTANCE REPORT'],
      ['Branch', selectedBranch],
      ['Date', newReport.date],
      ['Submitted by', newReport.submittedBy],
      [],
      ['1. SALES'],
      ['Total Sales', newReport.sales],
      [],
      ['2. SALARY EXPENSES'],
      ['Name', 'Position', 'Rate', 'Present', 'Amount'],
      ...salaryAttendance.map(entry => {
        const emp = employeeRoster[selectedBranch]?.find(e => e.name === entry.employeeName);
        return [entry.employeeName, emp?.position, emp?.rate, entry.present ? 'Yes' : 'No', entry.present ? emp?.rate : 0];
      }),
      ['SALARY TOTAL', '', '', '', salaryTotal],
      [],
      ['3. CK EXPENSES'],
      ['Description', 'Quantity', 'Unit Price', 'Supplier', 'Total'],
      ...ckItems.map(item => [item.description, item.quantity, item.unitPrice, item.supplier, item.quantity * item.unitPrice]),
      ['CK TOTAL', '', '', '', ckTotal],
      [],
      ['4. OPERATIONAL EXPENSES'],
      ['Category', 'Description', 'Paid To', 'Amount'],
      ...opexItems.map(item => [item.category, item.description, item.paidTo, item.amount]),
      ['OPEX TOTAL', '', '', opexTotal],
      [],
      ['5. CASH ADVANCES'],
      ['Employee', 'Amount', 'Reason', 'Approved By'],
      ...cashAdvances.map(item => [item.employeeName, item.amount, item.reason, item.approvedBy]),
      ['CASH ADV TOTAL', '', '', cashAdvTotal],
      [],
      ['6. ALLOCATIONS'],
      ['Rental', allocation.rental],
      ['Utilities', allocation.utilities],
      ['Misc & 13th', allocation.misc],
      ['Owner Savings (20%)', allocation.ownerSavings],
      ['Investor', allocation.investorPayment],
      ['Net Profit', allocation.netProfit],
      allocation.shortfall > 0 ? ['SHORTFALL', allocation.shortfall] : [],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chef-ram-${selectedBranch}-${newReport.date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ===== ANALYTICS =====
  const branchReports = reports.filter(r => r.branch === selectedBranch);
  const analytics = useMemo(() => {
    const totalSales = branchReports.reduce((sum, r) => sum + r.sales, 0);
    const totalProfit = branchReports.reduce((sum, r) => sum + r.netProfit, 0);
    const totalSalary = branchReports.reduce((sum, r) => sum + r.salaryTotal, 0);
    const avgDaily = branchReports.length > 0 ? Math.round(totalSales / branchReports.length) : 0;

    return { totalSales, totalProfit, totalSalary, avgDaily, recordCount: branchReports.length };
  }, [branchReports]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Chef Ram Master Platform</h1>
            <p className="text-slate-400">Salary • CK • OpEx • Allocations • Daily Report • Excel Export</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700/50 overflow-x-auto">
          {[
            { id: 'daily-report', label: 'Daily Report' },
            { id: 'history', label: 'History' },
            { id: 'dashboard', label: 'Dashboard' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Branch Selector with Sticky Edit Button */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap mb-4">
            {branches.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  selectedBranch === b ? 'bg-amber-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowRosterModal(!showRosterModal)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-lg text-base shadow-lg"
          >
            ✏️ EDIT EMPLOYEES - {selectedBranch}
          </button>
        </div>

        {/* Edit Employees Modal */}
        {showRosterModal && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Edit Employees - {selectedBranch}</h2>
            
            {/* Current Employees */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Current Employees:</h3>
              <div className="space-y-2">
                {employeeRoster[selectedBranch]?.map((emp) => (
                  <div key={emp.name} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg">
                    <div>
                      <p className="text-white font-semibold">{emp.name}</p>
                      <p className="text-slate-400 text-sm">{emp.position} - ₱{emp.rate}/day</p>
                    </div>
                    <button
                      onClick={() => handleRemoveEmployee(emp.name)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Employee */}
            <h3 className="text-white font-semibold mb-3">Add New Employee:</h3>
            <div className="grid md:grid-cols-4 gap-3 mb-4">
              <input
                type="text"
                placeholder="Name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
              />
              <input
                type="text"
                placeholder="Position"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
              />
              <input
                type="number"
                placeholder="Daily Rate (₱)"
                value={newEmployee.rate}
                onChange={(e) => setNewEmployee({ ...newEmployee, rate: parseFloat(e.target.value) || 0 })}
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
              />
              <button
                onClick={handleAddEmployee}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2 text-sm"
              >
                Add Employee
              </button>
            </div>

            <button
              onClick={() => setShowRosterModal(false)}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Done
            </button>
          </div>
        )}

        {/* DAILY REPORT TAB */}
        {activeTab === 'daily-report' && (
          <div className="space-y-8">
            <form onSubmit={handleSubmitDailyReport} className="space-y-8">
              {/* Section 1: Basic Info */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">1. Basic Information</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <input type="date" value={newReport.date} onChange={(e) => setNewReport({ ...newReport, date: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                  <input type="number" placeholder="Total Sales (₱)" value={newReport.sales} onChange={(e) => setNewReport({ ...newReport, sales: parseFloat(e.target.value) || 0 })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500" />
                  <input type="text" placeholder="Submitted by" value={newReport.submittedBy} onChange={(e) => setNewReport({ ...newReport, submittedBy: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500" />
                  <textarea placeholder="Notes" value={newReport.notes} onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 h-10" />
                </div>
              </div>

              {/* Section 2: Salary Attendance */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">2. Salary Attendance (₱{salaryTotal.toLocaleString()})</h2>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {salaryAttendance.map((entry) => {
                    const emp = employeeRoster[selectedBranch]?.find(e => e.name === entry.employeeName);
                    return (
                      <div key={entry.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg">
                        <div>
                          <p className="text-white font-semibold text-sm">{entry.employeeName} ({emp?.position})</p>
                          <p className="text-slate-400 text-xs">{entry.present ? '✓ Present' : '✗ Absent'}</p>
                        </div>
                        <p className="text-green-400 font-bold">₱{entry.present ? emp?.rate : 0}</p>
                        <button type="button" onClick={() => setSalaryAttendance(salaryAttendance.filter((i) => i.id !== entry.id))} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid md:grid-cols-3 gap-2">
                  <select value={newSalaryEntry.employeeName} onChange={(e) => setNewSalaryEntry({ ...newSalaryEntry, employeeName: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Select Employee</option>
                    {employeeRoster[selectedBranch]?.map((emp) => (
                      <option key={emp.name} value={emp.name}>{emp.name} - {emp.position}</option>
                    ))}
                  </select>
                  <select value={newSalaryEntry.present ? 'yes' : 'no'} onChange={(e) => setNewSalaryEntry({ ...newSalaryEntry, present: e.target.value === 'yes' })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="yes">Present</option>
                    <option value="no">Absent</option>
                  </select>
                  <button type="button" onClick={handleAddSalaryEntry} className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2 text-sm">Add</button>
                </div>
              </div>

              {/* Section 3: CK Items */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">3. CK Expenses (₱{ckTotal.toLocaleString()})</h2>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {ckItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{item.description}</p>
                        <p className="text-slate-400 text-xs">{item.quantity} × ₱{item.unitPrice} | {item.supplier}</p>
                      </div>
                      <p className="text-amber-400 font-bold">₱{(item.quantity * item.unitPrice).toLocaleString()}</p>
                      <button type="button" onClick={() => setCkItems(ckItems.filter((i) => i.id !== item.id))} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-5 gap-2">
                  <input type="text" placeholder="Item" value={newCkItem.description} onChange={(e) => setNewCkItem({ ...newCkItem, description: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="number" placeholder="Qty" value={newCkItem.quantity} onChange={(e) => setNewCkItem({ ...newCkItem, quantity: parseFloat(e.target.value) || 0 })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="number" placeholder="Price" value={newCkItem.unitPrice} onChange={(e) => setNewCkItem({ ...newCkItem, unitPrice: parseFloat(e.target.value) || 0 })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="text" placeholder="Supplier" value={newCkItem.supplier} onChange={(e) => setNewCkItem({ ...newCkItem, supplier: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <button type="button" onClick={handleAddCkItem} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg py-2 text-sm">Add</button>
                </div>
              </div>

              {/* Section 4: OpEx Items */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">4. Operational Expenses (₱{opexTotal.toLocaleString()})</h2>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {opexItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{item.category}: {item.description}</p>
                        <p className="text-slate-400 text-xs">Paid to: {item.paidTo}</p>
                      </div>
                      <p className="text-red-400 font-bold">₱{item.amount.toLocaleString()}</p>
                      <button type="button" onClick={() => setOpexItems(opexItems.filter((i) => i.id !== item.id))} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-5 gap-2">
                  <input type="text" placeholder="Category" value={newOpexItem.category} onChange={(e) => setNewOpexItem({ ...newOpexItem, category: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="text" placeholder="Description" value={newOpexItem.description} onChange={(e) => setNewOpexItem({ ...newOpexItem, description: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="number" placeholder="Amount" value={newOpexItem.amount} onChange={(e) => setNewOpexItem({ ...newOpexItem, amount: parseFloat(e.target.value) || 0 })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="text" placeholder="Paid to" value={newOpexItem.paidTo} onChange={(e) => setNewOpexItem({ ...newOpexItem, paidTo: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <button type="button" onClick={handleAddOpexItem} className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm">Add</button>
                </div>
              </div>

              {/* Section 5: Cash Advances */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">5. Cash Advances - Salary Fund (₱{cashAdvTotal.toLocaleString()})</h2>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {cashAdvances.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{item.employeeName}</p>
                        <p className="text-slate-400 text-xs">{item.reason} (Approved: {item.approvedBy})</p>
                      </div>
                      <p className="text-orange-400 font-bold">₱{item.amount.toLocaleString()}</p>
                      <button type="button" onClick={() => setCashAdvances(cashAdvances.filter((i) => i.id !== item.id))} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-5 gap-2">
                  <input type="text" placeholder="Employee" value={newCashAdv.employeeName} onChange={(e) => setNewCashAdv({ ...newCashAdv, employeeName: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="number" placeholder="Amount" value={newCashAdv.amount} onChange={(e) => setNewCashAdv({ ...newCashAdv, amount: parseFloat(e.target.value) || 0 })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="text" placeholder="Reason" value={newCashAdv.reason} onChange={(e) => setNewCashAdv({ ...newCashAdv, reason: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <input type="text" placeholder="Approved by" value={newCashAdv.approvedBy} onChange={(e) => setNewCashAdv({ ...newCashAdv, approvedBy: e.target.value })} className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm" />
                  <button type="button" onClick={handleAddCashAdv} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg py-2 text-sm">Add</button>
                </div>
              </div>

              {/* Section 6: Allocations */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">6. AUTO-CALCULATED ALLOCATIONS</h2>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">Rental</p>
                    <p className="text-2xl font-bold text-blue-400">₱{allocation.rental.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">Utilities</p>
                    <p className="text-2xl font-bold text-blue-400">₱{allocation.utilities.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">Misc & 13th</p>
                    <p className="text-2xl font-bold text-blue-400">₱{allocation.misc.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">Owner Savings (20%)</p>
                    <p className="text-2xl font-bold text-orange-400">₱{allocation.ownerSavings.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Min ₱2,000</p>
                  </div>
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">Investor</p>
                    <p className="text-2xl font-bold text-purple-400">₱{allocation.investorPayment.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Min ₱1,000</p>
                  </div>
                  <div className={`p-4 rounded-lg ${allocation.netProfit >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                    <p className="text-slate-400 text-xs">Net Profit</p>
                    <p className={`text-2xl font-bold ${allocation.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₱{allocation.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>

                {allocation.shortfall > 0 && (
                  <div className="bg-red-900/40 border border-red-700/50 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-semibold">⚠️ Shortfall: ₱{allocation.shortfall.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-slate-700/30 p-4 rounded-lg mb-6">
                  <h3 className="text-white font-bold mb-3">Summary</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between"><span>Total Sales:</span><span className="font-bold text-emerald-400">₱{newReport.sales.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- Salary:</span><span className="font-bold text-red-400">₱{salaryTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- CK:</span><span className="font-bold text-red-400">₱{ckTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- OpEx:</span><span className="font-bold text-red-400">₱{opexTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- Fixed (Rental + Utilities + Misc):</span><span className="font-bold text-red-400">₱{(allocation.rental + allocation.utilities + allocation.misc).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- Cash Advances:</span><span className="font-bold text-red-400">₱{cashAdvTotal.toLocaleString()}</span></div>
                    <hr className="my-2 border-slate-600" />
                    <div className="flex justify-between"><span>Remaining After Expenses:</span><span className="font-bold text-blue-400">₱{(newReport.sales - salaryTotal - ckTotal - opexTotal - allocation.rental - allocation.utilities - allocation.misc - cashAdvTotal).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- Owner Savings (20%):</span><span className="font-bold text-orange-400">₱{allocation.ownerSavings.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>- Investor:</span><span className="font-bold text-purple-400">₱{allocation.investorPayment.toLocaleString()}</span></div>
                    <hr className="my-2 border-slate-600" />
                    <div className="flex justify-between text-lg"><span className="font-bold">Net Profit:</span><span className={`font-bold ${allocation.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>₱{allocation.netProfit.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-lg transition-all">
                  Submit Daily Report
                </button>
                <button type="button" onClick={handlePrintDailyReport} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-all">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button type="button" onClick={handleExportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-all">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Daily Report History - {selectedBranch}</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {branchReports.length === 0 ? (
                  <p className="text-slate-400">No reports submitted yet</p>
                ) : (
                  branchReports.map((report) => (
                    <div key={report.id} className="bg-slate-700/30 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-white font-bold">{report.date} | {report.submittedBy}</p>
                        <p className={`font-bold ${report.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>₱{report.netProfit.toLocaleString()}</p>
                      </div>
                      <p className="text-slate-400 text-sm">
                        Sales: ₱{report.sales.toLocaleString()} | Salary: ₱{report.salaryTotal.toLocaleString()} | CK: ₱{report.ckTotal.toLocaleString()} | OpEx: ₱{report.opexTotal.toLocaleString()} | Savings: ₱{report.ownerSavings.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-6">
                <p className="text-emerald-300 text-xs font-semibold uppercase mb-2">Total Sales</p>
                <p className="text-3xl font-bold text-emerald-400">₱{analytics.totalSales.toLocaleString()}</p>
                <p className="text-xs text-emerald-200 mt-1">{analytics.recordCount} days</p>
              </div>

              <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-700/30 rounded-xl p-6">
                <p className="text-red-300 text-xs font-semibold uppercase mb-2">Total Salary</p>
                <p className="text-3xl font-bold text-red-400">₱{analytics.totalSalary.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-700/30 rounded-xl p-6">
                <p className="text-orange-300 text-xs font-semibold uppercase mb-2">Avg Daily Sales</p>
                <p className="text-3xl font-bold text-orange-400">₱{analytics.avgDaily.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-6">
                <p className="text-green-300 text-xs font-semibold uppercase mb-2">Total Profit</p>
                <p className="text-3xl font-bold text-green-400">₱{analytics.totalProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefRamMasterPlatform;
