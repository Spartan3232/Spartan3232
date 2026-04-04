import React, { createContext, useContext, useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import RandevuHasta from "@/pages/RandevuHasta";
import Kasa from "@/pages/Kasa";
import Paketler from "@/pages/Paketler";

export const SaveContext = createContext({ lastSave: null, touch: () => {} });
export const useSave = () => useContext(SaveContext);

export default function App() {
  const [lastSave, setLastSave] = useState(null);
  const touch = useCallback(() => setLastSave(new Date()), []);

  return (
    <SaveContext.Provider value={{ lastSave, touch }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/randevu-hasta" element={<RandevuHasta />} />
          <Route path="/kasa" element={<Kasa />} />
          <Route path="/paketler" element={<Paketler />} />
        </Route>
      </Routes>
    </SaveContext.Provider>
  );
}
