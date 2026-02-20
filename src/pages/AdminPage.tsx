import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '../hooks/useHolidays';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import type { User, Project, Holiday, OrgSettings, UserRole } from '../types';

type Tab = 'general' | 'users' | 'projects' | 'holidays' | 'notifications' | 'integrations';

interface SidebarItem { id: Tab; label: string; icon: string; roles?: UserRole[] }

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'general', label: 'General', icon: '⚙', roles: ['ADMIN'] },
  { id: 'users', label: 'Users & Roles', icon: '👥' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'holidays', label: 'Holidays', icon: '🗓', roles: ['ADMIN'] },
  { id: 'notifications', label: 'Notifications', icon: '🔔', roles: ['ADMIN'] },
  { id: 'integrations', label: 'Integrations', icon: '🔗', roles: ['ADMIN'] },
];

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const visibleItems = SIDEBAR_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );
  const defaultTab = isAdmin ? 'general' : 'users';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isAdmin ? 'Administration' : 'Team Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Manage your organisation settings' : 'Manage your team members and projects'}
          </p>
        </div>
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-48 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors
                    ${activeTab === item.id
                      ? 'bg-brand-primary/5 text-brand-primary font-medium border-l-2 border-brand-primary'
                      : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'general' && isAdmin && <GeneralSettings />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'projects' && <ProjectsTab />}
            {activeTab === 'holidays' && isAdmin && <HolidaysTab />}
            {activeTab === 'notifications' && isAdmin && <NotificationsTab />}
            {activeTab === 'integrations' && isAdmin && <IntegrationsTab />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ─── General Settings ─────────────────────────────────── */
function GeneralSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Partial<OrgSettings>>({});

  const s = { ...settings, ...form };

  const handleSave = () => updateSettings.mutate(form);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Work Week Card */}
      <Card title="Work Week">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Week starts on"
            value={s.workWeekStart ?? 'monday'}
            onChange={(e) => setForm((p) => ({ ...p, workWeekStart: e.target.value }))}
            options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]}
          />
          <Input
            label="Standard hours / day"
            type="number"
            value={s.standardHours ?? 8}
            onChange={(e) => setForm((p) => ({ ...p, standardHours: Number(e.target.value) }))}
          />
          <Input
            label="Max hours / day"
            type="number"
            value={s.maxHoursPerDay ?? 24}
            onChange={(e) => setForm((p) => ({ ...p, maxHoursPerDay: Number(e.target.value) }))}
          />
          <Input
            label="Max hours / week"
            type="number"
            value={s.maxHoursPerWeek ?? 60}
            onChange={(e) => setForm((p) => ({ ...p, maxHoursPerWeek: Number(e.target.value) }))}
          />
          <Select
            label="Time format"
            value={s.timeFormat ?? 'decimal'}
            onChange={(e) => setForm((p) => ({ ...p, timeFormat: e.target.value }))}
            options={[{ value: 'decimal', label: 'Decimal (8.5)' }, { value: 'hhmm', label: 'HH:MM (8:30)' }]}
          />
          <Select
            label="Time increment (min)"
            value={s.timeIncrement ?? 30}
            onChange={(e) => setForm((p) => ({ ...p, timeIncrement: Number(e.target.value) }))}
            options={[{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '60 min' }]}
          />
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card title="Feature Toggles">
        <div className="space-y-3">
          {[
            { key: 'requireApproval' as const, label: 'Require approval for timesheets' },
            { key: 'allowBackdated' as const, label: 'Allow backdated entries' },
            { key: 'enableOvertime' as const, label: 'Enable overtime tracking' },
            { key: 'mandatoryDesc' as const, label: 'Mandatory description on entries' },
            { key: 'allowCopyWeek' as const, label: 'Allow copy previous week' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{item.label}</span>
              <Toggle
                checked={s[item.key] ?? false}
                onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.checked }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={updateSettings.isPending}>Save Settings</Button>
      </div>
    </div>
  );
}

/* ─── Users Tab ────────────────────────────────────────── */
function UsersTab() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = authUser?.role === 'ADMIN';
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '', managerIds: [] as number[] });

  const availableManagers = users.filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN');

  const resetForm = () => setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '', managerIds: [] });

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    if (!editUser && !form.email.trim()) { toast('Email is required', 'error'); return; }
    if (!editUser && !form.password) { toast('Password is required', 'error'); return; }
    if (!editUser && form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }

    if (editUser) {
      await updateUser.mutateAsync({
        id: editUser.id,
        dto: {
          name: form.name,
          department: form.department,
          ...(isAdmin ? { role: form.role, managerIds: form.managerIds } : {}),
        },
      });
    } else {
      await createUser.mutateAsync(form);
    }
    setModalOpen(false);
    resetForm();
    setEditUser(null);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      name: u.name, email: u.email, password: '', role: u.role,
      department: u.department ?? '',
      managerIds: u.managers?.map((m) => m.manager.id) ?? [],
    });
    setModalOpen(true);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-800">
          {isAdmin ? `Users (${users.length})` : `My Team (${users.length})`}
        </h2>
        <Button size="sm" onClick={() => { setEditUser(null); resetForm(); setModalOpen(true); }}>
          + Add {isAdmin ? 'User' : 'Employee'}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Reports To</th>}
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} size="sm" />
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${u.role === 'ADMIN' ? 'bg-brand-primary/10 text-brand-primary' :
                      u.role === 'MANAGER' ? 'bg-brand-secondary/10 text-amber-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.department ?? '—'}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.managers && u.managers.length > 0
                      ? u.managers.map((m) => m.manager.name).join(', ')
                      : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <Badge variant={u.status === 'active' ? 'active' : 'inactive'}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(u)} className="text-brand-primary hover:bg-brand-primary/10 p-1.5 rounded text-xs">Edit</button>
                    <button onClick={() => deleteUser.mutate(u.id)} className="text-brand-danger hover:bg-red-50 p-1.5 rounded text-xs">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : (isAdmin ? 'Add User' : 'Add Employee')}>
        <div className="space-y-3">
          <Input label="Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={!!editUser} />
          {!editUser && <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" />}
          {isAdmin && (
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              options={[{ value: 'EMPLOYEE', label: 'Employee' }, { value: 'MANAGER', label: 'Manager' }, { value: 'ADMIN', label: 'Admin' }]}
            />
          )}
          <Input label="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          {/* Manager assignment — Admin only */}
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reports To</label>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {availableManagers.filter((m) => m.id !== editUser?.id).length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No managers available</p>
                ) : (
                  availableManagers.filter((m) => m.id !== editUser?.id).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        checked={form.managerIds.includes(m.id)}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            managerIds: e.target.checked
                              ? [...p.managerIds, m.id]
                              : p.managerIds.filter((id) => id !== m.id),
                          }));
                        }}
                      />
                      {m.name} <span className="text-xs text-gray-400">({m.role})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={createUser.isPending || updateUser.isPending}>
              {editUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Projects Tab ─────────────────────────────────────── */
function ProjectsTab() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = authUser?.role === 'ADMIN';
  const { data: projects = [], isLoading } = useProjects();
  const { data: users = [] } = useUsers();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ code: '', name: '', client: '', budgetHours: 0, managerIds: [] as number[] });

  const availableManagers = users.filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN');

  const handleSubmit = async () => {
    if (!editProject && !form.code.trim()) { toast('Project code is required', 'error'); return; }
    if (!form.name.trim()) { toast('Project name is required', 'error'); return; }
    if (!form.client.trim()) { toast('Client is required', 'error'); return; }
    if (form.budgetHours < 0) { toast('Budget hours cannot be negative', 'error'); return; }

    if (editProject) {
      await updateProject.mutateAsync({ id: editProject.id, dto: form });
    } else {
      await createProject.mutateAsync(form);
    }
    setModalOpen(false);
    setEditProject(null);
    setForm({ code: '', name: '', client: '', budgetHours: 0, managerIds: [] });
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({
      code: p.code, name: p.name, client: p.client, budgetHours: p.budgetHours,
      managerIds: p.managers?.map((m) => m.manager.id) ?? [],
    });
    setModalOpen(true);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-800">Projects ({projects.length})</h2>
        <Button size="sm" onClick={() => { setEditProject(null); setForm({ code: '', name: '', client: '', budgetHours: 0, managerIds: [] }); setModalOpen(true); }}>
          + Add Project
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Budget hrs</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Used hrs</th>
              {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Managers</th>}
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map((p) => {
              const pct = p.budgetHours > 0 ? Math.round((p.usedHours / p.budgetHours) * 100) : 0;
              return (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.client}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.budgetHours}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${pct >= 90 ? 'text-brand-danger' : pct >= 70 ? 'text-brand-secondary' : 'text-brand-success'}`}>
                      {p.usedHours}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.managers && p.managers.length > 0
                        ? p.managers.map((m) => m.manager.name).join(', ')
                        : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.status === 'active' ? 'active' : 'inactive'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="text-brand-primary hover:bg-brand-primary/10 p-1.5 rounded text-xs">Edit</button>
                      <button onClick={() => deleteProject.mutate(p.id)} className="text-brand-danger hover:bg-red-50 p-1.5 rounded text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editProject ? 'Edit Project' : 'Add Project'}>
        <div className="space-y-3">
          <Input label="Code *" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="PRJ-2024-001" disabled={!!editProject} />
          <Input label="Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Client *" value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} />
          <Input label="Budget Hours" type="number" value={form.budgetHours} onChange={(e) => setForm((p) => ({ ...p, budgetHours: Number(e.target.value) }))} />
          {/* Manager assignment — Admin only */}
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Assigned Managers</label>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {availableManagers.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No managers available</p>
                ) : (
                  availableManagers.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        checked={form.managerIds.includes(m.id)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            managerIds: e.target.checked
                              ? [...prev.managerIds, m.id]
                              : prev.managerIds.filter((id) => id !== m.id),
                          }));
                        }}
                      />
                      {m.name} <span className="text-xs text-gray-400">({m.role})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={createProject.isPending || updateProject.isPending}>
              {editProject ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Holidays Tab ─────────────────────────────────────── */
function HolidaysTab() {
  const { data: holidays = [], isLoading } = useHolidays(new Date().getFullYear());
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', recurring: false });

  const handleSubmit = async () => {
    await createHoliday.mutateAsync(form);
    setModalOpen(false);
    setForm({ name: '', date: '', recurring: false });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-800">Holidays {new Date().getFullYear()}</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>+ Add Holiday</Button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 divide-y divide-gray-50">
        {holidays.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No holidays configured</p>
        ) : holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{h.name}</p>
              <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3">
              {h.recurring && <Badge variant="approved">Recurring</Badge>}
              <button onClick={() => deleteHoliday.mutate(h.id)} className="text-brand-danger hover:bg-red-50 p-1.5 rounded text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Holiday" size="sm">
        <div className="space-y-3">
          <Input label="Holiday name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Christmas Day" />
          <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <Toggle
            label="Recurring (repeats annually)"
            checked={form.recurring}
            onChange={(e) => setForm((p) => ({ ...p, recurring: e.target.checked }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.date} isLoading={createHoliday.isPending}>
              Add Holiday
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Notifications Tab ─────────────────────────────────── */
function NotificationsTab() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Partial<OrgSettings>>({});
  const s = { ...settings, ...form };

  return (
    <div className="space-y-4">
      <Card title="Email Notifications">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">Timesheet submission reminders</span>
            <Toggle checked={true} />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">Approval notifications</span>
            <Toggle checked={true} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Rejection notifications</span>
            <Toggle checked={true} />
          </div>
        </div>
      </Card>
      <Card title="Reminder Times">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Daily reminder time"
            type="time"
            value={s.dailyReminderTime ?? '17:00'}
            onChange={(e) => setForm((p) => ({ ...p, dailyReminderTime: e.target.value }))}
          />
          <Select
            label="Weekly deadline"
            value={s.weeklyDeadline ?? 'friday'}
            onChange={(e) => setForm((p) => ({ ...p, weeklyDeadline: e.target.value }))}
            options={[
              { value: 'friday', label: 'Friday' },
              { value: 'monday', label: 'Monday (next week)' },
            ]}
          />
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => updateSettings.mutate(form)} isLoading={updateSettings.isPending}>
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
}

/* ─── Integrations Tab ──────────────────────────────────── */
function IntegrationsTab() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Partial<OrgSettings>>({});
  const s = { ...settings, ...form };

  return (
    <div className="space-y-4">
      <Card title="Payroll System">
        <div className="flex items-end gap-4">
          <Select
            label="Payroll provider"
            value={s.payrollType ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, payrollType: e.target.value }))}
            options={[
              { value: '', label: 'None' },
              { value: 'xero', label: 'Xero' },
              { value: 'quickbooks', label: 'QuickBooks' },
              { value: 'adp', label: 'ADP' },
            ]}
            className="flex-1"
          />
          <Button variant="outline-primary" size="sm" disabled={!s.payrollType}>Test Connection</Button>
        </div>
      </Card>
      <Card title="Project Management">
        <div className="flex items-end gap-4">
          <Select
            label="PM system"
            value={s.pmType ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, pmType: e.target.value }))}
            options={[
              { value: '', label: 'None' },
              { value: 'jira', label: 'Jira' },
              { value: 'asana', label: 'Asana' },
              { value: 'linear', label: 'Linear' },
            ]}
            className="flex-1"
          />
          <Button variant="outline-primary" size="sm" disabled={!s.pmType}>Test Connection</Button>
        </div>
      </Card>
      <Card title="Single Sign-On (SSO)">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">Google Workspace SSO</span>
            <Toggle />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Microsoft Azure AD SSO</span>
            <Toggle />
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => updateSettings.mutate(form)} isLoading={updateSettings.isPending}>
          Save Integration Settings
        </Button>
      </div>
    </div>
  );
}

/* ─── Shared helpers ─────────────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
