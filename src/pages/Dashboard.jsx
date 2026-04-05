import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { odoo } from '../lib/odooClient';
import { SearchableSelect } from '../components/SearchableSelect';

export function Dashboard() {
  const navigate = useNavigate();
  // State for Date Interval Filtering
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to Start of Month
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  
  // Data states
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Transaction Highlight Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showReport, setShowReport] = useState(false);

  // Manager Hierarchy States
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('ALL'); // 'ALL' = Logged in User + Subordinates, explicitly formatted

  useEffect(() => {
    const fetchHierarchy = async () => {
      const team = await odoo.fetchMyTeam();
      setTeamMembers(team || []);
    };
    fetchHierarchy();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      let filterIds = null;
      if (selectedTarget === 'ALL') {
         // Gather my ID + team IDs
         const myId = parseInt(localStorage.getItem('portal_user_id'));
         filterIds = [myId, ...teamMembers.map(t => t.userId)];
      } else {
         filterIds = [parseInt(selectedTarget)];
      }

      const records = await odoo.getIntervalPayments(fromDate, toDate, filterIds);
      setPayments(records);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when selectedDate or target changes
  useEffect(() => {
    fetchDashboardData();
  }, [fromDate, toDate, selectedTarget, teamMembers.length]);

  // Aggregate Computation (Daily Total)
  const totalDailySum = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const journalTotals = payments.reduce((acc, curr) => {
    const journal = curr.journal_id ? curr.journal_id[1] : 'Unknown';
    acc[journal] = (acc[journal] || 0) + (curr.amount || 0);
    return acc;
  }, {});

  // Formatting helpers
  const getBadgeColor = (stateStr) => {
    switch (stateStr) {
      case 'posted': return 'bg-green-50 text-green-700 border-green-100';
      case 'approved': return 'bg-green-50 text-green-700 border-green-100';
      case 'pending': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-error-container text-on-error-container border-error/20';
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-error-container text-on-error-container border-error/20';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getIconColor = (journalName) => {
    if (!journalName) return 'text-primary bg-primary-container';
    const n = journalName.toLowerCase();
    if (n.includes('cash')) return 'text-green-700 bg-green-100';
    if (n.includes('bank')) return 'text-blue-700 bg-blue-100';
    return 'text-yellow-700 bg-yellow-100';
  };

  return (
    <main className={`w-full px-6 pb-32 pt-24 max-w-md mx-auto relative ${(selectedPayment || showReport) ? 'print:p-0 print:bg-white print:m-0 print:max-w-none' : ''}`}>
      {/* Group existing dashboard content and hide it during print */}
      <div className={`space-y-8 ${(selectedPayment || showReport) ? 'print:hidden' : ''}`}>
        
        {error && (
          <div className="p-3 bg-error-container text-on-error-container text-xs font-bold rounded-lg border border-error/20">
            {error}
          </div>
        )}

      {/* Hero Section: Total Contributions */}
      <section>
        <div className="bg-gradient-to-br from-primary to-primary-fixed-dim p-8 rounded-[2rem] shadow-xl shadow-primary/10 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="font-label text-white/80 text-[10px] font-semibold uppercase tracking-[0.15em]">Daily Summary | <span className="font-['Public_Sans']">یومیہ خلاصہ</span></p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-extrabold text-white tracking-tighter">
                {loading ? '...' : totalDailySum.toLocaleString() + '/-'}
              </span>
              <span className="text-white/70 font-medium">PKR</span>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="space-y-1 text-right">
                <p className="font-label text-white/60 text-[10px] uppercase tracking-wider">Filtered Interval</p>
                <p className="text-white font-semibold text-xs tracking-wide">
                  {new Date(fromDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} → {new Date(toDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-primary bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-on-secondary-container" style={{fontVariationSettings: '"FILL" 1'}}>account_balance_wallet</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Date Filters & Sync Tooling */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-start gap-1 bg-surface-container-low p-3 rounded-[1.5rem] border border-outline-variant/30">
            <span className="font-label text-[9px] font-bold text-primary uppercase tracking-widest pl-1">From Date</span>
            <input 
              type="date" 
              className="w-full bg-transparent text-on-surface font-label text-[11px] font-bold tracking-widest border-none outline-none cursor-pointer p-0 m-0" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-start gap-1 bg-surface-container-low p-3 rounded-[1.5rem] border border-outline-variant/30">
            <span className="font-label text-[9px] font-bold text-primary uppercase tracking-widest pl-1">To Date</span>
            <input 
              type="date" 
              className="w-full bg-transparent text-on-surface font-label text-[11px] font-bold tracking-widest border-none outline-none cursor-pointer p-0 m-0" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container p-4 rounded-[1.25rem] border border-secondary/20 hover:shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest hidden sm:inline">Refresh | ریفریش</span>
          </button>
          
          <button 
            onClick={() => setShowReport(true)}
            disabled={loading || payments.length === 0}
            className="flex-[2] flex items-center justify-center gap-2 bg-primary text-white p-4 rounded-[1.25rem] shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">assessment</span>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest">Generate Report | رپورٹ مرتب کریں</span>
          </button>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Daily Log <span className="font-['Public_Sans'] font-medium text-lg text-on-surface-variant font-normal">| روزنامچہ</span></h2>
          <span className="font-label text-[10px] font-bold text-primary uppercase tracking-widest">
            {payments.length} Records
          </span>
        </div>
        
        {/* Manager Target Filter Widget */}
        {teamMembers.length > 0 && (
          <div className="bg-surface-container-low p-4 rounded-xl shadow-sm border border-outline-variant/30 animate-in slide-in-from-top-2 z-10 relative">
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Manager View Filter | منیجر فلٹر</label>
            <SearchableSelect 
              value={selectedTarget}
              onChange={setSelectedTarget}
              options={[
                { value: 'ALL', label: 'Show All (Me & Subordinates)' },
                { value: localStorage.getItem('portal_user_id'), label: 'My Entries Only' },
                ...teamMembers.map(m => ({ value: m.userId.toString(), label: `${m.employeeName} (${m.userName})` }))
              ]}
              placeholder="Search user..."
            />
          </div>
        )}

        <div className="space-y-4">
          {loading && <p className="text-center text-outline-variant font-label text-xs uppercase animate-pulse">Fetching records...</p>}
          
          {!loading && payments.length === 0 && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-dashed border-outline-variant text-center space-y-2">
              <span className="material-symbols-outlined text-outline-variant text-3xl">receipt_long</span>
              <p className="font-body text-sm text-on-surface-variant">No manual entries logged by you on this date.</p>
            </div>
          )}

          {!loading && payments.map((payment) => {
            const journalName = payment.journal_id ? payment.journal_id[1] : 'Unknown Journal';
            const stateStr = payment.x_approval_state === 'pending_approval' ? 'pending' 
                           : payment.x_approval_state === 'approved' ? 'approved' 
                           : payment.x_approval_state === 'rejected' ? 'rejected' 
                           : (payment.state || 'draft');
            
            return (
              <div 
                key={payment.id} 
                onClick={() => setSelectedPayment(payment)}
                className="bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-4 transition-transform active:scale-[0.98] border border-surface-container cursor-pointer hover:shadow-md"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconColor(journalName)}`}>
                  <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>
                    {journalName.toLowerCase().includes('cash') ? 'payments' : 'account_balance'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline font-bold text-on-surface text-base">{journalName}</h3>
                      <p className="font-body text-[10px] text-on-surface-variant flex gap-1 mt-0.5">
                        <span className="font-semibold">{payment.name || payment.payment_reference || 'Ref/Draft'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-headline font-bold text-on-surface text-base">{payment.amount ? payment.amount.toLocaleString() : '0'}/-</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center font-label text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${getBadgeColor(stateStr)}`}>
                          {stateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

        <button 
          onClick={() => navigate('/manual-entry')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-30"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>

      </div>

      {/* Report Summary Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface sm:bg-black/60 sm:backdrop-blur-sm sm:p-4 transition-all print:bg-white print:p-0 print:block print:relative print:inset-auto">
          <div className="bg-surface w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-in print:shadow-none print:w-full print:max-w-none print:h-auto">
            {/* Modal Header (Hidden on print) */}
            <div className="p-6 bg-surface-container border-b border-outline-variant/30 flex justify-between items-center print:hidden shrink-0">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assessment</span>
                Interval Report
              </h3>
              <button 
                onClick={() => setShowReport(false)}
                className="w-8 h-8 rounded-full bg-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-outline-variant/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-8 overflow-y-auto print:p-8 print:overflow-visible">
              <div className="text-center mb-8 border-b border-outline-variant/30 pb-6 print:border-black">
                <h1 className="font-headline text-3xl font-extrabold text-on-surface uppercase tracking-widest print:text-black">Transaction Report</h1>
                <p className="text-on-surface-variant text-base mt-2 font-body print:text-black">From: <strong>{fromDate}</strong> &mdash; To: <strong>{toDate}</strong></p>
                <p className="text-on-surface-variant text-xs mt-1 print:text-black">Generated: {new Date().toLocaleString()}</p>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-center print:border-black print:bg-white">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 print:text-black">Total Collections</p>
                  <p className="font-headline text-2xl font-bold text-primary print:text-black">{totalDailySum.toLocaleString()}/-</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-center print:border-black print:bg-white">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 print:text-black">Total Transactions</p>
                  <p className="font-headline text-2xl font-bold text-primary print:text-black">{payments.length}</p>
                </div>
              </div>

              {/* Journal Breakdown */}
              <div className="mb-8">
                <h3 className="font-headline font-bold text-base mb-3 pb-2 uppercase tracking-widest print:text-black">Collections by Journal</h3>
                <div className="space-y-2">
                  {Object.entries(journalTotals).map(([journal, total]) => (
                    <div key={journal} className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 print:border-black print:border-dashed">
                      <span className="font-body font-semibold text-sm print:text-black">{journal}</span>
                      <span className="font-headline font-bold text-sm print:text-black">{total.toLocaleString()}/-</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Logs */}
              <div>
                <h3 className="font-headline font-bold text-base mb-3 pb-2 uppercase tracking-widest print:text-black">Transaction Log</h3>
                <table className="w-full text-left text-sm font-body">
                  <thead>
                    <tr className="border-b-2 border-outline-variant/50 print:border-black">
                      <th className="py-2 font-bold text-xs uppercase print:text-black">Date</th>
                      <th className="py-2 font-bold text-xs uppercase print:text-black">Ref/Payee</th>
                      <th className="py-2 font-bold text-xs uppercase print:text-black">Journal</th>
                      <th className="py-2 font-bold text-xs uppercase text-right print:text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-outline-variant/10 print:border-black print:border-dashed">
                        <td className="py-2 whitespace-nowrap text-xs print:text-black">{p.date}</td>
                        <td className="py-2 print:text-black">
                          <div className="font-semibold text-xs truncate max-w-[150px]">{p.partner_id ? p.partner_id[1] : 'N/A'}</div>
                          <div className="text-[10px] text-on-surface-variant font-bold print:text-black/70">{p.name || p.payment_reference}</div>
                        </td>
                        <td className="py-2 text-xs print:text-black">{p.journal_id ? p.journal_id[1] : 'Unknown'}</td>
                        <td className="py-2 text-right font-bold text-xs print:text-black">{p.amount ? p.amount.toLocaleString() : '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="hidden print:block text-center text-xs mt-12 pt-4 border-t border-black border-dashed pb-8">
                <p>System Generated Report</p>
                <p>Powered By Affinity Business Suite</p>
              </div>
            </div>

            {/* Print actions (Hidden in print) */}
            <div className="p-4 bg-surface-container border-t border-outline-variant/30 print:hidden flex gap-3 shrink-0">
               <button 
                 onClick={() => window.print()}
                 className="flex-[2] py-4 rounded-xl bg-primary text-white font-headline font-bold uppercase tracking-widest shadow flex items-center justify-center gap-2 active:scale-95 transition-transform"
               >
                 <span className="material-symbols-outlined text-[18px]">print</span> Print Report
               </button>
               <button 
                 onClick={() => setShowReport(false)}
                 className="flex-1 py-4 items-center justify-center flex rounded-xl bg-outline-variant/20 text-on-surface font-label text-xs uppercase tracking-widest font-bold active:scale-[0.98] transition-transform"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Overlay Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 transition-all print:bg-transparent print:backdrop-blur-none print:relative print:inset-auto print:block">
          <div 
            className="print:hidden bg-surface w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom border border-outline/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-surface-container border-b border-outline-variant/30 flex justify-between items-center">
              <h3 className="font-headline font-bold text-on-surface">Payment Details</h3>
              <button 
                onClick={() => setSelectedPayment(null)}
                className="w-8 h-8 rounded-full bg-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-outline-variant/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Highlight Amount Phase */}
              <div className="text-center space-y-1">
                <span className={`inline-flex items-center font-label text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter border ${getBadgeColor(selectedPayment.state || 'draft')}`}>
                   {selectedPayment.state || 'draft'}
                </span>
                <p className="font-headline text-5xl font-extrabold text-primary tracking-tighter pt-2">
                  {selectedPayment.amount ? selectedPayment.amount.toLocaleString() : '0'} <span className="text-xl text-primary/70">PKR</span>
                </p>
              </div>

              <div className="h-px w-full bg-outline-variant/30 my-4" />

              {/* Specs */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Journal</span>
                  <span className="font-headline font-bold text-sm text-on-surface">{selectedPayment.journal_id ? selectedPayment.journal_id[1] : 'Unknown'}</span>
                </div>
                
                <div className="flex justify-between items-end">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Date Logged</span>
                  <span className="font-headline font-bold text-sm text-on-surface">{selectedPayment.date}</span>
                </div>

                <div className="flex justify-between items-end">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Payee Contact</span>
                  <span className="font-headline font-bold text-sm text-on-surface text-right max-w-[150px] truncate">
                    {selectedPayment.partner_id ? selectedPayment.partner_id[1] : 'No Explicit Payload Partner'}
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Internal Ref</span>
                  <span className="font-headline font-bold text-sm text-on-surface">{selectedPayment.name || selectedPayment.payment_reference || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Print/Share actions */}
            <div className="p-4 bg-surface-container-lowest flex flex-col gap-3">
               <button 
                  onClick={() => window.print()}
                  className="w-full py-4 rounded-xl bg-secondary-container text-on-secondary-container font-headline font-bold uppercase tracking-widest border border-secondary/20 shadow flex items-center justify-center gap-2 active:scale-95 transition-transform"
               >
                 <span className="material-symbols-outlined">print</span> Print Receipt | رسید پرنٹ کریں
               </button>
               <button 
                  onClick={() => setSelectedPayment(null)}
                  className="w-full py-4 rounded-xl bg-primary text-white font-label text-xs uppercase tracking-widest font-bold active:scale-[0.98] transition-transform"
               >
                 Close Detail | بند کریں
               </button>
            </div>
          </div>

          {/* PRINTABLE RECEIPT PAYLOAD (Visible only on print or embedded in UI implicitly) */}
          <div className="hidden print:block w-full max-w-[80mm] mx-auto text-black p-4 font-mono text-sm space-y-4">
              <div className="text-center font-bold pb-2 border-b border-black">
                <h2 className="mb-1">OFFICIAL RECEIPT <br/><span className="text-sm">سرکاری رسید</span></h2>
                <p className="text-xs mt-1">Date: {selectedPayment.date}</p>
              </div>

              <div className="space-y-1 py-2">
                <div className="flex justify-between gap-4">
                  <span>Ref:</span>
                  <span className="text-right">{selectedPayment.name || selectedPayment.payment_reference || 'MANUAL'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Payee:</span>
                  <span className="font-bold text-right">{selectedPayment.partner_id ? selectedPayment.partner_id[1] : 'N/A'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Method:</span>
                  <span className="text-right">{selectedPayment.journal_id ? selectedPayment.journal_id[1] : 'UNKNOWN'}</span>
                </div>
              </div>

              <div className="py-2 border-t border-black border-dashed flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>PKR {selectedPayment.amount ? selectedPayment.amount.toLocaleString() : '0'}</span>
              </div>
              <div className="text-center text-xs mt-8 pt-4 flex flex-col items-center justify-center gap-2">
                <p>System Generated Receipt</p>
                <img src="/affinity-logo.png" alt="Affinity Business Suite" className="h-6 object-contain opacity-80 grayscale" />
              </div>
          </div>
        </div>
      )}
    </main>
  );
}
