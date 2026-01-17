
import React, { useState, useEffect } from 'react';
import { User, AuditLog } from '../../types';
import { api } from '../../frontend/api';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.logs.getAll();
        setLogs(response.logs || []);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };
    fetchLogs();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Security Audit</h1>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="p-4">Time</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Action</th>
              <th className="p-4">Resource</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono text-[11px]">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="p-4 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                <td className="p-4 font-bold">{l.username}</td>
                <td className="p-4"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">{l.action}</span></td>
                <td className="p-4">{l.resource}</td>
                <td className="p-4 text-slate-500 italic">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
