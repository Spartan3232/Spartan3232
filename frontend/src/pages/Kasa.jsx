import React, { useEffect, useMemo, useState } from "react";
import { listIslemler, deleteIslem, getAylikRapor } from "@/api";
import { formatTL, todayISO, formatDate } from "@/lib/utils";
import { Plus, X as XIcon, TrendingUp, TrendingDown } from "lucide-react";
import IslemModal from "@/components/IslemModal";
import ConfirmButton from "@/components/ConfirmButton";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function Kasa() {
  const [tab, setTab] = useState("bugun");
  const [islemModal, setIslemModal] = useState(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1">
        {[
          ["bugun", "Bugün"],
          ["ay", "Bu Ay"],
          ["rapor", "Aylık Rapor"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`py-2 rounded-xl text-xs font-medium ${tab === k ? "bg-[#cba96e] text-black" : "bg-card border border-border"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab !== "rapor" && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIslemModal("tahsilat")}
            className="py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1">
            <Plus className="h-4 w-4" /> Gelir
          </button>
          <button onClick={() => setIslemModal("gider")}
            className="py-3 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-1">
            <Plus className="h-4 w-4" /> Gider
          </button>
        </div>
      )}

      {tab === "bugun" && <IslemlerList params={{ tarih: todayISO() }} />}
      {tab === "ay" && <IslemlerList params={{ ay: new Date().toISOString().slice(0, 7) }} />}
      {tab === "rapor" && <AylikRapor />}

      {islemModal && (
        <IslemModal tip={islemModal} onClose={() => setIslemModal(null)} onSaved={() => setIslemModal(null)} />
      )}
    </div>
  );
}

function IslemlerList({ params }) {
  const { touch } = useSave();
  const [items, setItems] = useState([]);

  const load = async () => setItems(await listIslemler(params));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(params)]);

  const remove = async (id) => {
    await deleteIslem(id);
    touch();
    toast.success("Silindi");
    load();
  };

  const gelir = items.filter((i) => i.tip === "tahsilat").reduce((a, b) => a + (b.tutar || 0), 0);
  const gider = items.filter((i) => i.tip === "gider").reduce((a, b) => a + (b.tutar || 0), 0);
  const net = gelir - gider;

  const byYontem = useMemo(() => {
    const m = { nakit: 0, kart: 0, havale: 0 };
    items.filter((i) => i.tip === "tahsilat").forEach((i) => {
      m[i.yontem || "nakit"] = (m[i.yontem || "nakit"] || 0) + (i.tutar || 0);
    });
    return m;
  }, [items]);
  const maxY = Math.max(1, ...Object.values(byYontem));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Gelir" value={formatTL(gelir)} color="text-emerald-400" />
        <Stat label="Gider" value={formatTL(gider)} color="text-red-400" />
        <Stat label="Net" value={formatTL(net)} color="text-[#cba96e]" />
      </div>

      <div className="rounded-xl bg-card border border-border p-3">
        <div className="text-xs text-muted-foreground mb-2">Ödeme Yöntemi Dağılımı</div>
        <div className="space-y-2">
          {Object.entries(byYontem).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize">{k}</span>
                <span>{formatTL(v)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-[#cba96e]" style={{ width: `${(v / maxY) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 rounded-lg bg-card border border-border text-center">
            Kayıt yok.
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${i.tip === "tahsilat" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {i.tip === "tahsilat" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{i.kategori} {i.aciklama ? `— ${i.aciklama}` : ""}</div>
              <div className="text-xs text-muted-foreground">{formatDate(i.tarih)} • {i.yontem}</div>
            </div>
            <div className={`font-semibold ${i.tip === "tahsilat" ? "text-emerald-400" : "text-red-400"}`}>
              {i.tip === "tahsilat" ? "+" : "-"}{formatTL(i.tutar)}
            </div>
            <ConfirmButton
              className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center"
              onConfirm={() => remove(i.id)}
            >
              <XIcon className="h-3.5 w-3.5" />
            </ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-xl bg-card border border-border p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${color}`}>{value}</div>
    </div>
  );
}

function AylikRapor() {
  const [data, setData] = useState([]);
  useEffect(() => { getAylikRapor().then(setData); }, []);

  const max = Math.max(1, ...data.map((d) => Math.max(d.gelir, d.gider)));
  const toplamGelir = data.reduce((a, b) => a + b.gelir, 0);
  const toplamGider = data.reduce((a, b) => a + b.gider, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="12A Gelir" value={formatTL(toplamGelir)} color="text-emerald-400" />
        <Stat label="12A Gider" value={formatTL(toplamGider)} color="text-red-400" />
        <Stat label="Net" value={formatTL(toplamGelir - toplamGider)} color="text-[#cba96e]" />
      </div>
      <div className="rounded-xl bg-card border border-border p-3">
        <div className="text-xs text-muted-foreground mb-2">Son 12 Ay</div>
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.ay}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span>{d.ay}</span>
                <span className="gold">{formatTL(d.net)}</span>
              </div>
              <div className="flex gap-1 h-3">
                <div className="bg-emerald-500/70 rounded-sm" style={{ width: `${(d.gelir / max) * 50}%` }} />
                <div className="bg-red-500/70 rounded-sm" style={{ width: `${(d.gider / max) * 50}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
