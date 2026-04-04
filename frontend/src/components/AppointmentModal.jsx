import React, { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/Sheet";
import { createRandevu, updateRandevu, listHastalar, listHizmetler, listPaketler, createHasta } from "@/api";
import { toast } from "sonner";
import { AlertTriangle, UserPlus } from "lucide-react";
import { useSave } from "@/App";
import { todayISO } from "@/lib/utils";

const SAATLER = (() => {
  const out = [];
  for (let h = 7; h <= 22; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export default function AppointmentModal({ randevu, defaultDate, defaultHastaId, onClose, onSaved }) {
  const { touch } = useSave();
  const [hastalar, setHastalar] = useState([]);
  const [hizmetler, setHizmetler] = useState([]);
  const [paketler, setPaketler] = useState([]);
  const [search, setSearch] = useState("");
  const [newHasta, setNewHasta] = useState(false);
  const [newHastaForm, setNewHastaForm] = useState({ ad: "", soyad: "", tel: "" });
  const [form, setForm] = useState({
    hastaId: randevu?.hastaId || defaultHastaId || "",
    hizmetId: randevu?.hizmetId || "",
    hizmetAdi: randevu?.hizmetAdi || "",
    tarih: randevu?.tarih || defaultDate || todayISO(),
    saat: randevu?.saat || "10:00",
    durum: randevu?.durum || "bekliyor",
    ucret: randevu?.ucret ?? 0,
    odemeDurumu: randevu?.odemeDurumu || "bekliyor",
    odemeYontemi: randevu?.odemeYontemi || "nakit",
    notlar: randevu?.notlar || "",
    paketId: randevu?.paketId || "",
    manuelHizmet: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listHastalar().then(setHastalar);
    listHizmetler().then(setHizmetler);
    listPaketler().then(setPaketler);
  }, []);

  const hasta = hastalar.find((h) => h.id === form.hastaId);
  const filteredHastalar = useMemo(() => {
    if (!search) return hastalar.slice(0, 8);
    const q = search.toLowerCase();
    return hastalar
      .filter((h) => `${h.ad} ${h.soyad} ${h.tel}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [hastalar, search]);

  const aktifPaketler = paketler.filter(
    (p) => p.hastaId === form.hastaId && p.durum === "aktif" && p.kalanSeans > 0
  );

  const kategoriliHizmetler = useMemo(() => {
    const map = {};
    hizmetler.forEach((h) => {
      if (!h.aktif) return;
      (map[h.kategori] = map[h.kategori] || []).push(h);
    });
    return map;
  }, [hizmetler]);

  const pickHizmet = (h) => {
    setForm({
      ...form,
      hizmetId: h.id,
      hizmetAdi: h.ad,
      ucret: h.tekFiyat || 0,
      manuelHizmet: false,
    });
  };

  const createNewHasta = async () => {
    if (!newHastaForm.ad.trim()) return toast.error("Ad gerekli");
    const h = await createHasta(newHastaForm);
    setHastalar([...hastalar, h]);
    setForm({ ...form, hastaId: h.id });
    setNewHasta(false);
    touch();
    toast.success("Hasta eklendi");
  };

  const submit = async () => {
    if (!form.hastaId) return toast.error("Hasta seçin");
    if (!form.hizmetAdi) return toast.error("Hizmet seçin");
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.manuelHizmet;
      if (!payload.paketId) payload.paketId = null;
      const saved = randevu
        ? await updateRandevu(randevu.id, payload)
        : await createRandevu(payload);
      touch();
      toast.success("Randevu kaydedildi");
      onSaved?.(saved);
      onClose();
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={randevu ? "Randevu Düzenle" : "Yeni Randevu"}
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
      <div className="space-y-4">
        {/* Hasta Selection */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Hasta</div>
          {hasta ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div>
                <div className="font-medium">{hasta.ad} {hasta.soyad}</div>
                <div className="text-xs text-muted-foreground">{hasta.tel}</div>
              </div>
              <button className="text-xs text-[#cba96e]" onClick={() => setForm({ ...form, hastaId: "" })}>
                Değiştir
              </button>
            </div>
          ) : newHasta ? (
            <div className="space-y-2 p-3 rounded-lg bg-secondary">
              <input placeholder="Ad *" className="field" value={newHastaForm.ad}
                onChange={(e) => setNewHastaForm({ ...newHastaForm, ad: e.target.value })} />
              <input placeholder="Soyad" className="field" value={newHastaForm.soyad}
                onChange={(e) => setNewHastaForm({ ...newHastaForm, soyad: e.target.value })} />
              <input placeholder="Telefon" className="field" value={newHastaForm.tel}
                onChange={(e) => setNewHastaForm({ ...newHastaForm, tel: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={createNewHasta} className="flex-1 py-2 rounded-lg bg-[#cba96e] text-black text-sm font-medium">Kaydet</button>
                <button onClick={() => setNewHasta(false)} className="flex-1 py-2 rounded-lg bg-background text-sm">Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              <input
                placeholder="Hasta ara..."
                className="field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {filteredHastalar.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setForm({ ...form, hastaId: h.id })}
                    className="w-full text-left p-2 rounded hover:bg-secondary text-sm"
                  >
                    {h.ad} {h.soyad} <span className="text-muted-foreground text-xs">{h.tel}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNewHasta(true)}
                  className="w-full text-left p-2 rounded text-[#cba96e] text-sm flex items-center gap-1"
                >
                  <UserPlus className="h-4 w-4" /> Yeni hasta ekle
                </button>
              </div>
            </>
          )}
        </div>

        {hasta?.saglikNotu && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Sağlık Notu</div>
              <div className="text-xs">{hasta.saglikNotu}</div>
            </div>
          </div>
        )}

        {/* Tarih / Saat */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Tarih</div>
            <input type="date" className="field" value={form.tarih}
              onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Saat</div>
            <select className="field" value={form.saat}
              onChange={(e) => setForm({ ...form, saat: e.target.value })}>
              {SAATLER.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {/* Hizmet */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Hizmet</div>
          {!form.manuelHizmet ? (
            <select
              className="field"
              value={form.hizmetId}
              onChange={(e) => {
                if (e.target.value === "__manuel__") {
                  setForm({ ...form, manuelHizmet: true, hizmetId: "", hizmetAdi: "" });
                  return;
                }
                const h = hizmetler.find((x) => x.id === e.target.value);
                if (h) pickHizmet(h);
              }}
            >
              <option value="">-- Seçin --</option>
              {Object.entries(kategoriliHizmetler).map(([kat, list]) => (
                <optgroup key={kat} label={kat}>
                  {list.map((h) => (
                    <option key={h.id} value={h.id}>{h.ad} {h.tekFiyat ? `— ${h.tekFiyat}₺` : ""}</option>
                  ))}
                </optgroup>
              ))}
              <option value="__manuel__">✎ Manuel Giriş</option>
            </select>
          ) : (
            <input
              className="field"
              placeholder="Hizmet adı"
              value={form.hizmetAdi}
              onChange={(e) => setForm({ ...form, hizmetAdi: e.target.value })}
            />
          )}
        </div>

        {aktifPaketler.length > 0 && (
          <div className="p-3 rounded-lg bg-secondary space-y-2">
            <div className="text-xs text-muted-foreground">Aktif Paketler</div>
            {aktifPaketler.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.paketId === p.id}
                  onChange={(e) => setForm({ ...form, paketId: e.target.checked ? p.id : "", ucret: e.target.checked ? 0 : form.ucret })}
                />
                Paketten Düş: {p.hizmetAdi} ({p.kalanSeans}/{p.toplamSeans})
              </label>
            ))}
          </div>
        )}

        {/* Durum / Ücret / Ödeme */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Durum</div>
            <select className="field" value={form.durum}
              onChange={(e) => setForm({ ...form, durum: e.target.value })}>
              <option value="bekliyor">Bekliyor</option>
              <option value="geldi">Geldi</option>
              <option value="gelmedi">Gelmedi</option>
              <option value="iptal">İptal</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Ücret (₺)</div>
            <input type="number" className="field" value={form.ucret}
              onChange={(e) => setForm({ ...form, ucret: Number(e.target.value) })} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Ödeme Durumu</div>
            <select className="field" value={form.odemeDurumu}
              onChange={(e) => setForm({ ...form, odemeDurumu: e.target.value })}>
              <option value="bekliyor">Bekliyor</option>
              <option value="odendi">Ödendi</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Ödeme Yöntemi</div>
            <select className="field" value={form.odemeYontemi}
              onChange={(e) => setForm({ ...form, odemeYontemi: e.target.value })}>
              <option value="nakit">Nakit</option>
              <option value="kart">Kart</option>
              <option value="havale">Havale</option>
            </select>
          </label>
        </div>

        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Not</div>
          <textarea className="field" rows={2} value={form.notlar}
            onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
        </label>
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
