import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../App';
import { 
  Home, 
  MessageCircle, 
  Target, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  Brain, 
  LogOut,
  Menu,
  X,
  Zap
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(UserContext);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: Brain, label: 'AI Koç', path: '/ai-chat' },
    { icon: Target, label: 'Hedeflerim', path: '/goals' },
    { icon: BookOpen, label: 'Gelişim Modülleri', path: '/modules' },
    { icon: Users, label: 'Koçluk Seansları', path: '/sessions' },
    { icon: BarChart3, label: 'Raporlar', path: '/reports' },
    { icon: Settings, label: 'Ayarlar', path: '/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg text-white p-2 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-r border-white border-opacity-20 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white border-opacity-20">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MedSales</h1>
              <p className="text-blue-100 text-sm">Koçluk Platformu</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-white border-opacity-20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-white font-medium">{user?.name}</h3>
              <p className="text-blue-100 text-sm">
                {user?.role === 'bolge_muduru' ? 'Bölge Müdürü' : 'Mümessil'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-white bg-opacity-20 text-white shadow-lg'
                        : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white border-opacity-20">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;