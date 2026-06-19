import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface CustomersProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Customers({ apiBase, showToast }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/customers`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setEmail(cust.email);
    setPhone(cust.phone || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and Email are required.', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
    };

    try {
      let res;
      if (editingCustomer) {
        // PUT update
        res = await fetch(`${apiBase}/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // POST create
        res = await fetch(`${apiBase}/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.detail || 'Failed to save customer');
      }

      showToast(
        editingCustomer ? 'Customer updated successfully.' : 'Customer registered successfully.',
        'success'
      );
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'An error occurred while saving.', 'error');
    }
  };

  const handleDelete = async (id: number, customerName: string) => {
    if (!confirm(`Are you sure you want to delete customer "${customerName}"? All related orders will also be deleted.`)) return;

    try {
      const res = await fetch(`${apiBase}/api/customers/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete customer');
      }

      showToast('Customer record deleted.', 'success');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Error deleting customer', 'error');
    }
  };

  const filteredCustomers = customers.filter(
    (cust) =>
      cust.name.toLowerCase().includes(search.toLowerCase()) ||
      cust.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search and Add Controls */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} style={{ marginRight: '4px' }} /> Add Customer
        </button>
      </div>

      {/* Customers Table */}
      <div className="glass section-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customers...</p>
        ) : filteredCustomers.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            {search ? 'No customers match your search.' : 'No registered customers. Click "Add Customer" to begin.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      #CUST-{String(cust.id).padStart(4, '0')}
                    </td>
                    <td style={{ fontWeight: '500' }}>{cust.name}</td>
                    <td style={{ color: 'var(--primary)' }}>{cust.email}</td>
                    <td>{cust.phone || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Customer"
                          onClick={() => openEditModal(cust)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Delete Customer"
                          onClick={() => handleDelete(cust.id, cust.name)}
                        >
                          <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form className="glass modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer Info' : 'Register Customer'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingCustomer ? 'Save Changes' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
