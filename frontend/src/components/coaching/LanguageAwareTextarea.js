import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { checkLanguage } from './coachingApi';

// Serbest metin alanlarında yasaklı/uygunsuz dil için canlı uyarı gösterir.
// Kesin hukuki karar üretmez; yalnızca kullanıcıyı role ilişkin somut
// davranışla yeniden yazmaya yönlendirir. Tamamlama aşamasında sunucu
// tarafında ayrıca ve kesin biçimde kontrol edilir.
const LanguageAwareTextarea = ({ label, value, onChange, placeholder, rows = 3, required = false, helpText }) => {
  const [warnings, setWarnings] = useState([]);

  const handleBlur = async () => {
    if (!value || !value.trim()) {
      setWarnings([]);
      return;
    }
    try {
      const res = await checkLanguage(value);
      setWarnings(res.matches || []);
    } catch (err) {
      console.error('Language check error:', err);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {helpText && <p className="text-xs text-gray-500 mb-1">{helpText}</p>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      {warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg ${
              w.severity === 'block' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span><strong>"{w.term}"</strong> — {w.guidance}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageAwareTextarea;
