"use client";

import { useState, useEffect, useCallback } from "react";

interface TermItem {
  id: number;
  title_en: string;
  title_te: string;
  title_hi: string;
  text_en: string;
  text_te: string;
  text_hi: string;
  sort_order: number;
  is_active: boolean;
  scope: "franchise" | "shop";
  created_at: string;
  updated_at: string;
}

const emptyTerm: Omit<TermItem, "id" | "created_at" | "updated_at"> = {
  title_en: "",
  title_te: "",
  title_hi: "",
  text_en: "",
  text_te: "",
  text_hi: "",
  sort_order: 0,
  is_active: true,
  scope: "franchise",
};

export default function TermsTab({ api, role }: { api: (path: string, opts?: RequestInit) => Promise<Response>; role: string }) {
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyTerm);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [error, setError] = useState("");
  const [editLang, setEditLang] = useState<"en" | "te" | "hi">("en");
  const [scopeFilter, setScopeFilter] = useState<"franchise" | "shop">("franchise");

  const fetchTerms = useCallback(async () => {
    try {
      const r = await api("/api/admin/terms");
      if (r.ok) setTerms(await r.json());
    } catch {}
    setLoading(false);
  }, [api]);

  const loadTerms = useCallback(() => {
    setLoading(true);
    void fetchTerms();
  }, [fetchTerms]);

  useEffect(() => {
    let active = true;
    api("/api/admin/terms")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setTerms(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);

  const filtered = terms.filter(t => {
    if (t.scope !== scopeFilter) return false;
    const matchSearch = !search ||
      t.title_en.toLowerCase().includes(search.toLowerCase()) ||
      t.title_te.toLowerCase().includes(search.toLowerCase()) ||
      t.title_hi.toLowerCase().includes(search.toLowerCase()) ||
      t.text_en.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" ||
      (filterActive === "active" && t.is_active) ||
      (filterActive === "inactive" && !t.is_active);
    return matchSearch && matchActive;
  });

  const startAdd = () => {
    setForm({ ...emptyTerm, scope: scopeFilter, sort_order: terms.filter((term) => term.scope === scopeFilter).length });
    setEditingId(null);
    setIsNew(true);
    setEditLang("en");
    setError("");
  };

  const startEdit = (term: TermItem) => {
    setForm({
      title_en: term.title_en,
      title_te: term.title_te,
      title_hi: term.title_hi,
      text_en: term.text_en,
      text_te: term.text_te,
      text_hi: term.text_hi,
      sort_order: term.sort_order,
      is_active: term.is_active,
      scope: term.scope,
    });
    setEditingId(term.id);
    setIsNew(false);
    setEditLang("en");
    setError("");
  };

  const save = async () => {
    if (!form.text_en.trim()) { setError("English text is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        const r = await api("/api/admin/terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!r.ok) { const d = await r.json(); setError(d.detail || "Failed to save"); setSaving(false); return; }
      } else {
        const r = await api(`/api/admin/terms/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!r.ok) { const d = await r.json(); setError(d.detail || "Failed to save"); setSaving(false); return; }
      }
      setEditingId(null);
      setIsNew(false);
      loadTerms();
    } catch { setError("Failed to save"); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this term permanently?")) return;
    try {
      await api(`/api/admin/terms/${id}`, { method: "DELETE" });
      loadTerms();
    } catch {}
  };

  const toggleActive = async (term: TermItem) => {
    try {
      await api(`/api/admin/terms/${term.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !term.is_active }),
      });
      loadTerms();
    } catch {}
  };

  const updateForm = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (editingId !== null || isNew) {
    const langLabels: Record<string, string> = { en: "English", te: "Telugu", hi: "Hindi" };
    const titleField = `title_${editLang}` as keyof typeof form;
    const textField = `text_${editLang}` as keyof typeof form;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setEditingId(null); setIsNew(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 14, fontFamily: "inherit" }}>&larr; Back</button>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: 22, fontWeight: 700, color: "#1b3c33", margin: 0 }}>{isNew ? "Add New Term" : `Edit Term #${editingId}`}</h2>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#a32d2d", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["en", "te", "hi"] as const).map(lang => (
            <button key={lang} onClick={() => setEditLang(lang)} style={{
              padding: "6px 14px", borderRadius: 100, border: "1.5px solid #e8e5e0",
              background: editLang === lang ? "#1b3c33" : "transparent",
              color: editLang === lang ? "#fff" : "#666",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{langLabels[lang]}</button>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <label style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
            Title ({langLabels[editLang]})
          </label>
          <input
            value={String(form[titleField])}
            onChange={e => updateForm(titleField, e.target.value)}
            placeholder={`Title in ${langLabels[editLang]}`}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0ddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14 }}
          />
          <label style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
            Text ({langLabels[editLang]}) *
          </label>
          <textarea
            value={String(form[textField])}
            onChange={e => updateForm(textField, e.target.value)}
            placeholder={`Terms text in ${langLabels[editLang]}`}
            rows={6}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0ddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => updateForm("sort_order", parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0ddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
            <label style={{ fontFamily: "inherit", fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => updateForm("is_active", e.target.checked)} style={{ width: 16, height: 16 }} />
              Active
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => { setEditingId(null); setIsNew(false); }} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e0ddd8", background: "#fff", color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#1b3c33", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : isNew ? "Create Term" : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: 22, fontWeight: 700, color: "#1b3c33", margin: 0 }}>Terms & Conditions</h2>
          <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>Manage franchise and coffee shop terms displayed to customers</p>
        </div>
        {role === "super_admin" && (
          <button onClick={startAdd} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1b3c33", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Term</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([
          ["franchise", "Franchise Terms"],
          ["shop", "Shop Terms"],
        ] as const).map(([scope, label]) => (
          <button
            key={scope}
            onClick={() => { setScopeFilter(scope); setFilterActive("all"); setSearch(""); }}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${scopeFilter === scope ? "#1b3c33" : "#e0ddd8"}`,
              background: scopeFilter === scope ? "#1b3c33" : "#fff",
              color: scopeFilter === scope ? "#fff" : "#555",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >{label} ({terms.filter((term) => term.scope === scope).length})</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search terms..."
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #e0ddd8", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as "all" | "active" | "inactive")}
          style={{ padding: "8px 12px", border: "1px solid #e0ddd8", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
          <option value="all">All ({terms.filter((term) => term.scope === scopeFilter).length})</option>
          <option value="active">Active ({terms.filter(t => t.scope === scopeFilter && t.is_active).length})</option>
          <option value="inactive">Inactive ({terms.filter(t => t.scope === scopeFilter && !t.is_active).length})</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#999", fontSize: 13 }}>Loading terms...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#999", fontSize: 13 }}>
          {terms.filter((term) => term.scope === scopeFilter).length === 0 ? "No terms yet. Click \"Add Term\" to create your first term." : "No terms match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((term) => (
            <div key={term.id} style={{
              background: "#fff", border: "1px solid #e8e5e0", borderRadius: 10, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14, transition: "box-shadow 0.15s",
            }}>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 16, color: "#c8a97e", minWidth: 28, textAlign: "right" }}>
                {String(term.sort_order + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1b3c33", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {term.title_en || "(No title)"}
                </div>
                <div style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {term.text_en.substring(0, 100)}{term.text_en.length > 100 ? "..." : ""}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {term.title_te && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#f0ede8", color: "#666" }}>TE</span>}
                  {term.title_hi && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#f0ede8", color: "#666" }}>HI</span>}
                </div>
              </div>
              <button onClick={() => toggleActive(term)} title={term.is_active ? "Deactivate" : "Activate"} style={{
                padding: "4px 10px", borderRadius: 6, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: term.is_active ? "#eaf3de" : "#fef2f2",
                borderColor: term.is_active ? "#bcd99c" : "#fecaca",
                color: term.is_active ? "#3b6d11" : "#a32d2d",
              }}>{term.is_active ? "Active" : "Inactive"}</button>
              {role === "super_admin" && (
                <>
                  <button onClick={() => startEdit(term)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e0ddd8", background: "#fff", color: "#666", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                  <button onClick={() => remove(term.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#a32d2d", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
