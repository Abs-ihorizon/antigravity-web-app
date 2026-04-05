import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { odoo } from '../lib/odooClient';

export function TopBar() {
  const navigate = useNavigate();
  const portalUser = localStorage.getItem('portal_user_name') || 'User';
  const [approvals, setApprovals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const fetchApprovals = async () => {
      const portalUser = localStorage.getItem('portal_user_name');
      if (portalUser && odoo.uid) { // make sure we are logged in
        try {
           const data = await odoo.getPendingApprovals(portalUser);
           setApprovals(data || []);
        } catch (e) {}
      }
    };
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id, status) => {
    setLoadingAction(true);
    try {
      await odoo.processApproval(id, status);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert("Error: " + e.message);
    }
    setLoadingAction(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#eceef0] dark:bg-[#2e3133] shadow-none transition-colors duration-200 ease-in-out">
      <div className="flex items-center gap-3">
        <div className="h-10 flex items-center pr-2">
          {/* Logo references the public/logo.png file. Added dark:invert so the black calligraphy reads on dark screens! */}
          <img alt="Jamaat Logo" className="h-full w-auto object-contain dark:invert" src="/logo.png"/>
        </div>
        <div className="flex flex-col">
          <h1 className="font-['Manrope'] font-bold text-sm md:text-lg leading-tight tracking-tight text-[#426087] dark:text-[#abc8f5]">Digital Ledger</h1>
          <span className="font-['Public_Sans'] text-xs font-medium text-slate-500">لیجر</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Logged in User Identity */}
        <div className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-300 dark:border-slate-700">
          <span className="font-label text-xs font-bold text-on-surface-variant max-w-[100px] truncate">{portalUser}</span>
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
             {portalUser.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
          <span className="material-symbols-outlined text-[14px] text-green-600 dark:text-green-400" style={{fontVariationSettings: '"FILL" 1'}}>cloud_done</span>
          <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider hidden sm:inline">Odoo Synced</span>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[#426087] dark:text-[#abc8f5]">notifications</span>
          {approvals.length > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#2e3133] animate-pulse"></span>
          )}
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
        <button 
          onClick={() => { odoo.logout(); navigate('/login'); }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-error/10 text-error transition-colors"
          title="Logout"
        >
          <span className="material-symbols-outlined text-error" style={{fontVariationSettings: '"wght" 700'}}>logout</span>
        </button>
      </div>

      {/* Approvals Modal Overlay */}
      {showModal && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface dark:bg-surface-container w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               <div className="p-4 bg-surface-container-low dark:bg-surface-container-highest border-b border-outline-variant/30 flex justify-between items-center">
                 <h2 className="font-headline font-bold text-on-surface">Pending Approvals ({approvals.length})</h2>
                 <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors">
                   <span className="material-symbols-outlined text-sm">close</span>
                 </button>
               </div>
               
               <div className="p-4 overflow-y-auto flex-1 space-y-4">
                 {approvals.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-20 mb-2">done_all</span>
                      <p>You're all caught up!</p>
                    </div>
                 ) : (
                    approvals.map(req => (
                      <div key={req.id} className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 shadow-sm flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                           <div>
                             <span className="text-xs font-bold uppercase tracking-wider text-primary">{req.payment_reference || 'MANUAL'}</span>
                             <p className="font-headline font-bold text-lg text-on-surface mt-1">{req.partner_id[1]}</p>
                             <p className="text-xs text-on-surface-variant mt-1">Submitted by: <span className="font-semibold text-on-surface">{req.x_portal_user ? req.x_portal_user[1] : 'Unknown'}</span></p>
                           </div>
                           <div className="text-right">
                             <p className="font-headline font-extrabold text-xl text-primary">Rs. {(req.amount || 0).toLocaleString()}</p>
                             <p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest">{req.date}</p>
                           </div>
                         </div>
                         <div className="flex gap-2 pt-2 border-t border-outline-variant/30 mt-1">
                           <button 
                             disabled={loadingAction}
                             onClick={() => handleAction(req.id, 'rejected')} 
                             className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-error-container text-on-error-container hover:bg-error hover:text-white transition-colors disabled:opacity-50"
                           >
                              Reject
                           </button>
                           <button 
                             disabled={loadingAction}
                             onClick={() => handleAction(req.id, 'approved')} 
                             className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                           >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Approve
                           </button>
                         </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
         </div>
      )}
    </header>
  );
}
