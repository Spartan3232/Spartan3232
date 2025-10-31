import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TTS from "@/pages/TTS";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tts/:id" element={<TTS />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
