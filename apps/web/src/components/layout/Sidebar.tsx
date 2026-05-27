import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Layers, TruckIcon, ShoppingCart,
  ArrowLeftRight, Users, LogOut, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getInitials, cn } from '../../utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Itens',         path: '/items',     icon: <Package          size={18} />, adminOnly: true  },
  { label: 'Estoque',       path: '/stock',     icon: <Layers           size={18} />, adminOnly: true  },
  { label: 'Remessas',      path: '/shipments', icon: <TruckIcon        size={18} />, adminOnly: true },
  { label: 'Pedidos',       path: '/orders',    icon: <ShoppingCart     size={18} /> },
  { label: 'Movimentações', path: '/movements', icon: <ArrowLeftRight   size={18} />, adminOnly: true },
  { label: 'Usuários',      path: '/users',     icon: <Users            size={18} />, adminOnly: true },
];

interface SidebarContentProps {
  collapsed: boolean;
  onMobileClose: () => void;
  filtered: NavItem[];
  user: { name: string; userType: string } | null;
  onLogout: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  collapsed, onMobileClose, filtered, user, onLogout,
}) => (
  <div className="flex flex-col h-full">

    {/* Logo */}
    <div className={cn(
      'flex items-center border-b border-white/10 transition-all duration-300',
      collapsed ? 'justify-center px-3 py-4' : 'gap-3 px-4 py-4'
    )}>
      <div className={cn(
        ' shadow-sm flex items-center justify-center flex-shrink-0 transition-all duration-300',
        collapsed ? 'w-9 h-9 p-1' : 'w-10 h-10 p-1.5'
      )}>
        <img src="/iconeAlmoXpert.png" alt="IFBA" className="w-full h-full object-contain" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
            AlmoxPert
          </p>
          <p className="text-[10px] text-white/50">IFBA — V. da Conquista</p>
        </div>
      )}
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {filtered.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onMobileClose}
          className={({ isActive }) =>
            cn('sidebar-item', isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
              collapsed && 'justify-center px-2')
          }
          title={collapsed ? item.label : undefined}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>

    {/* User Footer */}
    <div className={cn('border-t border-white/10 pt-3 pb-4', collapsed ? 'px-2' : 'px-3')}>
      {user && (
        <NavLink
          to="/profile"
          onClick={onMobileClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl transition-colors cursor-pointer ${
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? user.name : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-white/50">
                {user.userType === 'admin' ? 'Administrador' : 'Estudante'}
              </p>
            </div>
          )}
        </NavLink>
      )}
      <button
        onClick={onLogout}
        title={collapsed ? 'Sair' : undefined}
        className={cn(
          'sidebar-item sidebar-item-inactive w-full text-red-400/80 hover:text-red-400 hover:bg-red-500/10',
          collapsed && 'justify-center px-2'
        )}
      >
        <LogOut size={16} />
        {!collapsed && <span>Sair</span>}
      </button>
    </div>
  </div>
);

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.userType === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filtered = navItems.filter((item) => !item.adminOnly || isAdmin);

  const contentProps: SidebarContentProps = {
    collapsed,
    onMobileClose,
    filtered,
    user,
    onLogout: handleLogout,
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-gray-900 transition-all duration-300 ease-in-out relative flex-shrink-0 overflow-visible',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent {...contentProps} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[78px] w-6 h-6 rounded-full bg-gray-900 border border-gray-700 text-white flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-64 bg-gray-900 flex flex-col animate-slide-in z-50">
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent {...contentProps} />
          </aside>
        </div>
      )}
    </>
  );
};