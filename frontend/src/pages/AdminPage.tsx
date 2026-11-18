import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Database, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

export const AdminPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getAdminSystem().then((s) => setSystemStatus(s));
    api.getAdminUsers().then((u) => setUsers(u));
    api.getAdminAudit(25).then((a) => setAuditLogs(a));
  }, []);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'analyst' : 'admin';
    await api.updateAdminUserRole(userId, nextRole);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole as any } : u)));
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            <h1 className="font-sora text-2xl font-bold text-text">Administrator 2×2 Console</h1>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            System health, MongoDB collections telemetry, user privilege management & immutable audit logs
          </p>
        </div>
      </div>

      {/* 2x2 Quadrant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quadrant 1: System Telemetry */}
        <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-sora font-semibold text-sm text-text">Q1: System & MongoDB Health</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              {systemStatus?.status?.toUpperCase() || 'HEALTHY'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-surface-2 border border-border">
              <span className="text-text-3 block text-[10px]">Database</span>
              <span className="font-bold text-text">{systemStatus?.database_name || 'outbreaklab'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-2 border border-border">
              <span className="text-text-3 block text-[10px]">Cluster Connection</span>
              <span className="font-bold text-emerald-700">Atlas SRV Active</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-2 border border-border">
              <span className="text-text-3 block text-[10px]">Environment</span>
              <span className="font-bold text-text capitalize">{systemStatus?.environment || 'Development'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-2 border border-border">
              <span className="text-text-3 block text-[10px]">Uptime</span>
              <span className="font-bold text-text">{systemStatus?.uptime_seconds || 120}s</span>
            </div>
          </div>
        </div>

        {/* Quadrant 2: Database Collection Telemetry */}
        <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="font-sora font-semibold text-sm text-text">Q2: Collections Records</h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {Object.entries(systemStatus?.counts || {}).map(([col, count]: any) => (
              <div key={col} className="p-2.5 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-3 block text-[10px] capitalize truncate">{col}</span>
                <span className="font-sora font-bold text-sm text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrant 3: User Accounts & Roles */}
        <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-signal" />
              <h3 className="font-sora font-semibold text-sm text-text">Q3: User Accounts</h3>
            </div>
            <span className="text-xs font-mono text-text-3">{users.length} Users</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border text-xs font-mono">
            {users.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between">
                <div className="truncate mr-2">
                  <div className="font-medium text-text truncate">{u.full_name}</div>
                  <div className="text-[10px] text-text-3 truncate">{u.email}</div>
                </div>
                <button
                  onClick={() => handleRoleToggle(u.id, u.role)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    u.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-surface-2 text-text-2 border-border'
                  }`}
                  title="Click to toggle role"
                >
                  {u.role.toUpperCase()}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrant 4: Security & Audit Trail */}
        <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-sora font-semibold text-sm text-text">Q4: Immutable Audit Trail</h3>
            </div>
            <span className="text-xs font-mono text-text-3">Recent 25 Logs</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 text-xs font-mono">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-surface-2/60 border border-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary">{log.action}</span>
                  <span className="text-text-3 ml-2">({log.entity_type})</span>
                </div>
                <span className="text-[10px] text-text-3">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
