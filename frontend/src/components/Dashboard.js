import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  MessageCircle, 
  TrendingUp, 
  BarChart3,
  LogOut,
  Zap,
  Award,
  Users,
  Target
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/dashboard/${user.id}`);
      setDashboardData(response.data);
    } catch (err) {
      setError('Dashboard verisi yüklenirken hata oluştu');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi öğleden sonra';
    return 'İyi akşamlar';
  };

  const getSeviyeColor = (seviye) => {
    if (seviye === "Üstün Başarılı") return 'bg-green-500 text-white';
    if (seviye === "Başarılı") return 'bg-blue-500 text-white';
    return 'bg-orange-500 text-white';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">ROTA Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="bg-red-100 border border-red-300 text-red-700 p-6 rounded-lg max-w-md">
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Fixed Header with Products & Branches */}
      <header className="bg-white/20 backdrop-blur-md border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {getGreeting()}, {user?.name}!
              </h1>
              <p className="text-blue-100 text-sm">ROTA Koçluk Sistemi</p>
            </div>
            
            {/* Fixed Product & Branch Bar */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-white font-medium">📦 Ürünler:</span>
                <span className="text-blue-100 ml-1">Sidefer • Cistus • Dalincare • Tümformlar</span>
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-white font-medium">🏥 Branşlar:</span>
                <span className="text-blue-100 ml-1">Pediatri • Dermatoloji • Kadın Doğum</span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span className="text-white text-sm">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Performance Overview */}
        {dashboardData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">ROTA Koçluk Özeti</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {dashboardData.overall_score || 0}
                </div>
                <div className="text-sm text-gray-600">Genel Skor</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData.overall_score || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {dashboardData.total_sessions || 0}
                </div>
                <div className="text-sm text-gray-600">Toplam Koçluk</div>
                <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {Object.keys(dashboardData.baslik_breakdown || {}).length}
                </div>
                <div className="text-sm text-gray-600">Çalışılan Başlık</div>
                <Target className="w-8 h-8 text-green-500 mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {dashboardData.seviye_breakdown?.["Gelişmeli"] || 0}
                </div>
                <div className="text-sm text-gray-600">Gelişim Alanı</div>
                <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mt-2" />
              </div>
            </div>

            {/* Seviye Breakdown */}
            {dashboardData.seviye_breakdown && Object.keys(dashboardData.seviye_breakdown).length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {Object.entries(dashboardData.seviye_breakdown).map(([seviye, count]) => (
                  <div key={seviye} className="text-center">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getSeviyeColor(seviye)}`}>
                      {count} {seviye}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Chat Action */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
          <Brain className="w-20 h-20 text-purple-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">AI ROTA Koçluk Chat</h2>
          <p className="text-gray-600 mb-6">
            Chat üzerinden başlık seçin, seviye belirtin ve AI koçunuzdan detaylı geri bildirim alın
          </p>
          
          <Link
            to="/ai-coach"
            className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 text-lg font-semibold"
          >
            <MessageCircle className="w-6 h-6" />
            <span>ROTA Koçluk Chat Başlat</span>
          </Link>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>💡 Örnek kullanım: "Başlık: Etkili giriş, Seviye: Gelişmeli"</p>
          </div>
        </div>

        {/* 16 ROTA Başlıkları Preview */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">ROTA Verimlilik Başlıkları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {dashboardData?.available_basliklar?.map((baslik, index) => (
              <div
                key={baslik}
                className="bg-gray-50 hover:bg-blue-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer"
                onClick={() => window.location.href = '/ai-coach'}
              >
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{baslik}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              ⚡ Hızlı başlangıç için herhangi bir başlığa tıklayın
            </p>
          </div>
        </div>

        {/* Recent Sessions */}
        {dashboardData?.recent_sessions && dashboardData.recent_sessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Son ROTA Koçluk Seansları</h3>
            <div className="space-y-3">
              {dashboardData.recent_sessions.map((session, index) => (
                <div key={session.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Award className="w-5 h-5 text-purple-500" />
                    <div>
                      <h4 className="font-semibold text-gray-800">{session.baslik}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(session.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSeviyeColor(session.seviye)}`}>
                    {session.seviye}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!dashboardData?.recent_sessions || dashboardData.recent_sessions.length === 0) && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center mt-6">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">ROTA Koçluk Yolculuğunuza Başlayın</h3>
            <p className="text-gray-600 mb-6">
              Chat üzerinden ilk başlık seçiminizi yapın ve AI koçunuzdan detaylı geri bildirim alın.
            </p>
            <Link
              to="/ai-coach"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300"
            >
              <Brain className="w-5 h-5" />
              <span>İlk ROTA Koçluğunu Başlat</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;