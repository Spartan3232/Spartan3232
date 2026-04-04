import React, { useState } from "react";
import Sheet from "@/components/Sheet";
import { phoneToWa, gunIfadesi } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";

export default function WhatsAppModal({ hasta, randevu, onClose }) {
  const defaultMsg = `Merhaba ${hasta?.ad || ""}, ${gunIfadesi(randevu?.tarih)} saat ${randevu?.saat || ""}'deki ${randevu?.hizmetAdi || ""} randevunuzu hatırlatmak isterim. D'Beauty Center 💛`;
  const [msg, setMsg] = useState(defaultMsg);

  const wa = phoneToWa(hasta?.tel);
  const send = () => {
    if (!wa) return toast.error("Telefon yok");
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };
  const copy = async () => {
    await navigator.clipboard.writeText(msg);
    toast.success("Kopyalandı");
  };

  return (
    <Sheet title="WhatsApp Hatırlatma" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Alıcı: <span className="text-foreground">{hasta?.ad} {hasta?.soyad}</span>
          {hasta?.tel && <span className="ml-2">({hasta.tel})</span>}
        </div>
        <textarea
          rows={6}
          className="w-full bg-input border border-border rounded-lg p-3 text-sm"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="py-3 rounded-xl bg-secondary flex items-center justify-center gap-2">
            <Copy className="h-4 w-4" /> Kopyala
          </button>
          <button onClick={send} className="py-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> WhatsApp'ta Gönder
          </button>
        </div>
      </div>
    </Sheet>
  );
}
