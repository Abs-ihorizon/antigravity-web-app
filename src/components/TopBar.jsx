export function TopBar() {
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
          <span className="material-symbols-outlined text-[14px] text-green-600 dark:text-green-400" style={{fontVariationSettings: '"FILL" 1'}}>cloud_done</span>
          <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">Odoo Synced</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#eceef0]/50 dark:hover:bg-[#2e3133]/50 transition-colors">
          <span className="material-symbols-outlined text-[#426087] dark:text-[#abc8f5]">notifications</span>
        </button>
      </div>
    </header>
  );
}
