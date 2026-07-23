import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { RATING_STATUS_LABELS, CLASSIFICATION_LABELS, classificationFor } from './coachingApi';

const emptyRating = (criterionId) => ({
  criterionId, score: null, status: 'not_assessed', evidenceCallIds: [], evidenceNote: '', classification: 'not_assessed',
});

const badgeColor = (classification) => ({
  strength: 'bg-green-100 text-green-700',
  expected: 'bg-blue-100 text-blue-700',
  development: 'bg-orange-100 text-orange-700',
  not_assessed: 'bg-gray-100 text-gray-500',
}[classification]);

const CriterionRow = ({ criterion, rating, calls, onChange }) => {
  const needsEvidence = [1, 2, 4, 5].includes(rating.score);
  const missingEvidence = needsEvidence && (!rating.evidenceNote?.trim() || rating.evidenceCallIds.length === 0);
  const scoreAllowed = rating.status === 'observed' || rating.status === 'partly_observed';

  const set = (field, value) => onChange({ ...rating, [field]: value });

  const toggleCall = (callId) => {
    const has = rating.evidenceCallIds.includes(callId);
    set('evidenceCallIds', has ? rating.evidenceCallIds.filter(x => x !== callId) : [...rating.evidenceCallIds, callId]);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-xs font-mono text-gray-400 mr-2">{criterion.id}</span>
          <span className="text-sm text-gray-900">{criterion.label}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${badgeColor(classificationFor(scoreAllowed ? rating.score : null))}`}>
          {CLASSIFICATION_LABELS[classificationFor(scoreAllowed ? rating.score : null)]}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
          <select
            value={rating.status}
            onChange={(e) => {
              const status = e.target.value;
              const allowed = status === 'observed' || status === 'partly_observed';
              onChange({ ...rating, status, score: allowed ? rating.score : null });
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {Object.entries(RATING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Puan (1-5)</label>
          <select
            disabled={!scoreAllowed}
            value={rating.score ?? ''}
            onChange={(e) => set('score', e.target.value === '' ? null : Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          >
            <option value="">Puan yok</option>
            {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {scoreAllowed && rating.score !== null && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bağlanmış görüşme kanıtı {needsEvidence && <span className="text-red-500">*</span>}</label>
            <div className="flex flex-wrap gap-1.5">
              {calls.length === 0 && <span className="text-xs text-gray-400">Önce Adım 3'te görüşme ekleyin.</span>}
              {calls.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCall(c.id)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    rating.evidenceCallIds.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600'
                  }`}
                >
                  {c.customerName} · {c.brick}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Yönetici kanıt notu {needsEvidence && <span className="text-red-500">*</span>}</label>
            <textarea
              value={rating.evidenceNote || ''}
              onChange={(e) => set('evidenceNote', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Gözlenen somut davranışı yazın."
            />
          </div>
          {missingEvidence && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> {rating.score} puan kanıt (görüşme + not) olmadan kaydedilemez.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CategorySection = ({ category, criteria, ratingsMap, calls, onRatingChange }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left">
        <span className="font-semibold text-gray-800 text-sm">{category.id}. {category.label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-2">
          {criteria.map(c => (
            <CriterionRow
              key={c.id}
              criterion={c}
              rating={ratingsMap[c.id] || emptyRating(c.id)}
              calls={calls}
              onChange={(next) => onRatingChange(c.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Step4Competencies = ({ competencies, ratings, calls, onChange }) => {
  const ratingsMap = useMemo(() => {
    const map = {};
    ratings.forEach(r => { map[r.criterionId] = r; });
    return map;
  }, [ratings]);

  const handleRatingChange = (criterionId, next) => {
    const others = ratings.filter(r => r.criterionId !== criterionId);
    onChange([...others, next]);
  };

  if (!competencies) return null;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
        3 puan "Beklenen düzey"dir ve gelişim alanı sayılmaz. Boş kriterler otomatik 3 yapılmaz. 1, 2, 4 ve 5 puan
        kanıtsız kaydedilemez. Satış/hedef/realizasyon bu puanı otomatik değiştirmez.
      </div>
      {competencies.categories.map(cat => (
        <CategorySection
          key={cat.id}
          category={cat}
          criteria={competencies.criteria.filter(c => c.category === cat.id)}
          ratingsMap={ratingsMap}
          calls={calls}
          onRatingChange={handleRatingChange}
        />
      ))}
    </div>
  );
};

export default Step4Competencies;
