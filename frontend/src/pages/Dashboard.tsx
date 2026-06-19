import React, { useEffect, useState } from 'react';
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, ArrowRight, PlusCircle } from 'lucide-react';

interface Product {
  id: number;
  sku: string;
  name: string;
  price: string;
  stock: number;
}

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_order: string;
  product?: Product;
}

interface Order {
  id: number;
  customer_id: number;
  status: string;
  created_at: string;
  customer: Customer;
  items: OrderItem[];
  total_amount: string;
}

interface DashboardStats {
  total_products: number;
  total_customers: number;
  total_orders: number;
  total_revenue: string;
  low_stock_products: Product[];
  recent_orders: Order[];
}

interface DashboardProps {
  onNavigate: (tab: 'dashboard' | 'products' | 'customers' | 'orders') => void;
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Dashboard({ onNavigate, apiBase, showToast }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/dashboard/stats`);
      if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-secondary)' }}>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass section-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Failed to load dashboard data.</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
  };

  return (
    <div>
      {/* Stats Cards Row */}
      <div className="stats-grid">
        <div className="glass stat-card primary">
          <div className="stat-info">
            <p>Total Products</p>
            <h2>{stats.total_products}</h2>
          </div>
          <div className="stat-icon">
            <Package size={24} />
          </div>
        </div>

        <div className="glass stat-card success">
          <div className="stat-info">
            <p>Customers Registered</p>
            <h2>{stats.total_customers}</h2>
          </div>
          <div className="stat-icon">
            <Users size={24} />
          </div>
        </div>

        <div className="glass stat-card warning">
          <div className="stat-info">
            <p>Orders Placed</p>
            <h2>{stats.total_orders}</h2>
          </div>
          <div className="stat-icon">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="glass stat-card danger">
          <div className="stat-info">
            <p>Total Revenue</p>
            <h2>{formatCurrency(stats.total_revenue)}</h2>
          </div>
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Split */}
      <div className="dashboard-layout">
        {/* Left Side: Recent Orders */}
        <div className="glass section-card">
          <div className="section-card-header">
            <h3>Recent Orders</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('orders')}>
              View All Orders <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </button>
          </div>

          <div className="table-responsive">
            {stats.recent_orders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>No orders placed yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(4, '0')}</td>
                      <td>{order.customer.name}</td>
                      <td>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(order.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Inventory Alerts & Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Low Stock Warnings */}
          <div className="glass section-card" style={{ flexGrow: 1 }}>
            <div className="section-card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                Low Stock Alerts
              </h3>
              <span className="badge badge-danger">{stats.low_stock_products.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {stats.low_stock_products.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>All products are healthy.</p>
              ) : (
                stats.low_stock_products.map((prod) => (
                  <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{prod.name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {prod.sku}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${prod.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {prod.stock} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="glass section-card">
            <h3>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => onNavigate('products')}>
                <PlusCircle size={16} style={{ marginRight: '8px', stroke: 'var(--primary)' }} />
                Manage & Add Products
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => onNavigate('customers')}>
                <PlusCircle size={16} style={{ marginRight: '8px', stroke: 'var(--success)' }} />
                Register New Customer
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => onNavigate('orders')}>
                <PlusCircle size={16} style={{ marginRight: '8px', stroke: 'var(--warning)' }} />
                Create New Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
