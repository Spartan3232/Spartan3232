import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Settings, Database } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ServicesModal from "@/components/ServicesModal";
import BackupModal from "@/components/BackupModal";
import { useSave } from "@/App";
import { format } from "date-fns";

export default function Layout() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const { lastSave } = useSave();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[480px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <h1 className="font-display text-2xl leading-none">
                <span style={{ color: "#cba96e" }}>D'Beauty</span>{" "}
                <span className="text-foreground/80">Center</span>
              </h1>
              {lastSave && (
                <span className="text-[10px] text-emerald-400/80 mt-1">
                  ● Kaydedildi {format(lastSave, "HH:mm")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setServicesOpen(true)}
                className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                title="Hizmetler"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setBackupOpen(true)}
                className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                title="Yedek"
              >
                <Database className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 px-4 pt-3">
          <Outlet />
        </main>

        <BottomNav />

        {servicesOpen && <ServicesModal onClose={() => setServicesOpen(false)} />}
        {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}
      </div>
    </div>
  );
}
