import { useEffect, useMemo, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Toaster, toast } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const leaguesBySport = {
  football: ["EPL", "La Liga", "Süper Lig", "UEFA"],
  basketball: ["NBA", "EuroLeague", "BSL"],
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

  const handlePredict = async (fx) => {
    try {
      if (!modelStatus || !modelStatus.trained) {
        toast("No trained model yet — falling back if needed");
      }
      const body = fx.uuid ? { fixture_uuid: fx.uuid } : { sport, league, home: fx.home, away: fx.away };
      const res = await axios.post(`${API}/model/predict`, body);
      setSelectedFixture({ home: fx.home, away: fx.away, uuid: fx.uuid || fx.id });
      setPrediction(res.data);
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
              <div className="flex gap-3">
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
                  return (
                    <div key={fx.uuid || fx.id} className="rounded-lg border border-neutral-800 p-4 flex items-center justify-between hover:bg-white/5" data-testid={`fixture-${fx.uuid || fx.id}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{fx.home} vs {fx.away}</div>
                          {useModel && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-700/40" data-testid="use-model-badge">Use Model</span>
                          )}
                        </div>
                        <div className="text-neutral-400 text-sm">{fx.league} • {new Date(fx.date_utc || fx.kickoff).toLocaleString()}</div>
                        {fx.odds && fx.odds.markets?.moneyline && (
                          <div className="text-xs text-neutral-400 mt-1" data-testid="odds-moneyline">ML: H {fx.odds.markets.moneyline.home || '-'} {fx.odds.markets.moneyline.draw ? `• D ${fx.odds.markets.moneyline.draw}` : ''} • A {fx.odds.markets.moneyline.away || '-'}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handlePredict(fx)} data-testid={`predict-btn-${fx.uuid || fx.id}`}>Predict</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExplain(fx)} data-testid={`explain-btn-${fx.uuid || fx.id}`}>Explain</Button>
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
                    <div className="text-sm text-neutral-400" data-testid="model-trained-at">Trained at: {modelStatus.created_at ? new Date(modelStatus.created_at).toLocaleString() : '-'}</div>
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