import { useEffect, useMemo, useState } from "react";
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

  const yyyyMmDd = (d) => new Date(d).toISOString().slice(0, 10);

  const loadFixtures = async () => {
    try {
      const date = yyyyMmDd(dateValue);
      let res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } });
      if (!res.data || res.data.length === 0) {
        await axios.get(`${API}/fixtures`, { params: { sport, league, date } });
        res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } });
      }
      setFixtures(res.data);
      setPredMap({});
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
      await loadFixtures();
    } catch (e) {
      toast.error("Failed to fetch odds");
    }
  };

  const ensurePredictionsForFixtures = async () => {
    if (!heatmap) return;
    const date = yyyyMmDd(dateValue);
    const copy = { ...predMap };
    for (const fx of fixtures) {
      const key = fx.uuid || fx.id;
      if (copy[key]) continue;
      try {
        const body = fx.uuid ? { fixture_uuid: fx.uuid } : { sport, league, home: fx.home, away: fx.away };
        const res = await axios.post(`${API}/model/predict`, body);
        copy[key] = res.data;
        // small delay to avoid hammering
        await new Promise(r => setTimeout(r, 120));
      } catch (e) {
        // ignore per-fixture errors
      }
    }
    setPredMap(copy);
  };

  useEffect(() => {
    ensurePredictionsForFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmap, fixtures]);

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

  const computeBestValue = (fx) => {
    const ml = fx?.odds?.markets?.moneyline;
    if (!ml) return null;
    const pred = predMap[fx.uuid || fx.id];
    if (!pred) return null;
    const sides = ['home', ...(sport === 'football' ? ['draw'] : []), 'away'];
    let best = { side: null, delta: -Infinity, odds: null, p: null };
    for (const s of sides) {
      const p = s === 'home' ? pred.home_win_prob : s === 'draw' ? pred.draw_prob : pred.away_win_prob;
      const o = ml[s];
      const imp = implied(o);
      if (p == null || imp == null) continue;
      const delta = p - imp;
      if (delta > best.delta) best = { side: s.toUpperCase(), delta, odds: o, p };
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

  const ev = (p, odds) => (p == null || odds == null) ? null : (p * (Number(odds) - 1) - (1 - p));

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
          <Button size="sm" variant="outline" data-testid={`odds-drawer-btn-${fx.uuid || fx.id}`}>Odds</Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Fixtures</CardTitle>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2" data-testid="value-heatmap-toggle">
                  <Switch checked={heatmap} onCheckedChange={setHeatmap} />
                  <span className="text-sm text-neutral-300">Color rows by best value</span>
                </div>
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

                <Button onClick={loadFixtures} variant="secondary" data-testid="refresh-fixtures-btn">Refresh</Button>
                <Button onClick={fetchOdds} variant="outline" data-testid="fetch-odds-btn">Fetch Odds</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fixtures.length === 0 && (
                  <div className="text-neutral-400" data-testid="no-fixtures-msg">No fixtures found for selection</div>
                )}
                {fixtures.map((fx) => {
                  const useModel = modelStatus?.trained;
                  const isSelected = selectedFixture && (selectedFixture.uuid === (fx.uuid || fx.id));
                  const ml = fx?.odds?.markets?.moneyline;
                  const best = computeBestValue(fx);
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