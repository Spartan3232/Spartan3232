import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Components
import Dashboard from "./components/Dashboard";
import QuickAssessment from "./components/QuickAssessment";
import AICoach from "./components/AICoach";
import Login from "./components/Login";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// User Context
const UserContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const savedUser = localStorage.getItem('ai_coach_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('ai_coach_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ai_coach_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">AI Koçluk Sistemi Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser: handleLogin, logout: handleLogout }}>
      <div className="App">
        <BrowserRouter>
          {!user ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessment" element={<QuickAssessment />} />
              <Route path="/ai-coach" element={<AICoach />} />
            </Routes>
          )}
        </BrowserRouter>
      </div>
    </UserContext.Provider>
  );
}

export { UserContext, API };
export default App;