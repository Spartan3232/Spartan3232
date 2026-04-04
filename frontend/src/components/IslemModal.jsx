import React, { useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { createIslem, listHastalar } from "@/api";
import { toast } from "sonner";
import { useSave } from "@/App";
import { todayISO } from "@/lib/utils";

const GELIR_KATEGORI = ["Hizmet", "Paket", "Ürün", "Diğer"];
const GIDER_KATEGORI = ["Kira", "Maaş", "Kozmetik", "Fatura", "Vergi", "Diğer"];

export default function IslemModal({ tip = "tahsilat", onClose, onSaved }) {
  const { touch } = useSave();
  const [hastalar, setHastalar] = useState([]);
  const [form, setForm] = useState({
    tip,
    hastaId: "",
    tutar: 0,
    yontem: "nakit",
    kategori: tip === "tahsilat" ? "Hizmet" : "Diğer",
    aciklama: "",
    tarih: todayISO(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { listHastalar().then(setHastalar); }, []);

  const submit = async () => {
    if (!form.tutar || form.tutar <= 0) return toast.error("Tutar girin");
    setSaving(true);
    try {
      await createIslem(form);
      touch();
      toast.success("Kaydedildi");
      onSaved?.();
      onClose();
    } catch { toast.error("Kaydedilemedi"); }
    finally { setSaving(false); }
  };

  const kategoriler = form.tip === "tahsilat" ? GELIR_KATEGORI : GIDER_KATEGORI;

  return (
    <Sheet
      title={form.tip === "tahsilat" ? "Yeni Gelir" : "Yeni Gider"}
      onClose={onClose}
      footer={
        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold disabled:opacity-50">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button"
            onClick={() => setForm({ ...form, tip: "tahsilat", kategori: "Hizmet" })}
            className={`py-2 rounded-lg ${form.tip === "tahsilat" ? "bg-emerald-600 text-white" : "bg-secondary"}`}>
            Gelir
          </button>
          <button type="button"
            onClick={() => setForm({ ...form, tip: "gider", kategori: "Diğer" })}
            className={`py-2 rounded-lg ${form.tip === "gider" ? "bg-red-600 text-white" : "bg-secondary"}`}>
            Gider
          </button>
        </div>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Tutar (₺)</div>
          <input type="number" className="field" value={form.tutar}
            onChange={(e) => setForm({ ...form, tutar: Number(e.target.value) })} />
        </label>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Yöntem</div>
          <select className="field" value={form.yontem}
            onChange={(e) => setForm({ ...form, yontem: e.target.value })}>
            <option value="nakit">Nakit</option>
            <option value="kart">Kart</option>
            <option value="havale">Havale</option>
          </select>
        </label>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Kategori</div>
          <select className="field" value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
            {kategoriler.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>

        {form.tip === "tahsilat" && (
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Hasta (opsiyonel)</div>
            <select className="field" value={form.hastaId}
              onChange={(e) => setForm({ ...form, hastaId: e.target.value })}>
              <option value="">--</option>
              {hastalar.map((h) => <option key={h.id} value={h.id}>{h.ad} {h.soyad}</option>)}
            </select>
          </label>
        )}

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Açıklama</div>
          <input className="field" value={form.aciklama}
            onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
        </label>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Tarih</div>
          <input type="date" className="field" value={form.tarih}
            onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
        </label>
      </div>
      <style>{`
        .field { width:100%; background: hsl(var(--input)); border:1px solid hsl(var(--border));
          border-radius: 0.6rem; padding: 0.65rem 0.75rem; color: hsl(var(--foreground));
          outline:none; font-size:14px; }
      `}</style>
    </Sheet>
  );
}
