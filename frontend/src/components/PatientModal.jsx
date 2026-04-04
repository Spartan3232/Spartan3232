import React, { useState } from "react";
import Sheet from "@/components/Sheet";
import { createHasta, updateHasta } from "@/api";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function PatientModal({ hasta, onClose, onSaved }) {
  const { touch } = useSave();
  const [form, setForm] = useState({
    ad: hasta?.ad || "",
    soyad: hasta?.soyad || "",
    tel: hasta?.tel || "",
    dogumTarihi: hasta?.dogumTarihi || "",
    kaynak: hasta?.kaynak || "",
    saglikNotu: hasta?.saglikNotu || "",
    notlar: hasta?.notlar || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.ad.trim()) return toast.error("Ad gerekli");
    setSaving(true);
    try {
      const saved = hasta
        ? await updateHasta(hasta.id, form)
        : await createHasta(form);
      touch();
      toast.success(hasta ? "Hasta güncellendi" : "Hasta eklendi");
      onSaved?.(saved);
      onClose();
    } catch (e) {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={hasta ? "Hasta Düzenle" : "Yeni Hasta"}
      onClose={onClose}
      footer={
        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      }
    >
      <div className="space-y-3">
        <Field label="Ad *">
          <input value={form.ad} onChange={set("ad")} className="field" />
        </Field>
        <Field label="Soyad">
          <input value={form.soyad} onChange={set("soyad")} className="field" />
        </Field>
        <Field label="Telefon">
          <input value={form.tel} onChange={set("tel")} className="field" placeholder="05xx xxx xx xx" />
        </Field>
        <Field label="Doğum Tarihi">
          <input type="date" value={form.dogumTarihi} onChange={set("dogumTarihi")} className="field" />
        </Field>
        <Field label="Nereden Duydu">
          <select value={form.kaynak} onChange={set("kaynak")} className="field">
            <option value="">-- Seçin --</option>
            <option>Instagram</option>
            <option>Tavsiye</option>
            <option>Google</option>
            <option>Tabela</option>
            <option>Diğer</option>
          </select>
        </Field>
        <Field label="Sağlık Notu (Uyarı)">
          <textarea value={form.saglikNotu} onChange={set("saglikNotu")} className="field" rows={2} placeholder="Alerji, hamilelik, ilaç vb." />
        </Field>
        <Field label="Genel Not">
          <textarea value={form.notlar} onChange={set("notlar")} className="field" rows={2} />
        </Field>
      </div>
      <style>{`
        .field { width:100%; background: hsl(var(--input)); border:1px solid hsl(var(--border));
          border-radius: 0.6rem; padding: 0.65rem 0.75rem; color: hsl(var(--foreground));
          outline:none; font-size:14px; }
        .field:focus { border-color: #cba96e; }
      `}</style>
    </Sheet>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
