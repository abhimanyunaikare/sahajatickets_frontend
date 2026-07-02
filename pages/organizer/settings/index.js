import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function OrganizerSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('volunteer');

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login'); return; }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">⚙️ Settings</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('volunteer')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'volunteer' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}>
            🙌 Seva Interests
          </button>
          <button onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'zones' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}>
            📍 Zones / Cities
          </button>
        </div>

        {activeTab === 'volunteer' && <VolunteerOptionsManager />}
        {activeTab === 'zones' && <ZoneOptionsManager />}
      </div>
    </div>
  );
}

function VolunteerOptionsManager() {
  const [options, setOptions] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    try {
      const r = await api.get('/volunteer-options/all');
      setOptions(r.data);
    } catch {}
  };

  const addOption = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await api.post('/volunteer-options', { label: newLabel.trim(), display_order: options.length + 1 });
      setNewLabel('');
      fetchOptions();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add'); }
    finally { setAdding(false); }
  };

  const toggleActive = async (opt) => {
    try {
      await api.patch(`/volunteer-options/${opt.id}`, { is_active: !opt.is_active });
      fetchOptions();
    } catch { alert('Failed to update'); }
  };

  const saveEdit = async (id) => {
    if (!editLabel.trim()) return;
    try {
      await api.patch(`/volunteer-options/${id}`, { label: editLabel.trim() });
      setEditingId(null);
      fetchOptions();
    } catch { alert('Failed to save'); }
  };

  const deleteOption = async (id, label) => {
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/volunteer-options/${id}`);
      fetchOptions();
    } catch { alert('Failed to delete'); }
  };

  return (
    <div className="card">
      <h2 className="font-bold text-gray-800 mb-1">Seva / Volunteer Interest Options</h2>
      <p className="text-sm text-gray-500 mb-5">Seekers select these in their profile and family members. Toggle off to hide without deleting.</p>
      <OptionsManager
        options={options}
        newLabel={newLabel}
        setNewLabel={setNewLabel}
        adding={adding}
        onAdd={addOption}
        editingId={editingId}
        editLabel={editLabel}
        setEditLabel={setEditLabel}
        onEdit={(opt) => { setEditingId(opt.id); setEditLabel(opt.label); }}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onToggle={toggleActive}
        onDelete={deleteOption}
      />
    </div>
  );
}

function ZoneOptionsManager() {
  const [options, setOptions] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    try {
      const r = await api.get('/zone-options/all');
      setOptions(r.data);
    } catch {}
  };

  const addOption = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await api.post('/zone-options', { label: newLabel.trim(), display_order: options.length + 1 });
      setNewLabel('');
      fetchOptions();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add zone'); }
    finally { setAdding(false); }
  };

  const toggleActive = async (opt) => {
    try {
      await api.patch(`/zone-options/${opt.id}`, { is_active: !opt.is_active });
      fetchOptions();
    } catch { alert('Failed to update'); }
  };

  const saveEdit = async (id) => {
    if (!editLabel.trim()) return;
    try {
      await api.patch(`/zone-options/${id}`, { label: editLabel.trim() });
      setEditingId(null);
      fetchOptions();
    } catch { alert('Failed to save'); }
  };

  const deleteOption = async (id, label) => {
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/zone-options/${id}`);
      fetchOptions();
    } catch { alert('Failed to delete'); }
  };

  return (
    <div className="card">
      <h2 className="font-bold text-gray-800 mb-1">Zone / City Options</h2>
      <p className="text-sm text-gray-500 mb-5">These appear as searchable options when seekers fill their city/zone. They can also type freely.</p>
      <OptionsManager
        options={options}
        newLabel={newLabel}
        setNewLabel={setNewLabel}
        adding={adding}
        onAdd={addOption}
        editingId={editingId}
        editLabel={editLabel}
        setEditLabel={setEditLabel}
        onEdit={(opt) => { setEditingId(opt.id); setEditLabel(opt.label); }}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onToggle={toggleActive}
        onDelete={deleteOption}
      />
    </div>
  );
}

// Shared list manager UI for both volunteer options and zones
function OptionsManager({ options, newLabel, setNewLabel, adding, onAdd, editingId, editLabel, setEditLabel, onEdit, onSaveEdit, onCancelEdit, onToggle, onDelete }) {
  return (
    <>
      <div className="flex gap-2 mb-5">
        <input className="input flex-1" placeholder="Type new option name and press Enter…"
          value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()} />
        <button onClick={onAdd} disabled={adding} className="btn-primary !px-5 !py-2 text-sm">
          {adding ? '…' : '+ Add'}
        </button>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={opt.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
              ${opt.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            <span className="text-gray-300 text-sm w-5 shrink-0">{i + 1}</span>

            {editingId === opt.id ? (
              <input className="input flex-1 !py-1.5 text-sm" value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSaveEdit(opt.id)}
                autoFocus />
            ) : (
              <span className={`flex-1 text-sm ${opt.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                {opt.label}
              </span>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {editingId === opt.id ? (
                <>
                  <button onClick={() => onSaveEdit(opt.id)} className="text-xs text-green-600 hover:underline font-medium">Save</button>
                  <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => onToggle(opt)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium ${opt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {opt.is_active ? 'Active' : 'Hidden'}
                  </button>
                  <button onClick={() => onEdit(opt)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => onDelete(opt.id, opt.label)} className="text-xs text-red-400 hover:underline">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}