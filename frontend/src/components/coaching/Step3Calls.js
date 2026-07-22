import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Stethoscope, Building2 } from 'lucide-react';
import { CUSTOMER_TYPE_LABELS } from './coachingApi';
import LanguageAwareTextarea from './LanguageAwareTextarea';

const SPIN_LABELS = {
  situation: { label: 'S — Durum', help: 'Mevcut uygulamayı ve bağlamı anlamak.' },
  problem: { label: 'P — Sorun', help: 'Müşteri açısından gerçek güçlüğü ortaya çıkarmak.' },
  implication: { label: 'I — Etki', help: 'Sorunun klinik/operasyonel etkisini derinleştirmek.' },
  needPayoff: { label: 'N — Çözüm değeri', help: 'Müşterinin çözümün değerini kendi cümlesiyle ifade etmesini sağlamak.' },
};

const PRESENTATION_ITEMS = [
  ['objectiveClear', 'Sunum hedefi açık mı?'],
  ['linkedToNeed', 'Mesaj müşterinin ihtiyacına bağlı mı?'],
  ['coreMessageWithin90s', 'Ana mesaj ilk 60-90 saniyede netleşiyor mu?'],
  ['scientificallyAccurate', 'Bilimsel bilgi onaylı ve doğru mu?'],
  ['logicalFlow', 'Mesaj mantıksal bir akışa sahip mi?'],
  ['benefitVsFeature', 'Fayda, özellikten ayrıştırılıyor mu?'],
  ['evidenceSupportsMessage', 'Kanıt mesajı gerçekten destekliyor mu?'],
  ['materialSupportsConversation', 'Materyal konuşmayı destekliyor mu (okunmuyor mu)?'],
  ['customerEngaged', 'Müşteri sürece dahil ediliyor mu?'],
  ['understandingChecked', 'Sunum sonunda anlama/kabul kontrolü yapılıyor mu?'],
];

const emptyCall = () => ({
  id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  customerName: '', customerType: 'doctor', branch: '', unit: '', brick: '',
  visitDateTime: '', planned: null, durationMinutes: '', visitGoal: '', productFocus: '', resourceUsed: '',
  openQuestionCount: 0, closedQuestionCount: 0, probeQuestionCount: 0,
  spin: {
    situation: { used: false, question: '', newInformation: '', linkedToMessage: null },
    problem: { used: false, question: '', newInformation: '', linkedToMessage: null },
    implication: { used: false, question: '', newInformation: '', linkedToMessage: null },
    needPayoff: { used: false, question: '', newInformation: '', linkedToMessage: null },
  },
  presentation: {},
  objections: [],
  commitment: '', nextStep: '', followUpDate: '', observationNote: '',
});

const NumberField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <input
      type="number" min="0" value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
    />
  </div>
);

const CallForm = ({ initial, onSave, onCancel }) => {
  const [call, setCall] = useState(initial);
  const set = (field, value) => setCall(prev => ({ ...prev, [field]: value }));
  const setSpin = (stage, field, value) => setCall(prev => ({
    ...prev, spin: { ...prev.spin, [stage]: { ...prev.spin[stage], [field]: value } },
  }));
  const setPresentation = (field, value) => setCall(prev => ({ ...prev, presentation: { ...prev.presentation, [field]: value } }));

  const addObjection = () => set('objections', [...call.objections, { description: '', handled: null, note: '' }]);
  const updateObjection = (i, field, value) => {
    const next = [...call.objections];
    next[i] = { ...next[i], [field]: value };
    set('objections', next);
  };
  const removeObjection = (i) => set('objections', call.objections.filter((_, idx) => idx !== i));

  const canSave = call.customerName.trim() && call.brick.trim() && call.observationNote.trim();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Müşteri adı *</label>
          <input value={call.customerName} onChange={(e) => set('customerName', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Müşteri tipi *</label>
          <select value={call.customerType} onChange={(e) => set('customerType', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Brick *</label>
          <input value={call.brick} onChange={(e) => set('brick', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Branş</label>
          <input value={call.branch} onChange={(e) => set('branch', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ünite/Kurum</label>
          <input value={call.unit} onChange={(e) => set('unit', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ziyaret tarihi/saati</label>
          <input type="datetime-local" value={call.visitDateTime} onChange={(e) => set('visitDateTime', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Planlı / plansız</label>
          <select value={call.planned === null ? '' : String(call.planned)} onChange={(e) => set('planned', e.target.value === '' ? null : e.target.value === 'true')} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Belirtilmedi</option>
            <option value="true">Planlı</option>
            <option value="false">Plansız</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Süre (dk)</label>
          <input type="number" min="0" value={call.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Görüşme hedefi</label>
          <input value={call.visitGoal} onChange={(e) => set('visitGoal', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ürün/mesaj odağı</label>
          <input value={call.productFocus} onChange={(e) => set('productFocus', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kullanılan kaynak/materyal</label>
          <input value={call.resourceUsed} onChange={(e) => set('resourceUsed', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Açık uçlu soru" value={call.openQuestionCount} onChange={(v) => set('openQuestionCount', v)} />
        <NumberField label="Kapalı soru" value={call.closedQuestionCount} onChange={(v) => set('closedQuestionCount', v)} />
        <NumberField label="Derinleştirme (probe)" value={call.probeQuestionCount} onChange={(v) => set('probeQuestionCount', v)} />
      </div>

      <div>
        <h5 className="text-sm font-semibold text-gray-800 mb-2">SPIN kaydı</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(SPIN_LABELS).map(([stage, meta]) => (
            <div key={stage} className="bg-white border border-gray-200 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-1">
                <input type="checkbox" checked={call.spin[stage].used} onChange={(e) => setSpin(stage, 'used', e.target.checked)} />
                {meta.label}
              </label>
              <p className="text-xs text-gray-500 mb-2">{meta.help}</p>
              {call.spin[stage].used && (
                <div className="space-y-2">
                  <input
                    placeholder="Sorulan soru"
                    value={call.spin[stage].question || ''}
                    onChange={(e) => setSpin(stage, 'question', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Müşteriden alınan yeni bilgi"
                    value={call.spin[stage].newInformation || ''}
                    onChange={(e) => setSpin(stage, 'newInformation', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!call.spin[stage].linkedToMessage}
                      onChange={(e) => setSpin(stage, 'linkedToMessage', e.target.checked)}
                    />
                    Bilgi sunum mesajına yansıtıldı
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h5 className="text-sm font-semibold text-gray-800 mb-2">Sunum kontrol listesi</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {PRESENTATION_ITEMS.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
              <input type="checkbox" checked={!!call.presentation[field]} onChange={(e) => setPresentation(field, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <textarea
          placeholder="Sunum notu"
          value={call.presentation.note || ''}
          onChange={(e) => setPresentation('note', e.target.value)}
          rows={2}
          className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-semibold text-gray-800">İtirazlar</h5>
          <button type="button" onClick={addObjection} className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> İtiraz ekle
          </button>
        </div>
        <div className="space-y-2">
          {call.objections.map((obj, i) => (
            <div key={i} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-2">
              <input
                placeholder="İtiraz açıklaması"
                value={obj.description}
                onChange={(e) => updateObjection(i, 'description', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={obj.handled === null ? '' : String(obj.handled)}
                onChange={(e) => updateObjection(i, 'handled', e.target.value === '' ? null : e.target.value === 'true')}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Sonuç?</option>
                <option value="true">Karşılandı</option>
                <option value="false">Karşılanamadı</option>
              </select>
              <button type="button" onClick={() => removeObjection(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kapanışta alınan taahhüt</label>
          <input value={call.commitment} onChange={(e) => set('commitment', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bir sonraki adım</label>
          <input value={call.nextStep} onChange={(e) => set('nextStep', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Takip tarihi</label>
          <input type="date" value={call.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <LanguageAwareTextarea
        label="Somut gözlem notu"
        required
        value={call.observationNote}
        onChange={(v) => set('observationNote', v)}
        placeholder="Gözlenen davranışı somut biçimde yazın."
        rows={3}
      />

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">İptal</button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(call)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          Görüşmeyi Kaydet
        </button>
      </div>
    </div>
  );
};

const CallCard = ({ call, onEdit, onRemove }) => {
  const [open, setOpen] = useState(false);
  const Icon = call.customerType === 'pharmacy' ? Building2 : Stethoscope;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-medium text-gray-900 text-sm">{call.customerName} <span className="text-gray-400">· {call.brick}</span></p>
            <p className="text-xs text-gray-500">{call.visitDateTime || 'Tarih belirtilmedi'} · {CUSTOMER_TYPE_LABELS[call.customerType]}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3 text-sm text-gray-700 space-y-2">
          <p><strong>Gözlem notu:</strong> {call.observationNote}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onEdit(call)} className="text-xs text-blue-600 font-medium">Düzenle</button>
            <button type="button" onClick={() => onRemove(call.id)} className="text-xs text-red-600 font-medium">Sil</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Step3Calls = ({ calls, onChange, noCallsJustification, onJustificationChange }) => {
  const [editing, setEditing] = useState(null); // null | 'new' | call object

  const handleSave = (call) => {
    const exists = calls.some(c => c.id === call.id);
    onChange(exists ? calls.map(c => (c.id === call.id ? call : c)) : [...calls, call]);
    setEditing(null);
  };

  const handleRemove = (id) => onChange(calls.filter(c => c.id !== id));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {calls.map(call => (
          <CallCard key={call.id} call={call} onEdit={setEditing} onRemove={handleRemove} />
        ))}
      </div>

      {editing ? (
        <CallForm
          initial={editing === 'new' ? emptyCall() : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Yeni Görüşme Ekle
        </button>
      )}

      {calls.length === 0 && !editing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gözlenen görüşme yoksa gerekçe
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Yalnızca beceri çalışması gibi görüşmesiz koçluk türlerinde doldurun; aksi halde koçluk tamamlanamaz.
          </p>
          <textarea
            value={noCallsJustification || ''}
            onChange={(e) => onJustificationChange(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default Step3Calls;
