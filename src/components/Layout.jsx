import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function Layout() {
  const location = useLocation();
  const isLogin = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="w-full flex flex-col items-center min-h-screen relative">
      {!isLogin && <TopBar />}
      <Outlet />
      {!isLogin && <BottomNav />}
    </div>
  );
}
