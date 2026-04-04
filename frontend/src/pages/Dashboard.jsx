import React, { useEffect, useState } from "react";
import { getDashboard, listHastalar, updateRandevu } from "@/api";
import { formatTL } from "@/lib/utils";
import { MessageCircle, Check, X as XIcon, CreditCard } from "lucide-react";
import WhatsAppModal from "@/components/WhatsAppModal";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function Dashboard() {
  const { touch } = useSave();
  const [data, setData] = useState(null);
  const [hastalar, setHastalar] = useState([]);
  const [waTarget, setWaTarget] = useState(null);

  const load = async () => {
    const [d, h] = await Promise.all([getDashboard(), listHastalar()]);
    setData(d);
    setHastalar(h);
  };
  useEffect(() => { load(); }, []);

  const hastaOf = (id) => hastalar.find((x) => x.id === id);

  const quickAction = async (r, patch) => {
    await updateRandevu(r.id, { ...r, ...patch });
    touch();
    toast.success("Güncellendi");
    load();
  };

  if (!data) return <div className="text-muted-foreground text-sm">Yükleniyor...</div>;

  const cards = [
    { label: "Bugün Net Kasa", value: formatTL(data.bugunNetKasa), accent: "#cba96e" },
    { label: "Bu Ay Gelir", value: formatTL(data.buAyGelir), accent: "#c07898" },
    { label: "Toplam Alacak", value: formatTL(data.toplamAlacak), accent: "#e0c184" },
    { label: "Hasta Sayısı", value: data.hastaSayisi, accent: "#c07898" },
  ];

  const durumRenk = {
    bekliyor: "bg-blue-500/20 text-blue-300",
    geldi: "bg-emerald-500/20 text-emerald-300",
    gelmedi: "bg-red-500/20 text-red-300",
    iptal: "bg-gray-500/20 text-gray-300",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-card border border-border p-3">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="font-display text-2xl mt-1" style={{ color: c.accent }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-xl mb-2" style={{ color: "#cba96e" }}>Bugünün Randevuları</h2>
        {data.bugunRandevular.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 rounded-lg bg-card border border-border text-center">
            Bugün için randevu yok.
          </div>
        ) : (
          <div className="space-y-2">
            {data.bugunRandevular.map((r) => {
              const h = hastaOf(r.hastaId);
              return (
                <div key={r.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg" style={{ color: "#cba96e" }}>{r.saat}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${durumRenk[r.durum] || ""}`}>
                          {r.durum}
                        </span>
                      </div>
                      <div className="font-medium truncate">{h ? `${h.ad} ${h.soyad}` : "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.hizmetAdi}</div>
                    </div>
                    <button
                      onClick={() => setWaTarget({ hasta: h, randevu: r })}
                      className="h-9 w-9 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <button
                      onClick={() => quickAction(r, { durum: "geldi" })}
                      className="py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs flex items-center justify-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Geldi
                    </button>
                    <button
                      onClick={() => quickAction(r, { durum: "gelmedi" })}
                      className="py-1.5 rounded-lg bg-red-600/20 text-red-300 text-xs flex items-center justify-center gap-1"
                    >
                      <XIcon className="h-3 w-3" /> Gelmedi
                    </button>
                    <button
                      onClick={() => quickAction(r, { odemeDurumu: "odendi", durum: r.durum === "bekliyor" ? "geldi" : r.durum })}
                      className="py-1.5 rounded-lg bg-[#cba96e]/20 text-[#cba96e] text-xs flex items-center justify-center gap-1"
                    >
                      <CreditCard className="h-3 w-3" /> Ödeme
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {waTarget && (
        <WhatsAppModal hasta={waTarget.hasta} randevu={waTarget.randevu} onClose={() => setWaTarget(null)} />
      )}
    </div>
  );
}
