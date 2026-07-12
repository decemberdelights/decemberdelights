"use client";

import { Job } from "../types";

interface JobsTabProps {
  jobs: Job[];
  onAdd: () => void;
  onEdit: (item: Job) => void;
  onDelete: (id: number) => void;
}

export default function JobsTab({ jobs, onAdd, onEdit, onDelete }: JobsTabProps) {
  return (
    <>
      <div className="topbar">
        <h2>JOB OPENINGS</h2>
        <button className="btn primary" onClick={onAdd}>+ Add Job</button>
      </div>
      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Department</th><th>Location</th><th>Type</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {jobs.map(j => (
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
        {jobs.length === 0 && <div className="empty">No job openings. Click &quot;Add Job&quot; to create one.</div>}
      </div>
    </>
  );
}
