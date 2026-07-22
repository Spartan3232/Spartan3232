import React, { useState } from 'react';
import { Plus, X, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { GOAL_STATUS_LABELS } from './coachingApi';
import LanguageAwareTextarea from './LanguageAwareTextarea';

const VAGUE_PATTERNS = [/daha iyi olacak/i, /gelişecek$/i, /iyileşecek$/i, /^daha (çok|fazla|iyi)/i];

const emptyGoal = () => ({
  id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  competencyId: '', currentState: '', evidenceCallIds: [], targetBehavior: '',
  implementationSteps: [''], measurementMethod: '', baselineValue: '', targetValue: '', unit: '',
  dataSource: '', checkFrequency: '', reviewDate: '', employeeCommitment: '', managerSupport: '',
  successEvidence: '', status: 'planned',
});

const REQUIRED_FIELDS = ['competencyId', 'currentState', 'targetBehavior', 'measurementMethod', 'dataSource', 'reviewDate', 'employeeCommitment', 'managerSupport'];

const GoalForm = ({ initial, calls, templates, onSave, onCancel }) => {
  const [goal, setGoal] = useState(initial);
  const set = (field, value) => setGoal(prev => ({ ...prev, [field]: value }));

  const applyTemplate = (tpl) => {
    setGoal(prev => ({
      ...prev,
      competencyId: tpl.competencyId,
      currentState: tpl.currentState,
      targetBehavior: tpl.targetBehavior,
      implementationSteps: tpl.implementationSteps,
      measurementMethod: tpl.measurementMethod,
      unit: tpl.unit,
      dataSource: tpl.dataSource,
      checkFrequency: tpl.checkFrequency,
    }));
  };

  const addStep = () => set('implementationSteps', [...goal.implementationSteps, '']);
  const updateStep = (i, v) => {
    const next = [...goal.implementationSteps];
    next[i] = v;
    set('implementationSteps', next);
  };
  const removeStep = (i) => set('implementationSteps', goal.implementationSteps.filter((_, idx) => idx !== i));

  const toggleEvidence = (callId) => {
    const has = goal.evidenceCallIds.includes(callId);
    set('evidenceCallIds', has ? goal.evidenceCallIds.filter(x => x !== callId) : [...goal.evidenceCallIds, callId]);
  };

  const isVague = VAGUE_PATTERNS.some(p => p.test(goal.targetBehavior || ''));
  const missingRequired = REQUIRED_FIELDS.filter(f => !String(goal[f] || '').trim());
  const stepsValid = goal.implementationSteps.filter(s => s.trim()).length > 0;
  const canSave = missingRequired.length === 0 && stepsValid;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Hazır şablonlar (seçtikten sonra tüm alanları gözden geçirin)</p>
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="text-xs px-2.5 py-1.5 rounded-full border border-gray-300 bg-white hover:border-blue-400 text-gray-700">
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Yetkinlik *</label>
          <input value={goal.competencyId} onChange={(e) => set('competencyId', e.target.value)} placeholder="Örn. C9 veya field-continuity" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bağlı kanıtlar (görüşmeler)</label>
          <div className="flex flex-wrap gap-1.5">
            {calls.length === 0 && <span className="text-xs text-gray-400">Görüşme yok</span>}
            {calls.map(c => (
              <button key={c.id} type="button" onClick={() => toggleEvidence(c.id)} className={`text-xs px-2 py-1 rounded-full border ${goal.evidenceCallIds.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}>
                {c.customerName}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Mevcut durum *</label>
        <textarea value={goal.currentState} onChange={(e) => set('currentState', e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Hedef davranış *</label>
        <textarea value={goal.targetBehavior} onChange={(e) => set('targetBehavior', e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        {isVague && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Bu hedef ölçülemez görünüyor ("daha iyi olacak" gibi). Somut, gözlenebilir bir davranış yazın.
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-600">Uygulama adımları *</label>
          <button type="button" onClick={addStep} className="text-xs text-blue-600 font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Adım ekle</button>
        </div>
        <div className="space-y-1.5">
          {goal.implementationSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={s} onChange={(e) => updateStep(i, e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
              <button type="button" onClick={() => removeStep(i)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç değeri</label>
          <input value={goal.baselineValue} onChange={(e) => set('baselineValue', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hedef değer</label>
          <input value={goal.targetValue} onChange={(e) => set('targetValue', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ölçüm birimi</label>
          <input value={goal.unit} onChange={(e) => set('unit', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ölçüm yöntemi *</label>
        <textarea value={goal.measurementMethod} onChange={(e) => set('measurementMethod', e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Veri kaynağı *</label>
          <input value={goal.dataSource} onChange={(e) => set('dataSource', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kontrol sıklığı</label>
          <input value={goal.checkFrequency} onChange={(e) => set('checkFrequency', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Takip tarihi *</label>
          <input type="date" value={goal.reviewDate} onChange={(e) => set('reviewDate', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Çalışanın taahhüdü *</label>
        <textarea value={goal.employeeCommitment} onChange={(e) => set('employeeCommitment', e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Çalışan kendi cümlesiyle ne yapacağını yazar." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Yönetici desteği *</label>
        <textarea value={goal.managerSupport} onChange={(e) => set('managerSupport', e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Başarı kanıtı</label>
        <input value={goal.successEvidence} onChange={(e) => set('successEvidence', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
        <select value={goal.status} onChange={(e) => set('status', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
          {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">İptal</button>
        <button type="button" disabled={!canSave} onClick={() => onSave({ ...goal, implementationSteps: goal.implementationSteps.filter(s => s.trim()) })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
          Hedefi Kaydet
        </button>
      </div>
    </div>
  );
};

const Step7Goals = ({ goals, onChange, calls, templates }) => {
  const [editing, setEditing] = useState(null);

  const handleSave = (goal) => {
    const exists = goals.some(g => g.id === goal.id);
    onChange(exists ? goals.map(g => (g.id === goal.id ? goal : g)) : [...goals, goal]);
    setEditing(null);
  };
  const handleRemove = (id) => onChange(goals.filter(g => g.id !== id));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {goals.map(g => (
          <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{g.competencyId} — {g.targetBehavior}</p>
              <p className="text-xs text-gray-500 mt-1">Takip: {g.reviewDate} · {GOAL_STATUS_LABELS[g.status]}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={() => setEditing(g)} className="text-xs text-blue-600 font-medium">Düzenle</button>
              <button type="button" onClick={() => handleRemove(g.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <GoalForm
          initial={editing === 'new' ? emptyGoal() : editing}
          calls={calls}
          templates={templates}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Yeni Gelişim Hedefi Ekle
        </button>
      )}
    </div>
  );
};

export default Step7Goals;
