import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Brain, 
  CheckCircle, 
  Target, 
  Award,
  Lightbulb,
  TrendingUp,
  Users,
  Clock,
  MessageCircle,
  Zap
} from 'lucide-react';

const QuickAssessment = () => {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const [coachingAreas, setCoachingAreas] = useState({});
  const [formData, setFormData] = useState({
    coaching_area: '',
    performance_score: 75,
    strengths: [],
    improvement_areas: []
  });
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoachingAreas();
  }, []);

  const fetchCoachingAreas = async () => {
    try {
      const response = await axios.get(`${API}/coaching-areas`);
      setCoachingAreas(response.data.areas);
    } catch (err) {
      console.error('Areas fetch error:', err);
    }
  };

  const handleAreaSelection = (area) => {
    setFormData(prev => ({ ...prev, coaching_area: area }));
    setStep(2);
  };

  const handleSkillToggle = (skill, type) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].includes(skill)
        ? prev[type].filter(s => s !== skill)
        : [...prev[type], skill]
    }));
  };

  const submitAssessment = async () => {
    if (!formData.coaching_area) {
      setError('Lütfen bir koçluk alanı seçin');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const assessmentData = {
        user_id: user.id,
        coach_id: user.id, // Self-assessment for now
        ...formData
      };

      const response = await axios.post(`${API}/assessment`, assessmentData);
      setResult(response.data);
      setStep(4);
    } catch (err) {
      setError('Değerlendirme kaydedilirken hata oluştu');
      console.error('Assessment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAssessment = () => {
    setStep(1);
    setFormData({
      coaching_area: '',
      performance_score: 75,
      strengths: [],
      improvement_areas: []
    });
    setResult(null);
    setError('');
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPerformanceText = (score) => {
    if (score >= 90) return 'Mükemmel';
    if (score >= 75) return 'İyi';
    if (score >= 60) return 'Gelişiyor';
    return 'Destek Gerekli';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Hızlı Değerlendirme</h1>
              <p className="text-blue-100">5 dakikada AI destekli performans analizi</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Area Selection */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <Zap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Hangi alanda değerlendirme yapmak istiyorsunuz?</h2>
              <p className="text-gray-600">Gelişmek istediğiniz koçluk alanını seçin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(coachingAreas).map(([area, data]) => (
                <button
                  key={area}
                  onClick={() => handleAreaSelection(area)}
                  className="p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left group"
                >
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600">{area}</h3>
                  <p className="text-sm text-gray-600 mb-4">{data.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.key_skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Self-Assessment */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {formData.coaching_area} - Kendini Değerlendir
              </h2>
              <p className="text-gray-600">Mevcut performansınızı objektif olarak değerlendirin</p>
            </div>

            <div className="space-y-8">
              {/* Performance Score */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Genel Performans Puanı: {formData.performance_score}/100
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.performance_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, performance_score: parseInt(e.target.value) }))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>Başlangıç</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-white ${getPerformanceColor(formData.performance_score)}`}>
                      {getPerformanceText(formData.performance_score)}
                    </span>
                    <span>Uzman</span>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Güçlü Yönleriniz (En fazla 4 tane seçin)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coachingAreas[formData.coaching_area]?.key_skills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill, 'strengths')}
                      disabled={!formData.strengths.includes(skill) && formData.strengths.length >= 4}
                      className={`p-3 rounded-lg border transition-all duration-200 text-sm ${
                        formData.strengths.includes(skill)
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : 'bg-gray-50 border-gray-200 hover:border-green-300 disabled:opacity-50'
                      }`}
                    >
                      {skill}
                      {formData.strengths.includes(skill) && (
                        <CheckCircle className="w-4 h-4 inline ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Improvement Areas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Gelişim Alanlarınız (En fazla 3 tane seçin)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coachingAreas[formData.coaching_area]?.key_skills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill, 'improvement_areas')}
                      disabled={!formData.improvement_areas.includes(skill) && formData.improvement_areas.length >= 3}
                      className={`p-3 rounded-lg border transition-all duration-200 text-sm ${
                        formData.improvement_areas.includes(skill)
                          ? 'bg-orange-100 border-orange-500 text-orange-800'
                          : 'bg-gray-50 border-gray-200 hover:border-orange-300 disabled:opacity-50'
                      }`}
                    >
                      {skill}
                      {formData.improvement_areas.includes(skill) && (
                        <Target className="w-4 h-4 inline ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={formData.strengths.length === 0 || formData.improvement_areas.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-300"
              >
                Devam Et
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Değerlendirme Özeti</h2>
              <p className="text-gray-600">AI koçunuz bu bilgilere dayanarak size özel geri bildirim hazırlayacak</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="font-bold text-green-800 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Güçlü Yönler
                </h3>
                <ul className="space-y-2">
                  {formData.strengths.map((strength) => (
                    <li key={strength} className="flex items-center text-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Gelişim Alanları
                </h3>
                <ul className="space-y-2">
                  {formData.improvement_areas.map((area) => (
                    <li key={area} className="flex items-center text-orange-700">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h4 className="font-bold text-gray-800 mb-2">
                  {formData.coaching_area} - Performans Puanı
                </h4>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white font-bold text-lg ${getPerformanceColor(formData.performance_score)}`}>
                  {formData.performance_score}/100
                </div>
                <p className="text-gray-600 mt-2">{getPerformanceText(formData.performance_score)}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                onClick={submitAssessment}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-300 flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>AI Analiz Ediyor...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>AI Geri Bildirimi Al</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Koç Geri Bildirimi</h2>
              <p className="text-gray-600">Kişiselleştirilmiş gelişim planınız hazır</p>
            </div>

            <div className="space-y-6">
              {/* AI Feedback */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  AI Koçunuzun Değerlendirmesi
                </h3>
                <div className="text-purple-700 whitespace-pre-line">
                  {result.ai_feedback}
                </div>
              </div>

              {/* Action Plan */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Aksiyon Planı
                </h3>
                <ul className="space-y-3">
                  {result.action_plan.map((action, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1">
                        {index + 1}
                      </div>
                      <span className="text-blue-800">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={resetAssessment}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Yeni Değerlendirme
              </button>
              <Link
                to="/dashboard"
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 flex items-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Dashboard'a Dön</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAssessment;