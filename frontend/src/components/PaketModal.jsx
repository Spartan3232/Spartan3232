import React, { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/Sheet";
import { createPaket, listHastalar, listHizmetler } from "@/api";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function PaketModal({ defaultHastaId, onClose, onSaved }) {
  const { touch } = useSave();
  const [hastalar, setHastalar] = useState([]);
  const [hizmetler, setHizmetler] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    hastaId: defaultHastaId || "",
    hizmetId: "",
    hizmetAdi: "",
    toplamSeans: 4,
    paketFiyati: 0,
    odenenTutar: 0,
    yontem: "nakit",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listHastalar().then(setHastalar);
    listHizmetler().then(setHizmetler);
  }, []);

  const hasta = hastalar.find((h) => h.id === form.hastaId);
  const filtered = useMemo(() => {
    if (!search) return hastalar.slice(0, 8);
    const q = search.toLowerCase();
    return hastalar.filter((h) => `${h.ad} ${h.soyad}`.toLowerCase().includes(q)).slice(0, 8);
  }, [hastalar, search]);

  const pickHizmet = (id) => {
    const h = hizmetler.find((x) => x.id === id);
    if (!h) return;
    setForm({
      ...form,
      hizmetId: h.id,
      hizmetAdi: h.ad,
      paketFiyati: h.paketFiyat || form.paketFiyati,
      toplamSeans: h.paketSeans || form.toplamSeans,
    });
  };

  const kalanBorc = Math.max(0, (form.paketFiyati || 0) - (form.odenenTutar || 0));

  const submit = async () => {
    if (!form.hastaId) return toast.error("Hasta seçin");
    if (!form.hizmetAdi) return toast.error("Hizmet seçin");
    if (!form.toplamSeans || form.toplamSeans < 1) return toast.error("Seans sayısı");
    setSaving(true);
    try {
      await createPaket(form);
      touch();
      toast.success("Paket satışı kaydedildi");
      onSaved?.();
      onClose();
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title="Yeni Paket Sat"
      onClose={onClose}
      footer={
        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold disabled:opacity-50">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Hasta</div>
          {hasta ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div>{hasta.ad} {hasta.soyad}</div>
              <button className="text-xs text-[#cba96e]" onClick={() => setForm({ ...form, hastaId: "" })}>Değiştir</button>
            </div>
          ) : (
            <>
              <input placeholder="Hasta ara..." className="field" value={search}
                onChange={(e) => setSearch(e.target.value)} />
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {filtered.map((h) => (
                  <button key={h.id} type="button"
                    onClick={() => setForm({ ...form, hastaId: h.id })}
                    className="w-full text-left p-2 rounded hover:bg-secondary text-sm">
                    {h.ad} {h.soyad}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Hizmet</div>
          <select className="field" value={form.hizmetId} onChange={(e) => pickHizmet(e.target.value)}>
            <option value="">-- Seçin --</option>
            {hizmetler.filter((h) => h.aktif).map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad} {h.paketFiyat ? `— ${h.paketFiyat}₺ (${h.paketSeans} seans)` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Toplam Seans</div>
            <input type="number" className="field" value={form.toplamSeans}
              onChange={(e) => setForm({ ...form, toplamSeans: Number(e.target.value) })} />
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Paket Fiyatı (₺)</div>
            <input type="number" className="field" value={form.paketFiyati}
              onChange={(e) => setForm({ ...form, paketFiyati: Number(e.target.value) })} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Peşinat (₺)</div>
            <input type="number" className="field" value={form.odenenTutar}
              onChange={(e) => setForm({ ...form, odenenTutar: Number(e.target.value) })} />
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
        </div>

        <div className="p-3 rounded-lg bg-secondary text-sm flex justify-between">
          <span>Kalan Borç:</span>
          <span className="font-semibold" style={{ color: "#cba96e" }}>{kalanBorc} ₺</span>
        </div>
      </div>
      <style>{`
        .field { width:100%; background: hsl(var(--input)); border:1px solid hsl(var(--border));
          border-radius: 0.6rem; padding: 0.65rem 0.75rem; color: hsl(var(--foreground));
          outline:none; font-size:14px; }
      `}</style>
    </Sheet>
  );
}
