import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { User, Mail, UserCheck, Zap, Brain, Target } from 'lucide-react';

const UserAuth = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'mumessil'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/users`, formData);
      onLogin(response.data);
    } catch (err) {
      setError('Giriş yapılırken hata oluştu');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-strong p-8 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">MedSales Koç</h1>
          <p className="text-gray-600">İlaç satış koçluk platformuna hoş geldiniz</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="bg-blue-50 p-3 rounded-lg mb-2">
              <Brain className="w-6 h-6 text-blue-500 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">AI Koç</p>
          </div>
          <div className="text-center">
            <div className="bg-green-50 p-3 rounded-lg mb-2">
              <Target className="w-6 h-6 text-green-500 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">Hedef Takip</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-50 p-3 rounded-lg mb-2">
              <UserCheck className="w-6 h-6 text-purple-500 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">Gelişim</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ad Soyad
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Adınızı girin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="mumessil">Tıbbi Satış Temsilcisi</option>
              <option value="bolge_muduru">Bölge Müdürü</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-emerald-600 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 font-medium btn-hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="spinner w-5 h-5"></div>
                <span>Giriş yapılıyor...</span>
              </div>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            AI destekli koçluk ile satış hedeflerinizi gerçekleştirin
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserAuth;