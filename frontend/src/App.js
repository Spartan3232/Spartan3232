import { useEffect, useMemo, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

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
  
  const loadFixtures = async () => {
    try {
      const res = await axios.get(`${API}/fixtures`, { params: { sport, league } });
      setFixtures(res.data);
    } catch (e) {
      console.error("Failed to load fixtures", e);
    }
  };

  useEffect(() => {
    loadFixtures();
  }, [sport, league]);

  const handlePredict = async (fixtureId) => {
    try {
      const res = await axios.post(`${API}/predict`, { fixture_id: fixtureId });
      setPrediction(res.data);
      setExplanation(null);
    } catch (e) {
      console.error("Prediction failed", e);
    }
  };

  const handleExplain = async (fixtureId) => {
    try {
      const res = await axios.post(`${API}/explain`, { fixture_id: fixtureId });
      setExplanation(res.data);
    } catch (e) {
      console.error("Explain failed", e);
    }
  };

  const leagueOptions = useMemo(() => leaguesBySport[sport] || [], [sport]);

  return (
    <div className="min-h-screen bg-[#0b0d0e] text-white">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fixtures.length === 0 && (
                  <div className="text-neutral-400" data-testid="no-fixtures-msg">No fixtures found for selection</div>
                )}
                {fixtures.map((fx) => (
                  <div key={fx.id} className="rounded-lg border border-neutral-800 p-4 flex items-center justify-between hover:bg-white/5" data-testid={`fixture-${fx.id}`}>
                    <div>
                      <div className="font-medium">{fx.home} vs {fx.away}</div>
                      <div className="text-neutral-400 text-sm">{fx.league} • {new Date(fx.kickoff).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setSelectedFixture(fx); handlePredict(fx.id); }} data-testid={`predict-btn-${fx.id}`}>Predict</Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedFixture(fx); handleExplain(fx.id); }} data-testid={`explain-btn-${fx.id}`}>Explain</Button>
                    </div>
                  </div>
                ))}
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

            <Card className="bg-[#0f1316]/80 backdrop-blur-xl border-neutral-800" data-testid="prediction-card">
              <CardHeader>
                <CardTitle className="text-lg">Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                {!prediction && <div className="text-neutral-400" data-testid="prediction-empty">Run a prediction to see results</div>}
                {prediction && selectedFixture && (
                  <div>
                    <div className="mb-2 font-medium">{selectedFixture.home} vs {selectedFixture.away}</div>
                    <div className="text-sm text-neutral-400 mb-4">Model: {prediction.model}</div>
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