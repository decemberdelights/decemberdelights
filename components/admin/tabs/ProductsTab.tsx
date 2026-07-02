"use client";

import { Product } from "../types";

interface ProductsTabProps {
  products: Product[];
  onAdd: () => void;
  onEdit: (item: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductsTab({ products, onAdd, onEdit, onDelete }: ProductsTabProps) {
  return (
    <>
      <div className="topbar">
        <h2>PRODUCTS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Product</button>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>₹{p.price}</td>
                <td>{p.stock}</td>
                <td><span className={`status ${p.is_active ? "approved" : "rejected"}`}>{p.is_active ? "Yes" : "No"}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => onEdit(p)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="empty">No products. Click &quot;Add Product&quot; to create one.</div>}
      </div>
    </>
  );
}
