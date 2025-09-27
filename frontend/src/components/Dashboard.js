import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  Zap, 
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  Users,
  LogOut
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

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Dashboard yükleniyor...</p>
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
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {getGreeting()}, {user?.name}!
              </h1>
              <p className="text-blue-100">
                {user?.role === 'coach' ? 'Koç' : 'Satış Temsilcisi'} • AI Koçluk Sistemi
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-full p-2">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Performance Overview */}
        {dashboardData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Performans Özeti</h2>
              <div className={`px-4 py-2 rounded-full ${dashboardData.performance_level?.color ? 'text-white' : 'bg-gray-100'}`}
                   style={{ backgroundColor: dashboardData.performance_level?.color }}>
                <span className="font-semibold">{dashboardData.performance_level?.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {dashboardData.overall_score || 0}
                </div>
                <div className="text-sm text-gray-600">Genel Puan</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                    style={{ width: `${dashboardData.overall_score || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {dashboardData.total_assessments || 0}
                </div>
                <div className="text-sm text-gray-600">Toplam Değerlendirme</div>
                <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {dashboardData.completed_goals || 0}
                </div>
                <div className="text-sm text-gray-600">Tamamlanan Hedef</div>
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {dashboardData.active_goals || 0}
                </div>
                <div className="text-sm text-gray-600">Aktif Hedef</div>
                <Clock className="w-8 h-8 text-orange-500 mx-auto mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/assessment"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Hızlı Değerlendirme</h3>
                <p className="text-sm text-gray-600">5 dakikada performans değerlendirmesi</p>
              </div>
            </div>
          </Link>

          <Link
            to="/ai-coach"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">AI Koç Sohbeti</h3>
                <p className="text-sm text-gray-600">Yapay zeka ile koçluk görüşmesi</p>
              </div>
            </div>
          </Link>

          <button
            onClick={() => {/* TODO: Create Goal Modal */}}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Hedef Belirle</h3>
                <p className="text-sm text-gray-600">AI destekli hedef oluşturma</p>
              </div>
            </div>
          </button>
        </div>

        {/* Area Performance */}
        {dashboardData?.area_scores && Object.keys(dashboardData.area_scores).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Alan Bazlı Performans</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(dashboardData.area_scores).map(([area, score]) => (
                <div key={area} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm">{area}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(score)}`}>
                      {Math.round(score)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Assessments */}
        {dashboardData?.recent_assessments && dashboardData.recent_assessments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Son Değerlendirmeler</h2>
            
            <div className="space-y-4">
              {dashboardData.recent_assessments.slice(0, 5).map((assessment, index) => (
                <div key={assessment.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-10 h-10 rounded-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{assessment.coaching_area}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(assessment.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(assessment.performance_score)}`}>
                      {assessment.performance_score}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!dashboardData?.recent_assessments || dashboardData.recent_assessments.length === 0) && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI Koçluk Yolculuğuna Başlayın</h3>
            <p className="text-gray-600 mb-6">
              İlk değerlendirmenizi yaparak gelişim alanlarınızı keşfedin ve AI koçunuzla tanışın.
            </p>
            <Link
              to="/assessment"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
            >
              <Zap className="w-5 h-5" />
              <span>İlk Değerlendirmeni Yap</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;