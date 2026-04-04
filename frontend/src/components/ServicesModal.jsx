import React, { useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { listHizmetler, createHizmet, updateHizmet, deleteHizmet } from "@/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import { useSave } from "@/App";

export default function ServicesModal({ onClose }) {
  const { touch } = useSave();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ad: "", kategori: "Diğer", tekFiyat: 0, paketFiyat: "", paketSeans: "" });

  const load = async () => setItems(await listHizmetler());
  useEffect(() => { load(); }, []);

  const edit = (h) => {
    setEditing(h);
    setForm({
      ad: h.ad, kategori: h.kategori,
      tekFiyat: h.tekFiyat || 0,
      paketFiyat: h.paketFiyat || "",
      paketSeans: h.paketSeans || "",
    });
  };
  const reset = () => {
    setEditing(null);
    setForm({ ad: "", kategori: "Diğer", tekFiyat: 0, paketFiyat: "", paketSeans: "" });
  };
  const save = async () => {
    if (!form.ad.trim()) return toast.error("Ad gerekli");
    const payload = {
      ...form,
      tekFiyat: Number(form.tekFiyat) || 0,
      paketFiyat: form.paketFiyat ? Number(form.paketFiyat) : null,
      paketSeans: form.paketSeans ? Number(form.paketSeans) : null,
      aktif: 1,
    };
    if (editing) await updateHizmet(editing.id, payload);
    else await createHizmet(payload);
    await load();
    touch();
    toast.success("Kaydedildi");
    reset();
  };
  const remove = async (id) => {
    await deleteHizmet(id);
    await load();
    touch();
    toast.success("Silindi");
  };

  const grouped = items.reduce((acc, h) => {
    (acc[h.kategori] = acc[h.kategori] || []).push(h);
    return acc;
  }, {});

  return (
    <Sheet title="Hizmetler" onClose={onClose}>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-secondary space-y-2">
          <div className="text-xs text-muted-foreground">{editing ? "Düzenle" : "Yeni Hizmet"}</div>
          <input placeholder="Ad" className="field" value={form.ad}
            onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          <select className="field" value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
            <option>Lazer Epilasyon</option>
            <option>Cilt Bakımı</option>
            <option>Diğer</option>
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Tek Fiyat" className="field" value={form.tekFiyat}
              onChange={(e) => setForm({ ...form, tekFiyat: e.target.value })} />
            <input type="number" placeholder="Paket Fiyat" className="field" value={form.paketFiyat}
              onChange={(e) => setForm({ ...form, paketFiyat: e.target.value })} />
            <input type="number" placeholder="Seans" className="field" value={form.paketSeans}
              onChange={(e) => setForm({ ...form, paketSeans: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-2 rounded-lg bg-[#cba96e] text-black font-medium text-sm flex items-center justify-center gap-1">
              <Plus className="h-4 w-4" /> {editing ? "Güncelle" : "Ekle"}
            </button>
            {editing && (
              <button onClick={reset} className="flex-1 py-2 rounded-lg bg-background text-sm">Vazgeç</button>
            )}
          </div>
        </div>

        {Object.entries(grouped).map(([kat, list]) => (
          <div key={kat}>
            <div className="text-xs text-[#cba96e] font-semibold mb-1">{kat}</div>
            <div className="space-y-1">
              {list.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-sm">
                  <div>
                    <div>{h.ad}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.tekFiyat ? `${h.tekFiyat}₺` : "—"}
                      {h.paketFiyat ? ` / ${h.paketFiyat}₺ (${h.paketSeans} seans)` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => edit(h)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <ConfirmButton
                      className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center"
                      onConfirm={() => remove(h.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .field { width:100%; background: hsl(var(--input)); border:1px solid hsl(var(--border));
          border-radius: 0.6rem; padding: 0.55rem 0.7rem; color: hsl(var(--foreground));
          outline:none; font-size:13px; }
      `}</style>
    </Sheet>
  );
}
