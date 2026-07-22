import React from 'react';
import { Info } from 'lucide-react';
import LanguageAwareTextarea from './LanguageAwareTextarea';

const Step5Reflection = ({ reflection, onChange }) => {
  const set = (field, value) => onChange({ ...reflection, [field]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Çalışanın görüşü yönetici yorumundan ayrı tutulur; ayrı alanlarda kaydedilir ve birleştirilmez.</p>
      </div>
      <LanguageAwareTextarea
        label="Ne iyi gitti?"
        value={reflection.whatWentWell}
        onChange={(v) => set('whatWentWell', v)}
        rows={3}
      />
      <LanguageAwareTextarea
        label="Nerede zorlandın?"
        value={reflection.whatWasDifficult}
        onChange={(v) => set('whatWasDifficult', v)}
        rows={3}
      />
      <LanguageAwareTextarea
        label="Seçtiğin odak alanı"
        value={reflection.chosenFocus}
        onChange={(v) => set('chosenFocus', v)}
        rows={2}
      />
      <LanguageAwareTextarea
        label="Çalışanın kendi ifadesi"
        value={reflection.employeeStatement}
        onChange={(v) => set('employeeStatement', v)}
        rows={3}
      />
    </div>
  );
};

export default Step5Reflection;
