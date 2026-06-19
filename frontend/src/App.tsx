import React, { useState } from 'react';
import { LayoutDashboard, Package, Users, ShoppingCart, Activity, ShieldCheck } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'customers' | 'orders'>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss toast
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} apiBase={API_URL} showToast={showToast} />;
      case 'products':
        return <Products apiBase={API_URL} showToast={showToast} />;
      case 'customers':
        return <Customers apiBase={API_URL} showToast={showToast} />;
      case 'orders':
        return <Orders apiBase={API_URL} showToast={showToast} />;
      default:
        return <Dashboard onNavigate={setActiveTab} apiBase={API_URL} showToast={showToast} />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'products': return 'Inventory & Products';
      case 'customers': return 'Customer Management';
      case 'orders': return 'Sales Orders';
      default: return 'Dashboard';
    }
  };

  const getPageDescription = () => {
    switch (activeTab) {
      case 'dashboard': return 'Real-time performance metrics and alerts.';
      case 'products': return 'View, manage, edit and track stock levels.';
      case 'customers': return 'Manage client contacts and purchase history.';
      case 'orders': return 'Create and trace sales transactions.';
      default: return '';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Package size={26} />
          <span>StockWise</span>
        </div>

        <nav>
          <ul className="sidebar-menu">
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </a>
            </li>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                <Package size={18} />
                <span>Products</span>
              </a>
            </li>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                <Users size={18} />
                <span>Customers</span>
              </a>
            </li>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <ShoppingCart size={18} />
                <span>Orders</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--success)' }}>
            <Activity size={12} />
            <span>API Online</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px' }}>v1.0.0</div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-wrapper">
        <header className="main-header">
          <div className="header-title">
            <h1>{getPageTitle()}</h1>
            <p>{getPageDescription()}</p>
          </div>

          <div className="header-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
              <span>Secure Session</span>
            </div>
          </div>
        </header>

        {/* Content Render Area */}
        {renderContent()}
      </main>

      {/* Toast Notifications */}
      <div className="notifications-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
            onClick={() => removeToast(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
