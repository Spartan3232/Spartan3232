import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Components
import Dashboard from "./components/Dashboard";
import AIChat from "./components/AIChat";
import UserAuth from "./components/UserAuth";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// User Context
const UserContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const savedUser = localStorage.getItem('coaching_app_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleUserLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('coaching_app_user', JSON.stringify(userData));
  };

  const handleUserLogout = () => {
    setUser(null);
    localStorage.removeItem('coaching_app_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser: handleUserLogin, logout: handleUserLogout }}>
      <div className="App">
        <BrowserRouter>
          {!user ? (
            <UserAuth onLogin={handleUserLogin} />
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          )}
        </BrowserRouter>
      </div>
    </UserContext.Provider>
  );
}

export { UserContext, API };
export default App;