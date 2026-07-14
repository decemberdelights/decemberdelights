"use client";

import { useState, useMemo } from "react";
import { MenuItem } from "../types";
import FilterBar from "../FilterBar";

interface MenuTabProps {
  items: MenuItem[];
  onAdd: () => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: number) => void;
}

export default function MenuTab({ items, onAdd, onEdit, onDelete }: MenuTabProps) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (activeFilter === "active" && !item.is_active) return false;
      if (activeFilter === "inactive" && item.is_active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [item.name, item.category, item.description].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, activeFilter, searchQuery]);
  return (
    <>
      <div className="topbar">
        <h2>MENU ITEMS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Item</button>
      </div>

      <FilterBar
        search={{ placeholder: "Search by name, category...", value: searchQuery, onChange: setSearchQuery }}
        selects={[
          { label: "All Categories", value: categoryFilter, onChange: setCategoryFilter, options: categories.map(c => ({ label: c, value: c })) },
          { label: "All Status", value: activeFilter, onChange: setActiveFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
        ]}
        counts={[{ label: "Showing", total: items.length, filtered: filteredItems.length }]}
      />

      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Category</th><th>Name</th><th>Price</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {filteredItems.map(m => (
              <tr key={m.id}>
                <td>#{m.id}</td>
                <td>{m.category}</td>
                <td>{m.name}</td>
                <td>{m.price}</td>
                <td><span className={`status ${m.is_active ? "approved" : "rejected"}`}>{m.is_active ? "Yes" : "No"}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => onEdit(m)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(m.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filteredItems.length === 0 && <div className="empty">{items.length === 0 ? 'No menu items. Click "Add Item" to create one.' : "No items match your filters."}</div>}
      </div>
    </>
  );
}
