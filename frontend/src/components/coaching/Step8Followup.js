import React, { useState } from 'react';
import { CheckCircle2, XCircle, Download, Printer, Sparkles, AlertTriangle } from 'lucide-react';

const ChecklistItem = ({ ok, label }) => (
  <div className="flex items-center gap-2 text-sm">
    {ok ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
  </div>
);

const Step8Followup = ({
  session, checklist, comment, onFetchComment, commentLoading,
  onDownloadJson, csvUrl, onComplete, completing, completionErrors,
}) => {
  const [ackWarnings, setAckWarnings] = useState(false);
  const hasAdvisoryWarnings = (session.languageWarnings || []).some(w => w.severity === 'warn');
  const hasBlockingWarnings = (session.languageWarnings || []).some(w => w.severity === 'block');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Tamamlanma kontrolü</h4>
        <div className="space-y-2">
          {checklist.map((c, i) => <ChecklistItem key={i} ok={c.ok} label={c.label} />)}
        </div>
      </div>

      {session.languageWarnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Dil kontrolü uyarıları</h4>
          {session.languageWarnings.map((w, i) => (
            <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${w.severity === 'block' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              <strong>{w.field}:</strong> "{w.term}" — {w.guidance}
            </div>
          ))}
          {hasAdvisoryWarnings && !hasBlockingWarnings && (
            <label className="flex items-center gap-2 text-xs text-amber-900 mt-2">
              <input type="checkbox" checked={ackWarnings} onChange={(e) => setAckWarnings(e.target.checked)} />
              Metni gözden geçirdim; bu ifadelerin uygun olduğunu onaylıyorum.
            </label>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm">Otomatik SFA yorumu</h4>
          <button type="button" onClick={onFetchComment} disabled={commentLoading} className="text-xs text-blue-600 font-medium flex items-center gap-1 disabled:opacity-50">
            <Sparkles className="w-3.5 h-3.5" /> {commentLoading ? 'Oluşturuluyor...' : 'Yorumu Oluştur'}
          </button>
        </div>
        {comment ? (
          <p className="text-sm text-gray-700 whitespace-pre-line">{comment}</p>
        ) : (
          <p className="text-xs text-gray-400">Yalnızca kayıtlı veri ve kanıt kullanılarak yerel kural motoruyla üretilir; harici AI kullanılmaz.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onDownloadJson} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
          <Download className="w-4 h-4" /> JSON indir
        </button>
        <a href={csvUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
          <Download className="w-4 h-4" /> CSV indir
        </a>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
          <Printer className="w-4 h-4" /> Yazdır / PDF
        </button>
      </div>

      {completionErrors?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-semibold text-red-800 text-sm mb-2">Koçluk tamamlanamadı</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {completionErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={completing || session.status === 'completed'}
        onClick={() => onComplete(ackWarnings)}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold disabled:opacity-50"
      >
        {session.status === 'completed' ? 'Koçluk tamamlandı' : completing ? 'Tamamlanıyor...' : 'Koçluğu Tamamla'}
      </button>
    </div>
  );
};

export default Step8Followup;
