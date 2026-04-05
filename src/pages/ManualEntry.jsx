import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { odoo } from '../lib/odooClient';
import { syncManager } from '../lib/syncManager';

export function ManualEntry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [myManager, setMyManager] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [sequenceVal, setSequenceVal] = useState('');
  const [sequenceId, setSequenceId] = useState(null);
  const [seqError, setSeqError] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const portalUser = localStorage.getItem('portal_user_name');
      if (portalUser) {
        // Fetch Manager Data
        const mgrData = await odoo.fetchMyManager(portalUser);
        if (mgrData) {
           setMyManager(mgrData.managerName || '');
           setApprovalRequired(mgrData.approvalRequired);
        }
        
        // Fetch Sequence Data
        const seqInfo = await odoo.fetchNextSequence(portalUser);
        if (seqInfo.offline) {
           setIsOffline(true);
           setSequenceVal('OFFLINE-PENDING');
        } else if (seqInfo.error) {
           setSeqError(seqInfo.error);
        } else {
           setSequenceVal(seqInfo.nextValueStr);
           setSequenceId(seqInfo.sequenceId);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payerName = formData.get('payer');
    const contactNo = formData.get('contact_no');
    const remarks = formData.get('remarks');
    
    setLoading(true);
    setMessage('');
    setError(false);

    try {
      const portalUserId = localStorage.getItem('portal_user_id');
      
      // INTERCEPT OFFLINE CACHE EXPLICITLY!
      if (!navigator.onLine || isOffline) {
          const payload = {
              _rawPayerName: payerName,
              _rawContactNo: contactNo,
              amount: parseFloat(formData.get('amount')) || 0.0,
              date: formData.get('date'),
              journal_id: parseInt(formData.get('journal_id'), 10),
              x_portal_user: portalUserId ? parseInt(portalUserId) : null,
              ...(approvalRequired && { x_approval_state: 'pending_approval' }),
              ...(myManager && approvalRequired && { x_manager_user: myManager }),
              ...(remarks && { memo: remarks })
          };
          syncManager.addToQueue(payload);
          setSubmittedData({ ...payload, payerName, offlinePending: true });
          return;
      }

      // 1. Map Payee Name directly to a contact in Odoo
      let partnerId = false;
      if (payerName) {
         setMessage('Verifying Payer Contact in Odoo...');
         partnerId = await odoo.getOrCreatePartner(payerName, contactNo);
      }

      setMessage('Syncing Payment...');

      // 2. account.payment payload construction
      const receiptNum = sequenceVal; // Lock standard sequence mapping
      
      const paymentData = {
        name: receiptNum, // Force standard name convention
        payment_type: 'inbound',
        partner_type: 'customer', 
        amount: parseFloat(formData.get('amount')) || 0.0,
        date: formData.get('date'),
        journal_id: parseInt(formData.get('journal_id'), 10),
        payment_reference: receiptNum,
        x_portal_user: portalUserId ? parseInt(portalUserId) : null,
        ...(approvalRequired && { x_approval_state: 'pending_approval' }),
        ...(myManager && approvalRequired && { x_manager_user: myManager }),
        ...(remarks && { memo: remarks }), // Directly maps to the user's 'memo' DB field
        ...(partnerId && { partner_id: partnerId })
      };

      await odoo.createPayment(paymentData);

      setSubmittedData({ ...paymentData, payerName });
    } catch (err) {
      setError(true);
      setMessage(err.message || 'Failed to sync with Odoo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full pt-24 pb-32 px-4 max-w-2xl mx-auto">
      {seqError && (
        <div className="mb-4 p-4 rounded-xl font-bold text-sm text-center bg-error-container text-on-error-container border border-error/30 animate-in slide-in-from-top-2">
          {seqError}
        </div>
      )}
      {message && !seqError && (
        <div className={`mb-4 p-4 rounded-xl font-bold text-sm text-center border ${error ? 'bg-error-container text-on-error-container border-error/30' : 'bg-green-100 text-green-800 border-green-300'}`}>
          {message}
        </div>
      )}
      
      {/* Content Header */}
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">New Entry <span className="font-['Public_Sans'] font-medium text-2xl text-on-surface-variant font-normal">| نئی رسید</span></h2>
        <p className="text-on-surface-variant font-body">Log a manual transaction | دستی لین دین درج کریں</p>
      </div>

      <div className="bg-surface-container-lowest rounded-full p-8 editorial-shadow border border-outline-variant/10 rounded-[2rem]">
        <form className="space-y-8" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Receipt Number</label>
              <input 
                 name="receipt_number" 
                 value={sequenceVal || "Loading..."} 
                 readOnly 
                 className="w-full bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-bold border border-slate-200 dark:border-slate-800 rounded-md px-4 py-3 outline-none cursor-not-allowed" 
                 type="text"
              />
            </div>
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Date</label>
              <input name="date" required className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" type="date"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Payer Name</label>
              <input name="payer" className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" placeholder="Full Legal Name" type="text"/>
            </div>
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Contact No</label>
              <input name="contact_no" className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" placeholder="+92 300 0000000" type="tel"/>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-blue-700 ml-1">Odoo Journal ID</label>
            <div className="relative">
              <select name="journal_id" required className="w-full bg-blue-50/50 border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-on-surface appearance-none">
                <option value="6">Cash / Main - (ID: 6)</option>
                <option value="8">Bank (HBL) - (ID: 8)</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">account_balance_wallet</span>
            </div>
            <p className="text-[10px] text-outline ml-1">Must be the exact integer ID of the journal in your Odoo database</p>
          </div>

          <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-blue-700 ml-1">Amount (PKR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-headline font-bold text-primary">Rs.</span>
                <input name="amount" required className="w-full bg-surface-container-lowest border-none rounded-md pl-12 pr-4 py-4 text-2xl font-headline font-extrabold focus:ring-2 focus:ring-primary/20 transition-all outline-none text-on-surface" placeholder="0.00" type="number"/>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Remarks (Memo)</label>
            <textarea name="remarks" rows="2" className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface resize-none" placeholder="Optional notes..."></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-4">
            <button disabled={loading || !!seqError} className="w-full bg-gradient-to-r from-[#426087] to-[#356380] text-white font-headline font-bold py-4 rounded-full shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50" type="submit">
              <span>
                 {seqError ? "Limit Reached" :
                  loading ? "Syncing..." : 
                  approvalRequired ? `Post to Manager ${myManager ? '(' + myManager + ')' : ''}` : 
                  "Sync to Odoo"}
              </span>
              {!loading && !seqError && <span className="material-symbols-outlined text-sm">{approvalRequired ? 'send' : 'sync'}</span>}
              {seqError && <span className="material-symbols-outlined text-sm">block</span>}
            </button>
            <button className="w-full py-4 rounded-full font-body font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-[0.98]" type="button" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* SUCCESS / PRINT PANEL */}
      {submittedData && (
        <div className="fixed inset-0 bg-surface z-50 flex flex-col pt-safe print:bg-white">
          
          {/* UI Wrapper (Hidden during actual print) */}
          <div className="print:hidden p-6 flex flex-col h-full overflow-y-auto">
             <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
               <div className={`w-20 h-20 rounded-full flex items-center justify-center ${approvalRequired ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                 <span className="material-symbols-outlined text-4xl">{approvalRequired ? 'schedule_send' : 'check_circle'}</span>
               </div>
               <h2 className="font-headline text-2xl font-bold text-on-surface">
                 {submittedData.offlinePending ? 'Saved Offline' : approvalRequired ? 'Pending Approval' : 'Payment Synced!'}
               </h2>
               <p className="font-body text-on-surface-variant text-sm">
                 {submittedData.offlinePending 
                   ? 'Network unavailable. Saved locally. It will auto-sync when you reconnect.'
                   : approvalRequired 
                   ? `The transaction was routed to your manager (${myManager || 'Unassigned'}) for sign-off.` 
                   : 'The transaction is safely in your database.'}
               </p>
             </div>

             {/* Action Buttons */}
             <div className="mt-auto flex flex-col gap-4">
                <button 
                  onClick={() => window.print()}
                  className="w-full py-4 rounded-xl bg-secondary-container text-on-secondary-container font-headline font-bold uppercase tracking-widest border border-secondary/20 shadow flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined">print</span> Print Receipt | رسید پرنٹ کریں
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-4 rounded-xl bg-primary text-white font-headline font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/20"
                >
                  Return to Dashboard | ڈیش بورڈ پر واپس جائیں
                </button>
             </div>
          </div>

          {/* PRINTABLE RECEIPT PAYLOAD (Visible only on print or embedded in UI implicitly) */}
          <div className="hidden print:block w-full max-w-[80mm] mx-auto text-black p-4 font-mono text-sm space-y-4">
              <div className="text-center font-bold pb-2 border-b border-black">
                <h2>OFFICIAL RECEIPT</h2>
                <p className="text-xs">Date: {submittedData.date}</p>
              </div>

              <div className="space-y-1 py-2">
                <div className="flex justify-between">
                  <span>Ref:</span>
                  <span>{submittedData.payment_reference || 'MANUAL'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payee:</span>
                  <span className="font-bold">{submittedData.payerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{submittedData.journal_id === 6 ? 'CASH' : 'BANK'}</span>
                </div>
              </div>

              <div className="py-2 border-t border-black border-dashed flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>PKR {submittedData.amount.toLocaleString()}</span>
              </div>
              
              <div className="text-center text-xs mt-8 pt-4">
                <p>System Generated</p>
                <p>Powered By Affinity Business Suite</p>
              </div>
          </div>

        </div>
      )}
    </main>
  );
}
