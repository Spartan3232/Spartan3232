import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import Sidebar from './Sidebar';
import StatCard from './StatCard';
import GoalCard from './GoalCard';
import AIRecommendationCard from './AIRecommendationCard';
import GoalCreationModal from './GoalCreationModal';
import { MessageCircle, Target, TrendingUp, Users, Brain, Zap, Plus, BookOpen } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);

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

  const handleGoalCreated = () => {
    fetchDashboardData(); // Refresh dashboard data
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi öğleden sonra';
    return 'İyi akşamlar';
  };

  const getUserTitle = () => {
    return user?.role === 'bolge_muduru' ? 'Bölge Müdürü' : 'Tıbbi Satış Temsilcisi';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-64">
          <div className="text-center">
            <div className="spinner w-16 h-16 mx-auto mb-4"></div>
            <p className="text-white text-lg">Dashboard yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-64">
          <div className="text-center">
            <div className="bg-red-500 text-white p-4 rounded-lg">
              <p>{error}</p>
              <button 
                onClick={fetchDashboardData}
                className="mt-2 px-4 py-2 bg-white text-red-500 rounded hover:bg-gray-100"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-b border-white border-opacity-20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold text-white">
                  {getGreeting()}, {user?.name}!
                </h1>
                <p className="text-blue-100 mt-1">
                  {getUserTitle()} • ROTA Koçluk Platformu
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">AI Koç Aktif</p>
                  <p className="text-xs text-blue-200">GPT-5 • Gemini • Claude</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Toplam Hedefler"
              value={dashboardData?.stats?.total_goals || 0}
              icon={Target}
              color="blue"
              change="+12%"
              changeType="positive"
            />
            <StatCard
              title="Tamamlanan"
              value={dashboardData?.stats?.completed_goals || 0}
              icon={TrendingUp}
              color="green"
              change="+8%"
              changeType="positive"
            />
            <StatCard
              title="Başarı Oranı"
              value={`${Math.round(dashboardData?.stats?.completion_rate || 0)}%`}
              icon={Zap}
              color="purple"
              change="+5%"
              changeType="positive"
            />
            <StatCard
              title="Koçluk Seansları"
              value={dashboardData?.stats?.total_sessions || 0}
              icon={MessageCircle}
              color="orange"
              change="+15%"
              changeType="positive"
            />
          </div>

          {/* ROTA Framework Overview */}
          {dashboardData?.stats?.category_breakdown && Object.keys(dashboardData.stats.category_breakdown).length > 0 && (
            <div className="bg-white rounded-2xl shadow-strong p-6 mb-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <span>ROTA Gelişim Alanları</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(dashboardData.stats.category_breakdown).map(([category, stats]) => (
                  <div key={category} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <div className="text-sm text-gray-600">
                        {stats.completed}/{stats.total} tamamlandı
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% tamamlanma oranı
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Goals Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-strong p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Aktif Hedeflerim</h2>
                  <button 
                    onClick={() => setShowGoalModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-300 btn-hover-lift flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ROTA Hedef</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {dashboardData?.recent_goals?.length > 0 ? (
                    dashboardData.recent_goals.map((goal, index) => (
                      <GoalCard key={goal.id} goal={goal} index={index} onUpdate={fetchDashboardData} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-4">Henüz ROTA hedefi belirlenmemiş</p>
                      <button 
                        onClick={() => setShowGoalModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-300 btn-hover-lift flex items-center space-x-2 mx-auto"
                      >
                        <Plus className="w-5 h-5" />
                        <span>İlk ROTA Hedefinizi Belirleyin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Recommendations Sidebar */}
            <div className="space-y-6">
              <AIRecommendationCard />
              
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-strong p-6 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Hızlı Eylemler</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => window.location.href = '/ai-chat'}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 btn-hover-lift"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>AI Koç ile Sohbet</span>
                  </button>
                  <button 
                    onClick={() => setShowGoalModal(true)}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 btn-hover-lift"
                  >
                    <Target className="w-5 h-5" />
                    <span>ROTA Hedef Belirle</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 btn-hover-lift">
                    <Users className="w-5 h-5" />
                    <span>Koçluk Seansları</span>
                  </button>
                </div>
              </div>

              {/* AI Model Status */}
              <div className="bg-white rounded-2xl shadow-strong p-6 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-800 mb-4">AI Model Durumu</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">GPT-5</span>
                    </div>
                    <span className="text-xs text-green-600">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Gemini 2.0</span>
                    </div>
                    <span className="text-xs text-green-600">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Claude Sonnet</span>
                    </div>
                    <span className="text-xs text-green-600">Aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Goal Creation Modal */}
      <GoalCreationModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onGoalCreated={handleGoalCreated}
      />
    </div>
  );
};

export default Dashboard;