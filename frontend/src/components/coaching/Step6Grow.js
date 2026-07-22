import React from 'react';
import { Plus, X } from 'lucide-react';
import LanguageAwareTextarea from './LanguageAwareTextarea';

const Step6Grow = ({ grow, onChange }) => {
  const set = (field, value) => onChange({ ...grow, [field]: value });

  const addOption = () => set('options', [...grow.options, '']);
  const updateOption = (i, value) => {
    const next = [...grow.options];
    next[i] = value;
    set('options', next);
  };
  const removeOption = (i) => set('options', grow.options.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <LanguageAwareTextarea
        label="G — Goal / Hedef"
        helpText="Bu görüşmelerde hangi davranışını geliştirmek istiyorsun? Başarıyı ne gördüğümüzde anlayacağız?"
        value={grow.goal}
        onChange={(v) => set('goal', v)}
        rows={3}
      />
      <LanguageAwareTextarea
        label="R — Reality / Mevcut durum"
        helpText="Bugün hangi görüşmede istediğin sonucu aldın? Nerede zorlandın? Veriler ve gözlemler bize ne söylüyor?"
        value={grow.reality}
        onChange={(v) => set('reality', v)}
        rows={3}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">O — Options / Seçenekler</label>
        <p className="text-xs text-gray-500 mb-2">Başka hangi yöntemi deneyebilirdin? En az iki seçenek ve seçilen yöntem.</p>
        <div className="space-y-2">
          {grow.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button type="button" onClick={() => removeOption(i)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 font-medium flex items-center gap-1">
          <Plus className="w-4 h-4" /> Seçenek ekle
        </button>
      </div>
      <LanguageAwareTextarea
        label="W — Way Forward / İlerleme planı"
        helpText="İlk adım nedir? Ne zaman yapacaksın? Başarıyı hangi veri veya gözlemle ölçeceğiz? Yönetici desteği ne olacak?"
        value={grow.wayForward}
        onChange={(v) => set('wayForward', v)}
        rows={3}
      />
    </div>
  );
};

export default Step6Grow;
