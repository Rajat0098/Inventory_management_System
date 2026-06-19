import { useEffect, useState } from 'react';
import { Plus, Search, Eye, X, Trash, CornerDownRight, AlertTriangle, RefreshCw } from 'lucide-react';

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
  phone?: string;
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

interface OrdersProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Orders({ apiBase, showToast }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [lineItems, setLineItems] = useState<{ product_id: string; quantity: number }[]>([
    { product_id: '', quantity: 1 }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        fetch(`${apiBase}/api/orders`),
        fetch(`${apiBase}/api/products`),
        fetch(`${apiBase}/api/customers`)
      ]);

      if (!ordersRes.ok || !productsRes.ok || !customersRes.ok) {
        throw new Error('Failed to fetch orders or reference data.');
      }

      const [ordersData, productsData, customersData] = await Promise.all([
        ordersRes.json(),
        productsRes.json(),
        customersRes.json()
      ]);

      setOrders(ordersData);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (err: any) {
      showToast(err.message || 'Error loading dashboard records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const openCreateModal = () => {
    setSelectedCustomerId('');
    setLineItems([{ product_id: '', quantity: 1 }]);
    setIsCreateOpen(true);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  const handleLineItemChange = (index: number, field: 'product_id' | 'quantity', value: any) => {
    const updated = [...lineItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    } else {
      updated[index].product_id = value;
    }
    setLineItems(updated);
  };

  const calculateTotal = () => {
    let total = 0;
    lineItems.forEach((item) => {
      const prod = products.find((p) => p.id.toString() === item.product_id);
      if (prod) {
        total += parseFloat(prod.price) * item.quantity;
      }
    });
    return total;
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order? This will restore stock levels of its items.')) return;

    try {
      const res = await fetch(`${apiBase}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.detail || 'Failed to cancel order');
      }

      showToast('Order cancelled and inventory restored.', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order.', 'error');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      showToast('Please select a customer.', 'error');
      return;
    }

    // Filter out invalid lines
    const validItems = lineItems.filter(item => item.product_id !== '');
    if (validItems.length === 0) {
      showToast('Please add at least one valid product line item.', 'error');
      return;
    }

    // Check for duplicate products in lines
    const prodIds = validItems.map(i => i.product_id);
    if (new Set(prodIds).size !== prodIds.length) {
      showToast('Duplicate products found. Please combine quantities into a single line item.', 'error');
      return;
    }

    // Perform frontend validation against current product stock before submission
    let stockValid = true;
    for (const item of validItems) {
      const prod = products.find(p => p.id.toString() === item.product_id);
      if (prod && prod.stock < item.quantity) {
        showToast(
          `Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}`,
          'error'
        );
        stockValid = false;
        break;
      }
    }

    if (!stockValid) return;

    const payload = {
      customer_id: parseInt(selectedCustomerId, 10),
      items: validItems.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: item.quantity,
      })),
    };

    try {
      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.detail || 'Failed to create order');
      }

      showToast('Order created successfully.', 'success');
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'An error occurred placing the order.', 'error');
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    String(order.id).includes(search)
  );

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
  };

  return (
    <div>
      {/* Top Controls */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by customer name or order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'inline-flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh data">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} style={{ marginRight: '4px' }} /> Create Order
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass section-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            {search ? 'No orders match your search.' : 'No orders recorded yet. click "Create Order" to start.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                      #ORD-{String(order.id).padStart(4, '0')}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{order.customer.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{order.customer.email}</div>
                      </div>
                    </td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Order Details"
                          onClick={() => openViewModal(order)}
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} /> View
                        </button>
                        {order.status !== 'cancelled' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Cancel Order"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Order Details Modal */}
      {isViewOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <div className="modal-header">
              <h3>Order details: #ORD-{String(selectedOrder.id).padStart(4, '0')}</h3>
              <button className="modal-close-btn" onClick={() => setIsViewOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Customer summary */}
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Customer Contact</h4>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{selectedOrder.customer.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedOrder.customer.email}</div>
                {selectedOrder.customer.phone && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Phone: {selectedOrder.customer.phone}</div>
                )}
              </div>

              {/* Items listing */}
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Ordered Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CornerDownRight size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: '500' }}>{item.product?.name || 'Deleted Product'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '18px' }}>
                        Price at Purchase: {formatCurrency(item.price_at_order)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '500' }}>Qty: {item.quantity}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {formatCurrency((parseFloat(item.price_at_order) * item.quantity).toString())}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order total */}
              <div className="order-summary-box">
                <h4>Status: <span className={`badge badge-${selectedOrder.status === 'completed' ? 'success' : selectedOrder.status === 'pending' ? 'warning' : 'danger'}`} style={{ marginLeft: '6px' }}>{selectedOrder.status}</span></h4>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px' }}>Total Amount</span>
                  <span className="price">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setIsViewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <form className="glass modal-content" style={{ maxWidth: '650px' }} onSubmit={handleSubmitOrder}>
            <div className="modal-header">
              <h3>Create New Order</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Customer selector */}
              <div className="form-group">
                <label>Select Customer *</label>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line items section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Order Line Items *</h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                  <Plus size={12} style={{ marginRight: '4px' }} /> Add Line
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {lineItems.map((item, index) => {
                  const selectedProd = products.find((p) => p.id.toString() === item.product_id);
                  const isStockWarning = selectedProd && selectedProd.stock < item.quantity;

                  return (
                    <div key={index} className="order-line-item">
                      {/* Product Selector */}
                      <select
                        className="form-control"
                        value={item.product_id}
                        onChange={(e) => handleLineItemChange(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${parseFloat(p.price).toFixed(2)}) - SKU: {p.sku}
                          </option>
                        ))}
                      </select>

                      {/* Stock Info display */}
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {selectedProd ? (
                          <span style={{ color: selectedProd.stock === 0 ? 'var(--danger)' : selectedProd.stock <= 5 ? 'var(--warning)' : 'var(--success)' }}>
                            Stock: {selectedProd.stock}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Select product</span>
                        )}
                      </div>

                      {/* Quantity input */}
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        style={{ width: '80px', borderColor: isStockWarning ? 'var(--danger)' : 'var(--border)' }}
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        required
                      />

                      {/* Remove Line Button */}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ border: 'none', background: 'none' }}
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash size={14} style={{ color: lineItems.length === 1 ? 'var(--text-muted)' : 'var(--danger)' }} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic warning banner if stock validation fails on frontend */}
              {lineItems.some(item => {
                const p = products.find(prod => prod.id.toString() === item.product_id);
                return p && p.stock < item.quantity;
              }) && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  <AlertTriangle size={16} />
                  <span>One or more products do not have sufficient stock. Please reduce quantity or remove item before saving.</span>
                </div>
              )}

              {/* Total calculations box */}
              <div className="order-summary-box">
                <h4>Subtotal & Total</h4>
                <div>
                  <span className="price">{formatCurrency(calculateTotal().toString())}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={lineItems.some(item => {
                  const p = products.find(prod => prod.id.toString() === item.product_id);
                  return p && p.stock < item.quantity;
                })}
              >
                Place Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
