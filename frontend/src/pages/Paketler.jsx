import React, { useEffect, useMemo, useState } from "react";
import { listPaketler, listHastalar, seansKullan, paketTahsilat, deletePaket } from "@/api";
import { formatTL, formatDate } from "@/lib/utils";
import { Plus, Minus, CreditCard, Trash2 } from "lucide-react";
import PaketModal from "@/components/PaketModal";
import ConfirmButton from "@/components/ConfirmButton";
import Sheet from "@/components/Sheet";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function Paketler() {
  const { touch } = useSave();
  const [items, setItems] = useState([]);
  const [hastalar, setHastalar] = useState([]);
  const [filter, setFilter] = useState("aktif");
  const [modalOpen, setModalOpen] = useState(false);
  const [tahsilatFor, setTahsilatFor] = useState(null);

  const load = async () => {
    const [p, h] = await Promise.all([listPaketler(), listHastalar()]);
    setItems(p);
    setHastalar(h);
  };
  useEffect(() => { load(); }, []);

  const hastaOf = (id) => hastalar.find((x) => x.id === id);
  const filtered = useMemo(() => {
    if (filter === "tumu") return items;
    if (filter === "aktif") return items.filter((p) => p.durum === "aktif");
    return items.filter((p) => p.durum === "tamamlandi");
  }, [items, filter]);

  const useSeans = async (id) => {
    await seansKullan(id);
    touch();
    toast.success("Seans düşüldü");
    load();
  };
  const remove = async (id) => {
    await deletePaket(id);
    touch();
    toast.success("Silindi");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1">
        {[["aktif", "Aktif"], ["tamamlandi", "Tamamlanan"], ["tumu", "Tümü"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`py-2 rounded-xl text-xs font-medium ${filter === k ? "bg-[#cba96e] text-black" : "bg-card border border-border"}`}>
            {l}
          </button>
        ))}
      </div>

      <button onClick={() => setModalOpen(true)}
        className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Yeni Paket Sat
      </button>

      {filtered.length === 0 && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg bg-card border border-border text-center">
          Paket yok.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((p) => {
          const h = hastaOf(p.hastaId);
          const pct = p.toplamSeans ? ((p.toplamSeans - p.kalanSeans) / p.toplamSeans) * 100 : 0;
          return (
            <div key={p.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{h ? `${h.ad} ${h.soyad}` : "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.hizmetAdi}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.durum === "aktif" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-300"}`}>
                  {p.durum}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Kalan: {p.kalanSeans}/{p.toplamSeans}</span>
                  <span className="text-[#cba96e]">Borç: {formatTL(p.kalanBorc)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-[#cba96e]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Satış: {formatDate(p.satisTarihi)}</div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                <button onClick={() => useSeans(p.id)} disabled={p.kalanSeans <= 0}
                  className="py-1.5 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1 disabled:opacity-50">
                  <Minus className="h-3 w-3" /> Seans
                </button>
                <button onClick={() => setTahsilatFor(p)}
                  className="py-1.5 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1">
                  <CreditCard className="h-3 w-3" /> Tahsilat
                </button>
                <ConfirmButton
                  className="py-1.5 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1"
                  onConfirm={() => remove(p.id)}
                >
                  <Trash2 className="h-3 w-3" /> Sil
                </ConfirmButton>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && <PaketModal onClose={() => setModalOpen(false)} onSaved={load} />}
      {tahsilatFor && (
        <TahsilatModal paket={tahsilatFor} onClose={() => setTahsilatFor(null)} onSaved={() => { load(); touch(); }} />
      )}
    </div>
  );
}

function TahsilatModal({ paket, onClose, onSaved }) {
  const [tutar, setTutar] = useState(paket.kalanBorc || 0);
  const [yontem, setYontem] = useState("nakit");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!tutar || tutar <= 0) return toast.error("Tutar girin");
    setSaving(true);
    try {
      await paketTahsilat(paket.id, tutar, yontem);
      toast.success("Tahsilat alındı");
      onSaved?.();
      onClose();
    } catch { toast.error("Hata"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet title="Borç Tahsil Et" onClose={onClose}
      footer={
        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold disabled:opacity-50">
          Kaydet
        </button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="p-3 rounded-lg bg-secondary">
          <div>{paket.hizmetAdi}</div>
          <div className="text-xs text-muted-foreground">Kalan Borç: {formatTL(paket.kalanBorc)}</div>
        </div>
        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Tutar (₺)</div>
          <input type="number" className="field" value={tutar}
            onChange={(e) => setTutar(Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Yöntem</div>
          <select className="field" value={yontem} onChange={(e) => setYontem(e.target.value)}>
            <option value="nakit">Nakit</option>
            <option value="kart">Kart</option>
            <option value="havale">Havale</option>
          </select>
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
