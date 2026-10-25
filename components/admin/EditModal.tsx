"use client";

import { useState } from "react";
import Image from "next/image";
import { API } from "@/lib/api";

interface EditModalProps {
  item: Record<string, unknown>;
  isNew: boolean;
  saving?: boolean;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function EditModal({ item, isNew, saving, onSave, onCancel }: EditModalProps) {
  const [form, setForm] = useState({ ...item });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState((item.image_url as string) || "");
  const [extraExisting, setExtraExisting] = useState<string[]>(() => {
    const v = item.extra_images;
    if (Array.isArray(v)) return v.filter((u): u is string => typeof u === "string");
    if (typeof v === "string" && v) {
      try {
        const p: unknown = JSON.parse(v);
        if (Array.isArray(p)) return p.filter((u): u is string => typeof u === "string");
      } catch { /* ignore */ }
    }
    return [];
  });
  const [extraNew, setExtraNew] = useState<{ file: File; preview: string }[]>([]);

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

  const handleExtraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - extraExisting.length - extraNew.length);
    if (files.length === 0) return;
    const mapped = files.map((file) => {
      const reader = new FileReader();
      const entry = { file, preview: "" };
      reader.onload = (ev) => {
        entry.preview = ev.target?.result as string;
        setExtraNew((prev) => [...prev]);
      };
      reader.readAsDataURL(file);
      return entry;
    });
    setExtraNew((prev) => [...prev, ...mapped].slice(0, 3 - extraExisting.length));
    e.target.value = "";
  };

  return (
    <div className="modal" style={{ width: "min(520px, 95vw)" }} onClick={e => e.stopPropagation()}>
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
          <div className="form-group"><label>Package Weight (grams)</label><input type="number" min="1" step="1" required value={(form.weight_grams as number) || 250} onChange={e => set("weight_grams", Number(e.target.value))} /></div>
          <div className="form-group"><label>Stock</label><input type="number" value={(form.stock as number) || 0} onChange={e => set("stock", Number(e.target.value))} /></div>
          <div className="form-group"><label>Offer</label><input value={(form.offer as string) || ""} onChange={e => set("offer", e.target.value)} /></div>
          <div className="form-group full"><label>Main Photo</label>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 220, maxWidth: "100%" }}>
                <label htmlFor="dd-main-photo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1.5px dashed #bbb", background: "#fafafa", color: "#1b3c33", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  {imagePreview || imageFile ? "Replace photo" : "Upload photo"}
                </label>
                <input id="dd-main-photo" type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                {imageFile && <div style={{ marginTop: 6, fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imageFile.name}</div>}
              </div>
              <div style={{ flex: "1 1 200px", background: "#f5f3ef", borderRadius: 12, border: "1px solid #eee", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 150, position: "relative" }}>
                {imagePreview ? (
                  <>
                    <Image src={imagePreview.startsWith("data:") ? imagePreview : `${API}${imagePreview}`} alt="Main photo preview" width={360} height={220} style={{ maxWidth: "100%", maxHeight: 220, width: "auto", height: "auto", borderRadius: 8, objectFit: "contain" }} unoptimized />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); set("image_url", ""); }} aria-label="Remove main photo" style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: "none", background: "#e74c3c", color: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "#999" }}>No image selected</div>
                )}
              </div>
            </div>
          </div>
          <div className="form-group full"><label>More Photos (up to 3 — total 4 with main)</label>
            <input id="dd-extra-photos" type="file" accept="image/*" multiple onChange={handleExtraChange} disabled={extraExisting.length + extraNew.length >= 3} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
              {extraExisting.map((url) => (
                <div key={url} style={{ position: "relative", width: 96, height: 96, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e5e5", background: "#f5f3ef" }}>
                  <Image src={url.startsWith("http") ? url : `${API}${url}`} alt="Extra photo" width={96} height={96} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => setExtraExisting((prev) => prev.filter((u) => u !== url))} aria-label="Remove photo" style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(231,76,60,0.95)", color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
              {extraNew.map((entry, i) => (
                <div key={`${entry.file.name}-${i}`} style={{ position: "relative", width: 96, height: 96, borderRadius: 10, overflow: "hidden", border: "1px dashed #c8a97a", background: "#faf7f0" }}>
                  {entry.preview ? (
                    <Image src={entry.preview} alt="New photo" width={96} height={96} style={{ width: "100%", height: "100%", objectFit: "cover" }} unoptimized />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#999" }}>...</div>
                  )}
                  <button type="button" onClick={() => setExtraNew((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove photo" style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(231,76,60,0.95)", color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
              {extraExisting.length + extraNew.length < 3 && (
                <label htmlFor="dd-extra-photos" style={{ width: 96, height: 96, borderRadius: 10, border: "1.5px dashed #bbb", background: "#fafafa", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", fontSize: 22, fontWeight: 300 }}>
                  +
                  <span style={{ fontSize: 10, fontWeight: 700 }}>Add</span>
                </label>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#999" }}>{extraExisting.length + extraNew.length} of 3 added</div>
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
        <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button
          className="btn primary"
          disabled={saving}
          style={saving ? { opacity: 0.7, cursor: "wait" } : undefined}
          onClick={() => {
            if (saving) return;
            const restForm = { ...form };
            delete restForm.extra_images;
            onSave({ ...restForm, _imageFile: imageFile || undefined, _extraFiles: extraNew.map((e) => e.file), _keepExtra: extraExisting });
          }}
        >
          {saving ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="dd-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", display: "inline-block" }} />
              Saving...
            </span>
          ) : (
            "Save"
          )}
        </button>
      </div>
      <style>{`@keyframes dd-spin { to { transform: rotate(360deg); } } .dd-spin { animation: dd-spin 0.8s linear infinite; }`}</style>
    </div>
  );
}
