import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { SESSION_TYPE_LABELS } from './coachingApi';

const SESSION_TYPES = Object.keys(SESSION_TYPE_LABELS);

const Step1Setup = ({ setup, onChange, users, currentUser, competencies, previousSessions, readOnlyRepresentative }) => {
  const [brickInput, setBrickInput] = useState('');

  const representatives = users.filter(u => u.role !== 'coach');
  const managers = users.filter(u => u.role === 'coach');

  const set = (field, value) => onChange({ ...setup, [field]: value });

  const setRepresentative = (userId) => {
    const rep = users.find(u => u.id === userId);
    if (rep) set('representative', { id: rep.id, name: rep.name });
  };

  const setManagerName = (name) => {
    set('manager', { ...setup.manager, name });
  };

  const setManagerFromList = (userId) => {
    const mgr = users.find(u => u.id === userId);
    if (mgr) set('manager', { id: mgr.id, name: mgr.name });
  };

  const addBrick = () => {
    const v = brickInput.trim();
    if (!v) return;
    if (!setup.bricks.includes(v)) set('bricks', [...setup.bricks, v]);
    setBrickInput('');
  };

  const removeBrick = (b) => set('bricks', setup.bricks.filter(x => x !== b));

  const toggleFocusCompetency = (id) => {
    const has = setup.focusCompetencies.includes(id);
    set('focusCompetencies', has ? setup.focusCompetencies.filter(x => x !== id) : [...setup.focusCompetencies, id]);
  };

  useEffect(() => {
    if (!setup.representative && currentUser) {
      setRepresentative(currentUser.role === 'coach' ? (representatives[0]?.id) : currentUser.id);
    }
    if (!setup.manager?.name && currentUser?.role === 'coach') {
      setManagerName(currentUser.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temsilci *</label>
          <select
            disabled={readOnlyRepresentative}
            value={setup.representative?.id || ''}
            onChange={(e) => setRepresentative(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          >
            <option value="">Temsilci seçin</option>
            {representatives.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Yönetici *</label>
          <div className="flex gap-2">
            <select
              value={setup.manager?.id || ''}
              onChange={(e) => setManagerFromList(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Listeden seçin (opsiyonel)</option>
              {managers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={setup.manager?.name || ''}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="Yönetici adı soyadı"
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Koçluk tarihi *</label>
          <input
            type="date"
            value={setup.sessionDate || ''}
            onChange={(e) => set('sessionDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Koçluk türü *</label>
          <select
            value={setup.sessionType}
            onChange={(e) => set('sessionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {SESSION_TYPES.map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
          <input
            type="text"
            value={setup.province || ''}
            onChange={(e) => set('province', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saha günü başlangıç</label>
            <input
              type="time"
              value={setup.fieldDayStart || ''}
              onChange={(e) => set('fieldDayStart', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saha günü bitiş</label>
            <input
              type="time"
              value={setup.fieldDayEnd || ''}
              onChange={(e) => set('fieldDayEnd', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Çalışılan brick(ler)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={brickInput}
            onChange={(e) => setBrickInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBrick(); } }}
            placeholder="Brick adı yazıp Enter'a basın"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button type="button" onClick={addBrick} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {setup.bricks.map(b => (
            <span key={b} className="flex items-center gap-1 bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full">
              {b}
              <button type="button" onClick={() => removeBrick(b)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {previousSessions?.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Önceki koçluk kaydı bağlantısı</label>
          <select
            value={setup.previousSessionId || ''}
            onChange={(e) => set('previousSessionId', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Yok</option>
            {previousSessions.map(s => (
              <option key={s.id} value={s.id}>{s.sessionDate} — {SESSION_TYPE_LABELS[s.sessionType]}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Koçluğun odak yetkinliği</label>
        <div className="flex flex-wrap gap-2">
          {(competencies?.criteria || []).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleFocusCompetency(c.id)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                setup.focusCompetencies.includes(c.id)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
              }`}
              title={c.label}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step1Setup;
