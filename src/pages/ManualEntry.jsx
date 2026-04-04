import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { odoo } from '../lib/odooClient';

export function ManualEntry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payerName = formData.get('payer');
    
    setLoading(true);
    setMessage('');
    setError(false);

    try {
      // 1. Map Payee Name directly to a contact in Odoo
      let partnerId = false;
      if (payerName) {
         setMessage('Verifying Payer Contact in Odoo...');
         partnerId = await odoo.getOrCreatePartner(payerName);
      }

      setMessage('Syncing Payment...');

      // 2. account.payment payload construction
      const paymentData = {
        payment_type: 'inbound',
        partner_type: 'customer', 
        amount: parseFloat(formData.get('amount')) || 0.0,
        date: formData.get('date'),
        journal_id: parseInt(formData.get('journal_id'), 10),
        // 'ref' does not exist in some Odoo versions. Let's try 'payment_reference' or 'communication'
        // If this fails, we can add it to 'name' or let the user choose.
        payment_reference: formData.get('receipt_number'),
        // Automatically inject the linked contact explicitly
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
      {message && (
        <div className={`mb-4 p-4 rounded-xl font-bold text-sm text-center border ${error ? 'bg-error-container text-on-error-container border-error/30' : 'bg-green-100 text-green-800 border-green-300'}`}>
          {message}
        </div>
      )}
      
      {/* Content Header */}
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">New Entry</h2>
        <p className="text-on-surface-variant font-body">Log a manual transaction into the digital repository.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-full p-8 editorial-shadow border border-outline-variant/10 rounded-[2rem]">
        <form className="space-y-8" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Receipt Number</label>
              <input name="receipt_number" required className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" placeholder="REC-00219" type="text"/>
            </div>
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Date</label>
              <input name="date" required className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" type="date"/>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Payer Name</label>
            <input name="payer" className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-on-surface" placeholder="Full Legal Name" type="text"/>
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-4">
            <button disabled={loading} className="w-full bg-gradient-to-r from-[#426087] to-[#356380] text-white font-headline font-bold py-4 rounded-full shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50" type="submit">
              <span>{loading ? "Syncing..." : "Sync to Odoo"}</span>
              {!loading && <span className="material-symbols-outlined text-sm">sync</span>}
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
               <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                 <span className="material-symbols-outlined text-4xl">check_circle</span>
               </div>
               <h2 className="font-headline text-2xl font-bold text-on-surface">Payment Synced!</h2>
               <p className="font-body text-on-surface-variant text-sm">The transaction is safely in your database.</p>
             </div>

             {/* Action Buttons */}
             <div className="mt-auto flex flex-col gap-4">
                <button 
                  onClick={() => window.print()}
                  className="w-full py-4 rounded-xl bg-secondary-container text-on-secondary-container font-headline font-bold uppercase tracking-widest border border-secondary/20 shadow flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined">print</span> Print Receipt
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-4 rounded-xl bg-primary text-white font-headline font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/20"
                >
                  Return to Dashboard
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
