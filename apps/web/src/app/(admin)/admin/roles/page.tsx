'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  listAdminRoles,
  updateAdminRolePermissions,
  type AdminRolePermissionData,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { LoaderCircle, ShieldCheck } from 'lucide-react';

export default function AdminRolesPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AdminRolePermissionData | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired.');
      const result = await listAdminRoles(token);
      setData(result);
      const role = result.roles.find((item) => item.id === selectedRole) ?? result.roles[0];
      if (role) {
        setSelectedRole(role.id);
        setSelected(role.permissions);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load roles.');
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseRole = (id: string) => {
    const role = data?.roles.find((item) => item.id === id);
    if (role) {
      setSelectedRole(id);
      setSelected(role.permissions);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired.');
      await updateAdminRolePermissions(token, selectedRole, selected);
      toast.success('Role permissions saved.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (action: string) =>
    setSelected((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );

  const role = data?.roles.find((item) => item.id === selectedRole);
  if (loading) return <div style={{ padding: 32 }}>Loading role permissions…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 20 }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={24} />
          <h1 style={{ margin: 0 }}>Roles & permissions</h1>
        </div>
        <p style={{ color: 'var(--text-2)' }}>
          Choose exactly which admin actions each team role can use.
        </p>
      </header>
      <Card style={{ padding: 20 }}>
        <label htmlFor="admin-role-select">Team role</label>
        <select
          id="admin-role-select"
          value={selectedRole}
          onChange={(event) => chooseRole(event.target.value)}
          style={{ display: 'block', marginTop: 8, padding: 10, minWidth: 260 }}
        >
          {data?.roles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <p style={{ color: 'var(--text-2)' }}>{role?.description}</p>
      </Card>
      <Card style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Permissions</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 12,
          }}
        >
          {data?.permissions.map((permission) => (
            <label
              key={permission.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(permission.action)}
                disabled={permission.action === 'admin:access'}
                onChange={() => toggle(permission.action)}
              />
              <span>
                <strong>{permission.action}</strong>
                <br />
                <small style={{ color: 'var(--text-2)' }}>{permission.description}</small>
              </span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Button onClick={save} disabled={saving || !role}>
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : 'Save permissions'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
