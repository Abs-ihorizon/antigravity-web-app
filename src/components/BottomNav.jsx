import { NavLink, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  const isLogin = location.pathname === '/' || location.pathname === '/login';
  
  if (isLogin) return null;

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-2xl bg-[#ffffff]/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl border-t border-[#c2c7ce]/20 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] flex justify-around items-center h-20 px-4 pb-safe">
      <NavLink to="/dashboard" className={({isActive}) => `flex flex-col items-center justify-center transition-all cursor-pointer ${isActive ? 'text-[#426087] dark:text-[#abc8f5] font-bold scale-110' : 'text-[#44474a] dark:text-[#c4c7ca] opacity-70 hover:opacity-100'}`}>
        <span className="material-symbols-outlined">home</span>
        <span className="font-['Public_Sans'] text-[11px] font-medium leading-[1.6]">Home</span>
      </NavLink>
      <NavLink to="/manual-entry" className={({isActive}) => `flex flex-col items-center justify-center transition-all cursor-pointer ${isActive ? 'text-[#426087] dark:text-[#abc8f5] font-bold scale-110' : 'text-[#44474a] dark:text-[#c4c7ca] opacity-70 hover:opacity-100'}`}>
        <span className="material-symbols-outlined">add_circle</span>
        <span className="font-['Public_Sans'] text-[11px] font-medium leading-[1.6]">Add</span>
      </NavLink>
      <div className="flex flex-col items-center justify-center text-[#44474a] dark:text-[#c4c7ca] opacity-70 hover:opacity-100 transition-all cursor-pointer">
        <span className="material-symbols-outlined">analytics</span>
        <span className="font-['Public_Sans'] text-[11px] font-medium leading-[1.6]">Reports</span>
      </div>
    </nav>
  );
}
