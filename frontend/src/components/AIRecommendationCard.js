import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { Brain, Sparkles, ArrowRight, Lightbulb, Target } from 'lucide-react';

const AIRecommendationCard = () => {
  const { user } = useContext(UserContext);
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRecommendation();
  }, []);

  const fetchRecommendation = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/ai/suggest-goal?user_id=${user.id}`, {}, {
        params: {
          context: `Kullanıcı: ${user.name}, Rol: ${user.role === 'bolge_muduru' ? 'Bölge Müdürü' : 'Tıbbi Satış Temsilcisi'}`
        }
      });
      
      // Parse AI response if it's JSON
      try {
        const suggestion = JSON.parse(response.data.suggestion);
        setRecommendation(suggestion);
      } catch {
        // If not JSON, create a formatted recommendation
        setRecommendation({
          title: "AI Önerisi",
          description: response.data.suggestion,
          tips: ["AI'dan kişiselleştirilmiş tavsiyeler alın", "Hedeflerinizi düzenli olarak güncelleyin"]
        });
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      // Fallback recommendation
      setRecommendation({
        title: "Haftalık Satış Performansını Artır",
        description: "Bu hafta müşteri ziyaretlerinizi %15 artırarak satış hedeflerinize daha hızlı ulaşabilirsiniz.",
        target_value: "15",
        tips: [
          "Günlük müşteri ziyaret sayısını artırın",
          "Mevcut müşterilerle ilişkileri güçlendirin",
          "Yeni potansiyel müşteriler belirleyin"
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-strong p-6 animate-fade-in">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-800">AI Önerisi</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-white rounded-2xl shadow-strong p-6 animate-fade-in">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-800">AI Önerisi</h3>
        </div>
        <p className="text-gray-600 mb-4">AI önerisi yüklenirken hata oluştu.</p>
        <button 
          onClick={fetchRecommendation}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-strong p-6 border border-purple-100 animate-fade-in">
      <div className="flex items-center space-x-2 mb-4">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">AI Koç Önerisi</h3>
          <p className="text-sm text-purple-600">GPT-5 tarafından önerildi</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-bold text-gray-900 mb-2 flex items-center space-x-2">
          <Target className="w-4 h-4 text-purple-600" />
          <span>{recommendation.title}</span>
        </h4>
        <p className="text-gray-700 text-sm mb-3">{recommendation.description}</p>
        
        {recommendation.target_value && (
          <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-purple-800">
              🎯 Hedef: {recommendation.target_value}% artış
            </p>
          </div>
        )}
      </div>

      {recommendation.tips && (
        <div className="mb-4">
          <h5 className="font-semibold text-gray-800 mb-2 flex items-center space-x-1">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span>İpuçları:</span>
          </h5>
          <ul className="space-y-1">
            {recommendation.tips.slice(0, 3).map((tip, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                <Sparkles className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-2">
        <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 btn-hover-lift text-sm font-medium flex items-center justify-center space-x-1">
          <span>Hedef Oluştur</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button 
          onClick={fetchRecommendation}
          className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-50 transition-colors duration-300 text-sm font-medium border border-purple-200"
        >
          Yenile
        </button>
      </div>
    </div>
  );
};

export default AIRecommendationCard;