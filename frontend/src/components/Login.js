import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Brain, Target, TrendingUp, Zap, Users, Package, Building } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sales_rep',
    region: '',
    brick: '',
    responsible_products: [],
    target_branches: []
  });
  const [systemData, setSystemData] = useState({
    products: {},
    branches: {},
    regions: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      const [productsRes, branchesRes, regionsRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/branches`), 
        axios.get(`${API}/regions`)
      ]);
      
      setSystemData({
        products: productsRes.data.products,
        branches: branchesRes.data.branches,
        regions: regionsRes.data.regions
      });
    } catch (err) {
      console.error('System data fetch error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Lütfen tüm zorunlu alanları doldurun');
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

  const handleMultiSelect = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const getCurrentBricks = () => {
    if (formData.region && systemData.regions[formData.region]) {
      return systemData.regions[formData.region];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">İlaç Satış AI Koçluk</h1>
          <p className="text-gray-600">Ürün & Branş Odaklı Koçluk Sistemi</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-blue-700 font-medium">Ürün Odaklı</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Building className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-green-700 font-medium">Branş Spesifik</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Target className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-purple-700 font-medium">Brick Yönetimi</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <Zap className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-orange-700 font-medium">ROTA Koçluk</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Adınızı girin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          {/* Role & Region */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="sales_rep">Mümessil (TTS)</option>
                <option value="coach">Bölge Müdürü (BM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bölge
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Bölge Seçin</option>
                {Object.keys(systemData.regions).map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brick Selection */}
          {formData.region && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brick
              </label>
              <select
                name="brick"
                value={formData.brick}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Brick Seçin</option>
                {getCurrentBricks().map(brick => (
                  <option key={brick} value={brick}>{brick}</option>
                ))}
              </select>
            </div>
          )}

          {/* Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sorumlu Ürünler
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(systemData.products).map(([productKey, product]) => (
                <button
                  key={productKey}
                  type="button"
                  onClick={() => handleMultiSelect('responsible_products', productKey)}
                  className={`p-2 rounded-lg border text-left text-sm transition-all duration-200 ${
                    formData.responsible_products.includes(productKey)
                      ? 'bg-blue-100 border-blue-500 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-gray-600">{product.category}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Sidefer, Cistus, Dalincare, Tümformlar</p>
          </div>

          {/* Branches */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hedef Branşlar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(systemData.branches).map(([branchKey, branch]) => (
                <button
                  key={branchKey}
                  type="button"
                  onClick={() => handleMultiSelect('target_branches', branchKey)}
                  className={`p-2 rounded-lg border text-center text-sm transition-all duration-200 ${
                    formData.target_branches.includes(branchKey)
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="font-medium">{branch.name}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Pediatri, Dermatoloji, Kadın Doğum</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Giriş yapılıyor...</span>
              </div>
            ) : (
              'AI Koçluk Sistemine Gir'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center text-xs text-gray-600">
            <p className="mb-2 font-medium">🎯 Spesifik Ürün & Branş Koçluğu</p>
            <div className="flex justify-center space-x-4 text-xs">
              <span>📦 Sidefer • Cistus • Dalincare • Tümformlar</span>
              <span>🏥 Pediatri • Dermatoloji • Kadın Doğum</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;