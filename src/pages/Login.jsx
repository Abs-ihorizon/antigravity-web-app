import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { odoo } from '../lib/odooClient';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const serverUrl = formData.get('server_url');
    const db = formData.get('db');
    const email = formData.get('email');
    const password = formData.get('password');

    if (!serverUrl || !db || !email || !password) {
      setErrorMsg('All fields are required.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await odoo.login(serverUrl, db, email, password);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-md py-20 flex flex-col items-center justify-center flex-1 px-6">
      {/* Brand Identity Section */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-48 h-auto mb-6 relative flex justify-center">
          <div className="absolute inset-0 bg-primary-container/20 rounded-full blur-2xl"></div>
          <img alt="Jama'at-ul-Muslimeen Logo" className="relative w-full h-full object-contain dark:invert" src="/logo.png"/>
        </div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-2">Digital Ledger</h1>
        <p className="text-on-surface-variant font-body text-sm max-w-[280px] leading-relaxed">
          Secure Odoo ERP Authentication for administrative ledger access
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow w-full">
        {errorMsg && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs font-bold rounded-lg border border-error/20">
            {errorMsg}
          </div>
        )}
        <form className="space-y-5" onSubmit={handleLogin}>
          {/* Server URL Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1">
              <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant" htmlFor="server_url">
                Server URL
              </label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">dns</span>
              </div>
              <input name="server_url" className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-0 rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors placeholder:text-outline text-on-surface" id="server_url" placeholder="https://odoo.yourserver.com" type="url" defaultValue={odoo.baseUrl || "https://odoo.digital-ledger.com"}/>
            </div>
          </div>

          {/* Database Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1">
              <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant" htmlFor="db">
                Database Name
              </label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">database</span>
              </div>
              <input name="db" className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-0 rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors placeholder:text-outline text-on-surface" id="db" placeholder="odoo_db" type="text" defaultValue={odoo.db || ""}/>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1">
              <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant" htmlFor="email">
                Email / Login
              </label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input name="email" className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-0 rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors placeholder:text-outline text-on-surface" id="email" placeholder="name@institution.com" type="text" defaultValue="admin" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1">
              <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant" htmlFor="password">
                Password
              </label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input name="password" className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-0 rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors placeholder:text-outline text-on-surface" id="password" placeholder="••••••••" type="password" defaultValue=""/>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button disabled={loading} className="w-full h-14 bg-gradient-to-r from-primary to-primary-fixed-dim text-on-primary font-headline font-bold rounded-full shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50" type="submit">
              {loading ? "Authenticating..." : "Login / لاگ ان"}
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 -z-10 w-1/3 h-1/2 bg-gradient-to-tr from-primary-container/10 to-transparent pointer-events-none"></div>
      
      <div className="fixed bottom-6 left-0 right-0 flex flex-col items-center justify-center opacity-80 pointer-events-none pointer-events-none select-none">
         <p className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Powered By</p>
         <img src="/affinity-logo.png" alt="Affinity Business Suite Logo" className="h-[22px] object-contain mix-blend-multiply dark:mix-blend-lighten grayscale" />
      </div>
    </main>
  );
}
