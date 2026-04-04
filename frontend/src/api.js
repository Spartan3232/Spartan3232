import axios from "axios";

const BASE = (process.env.REACT_APP_BACKEND_URL || "http://localhost:4000") + "/api";

export const http = axios.create({ baseURL: BASE });

// Hastalar
export const listHastalar = () => http.get("/hastalar").then(r => r.data);
export const getHasta = (id) => http.get(`/hastalar/${id}`).then(r => r.data);
export const createHasta = (data) => http.post("/hastalar", data).then(r => r.data);
export const updateHasta = (id, data) => http.put(`/hastalar/${id}`, data).then(r => r.data);
export const deleteHasta = (id) => http.delete(`/hastalar/${id}`).then(r => r.data);

// Hizmetler
export const listHizmetler = () => http.get("/hizmetler").then(r => r.data);
export const createHizmet = (data) => http.post("/hizmetler", data).then(r => r.data);
export const updateHizmet = (id, data) => http.put(`/hizmetler/${id}`, data).then(r => r.data);
export const deleteHizmet = (id) => http.delete(`/hizmetler/${id}`).then(r => r.data);

// Randevular
export const listRandevular = (tarih) =>
  http.get("/randevular", { params: tarih ? { tarih } : {} }).then(r => r.data);
export const createRandevu = (data) => http.post("/randevular", data).then(r => r.data);
export const updateRandevu = (id, data) => http.put(`/randevular/${id}`, data).then(r => r.data);
export const deleteRandevu = (id) => http.delete(`/randevular/${id}`).then(r => r.data);

// Paketler
export const listPaketler = () => http.get("/paketler").then(r => r.data);
export const createPaket = (data) => http.post("/paketler", data).then(r => r.data);
export const updatePaket = (id, data) => http.put(`/paketler/${id}`, data).then(r => r.data);
export const deletePaket = (id) => http.delete(`/paketler/${id}`).then(r => r.data);
export const seansKullan = (id) => http.post(`/paketler/${id}/seans-kullan`).then(r => r.data);
export const paketTahsilat = (id, tutar, yontem) =>
  http.post(`/paketler/${id}/tahsilat`, { tutar, yontem }).then(r => r.data);

// Islemler
export const listIslemler = (params = {}) =>
  http.get("/islemler", { params }).then(r => r.data);
export const createIslem = (data) => http.post("/islemler", data).then(r => r.data);
export const deleteIslem = (id) => http.delete(`/islemler/${id}`).then(r => r.data);

// Dashboard / Rapor
export const getDashboard = () => http.get("/dashboard").then(r => r.data);
export const getAylikRapor = () => http.get("/rapor/aylik").then(r => r.data);

// Yedek
export const yedekExportUrl = () => BASE + "/yedek/export";
export const yedekImport = (data) => http.post("/yedek/import", data).then(r => r.data);
