import { useEffect, useMemo, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Toaster, toast } from "@/components/ui/sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const leaguesBySport = {
  football: ["EPL", "La Liga", "Süper Lig", "UEFA"],
  basketball: ["NBA", "EuroLeague", "BSL"],
};

const fmtPct = (p) => (p === null || p === undefined ? "-" : `${Math.round(p * 100)}%`);
const implied = (odds) => (odds && Number(odds) > 0 ? 1 / Number(odds) : null);
const valueColor = (delta) => {
  if (delta === null || delta === undefined) return "text-neutral-400";
  if (delta >= 0.08) return "text-emerald-400";
  if (delta >= 0.05) return "text-emerald-300";
  if (delta <= -0.05) return "text-rose-400";
  return "text-amber-400";
};
const relTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

const Dashboard = () => {
  const [sport, setSport] = useState("football");
  const [league, setLeague] = useState("EPL");
  const [fixtures, setFixtures] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [dateValue, setDateValue] = useState(new Date());
  const [training, setTraining] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [openOddsUuid, setOpenOddsUuid] = useState(null);
  const [openModelDrawer, setOpenModelDrawer] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [predMap, setPredMap] = useState({}); // uuid->prediction

  // Value filter/sort controls persisted
  const [valueFilterEnabled, setValueFilterEnabled] = useState(false);
  const [valueThreshold, setValueThreshold] = useState(0.05);
  const [sortBy, setSortBy] = useState("max"); // max | ev | time
  const [outcomeScope, setOutcomeScope] = useState("all"); // all | home | draw | away

  // Auto refresh controls
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(15);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const timerRef = useRef(null);
  const failureRef = useRef(0);
  const lastOddsMaxRef = useRef(null);

  // Load persisted prefs
  useEffect(() => {
    try {
      const vf = localStorage.getItem("pref_value_filter_enabled");
      const vt = localStorage.getItem("pref_value_threshold");
      const sb = localStorage.getItem("pref_sort_by");
      const os = localStorage.getItem("pref_outcome_scope");
      const ar = localStorage.getItem("pref_auto_refresh");
      const rm = localStorage.getItem("pref_refresh_minutes");
      if (vf !== null) setValueFilterEnabled(vf === "true");
      if (vt !== null) setValueThreshold(parseFloat(vt));
      if (sb) setSortBy(sb);
      if (os) setOutcomeScope(os);
      if (ar !== null) setAutoRefresh(ar === "true");
      if (rm !== null) setRefreshMinutes(parseInt(rm, 10));
    } catch {}
  }, []);

  // Persist prefs
  useEffect(() => { try { localStorage.setItem("pref_value_filter_enabled", String(valueFilterEnabled)); } catch {} }, [valueFilterEnabled]);
  useEffect(() => { try { localStorage.setItem("pref_value_threshold", String(valueThreshold)); } catch {} }, [valueThreshold]);
  useEffect(() => { try { localStorage.setItem("pref_sort_by", String(sortBy)); } catch {} }, [sortBy]);
  useEffect(() => { try { localStorage.setItem("pref_outcome_scope", String(outcomeScope)); } catch {} }, [outcomeScope]);
  useEffect(() => { try { localStorage.setItem("pref_auto_refresh", String(autoRefresh)); } catch {} }, [autoRefresh]);
  useEffect(() => { try { localStorage.setItem("pref_refresh_minutes", String(refreshMinutes)); } catch {} }, [refreshMinutes]);

  const yyyyMmDd = (d) => new Date(d).toISOString().slice(0, 10);

  const loadFixtures = async (opts = {}) => {
    try {
      const date = yyyyMmDd(dateValue);
      const headers = {};
      if (lastUpdated) headers["If-Modified-Since"] = lastUpdated;
      let res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date }, headers });
      if (!res.data || res.data.length === 0 || opts.forceLive) {
        await axios.get(`${API}/fixtures`, { params: { sport, league, date } });
        res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date }, headers });
      }
      setFixtures(res.data);
      setPredMap((prev) => (opts.keepPreds ? prev : {}));
      const maxOddsISO = getMaxOddsCollected(res.data);
      if (maxOddsISO && maxOddsISO !== lastOddsMaxRef.current) {
        if (lastOddsMaxRef.current) toast.success("Odds updated");
        lastOddsMaxRef.current = maxOddsISO;
      }
      const nowISO = new Date().toISOString();
      setLastUpdated(nowISO);
    } catch (e) {
      console.error("Failed to load fixtures", e);
    }
  };

  const loadModelStatus = async () => {
    try {
      const res = await axios.get(`${API}/model/status`, { params: { sport, league } });
      setModelStatus(res.data);
    } catch (e) {
      setModelStatus(null);
    }
  };

  useEffect(() => {
    loadFixtures();
    loadModelStatus();
  }, [sport, league, dateValue]);

  const fetchOdds = async () => {
    try {
      const date = yyyyMmDd(dateValue);
      const t = toast.loading("Fetching odds...");
      await axios.post(`${API}/fixtures/odds/fetch`, null, { params: { sport, league, date } });
      toast.success("Odds updated", { id: t });
      await loadFixtures({ keepPreds: true });
    } catch (e) {
      toast.error("Failed to fetch odds");
    }
  };

  const ensurePredictionsForFixtures = async () => {
    if (!(heatmap || valueFilterEnabled)) return;
    const copy = { ...predMap };
    for (const fx of fixtures) {
      const key = fx.uuid || fx.id;
      if (copy[key]) continue;
      try {
        const body = fx.uuid ? { fixture_uuid: fx.uuid } : { sport, league, home: fx.home, away: fx.away };
        const res = await axios.post(`${API}/model/predict`, body);
        copy[key] = res.data;
        await new Promise(r => setTimeout(r, 120));
      } catch (e) {
        // ignore
      }
    }
    setPredMap(copy);
  };

  useEffect(() => {
    ensurePredictionsForFixtures();
  }, [heatmap, valueFilterEnabled, fixtures]);

  const handlePredict = async (fx) => {
    try {
      if (!modelStatus || !modelStatus.trained) {
        toast("No trained model yet — falling back if needed");
      }
      const body = fx.uuid ? { fixture_uuid: fx.uuid } : { sport, league, home: fx.home, away: fx.away };
      const res = await axios.post(`${API}/model/predict`, body);
      setSelectedFixture({ home: fx.home, away: fx.away, uuid: fx.uuid || fx.id });
      setPrediction(res.data);
      setPredMap({ ...(predMap||{}), [fx.uuid || fx.id]: res.data });
      setExplanation(null);
      if (res.data.source === "model") {
        toast.success("Model prediction ready");
      } else {
        toast("Baseline prediction used");
      }
    } catch (e) {
      console.error("Prediction failed", e);
      toast.error("Prediction failed");
    }
  };

  const handleExplain = async (fx) => {
    try {
      const id = fx.uuid || fx.id;
      const res = await axios.post(`${API}/explain`, { fixture_id: id });
      setExplanation(res.data);
    } catch (e) {
      console.error("Explain failed", e);
    }
  };

  const trainModel = async () => {
    const t = toast.loading("Training model...");
    try {
      setTraining(true);
      await axios.post(`${API}/model/train`, { sport, league, horizon_days: 14 });
      await loadModelStatus();
      toast.success("Training completed", { id: t });
    } catch (e) {
      console.error("Training failed", e);
      const msg = e?.response?.data?.detail || "Training failed";
      toast.error(msg, { id: t });
    } finally {
      setTraining(false);
    }
  };

  const leagueOptions = useMemo(() => leaguesBySport[sport] || [], [sport]);

  const modelMetric = useMemo(() => {
    if (!modelStatus?.metrics) return null;
    return sport === 'football' ? modelStatus.metrics.acc : modelStatus.metrics.auc;
  }, [modelStatus, sport]);

  const sidesForScope = (scope) => (scope === 'all' ? ['home', ...(sport === 'football' ? ['draw'] : []), 'away'] : [scope]);

  const ev = (p, odds) => (p == null || odds == null) ? null : (p * (Number(odds) - 1) - (1 - p));

  const computeBestValue = (fx, scope = outcomeScope) => {
    const ml = fx?.odds?.markets?.moneyline;
    if (!ml) return null;
    const pred = predMap[fx.uuid || fx.id];
    if (!pred) return null;
    const sides = sidesForScope(scope);
    let best = { side: null, delta: -Infinity, odds: null, p: null, ev: null };
    for (const s of sides) {
      const p = s === 'home' ? pred.home_win_prob : s === 'draw' ? pred.draw_prob : pred.away_win_prob;
      const o = ml[s];
      const imp = implied(o);
      if (p == null || imp == null) continue;
      const delta = p - imp;
      const ev1 = ev(p, o);
      if (delta > best.delta) best = { side: s.toUpperCase(), delta, odds: o, p, ev: ev1 };
    }
    if (best.side === null) return null;
    return best;
  };

  const rowHeatClass = (fx) => {
    if (!heatmap) return "";
    const best = computeBestValue(fx);
    if (!best) return "";
    if (best.delta >= 0.08) return "bg-emerald-600/10";
    if (best.delta >= 0.05) return "bg-emerald-500/10";
    if (best.delta > -0.05 && best.delta < 0.05) return "bg-amber-500/10";
    return "";
  };

  const ValueTag = ({ fx }) => {
    const best = computeBestValue(fx);
    if (!best || best.delta < 0.05) return null;
    const deltaPct = Math.round(best.delta * 100);
    const p = best.p, o = best.odds;
    const ev1 = ev(p, o);
    const shape = best.delta >= 0.08 ? '▲' : best.delta <= -0.05 ? '■' : '●';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-700/40 cursor-default" data-testid="best-value-tag">
              {shape} Best Value: {best.side} (+{deltaPct}%)
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Model p: {p?.toFixed ? p.toFixed(3) : p}</div>
              <div>Implied p: {implied(o)?.toFixed(3)}</div>
              <div>Odds: {o}</div>
              <div>EV(1u): {ev1?.toFixed ? ev1.toFixed(3) : ev1}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const ModelPill = () => {
    if (!modelStatus?.trained) return null;
    const ver = modelStatus.version;
    const metric = modelMetric != null ? `${Math.round(modelMetric * 100)}%` : "-";
    return (
      <Drawer open={openModelDrawer} onOpenChange={setOpenModelDrawer}>
        <DrawerTrigger asChild>
          <button className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-neutral-700 hover:bg-white/10" data-testid="model-pill-btn">
            Model v{ver} · {sport === 'football' ? 'ACC' : 'AUC'} {metric} · Trained {relTime(modelStatus.created_at)}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle data-testid="model-drawer-title">Model Status</DrawerTitle>
            <DrawerDescription>Latest model for {sport.toUpperCase()} • {league}</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-3">
            <div className="text-sm" data-testid="model-drawer-id">Model ID: <span className="font-mono">{modelStatus.model_id}</span>
              <Button size="sm" variant="outline" className="ml-2" data-testid="copy-model-id-btn" onClick={() => { navigator.clipboard.writeText(modelStatus.model_id); toast.success('Copied model id'); }}>Copy</Button>
            </div>
            <div className="text-sm">Version: {modelStatus.version}</div>
            <div className="text-sm">Seasons: {Array.isArray(modelStatus.seasons) ? modelStatus.seasons.join(', ') : '-'}</div>
            <div className="text-sm">Samples: {modelStatus.samples ?? '-'}</div>
            {modelStatus.metrics && (
              <div className="text-sm space-y-1">
                {modelStatus.metrics.acc !== undefined && <div>ACC: {modelStatus.metrics.acc?.toFixed ? modelStatus.metrics.acc.toFixed(3) : modelStatus.metrics.acc}</div>}
                {modelStatus.metrics.auc !== undefined && <div>AUC: {modelStatus.metrics.auc?.toFixed ? modelStatus.metrics.auc.toFixed(3) : modelStatus.metrics.auc}</div>}
                {modelStatus.metrics.acc_cv_mean !== undefined && <div>ACC (CV): {modelStatus.metrics.acc_cv_mean?.toFixed ? modelStatus.metrics.acc_cv_mean.toFixed(3) : modelStatus.metrics.acc_cv_mean}</div>}
                {modelStatus.metrics.auc_cv_mean !== undefined && <div>AUC (CV): {modelStatus.metrics.auc_cv_mean?.toFixed ? modelStatus.metrics.auc_cv_mean.toFixed(3) : modelStatus.metrics.auc_cv_mean}</div>}
              </div>
            )}
            {Array.isArray(modelStatus.features_top) && modelStatus.features_top.length > 0 && (
              <div className="text-sm" data-testid="drawer-top-features">
                <div className="font-medium mb-1">Top 5 Features</div>
                <ul className="list-disc ml-5">
                  {modelStatus.features_top.slice(0,5).map((f, i) => (
                    <li key={i}>{f.name}: {typeof f.importance === 'number' ? f.importance.toFixed(3) : f.importance}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="pb-4 px-6"><DrawerClose asChild><Button variant="outline" data-testid="close-model-drawer">Close</Button></DrawerClose></div>
        </DrawerContent>
      </Drawer>
    );
  };

  const OddsDrawer = ({ fx }) => {
    const odds = fx?.odds;
    if (!odds) return null;
    const snapshots = fx?.odds_snapshots || odds?.snapshots || [];

    const Spark = ({ data, color }) => {
      if (!Array.isArray(data) || data.length < 2) return null;
      const w = 160, h = 40, pad = 4;
      const xs = data.map((v, i) => [i, Number(v) || 0]);
      const ys = xs.map(([,y]) => y);
      const ymin = Math.min(...ys), ymax = Math.max(...ys);
      const normY = (y) => h - pad - ((y - ymin) / (ymax - ymin || 1)) * (h - 2*pad);
      const points = xs.map(([i,y]) => ({ x: (i/(xs.length-1))*(w-2*pad)+pad, y: normY(y), yVal: y }));
      return (
        <svg width={w} height={h} className="block">
          <path d={points.map((p,idx)=>`${idx===0?'M':'L'} ${p.x} ${p.y}`).join(' ')} stroke={color} strokeWidth="2" fill="none"/>
          {points.map((p,idx)=> (<circle key={idx} cx={p.x} cy={p.y} r="2" fill={color}>
            <title>{new Date(odds.collected_at).toLocaleString()} • {p.yVal}</title>
          </circle>))}
        </svg>
      );
    };

    return (
      <Drawer open={openOddsUuid === (fx.uuid || fx.id)} onOpenChange={(o)=> setOpenOddsUuid(o ? (fx.uuid || fx.id) : null)}>
        <DrawerTrigger asChild>
          <Button size="sm" variant="outline" data-testid={`odds-drawer-btn-${(fx.uuid || fx.id)}`}>Odds</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle data-testid="odds-drawer-title">Odds • {fx.home} vs {fx.away}</DrawerTitle>
            <DrawerDescription>Provider: {odds.provider} • Collected: {new Date(odds.collected_at).toLocaleString()}</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-4 text-sm">
            {odds.markets?.moneyline && (
              <div data-testid="odds-moneyline-panel">
                <div className="font-medium mb-1">Moneyline</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>Home: {odds.markets.moneyline.home ?? '-'} ({fmtPct(implied(odds.markets.moneyline.home))})</div>
                  {sport === 'football' && <div>Draw: {odds.markets.moneyline.draw ?? '-'} ({fmtPct(implied(odds.markets.moneyline.draw))})</div>}
                  <div>Away: {odds.markets.moneyline.away ?? '-'} ({fmtPct(implied(odds.markets.moneyline.away))})</div>
                </div>
              </div>
            )}
            {odds.markets?.spread && (
              <div data-testid="odds-spread-panel">
                <div className="font-medium mb-1">Spread</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>Line: {odds.markets.spread.line ?? '-'}</div>
                  <div>Home: {odds.markets.spread.home ?? '-'}</div>
                  <div>Away: {odds.markets.spread.away ?? '-'}</div>
                </div>
              </div>
            )}
            {odds.markets?.totals && (
              <div data-testid="odds-totals-panel">
                <div className="font-medium mb-1">Totals</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>Line: {odds.markets.totals.line ?? '-'}</div>
                  <div>Over: {odds.markets.totals.over ?? '-'}</div>
                  <div>Under: {odds.markets.totals.under ?? '-'}</div>
                </div>
              </div>
            )}
            {Array.isArray(snapshots) && snapshots.length > 0 && (
              <div data-testid="odds-sparkline">
                <div className="font-medium mb-1">Line Movement</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Home</div>
                    <Spark data={snapshots.map(s=> s?.markets?.moneyline?.home).filter(Boolean)} color="#34d399" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Away</div>
                    <Spark data={snapshots.map(s=> s?.markets?.moneyline?.away).filter(Boolean)} color="#f87171" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="pb-4 px-6"><DrawerClose asChild><Button variant="outline" data-testid="close-odds-drawer">Close</Button></DrawerClose></div>
        </DrawerContent>
      </Drawer>
    );
  };

  // Derive filtered/sorted fixtures
  const enhancedFixtures = useMemo(() => {
    const total = fixtures.length;
    let rows = fixtures.map(fx => {
      const best = computeBestValue(fx);
      return { fx, best };
    });

    if (valueFilterEnabled) {
      rows = rows.filter(r => {
        if (!r.best) return false;
        return r.best.delta >= valueThreshold;
      });
    }

    if (sortBy === 'max') {
      rows.sort((a,b) => (b.best?.delta ?? -Infinity) - (a.best?.delta ?? -Infinity));
    } else if (sortBy === 'ev') {
      rows.sort((a,b) => (b.best?.ev ?? -Infinity) - (a.best?.ev ?? -Infinity));
    } else {
      rows.sort((a,b) => new Date(a.fx.date_utc || a.fx.kickoff) - new Date(b.fx.date_utc || b.fx.kickoff));
    }

    return { total, rows };
  }, [fixtures, valueFilterEnabled, valueThreshold, sortBy, predMap, outcomeScope]);

  // Auto-refresh scheduler
  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!autoRefresh || training || !pageVisible) return;

    const run = async () => {
      try {
        const date = yyyyMmDd(dateValue);
        // fetch odds then db
        await axios.post(`${API}/fixtures/odds/fetch`, null, { params: { sport, league, date } });
        const headers = {};
        if (lastUpdated) headers["If-Modified-Since"] = lastUpdated;
        const res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } , headers});
        const oldMax = lastOddsMaxRef.current;
        const newMax = getMaxOddsCollected(res.data);
        if (newMax && newMax !== oldMax) {
          lastOddsMaxRef.current = newMax;
          toast.success("Odds updated");
        }
        setFixtures(res.data);
        setRefreshCount(c => c + 1);
        setLastUpdated(new Date().toISOString());
        failureRef.current = 0;
      } catch (e) {
        failureRef.current = Math.min(5, failureRef.current + 1);
      }

      const base = refreshMinutes * 60 * 1000;
      const jitter = 1 + (Math.random() * 0.4 - 0.2); // ±20%
      const backoff = Math.pow(2, failureRef.current);
      const delay = Math.min(base * jitter * backoff, 60 * 60 * 1000); // cap at 60m
      timerRef.current = setTimeout(run, delay);
    };

    // initial schedule
    timerRef.current = setTimeout(run, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoRefresh, training, pageVisible, sport, league, dateValue, refreshMinutes]);

  function getMaxOddsCollected(list) {
    let maxISO = null;
    for (const fx of list || []) {
      const iso = fx?.odds?.collected_at;
      if (iso && (!maxISO || iso > maxISO)) maxISO = iso;
    }
    return maxISO;
  }

  return (
    <div className="min-h-screen bg-[#0b0d0e] text-white">
      <Toaster />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight" data-testid="app-title">SportOracle</h1>
          <p className="text-neutral-300 mt-2" data-testid="app-subtitle">Real-time analysis and AI predictions for Football and Basketball</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2 bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Fixtures</CardTitle>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2" data-testid="value-heatmap-toggle">
                    <Switch checked={heatmap} onCheckedChange={setHeatmap} />
                    <span className="text-sm text-neutral-300">Color rows by best value</span>
                  </div>
                  <div className="hidden md:flex items-center gap-2" data-testid="auto-refresh-toggle">
                    <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                    <span className="text-sm text-neutral-300">Auto-refresh</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2" data-testid="value-filter-toggle">
                  <Switch checked={valueFilterEnabled} onCheckedChange={setValueFilterEnabled} />
                  <span className="text-sm text-neutral-300">Show only edges ≥ {Math.round(valueThreshold*100)}%</span>
                </div>
                <div className="w-48" data-testid="threshold-slider">
                  <Slider value={[valueThreshold]} min={0} max={0.15} step={0.01} onValueChange={(v)=> setValueThreshold(parseFloat(v[0]))} />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]" data-testid="sort-select"><SelectValue placeholder="Sort by"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="max" data-testid="sort-opt-max">By max edge (desc)</SelectItem>
                    <SelectItem value="ev" data-testid="sort-opt-ev">By EV (desc)</SelectItem>
                    <SelectItem value="time" data-testid="sort-opt-time">By start time</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={outcomeScope} onValueChange={setOutcomeScope}>
                  <SelectTrigger className="w-[160px]" data-testid="outcome-select"><SelectValue placeholder="Scope"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="scope-all">All</SelectItem>
                    <SelectItem value="home" data-testid="scope-home">Home</SelectItem>
                    {sport === 'football' && <SelectItem value="draw" data-testid="scope-draw">Draw</SelectItem>}
                    <SelectItem value="away" data-testid="scope-away">Away</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2" data-testid="auto-refresh-minutes-select">
                  <span className="text-sm text-neutral-400">Every</span>
                  <Select value={String(refreshMinutes)} onValueChange={(v)=> setRefreshMinutes(parseInt(v,10))}>
                    <SelectTrigger className="w-[90px]"><SelectValue placeholder="15m"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-neutral-500" data-testid="last-updated-label">Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '-'}</div>
                <div className="text-xs text-neutral-500" data-testid="filtered-count-label">Filtered: {enhancedFixtures.rows.length} of {enhancedFixtures.total}</div>
              </div>
              <div className="flex gap-3 items-center">
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger className="w-[140px]" data-testid="sport-select">
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football" data-testid="sport-opt-football">Football</SelectItem>
                    <SelectItem value="basketball" data-testid="sport-opt-basketball">Basketball</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={league} onValueChange={setLeague}>
                  <SelectTrigger className="w-[160px]" data-testid="league-select">
                    <SelectValue placeholder="League" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagueOptions.map((lg) => (
                      <SelectItem key={lg} value={lg} data-testid={`league-opt-${lg}`}>{lg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={()=> loadFixtures({ keepPreds: true })} variant="secondary" data-testid="refresh-fixtures-btn">Refresh</Button>
                <Button onClick={fetchOdds} variant="outline" data-testid="fetch-odds-btn">Fetch Odds</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enhancedFixtures.rows.length === 0 && (
                  <div className="text-neutral-400" data-testid="no-fixtures-msg">No fixtures found for selection</div>
                )}
                {enhancedFixtures.rows.map(({ fx, best }) => {
                  const useModel = modelStatus?.trained;
                  const ml = fx?.odds?.markets?.moneyline;
                  const shape = best ? (best.delta >= 0.08 ? '▲' : best.delta <= -0.05 ? '■' : '●') : null;
                  return (
                    <div key={fx.uuid || fx.id} className={`rounded-lg border border-neutral-800 p-4 hover:bg-white/5 ${rowHeatClass(fx)}`} data-testid={`fixture-${fx.uuid || fx.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{fx.home} vs {fx.away}</div>
                            {useModel && <ModelPill />}
                            <ValueTag fx={fx} />
                          </div>
                          <div className="text-neutral-400 text-sm">{fx.league} • {new Date(fx.date_utc || fx.kickoff).toLocaleString()}</div>
                          {ml && (
                            <div className="mt-2 text-xs text-neutral-300 space-y-1" data-testid="fixture-odds-summary">
                              <div className="flex gap-4 flex-wrap">
                                <span>ML H: {ml.home ?? '-'} {best?.side === 'HOME' && shape && <span title="best side" className="ml-1">{shape}</span>}</span>
                                {sport === 'football' && <span>Draw: {ml.draw ?? '-'} {best?.side === 'DRAW' && shape && <span title="best side" className="ml-1">{shape}</span>}</span>}
                                <span>ML A: {ml.away ?? '-'} {best?.side === 'AWAY' && shape && <span title="best side" className="ml-1">{shape}</span>}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <OddsDrawer fx={fx} />
                          <Button size="sm" onClick={() => handlePredict(fx)} data-testid={`predict-btn-${fx.uuid || fx.id}`}>Predict</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExplain(fx)} data-testid={`explain-btn-${fx.uuid || fx.id}`}>Explain</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800">
              <CardHeader>
                <CardTitle className="text-lg">Filter by date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar mode="single" selected={dateValue} onSelect={setDateValue} className="rounded-md border border-neutral-800" data-testid="date-calendar" />
              </CardContent>
            </Card>

            <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="model-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Model</CardTitle>
                  <Button size="sm" onClick={trainModel} disabled={training} data-testid="train-model-btn">
                    {training ? "Training..." : "Train Model"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!modelStatus || !modelStatus.trained ? (
                  <div className="text-neutral-400" data-testid="model-status-empty">No trained model yet for {sport.toUpperCase()} • {league}</div>
                ) : (
                  <div className="space-y-2" data-testid="model-status">
                    <div className="text-sm text-neutral-400">Model ID: {modelStatus.model_id}</div>
                    <div className="text-xs text-neutral-500">Version: {modelStatus.version} • Seasons: {Array.isArray(modelStatus.seasons) ? modelStatus.seasons.join(', ') : '-' } • Samples: {modelStatus.samples ?? '-'}</div>
                    {modelStatus.metrics && (
                      <div className="text-sm">
                        {modelStatus.metrics.acc !== undefined && (
                          <div data-testid="model-acc">ACC: {modelStatus.metrics.acc?.toFixed ? modelStatus.metrics.acc.toFixed(3) : modelStatus.metrics.acc}</div>
                        )}
                        {modelStatus.metrics.auc !== undefined && (
                          <div data-testid="model-auc">AUC: {modelStatus.metrics.auc?.toFixed ? modelStatus.metrics.auc.toFixed(3) : modelStatus.metrics.auc}</div>
                        )}
                        {modelStatus.metrics.acc_cv_mean !== undefined && (
                          <div data-testid="model-acc-cv">ACC (CV): {modelStatus.metrics.acc_cv_mean?.toFixed ? modelStatus.metrics.acc_cv_mean.toFixed(3) : modelStatus.metrics.acc_cv_mean}</div>
                        )}
                        {modelStatus.metrics.auc_cv_mean !== undefined && (
                          <div data-testid="model-auc-cv">AUC (CV): {modelStatus.metrics.auc_cv_mean?.toFixed ? modelStatus.metrics.auc_cv_mean.toFixed(3) : modelStatus.metrics.auc_cv_mean}</div>
                        )}
                      </div>
                    )}
                    {Array.isArray(modelStatus.features_top) && modelStatus.features_top.length > 0 && (
                      <div className="mt-2" data-testid="top-features">
                        <div className="text-sm font-medium mb-1">Top Features</div>
                        <ul className="text-sm text-neutral-300 list-disc ml-5">
                          {modelStatus.features_top.slice(0,5).map((f, idx) => (
                            <li key={idx}>{f.name}: {typeof f.importance === 'number' ? f.importance.toFixed(3) : f.importance}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-sm text-neutral-400" data-testid="model-trained-at">Trained: {modelStatus.created_at ? new Date(modelStatus.created_at).toLocaleString() : '-'}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="prediction-card">
              <CardHeader>
                <CardTitle className="text-lg">Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                {!prediction && <div className="text-neutral-400" data-testid="prediction-empty">Run a prediction to see results</div>}
                {prediction && selectedFixture && (
                  <div>
                    <div className="mb-2 font-medium">{selectedFixture.home} vs {selectedFixture.away}</div>
                    <div className="text-xs text-neutral-400 mb-2">Source: {prediction.source || 'baseline'}</div>
                    <div className="text-sm text-neutral-400 mb-4">
                      Model: {prediction.model} {prediction.model_id ? `• ${prediction.model_id}` : ''} {prediction.version ? `• v${prediction.version}` : ''}
                      {prediction.source === 'model' && (
                        <>
                          {' '}• Metric: {sport === 'football' ? (modelStatus?.metrics?.acc?.toFixed?.(3) ?? modelStatus?.metrics?.acc) : (modelStatus?.metrics?.auc?.toFixed?.(3) ?? modelStatus?.metrics?.auc)}
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-md bg-white/5 p-3">
                        <div className="text-xs text-neutral-400">Home</div>
                        <div className="text-2xl font-semibold" data-testid="prob-home">{Math.round(prediction.home_win_prob * 100)}%</div>
                      </div>
                      {typeof prediction.draw_prob === "number" && (
                        <div className="rounded-md bg-white/5 p-3">
                          <div className="text-xs text-neutral-400">Draw</div>
                          <div className="text-2xl font-semibold" data-testid="prob-draw">{Math.round(prediction.draw_prob * 100)}%</div>
                        </div>
                      )}
                      <div className="rounded-md bg-white/5 p-3">
                        <div className="text-xs text-neutral-400">Away</div>
                        <div className="text-2xl font-semibold" data-testid="prob-away">{Math.round(prediction.away_win_prob * 100)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="explanation-card">
              <CardHeader>
                <CardTitle className="text-lg">AI Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                {!explanation && <div className="text-neutral-400" data-testid="explain-empty">Click Explain on any fixture</div>}
                {explanation && (
                  <div>
                    <div className="text-xs text-neutral-400 mb-2">Model: {explanation.model}</div>
                    <pre className="whitespace-pre-wrap text-sm" data-testid="explain-text">{explanation.explanation}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;