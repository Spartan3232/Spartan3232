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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

const PAGE_SIZE = 50;

function useVersion() {
  const [ver, setVer] = useState(null);
  useEffect(() => {
    axios.get(`${API}/version`).then(r => setVer(r.data)).catch(() => setVer(null));
  }, []);
  return ver;
}

const Dashboard = () => {
  // State
  const [sport, setSport] = useState("football");
  const [league, setLeague] = useState("EPL");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [dateValue, setDateValue] = useState(new Date());
  const [training, setTraining] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [openRowDrawer, setOpenRowDrawer] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [predMap, setPredMap] = useState({});
  const [valueFilterEnabled, setValueFilterEnabled] = useState(false);
  const [valueThreshold, setValueThreshold] = useState(0.05);
  const [sortBy, setSortBy] = useState("time");
  const [outcomeScope, setOutcomeScope] = useState("all");
  const [page, setPage] = useState(1);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(15);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pageVisible, setPageVisible] = useState(true);
  const timerRef = useRef(null);
  const failureRef = useRef(0);
  const lastOddsMaxRef = useRef(null);

  // Persist prefs
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
  useEffect(() => { try { localStorage.setItem("pref_value_filter_enabled", String(valueFilterEnabled)); } catch {} }, [valueFilterEnabled]);
  useEffect(() => { try { localStorage.setItem("pref_value_threshold", String(valueThreshold)); } catch {} }, [valueThreshold]);
  useEffect(() => { try { localStorage.setItem("pref_sort_by", String(sortBy)); } catch {} }, [sortBy]);
  useEffect(() => { try { localStorage.setItem("pref_outcome_scope", String(outcomeScope)); } catch {} }, [outcomeScope]);
  useEffect(() => { try { localStorage.setItem("pref_auto_refresh", String(autoRefresh)); } catch {} }, [autoRefresh]);
  useEffect(() => { try { localStorage.setItem("pref_refresh_minutes", String(refreshMinutes)); } catch {} }, [refreshMinutes]);

  const yyyyMmDd = (d) => new Date(d).toISOString().slice(0, 10);

  const getMaxOddsCollected = (list) => {
    let maxISO = null;
    for (const fx of list || []) {
      const iso = fx?.odds?.collected_at;
      if (iso && (!maxISO || iso > maxISO)) maxISO = iso;
    }
    return maxISO;
  };

  const loadFixtures = async (opts = {}) => {
    setLoading(true);
    try {
      const date = yyyyMmDd(dateValue);
      let res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } });
      if (!res.data || res.data.length === 0 || opts.forceLive) {
        await axios.get(`${API}/fixtures`, { params: { sport, league, date } });
        res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } });
      }
      setFixtures(res.data);
      setPage(1);
      const maxOddsISO = getMaxOddsCollected(res.data);
      if (maxOddsISO && maxOddsISO !== lastOddsMaxRef.current) {
        if (lastOddsMaxRef.current) toast.success("Odds updated");
        lastOddsMaxRef.current = maxOddsISO;
      }
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error("Failed to load fixtures", e);
    } finally {
      setLoading(false);
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
      await loadFixtures({});
    } catch (e) {
      toast.error("Failed to fetch odds");
    }
  };

  const ev = (p, odds) => (p == null || odds == null) ? null : (p * (Number(odds) - 1) - (1 - p));

  const sidesForScope = (scope) => (scope === 'all' ? ['home', ...(sport === 'football' ? ['draw'] : []), 'away'] : [scope]);

  const computeBestValue = (fx, scope = outcomeScope) => {
    const ml = fx?.odds?.markets?.moneyline;
    const pred = predMap[fx.uuid || fx.id];
    if (!ml || !pred) return null;
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
    return best.side ? best : null;
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

  // Background prediction priming for visible rows
  const visibleRows = useMemo(() => {
    return fixtures.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  }, [fixtures, page]);

  useEffect(() => {
    (async () => {
      const need = visibleRows.filter(fx => !predMap[fx.uuid || fx.id]).slice(0, 60);
      for (const fx of need) {
        try {
          const body = fx.uuid ? { fixture_uuid: fx.uuid } : { sport, league, home: fx.home, away: fx.away };
          const res = await axios.post(`${API}/model/predict`, body);
          setPredMap(prev => ({ ...prev, [fx.uuid || fx.id]: res.data }));
          await new Promise(r => setTimeout(r, 100));
        } catch {}
      }
    })();
  }, [visibleRows, sport, league]);

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
        await axios.post(`${API}/fixtures/odds/fetch`, null, { params: { sport, league, date } });
        const res = await axios.get(`${API}/fixtures/db`, { params: { sport, league, date } });
        const oldMax = lastOddsMaxRef.current;
        const newMax = getMaxOddsCollected(res.data);
        if (newMax && newMax !== oldMax) { lastOddsMaxRef.current = newMax; toast.success("Odds updated"); }
        setFixtures(res.data);
        setLastUpdated(new Date().toISOString());
        failureRef.current = 0;
      } catch (e) {
        failureRef.current = Math.min(5, failureRef.current + 1);
      }
      const base = refreshMinutes * 60 * 1000;
      const jitter = 1 + (Math.random() * 0.4 - 0.2);
      const backoff = Math.pow(2, failureRef.current);
      const delay = Math.min(base * jitter * backoff, 60*60*1000);
      timerRef.current = setTimeout(run, delay);
    };
    timerRef.current = setTimeout(run, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoRefresh, training, pageVisible, sport, league, dateValue, refreshMinutes]);

  // Sorting & filtering & paging
  const enriched = useMemo(() => {
    const total = fixtures.length;
    let rows = fixtures.map(fx => ({ fx, best: computeBestValue(fx) }));
    if (valueFilterEnabled) rows = rows.filter(r => (r.best && r.best.delta >= valueThreshold));
    if (sortBy === 'time') rows.sort((a,b) => new Date(a.fx.date_utc || a.fx.kickoff) - new Date(b.fx.date_utc || b.fx.kickoff));
    if (sortBy === 'max') rows.sort((a,b) => (b.best?.delta ?? -Infinity) - (a.best?.delta ?? -Infinity));
    if (sortBy === 'ev') rows.sort((a,b) => (b.best?.ev ?? -Infinity) - (a.best?.ev ?? -Infinity));
    return { total, rows };
  }, [fixtures, predMap, valueFilterEnabled, valueThreshold, sortBy, outcomeScope]);

  const pagedRows = useMemo(() => {
    const start = (page-1) * PAGE_SIZE;
    return enriched.rows.slice(start, start + PAGE_SIZE);
  }, [enriched, page]);

  // Row drawer content helpers
  const openDetails = (fx) => {
    setSelectedFixture(fx);
    setOpenRowDrawer(true);
  };

  const runPredictSelected = async () => {
    if (!selectedFixture) return;
    try {
      const body = selectedFixture.uuid ? { fixture_uuid: selectedFixture.uuid } : { sport, league, home: selectedFixture.home, away: selectedFixture.away };
      const res = await axios.post(`${API}/model/predict`, body);
      setPrediction(res.data);
      setPredMap(prev => ({ ...prev, [selectedFixture.uuid || selectedFixture.id]: res.data }));
      toast.success(res.data.source === 'model' ? 'Model prediction ready' : 'Baseline prediction used');
    } catch { toast.error('Prediction failed'); }
  };

  const runExplainSelected = async () => {
    if (!selectedFixture) return;
    try {
      const id = selectedFixture.uuid || selectedFixture.id;
      const res = await axios.post(`${API}/explain`, { fixture_id: id });
      setExplanation(res.data);
    } catch { toast.error('Explain failed'); }
  };

  const ver = useVersion();

  // Layout
  return (
    <div className="min-h-screen bg-[#0b0d0e] text-white">
      <Toaster />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight" data-testid="app-title">SportOracle</h1>
          <p className="text-neutral-300 mt-2" data-testid="app-subtitle">Real-time analysis and AI predictions for Football and Basketball</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Filters Panel */}
          <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="filters-panel">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-neutral-400">Sport</div>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger className="w-full" data-testid="sport-select">
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football" data-testid="sport-opt-football">Football</SelectItem>
                    <SelectItem value="basketball" data-testid="sport-opt-basketball">Basketball</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-neutral-400">League</div>
                <Select value={league} onValueChange={setLeague}>
                  <SelectTrigger className="w-full" data-testid="league-select">
                    <SelectValue placeholder="League" />
                  </SelectTrigger>
                  <SelectContent>
                    {(leaguesBySport[sport] || []).map((lg) => (
                      <SelectItem key={lg} value={lg} data-testid={`league-opt-${lg}`}>{lg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-neutral-400">Date</div>
                <Calendar mode="single" selected={dateValue} onSelect={setDateValue} className="rounded-md border border-neutral-800" data-testid="date-calendar" />
              </div>

              <div className="flex items-center justify-between" data-testid="auto-refresh-toggle">
                <div className="text-sm">Auto-refresh</div>
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>

              <div className="flex items-center gap-2" data-testid="auto-refresh-minutes-select">
                <span className="text-sm text-neutral-400">Every</span>
                <Select value={String(refreshMinutes)} onValueChange={(v)=> setRefreshMinutes(parseInt(v,10))}>
                  <SelectTrigger className="w-[110px]"><SelectValue placeholder="15m"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between" data-testid="value-heatmap-toggle">
                <div className="text-sm">Color rows by best value</div>
                <Switch checked={heatmap} onCheckedChange={setHeatmap} />
              </div>

              <div className="flex items-center justify-between" data-testid="value-filter-toggle">
                <div className="text-sm">Show only edges ≥ {Math.round(valueThreshold*100)}%</div>
                <Switch checked={valueFilterEnabled} onCheckedChange={setValueFilterEnabled} />
              </div>
              <div className="w-full" data-testid="threshold-slider">
                <Slider value={[valueThreshold]} min={0} max={0.15} step={0.01} onValueChange={(v)=> setValueThreshold(parseFloat(v[0]))} />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-neutral-400">Sort by</div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full" data-testid="sort-select"><SelectValue placeholder="Sort by"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time" data-testid="sort-opt-time">By start time</SelectItem>
                    <SelectItem value="max" data-testid="sort-opt-max">By max edge (desc)</SelectItem>
                    <SelectItem value="ev" data-testid="sort-opt-ev">By EV (desc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-neutral-400">Outcome scope</div>
                <Select value={outcomeScope} onValueChange={setOutcomeScope}>
                  <SelectTrigger className="w-full" data-testid="outcome-select"><SelectValue placeholder="Scope"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="scope-all">All</SelectItem>
                    <SelectItem value="home" data-testid="scope-home">Home</SelectItem>
                    {sport === 'football' && <SelectItem value="draw" data-testid="scope-draw">Draw</SelectItem>}
                    <SelectItem value="away" data-testid="scope-away">Away</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={fetchOdds} data-testid="fetch-odds-btn">Fetch Odds</Button>
                <Button variant="secondary" onClick={() => loadFixtures()} data-testid="refresh-fixtures-btn">Refresh</Button>
              </div>

              <div className="text-xs text-neutral-500 pt-1" data-testid="last-updated-label">Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '-'}</div>
            </CardContent>
          </Card>

          {/* Right Fixtures Table */}
          <Card className="lg:col-span-2 bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="fixtures-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Fixtures</CardTitle>
                <div className="text-xs text-neutral-500" data-testid="filtered-count-label">Filtered: {enriched.rows.length} of {enriched.total}</div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({length:8}).map((_,i)=> (<Skeleton key={i} className="w-full h-10 bg-white/5" data-testid={`skeleton-row-${i}`} />))}
                </div>
              ) : enriched.rows.length === 0 ? (
                <div className="text-neutral-400 text-sm" data-testid="empty-state">
                  No fixtures for this selection. Try Fetch Odds, switch date, or change league.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="fixtures-table">
                    <Thead>
                      <Tr>
                        <Th className="text-left">Time</Th>
                        <Th className="text-left">Home</Th>
                        <Th className="text-left">Away</Th>
                        <Th className="text-left">Moneyline (H/D/A)</Th>
                        <Th className="text-left">Model Prob (H/D/A)</Th>
                        <Th className="text-left">Edge (max)</Th>
                        <Th className="text-left">Badge</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedRows.map(({ fx, best }) => {
                        const ml = fx?.odds?.markets?.moneyline;
                        const pred = predMap[fx.uuid || fx.id];
                        const useModel = modelStatus?.trained;
                        const shape = best ? (best.delta >= 0.08 ? '▲' : best.delta <= -0.05 ? '■' : '●') : null;
                        return (
                          <Tr key={fx.uuid || fx.id} className={`cursor-pointer ${rowHeatClass(fx)}`} onClick={() => openDetails(fx)} data-testid={`fixture-row-${fx.uuid || fx.id}`}>
                            <Td>{new Date(fx.date_utc || fx.kickoff).toLocaleTimeString()}</Td>
                            <Td>{fx.home}</Td>
                            <Td>{fx.away}</Td>
                            <Td>
                              {ml ? (
                                <div className="text-xs">
                                  <span>H {ml.home ?? '-'}</span>
                                  {sport === 'football' && <span className="mx-2">D {ml.draw ?? '-'}</span>}
                                  <span>A {ml.away ?? '-'}</span>
                                </div>
                              ) : '-' }
                            </Td>
                            <Td>
                              {pred ? (
                                <div className="text-xs">
                                  <span>H {fmtPct(pred.home_win_prob)}</span>
                                  {sport === 'football' && <span className="mx-2">D {fmtPct(pred.draw_prob)}</span>}
                                  <span>A {fmtPct(pred.away_win_prob)}</span>
                                </div>
                              ) : '-' }
                            </Td>
                            <Td>
                              {best ? (
                                <div className={`text-xs ${valueColor(best.delta)}`}>
                                  {shape} {best.side} {(best.delta>0?'+':'')}{(best.delta*100).toFixed(1)}%
                                </div>
                              ) : '-' }
                            </Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                {useModel && <Badge variant="secondary" data-testid="use-model-badge">Use Model</Badge>}
                                {best && best.delta >= 0.05 && (
                                  <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-700/40" data-testid="best-value-badge">Best Value</Badge>
                                )}
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {enriched.rows.length > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-3 mt-4" data-testid="pagination-controls">
                  <Button variant="outline" disabled={page===1} onClick={()=> setPage(p=>Math.max(1,p-1))} data-testid="page-prev">Prev</Button>
                  <div className="text-xs text-neutral-400" data-testid="page-indicator">Page {page} / {Math.ceil(enriched.rows.length / PAGE_SIZE)}</div>
                  <Button variant="outline" disabled={page>=Math.ceil(enriched.rows.length/PAGE_SIZE)} onClick={()=> setPage(p=>p+1)} data-testid="page-next">Next</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-xs text-neutral-500" data-testid="footer-version">
          Build {ver?.ui_commit || 'dev'} · {ver?.deployed_at ? new Date(ver.deployed_at).toLocaleString() : '-'} · Backend {ver?.backend_commit || 'dev'}
        </footer>
      </div>

      {/* Row Details Drawer */}
      <Drawer open={openRowDrawer} onOpenChange={setOpenRowDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle data-testid="row-details-title">{selectedFixture ? `${selectedFixture.home} vs ${selectedFixture.away}` : 'Fixture Details'}</DrawerTitle>
            <DrawerDescription>{selectedFixture ? `${selectedFixture.league} • ${new Date(selectedFixture.date_utc || selectedFixture.kickoff).toLocaleString()}` : ''}</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6">
            <div className="flex gap-2 mb-4">
              <Button size="sm" onClick={runPredictSelected} data-testid="drawer-predict-btn">Predict</Button>
              <Button size="sm" variant="outline" onClick={runExplainSelected} data-testid="drawer-explain-btn">Explain</Button>
            </div>
            <Tabs defaultValue="overview" data-testid="details-tabs">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="odds">Odds</TabsTrigger>
                <TabsTrigger value="model">Model</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="pt-4 space-y-2" data-testid="tab-overview">
                {selectedFixture && (
                  <>
                    <div className="text-sm text-neutral-300">Status: {selectedFixture.status || '-'}</div>
                    {/* Best value tag */}
                    <div>
                      {(() => { const best = computeBestValue(selectedFixture); if (!best || best.delta < 0.05) return null; return (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-700/40" data-testid="drawer-best-value-tag">
                          Best Value: {best.side} (+{Math.round(best.delta*100)}%)
                        </span>
                      ); })()}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="odds" className="pt-4 space-y-3" data-testid="tab-odds">
                {selectedFixture?.odds ? (
                  <>
                    <div className="text-xs text-neutral-400">Provider: {selectedFixture.odds.provider} • Collected: {new Date(selectedFixture.odds.collected_at).toLocaleString()}</div>
                    <div className="text-sm">Moneyline: H {selectedFixture.odds.markets?.moneyline?.home ?? '-'} {sport==='football' && <>• D {selectedFixture.odds.markets?.moneyline?.draw ?? '-'}</>} • A {selectedFixture.odds.markets?.moneyline?.away ?? '-'}</div>
                  </>
                ) : <div className="text-neutral-400 text-sm">No odds available</div>}
              </TabsContent>

              <TabsContent value="model" className="pt-4 space-y-2" data-testid="tab-model">
                {modelStatus?.trained ? (
                  <>
                    <div className="text-sm">Model: xgboost-prophet</div>
                    <div className="text-sm">Version: {modelStatus.version}</div>
                    <div className="text-sm">Metrics: {sport==='football'?`ACC ${modelStatus.metrics?.acc ?? '-'}`:`AUC ${modelStatus.metrics?.auc ?? '-'}`}</div>
                    <div className="text-sm">Trained: {modelStatus.created_at ? new Date(modelStatus.created_at).toLocaleString() : '-'}</div>
                    {Array.isArray(modelStatus.features_top) && modelStatus.features_top.length>0 && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Top 5 Features</div>
                        <ul className="list-disc ml-5">
                          {modelStatus.features_top.slice(0,5).map((f,i)=> (<li key={i}>{f.name}: {typeof f.importance==='number'?f.importance.toFixed(3):f.importance}</li>))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : <div className="text-neutral-400 text-sm">No trained model yet for this league.</div>}
              </TabsContent>

              <TabsContent value="history" className="pt-4" data-testid="tab-history">
                <div className="text-neutral-400 text-sm">History not available yet.</div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="pb-4 px-6"><DrawerClose asChild><Button variant="outline" data-testid="close-row-drawer">Close</Button></DrawerClose></div>
        </DrawerContent>
      </Drawer>
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