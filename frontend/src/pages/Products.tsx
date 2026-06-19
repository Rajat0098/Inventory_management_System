import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: number;
}

interface ProductsProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Products({ apiBase, showToast }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setDescription('');
    setPrice('');
    setStock('0');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setDescription(prod.description || '');
    setPrice(prod.price);
    setStock(prod.stock.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !price || !stock) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price).toFixed(2),
      stock: parseInt(stock, 10),
    };

    try {
      let res;
      if (editingProduct) {
        // PUT update
        res = await fetch(`${apiBase}/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // POST create
        res = await fetch(`${apiBase}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.detail || 'Failed to save product');
      }

      showToast(
        editingProduct ? 'Product updated successfully.' : 'Product created successfully.',
        'success'
      );
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'An error occurred while saving.', 'error');
    }
  };

  const handleDelete = async (id: number, productName: string) => {
    if (!confirm(`Are you sure you want to delete product "${productName}"?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete product');
      }

      showToast('Product deleted successfully.', 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Error deleting product', 'error');
    }
  };

  const filteredProducts = products.filter((prod) =>
    prod.name.toLowerCase().includes(search.toLowerCase()) ||
    prod.sku.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (count: number) => {
    if (count === 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (count <= 5) return <span className="badge badge-warning">Low Stock ({count})</span>;
    return <span className="badge badge-success">In Stock ({count})</span>;
  };

  return (
    <div>
      {/* Top Search and Add Controls */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} style={{ marginRight: '4px' }} /> Add Product
        </button>
      </div>

      {/* Products Table */}
      <div className="glass section-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            {search ? 'No products match your search.' : 'No products in inventory. Click "Add Product" to start.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Stock Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary)' }}>
                      {prod.sku}
                    </td>
                    <td style={{ fontWeight: '500' }}>{prod.name}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.description || '—'}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      ${parseFloat(prod.price).toFixed(2)}
                    </td>
                    <td>{getStockBadge(prod.stock)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Product"
                          onClick={() => openEditModal(prod)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ hover: { background: 'var(--danger-glow)' } }}
                          title="Delete Product"
                          onClick={() => handleDelete(prod.id, prod.name)}
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
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>SKU (Stock Keeping Unit) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. PROD-100-BLU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  disabled={!!editingProduct}
                />
              </div>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. High Performance Mouse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describe the product details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Initial Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
