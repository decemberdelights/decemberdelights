"use client";

import { useState, useMemo } from "react";
import { Product } from "../types";
import FilterBar from "../FilterBar";

interface ProductsTabProps {
  products: Product[];
  onAdd: () => void;
  onEdit: (item: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductsTab({ products, onAdd, onEdit, onDelete }: ProductsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (activeFilter === "active" && !p.is_active) return false;
      if (activeFilter === "inactive" && p.is_active) return false;
      if (stockFilter === "in_stock" && p.stock <= 0) return false;
      if (stockFilter === "out_of_stock" && p.stock > 0) return false;
      if (stockFilter === "low_stock" && (p.stock <= 0 || p.stock > 10)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [p.name, p.category, p.description, p.offer].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [products, categoryFilter, activeFilter, stockFilter, searchQuery]);
  return (
    <>
      <div className="topbar">
        <h2>PRODUCTS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Product</button>
      </div>

      <FilterBar
        search={{ placeholder: "Search by name, category, offer...", value: searchQuery, onChange: setSearchQuery }}
        selects={[
          { label: "All Categories", value: categoryFilter, onChange: setCategoryFilter, options: categories.map(c => ({ label: c, value: c })) },
          { label: "All Status", value: activeFilter, onChange: setActiveFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
          { label: "All Stock", value: stockFilter, onChange: setStockFilter, options: [{ label: "In Stock", value: "in_stock" }, { label: "Out of Stock", value: "out_of_stock" }, { label: "Low Stock (1-10)", value: "low_stock" }] },
        ]}
        counts={[{ label: "Showing", total: products.length, filtered: filteredProducts.length }]}
      />

      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {filteredProducts.map(p => (
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
        </div>
        {filteredProducts.length === 0 && <div className="empty">{products.length === 0 ? 'No products. Click "Add Product" to create one.' : "No products match your filters."}</div>}
      </div>
    </>
  );
}
