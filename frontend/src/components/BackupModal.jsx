import React, { useRef, useState } from "react";
import Sheet from "@/components/Sheet";
import { yedekExportUrl, yedekImport } from "@/api";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { useSave } from "@/App";

export default function BackupModal({ onClose }) {
  const { touch } = useSave();
  const fileRef = useRef(null);
  const [lastBackup, setLastBackup] = useState(localStorage.getItem("dbeauty_last_backup") || null);

  const doExport = () => {
    const a = document.createElement("a");
    a.href = yedekExportUrl();
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    const ts = new Date().toISOString();
    localStorage.setItem("dbeauty_last_backup", ts);
    setLastBackup(ts);
    toast.success("Yedek indirildi");
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await yedekImport(data);
      touch();
      toast.success("Yedek yüklendi");
      onClose();
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error("Dosya geçersiz");
    }
  };

  return (
    <Sheet title="Yedekleme" onClose={onClose}>
      <div className="space-y-3">
        {lastBackup && (
          <div className="text-xs text-muted-foreground">
            Son yedek: {new Date(lastBackup).toLocaleString("tr-TR")}
          </div>
        )}
        <button onClick={doExport}
          className="w-full py-3 rounded-xl bg-[#cba96e] text-black font-semibold flex items-center justify-center gap-2">
          <Download className="h-4 w-4" /> Dışa Aktar (JSON)
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-xl bg-secondary flex items-center justify-center gap-2">
          <Upload className="h-4 w-4" /> İçe Aktar
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
        <div className="text-xs text-muted-foreground">
          İçe aktarırsanız mevcut tüm veriler yedek dosyasıyla değiştirilir.
        </div>
      </div>
    </Sheet>
  );
}
