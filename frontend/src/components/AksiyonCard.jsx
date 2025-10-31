import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Copy, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const LIMITS = {
  hedef: 140,
  olcum: 140,
  beklenen: 140,
  nasil: 120,
};

const SMART_TIME_REGEX = /(gün|hafta|ay|gün içinde|hafta içinde|ayın)/i;
const SMART_SCOPE_REGEX = /(hekim|ziyaret|görüşme|itiraz|eczane|senaryo|oturum|sunum|kayıt)/i;
const MEASURE_SOURCE_REGEX = /(CRM|test|reçete|stok|eğitim|kayıt|dashboard)/i;
const FORBIDDEN_VAGUE = /(daha iyi|daha fazla|artır|artmak|geliştir|geliştirmek)/i;
const VERB_START = /^(Planla|Hazırla|Uygula|Yaz|Ekle|Seç|Rol-?oyunu yap|Güncelle|İzle|Sor|Kur|Kaydet|Topla|İncele|Oluştur|Belirle|Tamamla|Tespit|Dinle|Kullan|Gözden|Kontrol|Bildir)/i;

function useAutoGrow(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 500) + "px";
  }, [ref, value]);
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Counter({ value, limit }) {
  const used = value?.length || 0;
  const danger = used > limit;
  return (
    <span className={cx("ml-2 text-xs select-none", danger ? "text-red-600" : "text-gray-500")}>
      {used}/{limit}
    </span>
  );
}

function FieldLabel({ children, required, hint }) {
  return (
    <Label className="text-sm font-medium text-gray-800 flex items-center gap-2">
      {children}
      {required && <span className="text-red-600">*</span>}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </Label>
  );
}

function validate(v) {
  const errors = [];
  const state = {};

  const req = [
    { key: "aksiyon_konusu", label: "Aksiyon konusu" },
    { key: "hedef", label: "Hedef" },
    { key: "olcum", label: "Ne ile ölçülecek" },
    { key: "beklenen_sonuc", label: "Beklenen sonuç" },
    { key: "nasil1", label: "Nasıl 1" },
  ];

  req.forEach(({ key, label }) => {
    const val = v[key];
    if (!val || !val.trim()) {
      errors.push(`${label} zorunludur.`);
      state[key] = "error";
    }
  });

  if (v.hedef) {
    const hasNum = /\d+/.test(v.hedef);
    const hasTime = SMART_TIME_REGEX.test(v.hedef);
    const hasScope = SMART_SCOPE_REGEX.test(v.hedef);
    if (!(hasNum && hasTime && hasScope)) {
      errors.push("Hedef SMART değil; sayı + zaman + kapsam ekleyin.");
      state.hedef = state.hedef === "error" ? "error" : "warn";
    } else {
      state.hedef = state.hedef || "ok";
    }
    if (FORBIDDEN_VAGUE.test(v.hedef)) {
      errors.push("Hedefte belirsiz sözcükler var (daha iyi/daha fazla/geliştirmek…).");
      state.hedef = "warn";
    }
    if (v.hedef.length > LIMITS.hedef) state.hedef = "warn";
  }

  if (v.olcum) {
    if (!MEASURE_SOURCE_REGEX.test(v.olcum)) {
      errors.push("Ölçüm alanında veri kaynağı belirtin (CRM/test/reçete/stok/eğitim…).");
      state.olcum = state.olcum === "error" ? "error" : "warn";
    } else {
      state.olcum = state.olcum || "ok";
    }
    if (FORBIDDEN_VAGUE.test(v.olcum)) {
      errors.push("Ölçüm alanında belirsiz sözcükler var.");
      state.olcum = "warn";
    }
    if (v.olcum.length > LIMITS.olcum) state.olcum = "warn";
  }

  if (v.beklenen_sonuc) {
    if (FORBIDDEN_VAGUE.test(v.beklenen_sonuc)) {
      errors.push("Beklenen sonuçta belirsiz sözcükler var.");
      state.beklenen_sonuc = "warn";
    } else {
      state.beklenen_sonuc = state.beklenen_sonuc || "ok";
    }
    if (v.beklenen_sonuc.length > LIMITS.beklenen) state.beklenen_sonuc = "warn";
  }

  ["nasil1", "nasil2", "nasil3"].forEach((k) => {
    const val = v[k];
    if (!val) return;
    if (!VERB_START.test(val)) {
      errors.push(`${k === "nasil1" ? "Nasıl 1" : k === "nasil2" ? "Nasıl 2" : "Nasıl 3"} fiille başlamalı (Planla/Hazırla/Uygula/…).`);
      state[k] = state[k] === "error" ? "error" : "warn";
    } else {
      state[k] = state[k] || "ok";
    }
    if (val.length > LIMITS.nasil) state[k] = "warn";
  });

  return { errors, state };
}

export default function AksiyonCard({ aksiyon, onChange, onDelete, testId }) {
  const [edited, setEdited] = useState(false);
  const validation = useMemo(() => validate(aksiyon), [aksiyon]);
  const hasAnyError = validation.errors.length > 0;

  const refs = {
    aksiyon_konusu: useRef(null),
    hedef: useRef(null),
    olcum: useRef(null),
    beklenen_sonuc: useRef(null),
    nasil1: useRef(null),
    nasil2: useRef(null),
    nasil3: useRef(null),
  };

  useAutoGrow(refs.aksiyon_konusu, aksiyon.aksiyon_konusu);
  useAutoGrow(refs.hedef, aksiyon.hedef);
  useAutoGrow(refs.olcum, aksiyon.olcum);
  useAutoGrow(refs.beklenen_sonuc, aksiyon.beklenen_sonuc);
  useAutoGrow(refs.nasil1, aksiyon.nasil1);
  useAutoGrow(refs.nasil2, aksiyon.nasil2 || "");
  useAutoGrow(refs.nasil3, aksiyon.nasil3 || "");

  function update(key, value) {
    setEdited(true);
    onChange({ ...aksiyon, [key]: value });
  }

  return (
    <div
      className={cx(
        "w-full rounded-2xl border bg-white shadow-sm",
        hasAnyError ? "border-amber-400" : "border-gray-200"
      )}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-amber-800">{aksiyon.baslik}</h3>
        </div>
        <div className="flex items-center gap-2">
          {aksiyon.ai_generated && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
              <Wand2 className="w-3.5 h-3.5" /> AI ile dolduruldu
            </span>
          )}
          {edited && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Düzenlendi
            </span>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid={`${testId}-delete-btn`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 grid grid-cols-1 gap-4">
        <Field
          label={<FieldLabel required>Aksiyon konusu</FieldLabel>}
          refEl={refs.aksiyon_konusu}
          value={aksiyon.aksiyon_konusu}
          placeholder="Fiil ile başla: 'Ürün X çekirdek anlatımını prova et' gibi"
          onChange={(v) => update("aksiyon_konusu", v)}
          state={validation.state.aksiyon_konusu}
        />

        <Field
          label={<FieldLabel required>Hedef</FieldLabel>}
          refEl={refs.hedef}
          value={aksiyon.hedef}
          placeholder="SMART: sayı + zaman + kapsam (örn. 14 gün içinde 5 hekim ziyarette...)"
          onChange={(v) => update("hedef", v)}
          state={validation.state.hedef}
          counterLimit={LIMITS.hedef}
        />

        <Field
          label={<FieldLabel required>Ne ile ölçülecek</FieldLabel>}
          refEl={refs.olcum}
          value={aksiyon.olcum}
          placeholder="Veri kaynağı belirt (CRM/test/reçete/stok/eğitim...)"
          onChange={(v) => update("olcum", v)}
          state={validation.state.olcum}
          counterLimit={LIMITS.olcum}
        />

        <Field
          label={<FieldLabel required>Beklenen sonuç</FieldLabel>}
          refEl={refs.beklenen_sonuc}
          value={aksiyon.beklenen_sonuc}
          placeholder="İş etkisi: 'İtiraz sayısında azalma ve kapanış oranında artış' gibi"
          onChange={(v) => update("beklenen_sonuc", v)}
          state={validation.state.beklenen_sonuc}
          counterLimit={LIMITS.beklenen}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label={<FieldLabel required>Nasıl 1</FieldLabel>}
            refEl={refs.nasil1}
            value={aksiyon.nasil1}
            placeholder="Fiille başla: Planla/Hazırla/Uygula..."
            onChange={(v) => update("nasil1", v)}
            state={validation.state.nasil1}
            counterLimit={LIMITS.nasil}
          />
          <Field
            label={<FieldLabel>Nasıl 2</FieldLabel>}
            refEl={refs.nasil2}
            value={aksiyon.nasil2 || ""}
            placeholder="Opsiyonel adım"
            onChange={(v) => update("nasil2", v)}
            state={validation.state.nasil2}
            counterLimit={LIMITS.nasil}
          />
          <Field
            label={<FieldLabel>Nasıl 3</FieldLabel>}
            refEl={refs.nasil3}
            value={aksiyon.nasil3 || ""}
            placeholder="Opsiyonel adım"
            onChange={(v) => update("nasil3", v)}
            state={validation.state.nasil3}
            counterLimit={LIMITS.nasil}
          />
        </div>

        {hasAnyError && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm leading-relaxed">
              <div className="font-semibold mb-1">Kontrol edin:</div>
              <ul className="list-disc pl-5 space-y-1">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, refEl, counterLimit, state }) {
  const base = "w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 transition";
  const border =
    state === "error"
      ? "border-red-300 focus:ring-red-100"
      : state === "warn"
      ? "border-amber-300 focus:ring-amber-100"
      : "border-gray-200 focus:ring-gray-100";
  
  return (
    <div className="flex flex-col gap-1">
      {label}
      <textarea
        ref={refEl}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className={cx(base, border)}
      />
      {typeof counterLimit === "number" && <Counter value={value} limit={counterLimit} />}
    </div>
  );
}
