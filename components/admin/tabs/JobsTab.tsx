"use client";

import { useState, useMemo } from "react";
import { Job } from "../types";
import FilterBar from "../FilterBar";

interface JobsTabProps {
  jobs: Job[];
  onAdd: () => void;
  onEdit: (item: Job) => void;
  onDelete: (id: number) => void;
}

export default function JobsTab({ jobs, onAdd, onEdit, onDelete }: JobsTabProps) {
  const [deptFilter, setDeptFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const departments = useMemo(() => [...new Set(jobs.map(j => j.department).filter(Boolean))], [jobs]);
  const types = useMemo(() => [...new Set(jobs.map(j => j.job_type).filter(Boolean))], [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (deptFilter && j.department !== deptFilter) return false;
      if (typeFilter && j.job_type !== typeFilter) return false;
      if (activeFilter === "active" && !j.is_active) return false;
      if (activeFilter === "inactive" && j.is_active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [j.title, j.department, j.location, j.salary_range, j.description].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, deptFilter, typeFilter, activeFilter, searchQuery]);
  return (
    <>
      <div className="topbar">
        <h2>JOB OPENINGS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Job</button>
      </div>

      <FilterBar
        search={{ placeholder: "Search by title, department, location...", value: searchQuery, onChange: setSearchQuery }}
        selects={[
          { label: "All Departments", value: deptFilter, onChange: setDeptFilter, options: departments.map(d => ({ label: d, value: d })) },
          { label: "All Types", value: typeFilter, onChange: setTypeFilter, options: types.map(t => ({ label: t, value: t })) },
          { label: "All Status", value: activeFilter, onChange: setActiveFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
        ]}
        counts={[{ label: "Showing", total: jobs.length, filtered: filteredJobs.length }]}
      />

      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Department</th><th>Location</th><th>Type</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {filteredJobs.map(j => (
              <tr key={j.id}>
                <td>#{j.id}</td>
                <td>{j.title}</td>
                <td>{j.department}</td>
                <td>{j.location}</td>
                <td>{j.job_type}</td>
                <td><span className={`status ${j.is_active ? "approved" : "rejected"}`}>{j.is_active ? "Yes" : "No"}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => onEdit(j)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(j.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filteredJobs.length === 0 && <div className="empty">{jobs.length === 0 ? 'No job openings. Click "Add Job" to create one.' : "No jobs match your filters."}</div>}
      </div>
    </>
  );
}
