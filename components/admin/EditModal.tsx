"use client";

import { useState } from "react";
import Image from "next/image";
import { API } from "@/lib/api";

interface EditModalProps {
  item: Record<string, unknown>;
  isNew: boolean;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function EditModal({ item, isNew, onSave, onCancel }: EditModalProps) {
  const [form, setForm] = useState({ ...item });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState((item.image_url as string) || "");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const isMenu = "category" in form && "price" in form && typeof form.price === "string";
  const isProduct = "stock" in form && "original_price" in form;
  const isJob = "department" in form && "job_type" in form;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal" style={{ width: 520, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
      <h4>{isNew ? "Add New" : "Edit"} {isMenu ? "Menu Item" : isProduct ? "Product" : "Job"}</h4>
      <div className="form-grid" style={{ marginTop: 16 }}>
        {isMenu && (<>
          <div className="form-group"><label>Name</label><input value={(form.name as string) || ""} onChange={e => set("name", e.target.value)} /></div>
          <div className="form-group"><label>Category</label><input value={(form.category as string) || ""} onChange={e => set("category", e.target.value)} /></div>
          <div className="form-group"><label>Price</label><input value={(form.price as string) || ""} onChange={e => set("price", e.target.value)} /></div>
          <div className="form-group full"><label>Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: 12 }} />
            {imagePreview && <Image src={imagePreview.startsWith("data:") ? imagePreview : `${API}${imagePreview}`} alt="" width={300} height={150} style={{ marginTop: 8, maxWidth: "100%", maxHeight: 150, borderRadius: 6, objectFit: "contain" }} />}
            {!imagePreview && !imageFile && <div style={{ marginTop: 4, fontSize: 11, color: "#999" }}>No image selected</div>}
          </div>
          <div className="form-group full"><label>Description</label><textarea value={(form.description as string) || ""} onChange={e => set("description", e.target.value)} /></div>
          <div className="form-group"><label>Sort Order</label><input type="number" value={(form.sort_order as number) || 0} onChange={e => set("sort_order", Number(e.target.value))} /></div>
          <div className="form-group"><label>Active</label><select value={form.is_active ? "true" : "false"} onChange={e => set("is_active", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></div>
        </>)}
        {isProduct && (<>
          <div className="form-group"><label>Name</label><input value={(form.name as string) || ""} onChange={e => set("name", e.target.value)} /></div>
          <div className="form-group"><label>Category</label><input value={(form.category as string) || ""} onChange={e => set("category", e.target.value)} /></div>
          <div className="form-group"><label>Price (₹)</label><input type="number" value={(form.price as number) || 0} onChange={e => set("price", Number(e.target.value))} /></div>
          <div className="form-group"><label>Original Price (₹)</label><input type="number" value={(form.original_price as number) || 0} onChange={e => set("original_price", Number(e.target.value))} /></div>
          <div className="form-group"><label>Stock</label><input type="number" value={(form.stock as number) || 0} onChange={e => set("stock", Number(e.target.value))} /></div>
          <div className="form-group"><label>Offer</label><input value={(form.offer as string) || ""} onChange={e => set("offer", e.target.value)} /></div>
          <div className="form-group full"><label>Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: 12 }} />
            {imagePreview && <Image src={imagePreview.startsWith("data:") ? imagePreview : `${API}${imagePreview}`} alt="" width={300} height={150} style={{ marginTop: 8, maxWidth: "100%", maxHeight: 150, borderRadius: 6, objectFit: "contain" }} />}
            {!imagePreview && !imageFile && <div style={{ marginTop: 4, fontSize: 11, color: "#999" }}>No image selected</div>}
          </div>
          <div className="form-group"><label>Sort Order</label><input type="number" value={(form.sort_order as number) || 0} onChange={e => set("sort_order", Number(e.target.value))} /></div>
          <div className="form-group full"><label>Description</label><textarea value={(form.description as string) || ""} onChange={e => set("description", e.target.value)} /></div>
          <div className="form-group"><label>Active</label><select value={form.is_active ? "true" : "false"} onChange={e => set("is_active", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></div>
        </>)}
        {isJob && (<>
          <div className="form-group"><label>Title</label><input value={(form.title as string) || ""} onChange={e => set("title", e.target.value)} /></div>
          <div className="form-group"><label>Department</label><input value={(form.department as string) || ""} onChange={e => set("department", e.target.value)} /></div>
          <div className="form-group"><label>Location</label><input value={(form.location as string) || ""} onChange={e => set("location", e.target.value)} /></div>
          <div className="form-group"><label>Job Type</label><select value={(form.job_type as string) || "full-time"} onChange={e => set("job_type", e.target.value)}><option value="full-time">Full Time</option><option value="part-time">Part Time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div>
          <div className="form-group"><label>Salary Range</label><input value={(form.salary_range as string) || ""} onChange={e => set("salary_range", e.target.value)} /></div>
          <div className="form-group"><label>Active</label><select value={form.is_active ? "true" : "false"} onChange={e => set("is_active", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></div>
          <div className="form-group full"><label>Description</label><textarea value={(form.description as string) || ""} onChange={e => set("description", e.target.value)} /></div>
          <div className="form-group full"><label>Requirements</label><textarea value={(form.requirements as string) || ""} onChange={e => set("requirements", e.target.value)} /></div>
        </>)}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={() => onSave({ ...form, _imageFile: imageFile || undefined })}>Save</button>
      </div>
    </div>
  );
}
