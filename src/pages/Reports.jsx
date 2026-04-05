import { useState, useEffect } from 'react';
import { odoo } from '../lib/odooClient';
import { SearchableSelect } from '../components/SearchableSelect';

export function Reports() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Start of Current Month
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('ALL');

  useEffect(() => {
    const fetchHierarchy = async () => {
      const team = await odoo.fetchMyTeam();
      setTeamMembers(team || []);
    };
    fetchHierarchy();
  }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    setError('');
    try {
      let filterIds = null;
      if (selectedTarget === 'ALL') {
         const myId = parseInt(localStorage.getItem('portal_user_id'));
         filterIds = [myId, ...teamMembers.map(t => t.userId)];
      } else {
         filterIds = [parseInt(selectedTarget)];
      }

      const records = await odoo.getAllIntervalPayments(fromDate, toDate, filterIds);
      setPayments(records);
    } catch (err) {
      setError(err.message || 'Failed to fetch reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [fromDate, toDate, selectedTarget, teamMembers.length]);

  // Aggregate user-wise data
  const userTotals = payments.reduce((acc, curr) => {
    // Rely on the new custom Many2One Odoo field for parsing
    const username = curr.x_portal_user ? curr.x_portal_user[1] : (curr.create_uid ? curr.create_uid[1] : 'Unknown User');

    if (!acc[username]) acc[username] = { totalAmount: 0, count: 0, journals: {} };
    acc[username].totalAmount += (curr.amount || 0);
    acc[username].count += 1;
    
    // Maintain a breakdown per journal within the user aggregates
    const journal = curr.journal_id ? curr.journal_id[1] : 'Unknown';
    acc[username].journals[journal] = (acc[username].journals[journal] || 0) + (curr.amount || 0);
    return acc;
  }, {});

  const totalSum = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <main className="w-full px-6 pb-32 pt-24 max-w-md mx-auto relative print:p-0 print:bg-white print:max-w-none">
      <div className="space-y-8 print:hidden">
        {/* Header */}
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Analytics <span className="font-['Public_Sans'] font-medium text-2xl text-on-surface-variant font-normal">| تجزیات</span></h2>
          <p className="text-on-surface-variant font-body mb-4 tracking-tight">Performance & collections oversight | کارکردگی اور وصولی کا جائزہ</p>
          
          {/* Manager Target Filter Widget */}
          {teamMembers.length > 0 && (
            <div className="bg-surface-container-low p-4 rounded-xl shadow-sm border border-outline-variant/30 animate-in slide-in-from-top-2 z-10 relative">
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Data View Filter | ڈیٹا فلٹر</label>
              <SearchableSelect 
                value={selectedTarget}
                onChange={setSelectedTarget}
                options={[
                  { value: 'ALL', label: 'All Team Transactions' },
                  { value: localStorage.getItem('portal_user_id'), label: 'My Performance Only' },
                  ...teamMembers.map(m => ({ value: m.userId.toString(), label: `${m.employeeName} (${m.userName})` }))
                ]}
                placeholder="Search team member..."
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-start gap-1 bg-surface-container-low p-3 rounded-[1.5rem] border border-outline-variant/30">
              <span className="font-label text-[9px] font-bold text-primary uppercase tracking-widest pl-1">From Date | تاریخ سے</span>
              <input type="date" className="w-full bg-transparent text-on-surface font-label text-[11px] font-bold tracking-widest border-none outline-none cursor-pointer p-0 m-0" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col items-start gap-1 bg-surface-container-low p-3 rounded-[1.5rem] border border-outline-variant/30">
              <span className="font-label text-[9px] font-bold text-primary uppercase tracking-widest pl-1">To Date | تاریخ تک</span>
              <input type="date" className="w-full bg-transparent text-on-surface font-label text-[11px] font-bold tracking-widest border-none outline-none cursor-pointer p-0 m-0" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchReportsData} disabled={loading} className="flex-1 p-4 rounded-[1.25rem] bg-secondary-container text-on-secondary-container border border-secondary/20 hover:shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2">
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
            </button>
            <button onClick={() => window.print()} disabled={loading || payments.length === 0} className="flex-[2] p-4 rounded-[1.25rem] bg-primary text-white border border-secondary/20 font-bold flex justify-center items-center shadow-md hover:shadow-lg gap-2 text-[11px] uppercase tracking-widest active:scale-95 transition-transform shrink-0 disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">print</span> Print User Report | رپورٹ پرنٹ کریں
            </button>
          </div>
        </section>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container text-xs font-bold rounded-lg border border-error/20">
            {error}
          </div>
        )}

        {/* Collections Overview */}
        <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/30 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[120px]">
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-8xl text-primary/5 rotate-[-15deg] select-none pointer-events-none">
            account_balance_wallet
          </span>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 relative z-10">
            {teamMembers.length > 0 && selectedTarget !== 'ALL' 
              ? (selectedTarget === localStorage.getItem('portal_user_id') ? 'My Personal Collections' : 'Filtered Collections Context')
              : (teamMembers.length > 0 ? 'Global Team Collections' : 'My Total Collections')}
          </p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="font-headline text-3xl font-extrabold text-primary">{totalSum.toLocaleString()}</p>
            <span className="text-primary/70 font-bold text-sm">PKR</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant mt-2 inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full relative z-10 w-fit">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {payments.length} Total Transactions
          </p>
        </div>

        {/* User Wise Breakdown */}
        <section className="space-y-4">
          <h3 className="font-headline font-bold text-xl text-on-surface">User Breakdown <span className="font-['Public_Sans'] font-medium text-lg text-on-surface-variant font-normal">| صارف کی تفصیل</span></h3>
          {loading && <p className="animate-pulse text-[11px] font-bold uppercase tracking-widest text-outline-variant text-center my-8">Fetching aggregates...</p>}
          {!loading && Object.entries(userTotals).map(([username, data]) => (
            <div key={username} className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-surface-container pb-3">
                <span className="font-headline font-bold text-on-surface text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  {username}
                </span>
                <span className="font-label text-[9px] bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-secondary/10">
                  {data.count} entries
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pt-1">
                <div className="space-y-1">
                  {Object.entries(data.journals).map(([j, amt]) => (
                    <div key={j} className="text-xs font-semibold text-on-surface flex gap-2 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                      <span className="opacity-70 flex-1">{j}</span> <span className="font-bold">{amt.toLocaleString()}/-</span>
                    </div>
                  ))}
                </div>
                <div className="font-headline font-extrabold text-xl text-primary text-right sm:text-left">
                  {data.totalAmount.toLocaleString()}/-
                </div>
              </div>
            </div>
          ))}
          {!loading && Object.keys(userTotals).length === 0 && (
             <div className="bg-surface-container-lowest p-6 rounded-2xl border border-dashed border-outline-variant text-center space-y-2">
               <span className="material-symbols-outlined text-outline-variant text-3xl">sentiment_dissatisfied</span>
               <p className="font-body text-sm text-on-surface-variant">No records available for the selected interval.</p>
             </div>
          )}
        </section>
      </div>

      {/* Print Only Layout */}
      <div className="hidden print:block w-full text-black space-y-6 pt-4 font-body">
        <div className="text-center border-b-2 border-black pb-4 mb-8">
          <h1 className="font-headline text-3xl font-bold uppercase tracking-widest text-black">User Collections Report</h1>
          <p className="text-base mt-2 flex justify-center gap-4">
             <span>From: <strong className="font-mono">{fromDate}</strong></span> 
             <span>To: <strong className="font-mono">{toDate}</strong></span>
          </p>
          <p className="text-xs mt-2 opacity-60">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="bg-gray-100 p-4 flex justify-between font-bold border border-black mb-8 text-xl rounded">
          <span>GLOBAL COLLECTIONS:</span>
          <span className="font-mono">PKR {totalSum.toLocaleString()}</span>
        </div>

        <table className="w-full text-left font-body border-collapse border border-black">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-3 px-4 border border-black text-sm uppercase font-bold tracking-widest">Collector (User)</th>
              <th className="py-3 px-4 border border-black text-sm uppercase font-bold tracking-widest text-center">Total Entries</th>
              <th className="py-3 px-4 border border-black text-sm uppercase font-bold tracking-widest text-right">Aggregated Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(userTotals).map(([username, data]) => (
              <tr key={username} className="even:bg-gray-50 border-b border-black">
                <td className="py-4 px-4 border border-black align-top">
                  <div className="font-bold text-lg">{username}</div>
                  <div className="text-xs space-y-1 mt-2 opacity-80 pl-2 border-l-2 border-gray-400">
                    <div className="font-semibold uppercase tracking-wider text-[9px] mb-1">Journal Breakdown</div>
                    {Object.entries(data.journals).map(([j, amt]) => (
                      <div key={j} className="flex justify-between w-48">
                        <span>{j}:</span> <span className="font-mono">{amt.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-4 border border-black text-center font-bold font-mono align-top pt-5">{data.count}</td>
                <td className="py-4 px-4 border border-black text-right font-extrabold text-lg align-top pt-4 font-mono">
                   PKR {data.totalAmount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="text-center text-xs mt-16 pt-4 border-t border-black border-dashed pb-8 opacity-60">
          <p>System Generated Document</p>
          <p>Powered By Affinity Business Suite</p>
        </div>
      </div>
    </main>
  );
}
