import React, { useEffect, useMemo, useState } from "react";
import {
  listRandevular, listHastalar, updateRandevu, deleteRandevu,
  deleteHasta, listPaketler, listIslemler,
} from "@/api";
import { todayISO, addDays, formatDate, formatTL, gunIfadesi } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Pencil, Trash2, Search, User, CalendarPlus, Package as PackageIcon, CreditCard } from "lucide-react";
import AppointmentModal from "@/components/AppointmentModal";
import PatientModal from "@/components/PatientModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import Sheet from "@/components/Sheet";
import PaketModal from "@/components/PaketModal";
import IslemModal from "@/components/IslemModal";
import ConfirmButton from "@/components/ConfirmButton";
import { toast } from "sonner";
import { useSave } from "@/App";

export default function RandevuHasta() {
  const [tab, setTab] = useState("randevu");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("randevu")}
          className={`py-2 rounded-xl text-sm font-medium ${tab === "randevu" ? "bg-[#cba96e] text-black" : "bg-card border border-border"}`}
        >
          Randevular
        </button>
        <button
          onClick={() => setTab("hasta")}
          className={`py-2 rounded-xl text-sm font-medium ${tab === "hasta" ? "bg-[#cba96e] text-black" : "bg-card border border-border"}`}
        >
          Hastalar
        </button>
      </div>
      {tab === "randevu" ? <RandevularView /> : <HastalarView />}
    </div>
  );
}

function RandevularView() {
  const { touch } = useSave();
  const [tarih, setTarih] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [hastalar, setHastalar] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [wa, setWa] = useState(null);

  const load = async () => {
    const [r, h] = await Promise.all([listRandevular(tarih), listHastalar()]);
    setItems(r);
    setHastalar(h);
  };
  useEffect(() => { load(); }, [tarih]);

  const hastaOf = (id) => hastalar.find((x) => x.id === id);

  const remove = async (id) => {
    await deleteRandevu(id);
    touch();
    toast.success("Silindi");
    load();
  };

  const durumRenk = {
    bekliyor: "bg-blue-500/20 text-blue-300",
    geldi: "bg-emerald-500/20 text-emerald-300",
    gelmedi: "bg-red-500/20 text-red-300",
    iptal: "bg-gray-500/20 text-gray-300",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-2">
        <button onClick={() => setTarih(addDays(tarih, -1))}
          className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-display text-lg" style={{ color: "#cba96e" }}>{formatDate(tarih, "d MMMM")}</div>
          <button className="text-xs text-muted-foreground" onClick={() => setTarih(todayISO())}>
            {gunIfadesi(tarih)} • Bugüne git
          </button>
        </div>
        <button onClick={() => setTarih(addDays(tarih, 1))}
          className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button onClick={() => { setEditing(null); setModalOpen(true); }}
        className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Yeni Randevu
      </button>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 rounded-lg bg-card border border-border text-center">
          Bu tarihte randevu yok.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const h = hastaOf(r.hastaId);
            return (
              <div key={r.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg" style={{ color: "#cba96e" }}>{r.saat}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${durumRenk[r.durum] || ""}`}>{r.durum}</span>
                      {r.odemeDurumu === "odendi" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">ödendi</span>
                      )}
                    </div>
                    <div className="font-medium truncate">{h ? `${h.ad} ${h.soyad}` : "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.hizmetAdi} • {formatTL(r.ucret)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setWa({ hasta: h, randevu: r })}
                      className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setEditing(r); setModalOpen(true); }}
                      className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <ConfirmButton
                      className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center"
                      onConfirm={() => remove(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AppointmentModal
          randevu={editing}
          defaultDate={tarih}
          onClose={() => setModalOpen(false)}
          onSaved={() => load()}
        />
      )}
      {wa && <WhatsAppModal hasta={wa.hasta} randevu={wa.randevu} onClose={() => setWa(null)} />}
    </div>
  );
}

function HastalarView() {
  const { touch } = useSave();
  const [hastalar, setHastalar] = useState([]);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = async () => setHastalar(await listHastalar());
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return hastalar;
    const s = q.toLowerCase();
    return hastalar.filter((h) => `${h.ad} ${h.soyad} ${h.tel}`.toLowerCase().includes(s));
  }, [hastalar, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Ad, soyad veya telefon..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-input border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm"
        />
      </div>
      <button onClick={() => { setEditing(null); setModalOpen(true); }}
        className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Yeni Hasta
      </button>

      <div className="space-y-1">
        {filtered.map((h) => (
          <button key={h.id}
            onClick={() => setDetail(h)}
            className="w-full text-left rounded-xl bg-card border border-border p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-4 w-4 text-[#cba96e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{h.ad} {h.soyad}</div>
              <div className="text-xs text-muted-foreground truncate">{h.tel}</div>
            </div>
            {h.saglikNotu && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">⚠</span>}
          </button>
        ))}
      </div>

      {modalOpen && (
        <PatientModal
          hasta={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => load()}
        />
      )}
      {detail && (
        <PatientDetail
          hasta={detail}
          onClose={() => setDetail(null)}
          onChange={() => { load(); touch(); }}
        />
      )}
    </div>
  );
}

function PatientDetail({ hasta, onClose, onChange }) {
  const [tab, setTab] = useState("ozet");
  const [randevular, setRandevular] = useState([]);
  const [paketler, setPaketler] = useState([]);
  const [islemler, setIslemler] = useState([]);
  const [apptOpen, setApptOpen] = useState(false);
  const [paketOpen, setPaketOpen] = useState(false);
  const [islemOpen, setIslemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    const [r, p, i] = await Promise.all([listRandevular(), listPaketler(), listIslemler()]);
    setRandevular(r.filter((x) => x.hastaId === hasta.id));
    setPaketler(p.filter((x) => x.hastaId === hasta.id));
    setIslemler(i.filter((x) => x.hastaId === hasta.id));
  };
  useEffect(() => { load(); }, [hasta.id]);

  const remove = async () => {
    await deleteHasta(hasta.id);
    toast.success("Hasta silindi");
    onChange();
    onClose();
  };

  const toplamHarcama = islemler.filter((i) => i.tip === "tahsilat").reduce((a, b) => a + (b.tutar || 0), 0);
  const toplamAlacak = paketler.filter((p) => p.durum === "aktif").reduce((a, b) => a + (b.kalanBorc || 0), 0);

  return (
    <Sheet title={`${hasta.ad} ${hasta.soyad}`} onClose={onClose}>
      {hasta.saglikNotu && (
        <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs">
          ⚠ {hasta.saglikNotu}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 mb-3 text-xs">
        {["ozet", "gecmis", "paketler"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 rounded-lg ${tab === t ? "bg-[#cba96e] text-black font-medium" : "bg-secondary"}`}>
            {t === "ozet" ? "Özet" : t === "gecmis" ? "Geçmiş" : "Paketler"}
          </button>
        ))}
      </div>

      {tab === "ozet" && (
        <div className="space-y-2 text-sm">
          <Info label="Telefon" value={hasta.tel || "—"} />
          <Info label="Doğum" value={hasta.dogumTarihi || "—"} />
          <Info label="Kaynak" value={hasta.kaynak || "—"} />
          <Info label="Not" value={hasta.notlar || "—"} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2 rounded-lg bg-secondary">
              <div className="text-xs text-muted-foreground">Toplam Harcama</div>
              <div className="font-semibold gold">{formatTL(toplamHarcama)}</div>
            </div>
            <div className="p-2 rounded-lg bg-secondary">
              <div className="text-xs text-muted-foreground">Kalan Borç</div>
              <div className="font-semibold rose">{formatTL(toplamAlacak)}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "gecmis" && (
        <div className="space-y-1 text-sm">
          {randevular.length === 0 && <div className="text-muted-foreground text-xs">Henüz randevu yok.</div>}
          {randevular.map((r) => (
            <div key={r.id} className="p-2 rounded-lg bg-card border border-border">
              <div className="flex justify-between">
                <span>{formatDate(r.tarih)} {r.saat}</span>
                <span className="text-xs text-muted-foreground">{r.durum}</span>
              </div>
              <div className="text-xs text-muted-foreground">{r.hizmetAdi} • {formatTL(r.ucret)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "paketler" && (
        <div className="space-y-1 text-sm">
          {paketler.length === 0 && <div className="text-muted-foreground text-xs">Paket yok.</div>}
          {paketler.map((p) => (
            <div key={p.id} className="p-2 rounded-lg bg-card border border-border">
              <div className="flex justify-between">
                <span>{p.hizmetAdi}</span>
                <span className="text-xs">{p.kalanSeans}/{p.toplamSeans}</span>
              </div>
              <div className="text-xs text-muted-foreground">Borç: {formatTL(p.kalanBorc)} • {p.durum}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => setApptOpen(true)} className="py-2 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1">
          <CalendarPlus className="h-3 w-3" /> Randevu Ekle
        </button>
        <button onClick={() => setPaketOpen(true)} className="py-2 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1">
          <PackageIcon className="h-3 w-3" /> Paket Sat
        </button>
        <button onClick={() => setIslemOpen(true)} className="py-2 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1">
          <CreditCard className="h-3 w-3" /> Borç Tahsil
        </button>
        <button onClick={() => setEditOpen(true)} className="py-2 rounded-lg bg-secondary text-xs flex items-center justify-center gap-1">
          <Pencil className="h-3 w-3" /> Düzenle
        </button>
      </div>
      <ConfirmButton
        className="mt-2 w-full py-2 rounded-lg bg-red-600/20 text-red-400 text-xs"
        onConfirm={remove}
      >
        Sil
      </ConfirmButton>

      {apptOpen && (
        <AppointmentModal defaultHastaId={hasta.id} onClose={() => setApptOpen(false)} onSaved={() => { load(); onChange(); }} />
      )}
      {paketOpen && (
        <PaketModal defaultHastaId={hasta.id} onClose={() => setPaketOpen(false)} onSaved={() => { load(); onChange(); }} />
      )}
      {islemOpen && (
        <IslemModal tip="tahsilat" onClose={() => setIslemOpen(false)} onSaved={() => { load(); onChange(); }} />
      )}
      {editOpen && (
        <PatientModal hasta={hasta} onClose={() => setEditOpen(false)} onSaved={() => { onChange(); setEditOpen(false); }} />
      )}
    </Sheet>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
