"use client";

import { MenuItem } from "../types";

interface MenuTabProps {
  items: MenuItem[];
  onAdd: () => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: number) => void;
}

export default function MenuTab({ items, onAdd, onEdit, onDelete }: MenuTabProps) {
  return (
    <>
      <div className="topbar">
        <h2>MENU ITEMS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Item</button>
      </div>
      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Category</th><th>Name</th><th>Price</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(m => (
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
        {items.length === 0 && <div className="empty">No menu items. Click &quot;Add Item&quot; to create one.</div>}
      </div>
    </>
  );
}
