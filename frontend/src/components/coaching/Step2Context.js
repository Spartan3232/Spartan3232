import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

const MetricCard = ({ metric }) => {
  const [open, setOpen] = useState(false);
  const isMissing = metric.status === 'missing';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{metric.label}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isMissing ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
        }`}>
          {isMissing ? 'Veri yok' : metric.status}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-1">
        {isMissing ? '—' : `${metric.value ?? '—'} ${metric.unit || ''}`}
      </div>
      {metric.period && <p className="text-xs text-gray-500 mb-2">Dönem: {metric.period}</p>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        Kaynak ve hesaplama {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
          <p><strong>Kaynak:</strong> {metric.source}</p>
          {metric.formula && <p><strong>Formül:</strong> {metric.formula}</p>}
          {metric.qualityNotes?.length > 0 && (
            <ul className="list-disc list-inside">
              {metric.qualityNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const Step2Context = ({ contextMetrics }) => (
  <div className="space-y-4">
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p>
        Bu bölüm otomatik oluşturulur ve koçluk puanına doğrudan etki etmez. Bu uygulamada IMS/pazar/ziyaret/sipariş
        veri kaynağı entegrasyonu bulunmadığından tüm kartlar bilinçli olarak "Veri yok" gösterir; hiçbir sayı
        uydurulmaz. Gerçek satış/pazar sonuçları yalnızca bağlam sağlar, yetkinlik puanını otomatik belirlemez.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {contextMetrics.map(m => <MetricCard key={m.metricId} metric={m} />)}
    </div>
  </div>
);

export default Step2Context;
