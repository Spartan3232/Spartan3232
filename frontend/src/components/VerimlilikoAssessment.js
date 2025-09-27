import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { X, CheckCircle, Brain, Target, Users, FileText, AlertCircle, Zap, TrendingUp } from 'lucide-react';

const VerimlilikoAssessment = ({ isOpen, onClose, onAssessmentCompleted }) => {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [performanceLevels, setPerformanceLevels] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessmentResult, setAssessmentResult] = useState(null);

  const performanceOptions = [
    { id: 'ustun', label: 'Üstün', color: 'bg-green-500', description: 'Rol model seviyesi, çok iyi performans' },
    { id: 'basarili', label: 'Başarılı', color: 'bg-blue-500', description: 'Hedefleri karşılıyor, iyi performans' },
    { id: 'gelismeli', label: 'Gelişmeli', color: 'bg-orange-500', description: 'Gelişim alanı var, destek gerekli' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchVerimlilikoTopics();
    }
  }, [isOpen]);

  const fetchVerimlilikoTopics = async () => {
    try {
      const response = await axios.get(`${API}/rota/verimlilik/topics`);
      setAvailableTopics(response.data.topics);
    } catch (err) {
      console.error('Topics fetch error:', err);
      setError('Konu başlıkları yüklenirken hata oluştu');
    }
  };

  const handleTopicSelection = (topic) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else if (prev.length < 8) { // Maximum 8 topic selection
        return [...prev, topic];
      }
      return prev;
    });
  };

  const handlePerformanceLevel = (topic, level) => {
    setPerformanceLevels(prev => ({
      ...prev,
      [topic]: level
    }));
  };

  const submitAssessment = async () => {
    if (selectedTopics.length === 0) {
      setError('En az bir konu seçmelisiniz');
      return;
    }

    // Check if all selected topics have performance levels
    const missingLevels = selectedTopics.filter(topic => !performanceLevels[topic]);
    if (missingLevels.length > 0) {
      setError('Tüm seçilen konular için performans seviyesi belirtmelisiniz');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const assessmentData = {
        user_id: user.id,
        coach_id: user.id, // For now, self-assessment
        selected_topics: selectedTopics,
        performance_levels: performanceLevels
      };

      const response = await axios.post(`${API}/coaching/assessment`, assessmentData);
      setAssessmentResult(response.data);
      setStep(4); // Move to results step
    } catch (err) {
      setError('Değerlendirme kaydedilirken hata oluştu');
      console.error('Assessment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAssessment = () => {
    setStep(1);
    setSelectedTopics([]);
    setPerformanceLevels({});
    setAssessmentResult(null);
    setError('');
  };

  const handleClose = () => {
    resetAssessment();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">VERİMLİLİK Koçluk Değerlendirmesi</h2>
              <p className="text-gray-600">Dr / Ecz Tanıtım Uygulamaları - ROTA Metodolojisi</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Topic Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  1. VERİMLİLİK Konularını Seçin (Maksimum 8)
                </h3>
                <p className="text-gray-600 mb-4">
                  Değerlendirmek istediğiniz Dr / Ecz Tanıtım Uygulamaları konularını seçin:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableTopics.map((topic, index) => (
                    <button
                      key={topic}
                      onClick={() => handleTopicSelection(topic)}
                      disabled={!selectedTopics.includes(topic) && selectedTopics.length >= 8}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedTopics.includes(topic)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 text-sm">{topic}</h4>
                        {selectedTopics.includes(topic) && (
                          <CheckCircle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  Seçilen: {selectedTopics.length}/8
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedTopics.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Devam Et
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Performance Level Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  2. Performans Seviyelerini Belirtin
                </h3>
                <p className="text-gray-600 mb-6">
                  Seçtiğiniz her konu için mevcut performans seviyesini değerlendirin:
                </p>

                <div className="space-y-6">
                  {selectedTopics.map((topic) => (
                    <div key={topic} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{topic}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {performanceOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handlePerformanceLevel(topic, option.id)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                              performanceLevels[topic] === option.id
                                ? `border-${option.color.split('-')[1]}-500 bg-${option.color.split('-')[1]}-50`
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                              <span className="font-medium text-gray-900">{option.label}</span>
                            </div>
                            <p className="text-xs text-gray-600">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Geri
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedTopics.some(topic => !performanceLevels[topic])}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Değerlendir
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review and Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  3. Değerlendirme Özeti
                </h3>
                <p className="text-gray-600 mb-6">
                  AI koçluk sisteminiz bu konular için detaylı geri bildirim ve gelişim planı hazırlayacak:
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {performanceOptions.map((option) => {
                      const count = Object.values(performanceLevels).filter(level => level === option.id).length;
                      return (
                        <div key={option.id} className="text-center">
                          <div className={`w-8 h-8 rounded-full ${option.color} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                            {count}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{option.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTopics.map((topic) => (
                    <div key={topic} className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-700">{topic}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        performanceLevels[topic] === 'ustun' ? 'bg-green-100 text-green-800' :
                        performanceLevels[topic] === 'basarili' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {performanceOptions.find(opt => opt.id === performanceLevels[topic])?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Geri
                </button>
                <button
                  onClick={submitAssessment}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner w-4 h-4"></div>
                      <span>AI Değerlendiriyor...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>AI Koçluk Al</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && assessmentResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <span>AI Koçluk Geri Bildirimi</span>
                </h3>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 border border-purple-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">GPT-5 Koç Analizi Tamamlandı</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    {selectedTopics.length} VERİMLİLİK konusu için ROTA metodolojisine uygun 
                    koçluk planınız hazırlandı. Detayları aşağıda bulabilirsiniz.
                  </p>
                </div>

                {assessmentResult.ai_feedback?.topic_feedbacks && (
                  <div className="space-y-6">
                    {Object.entries(assessmentResult.ai_feedback.topic_feedbacks).map(([topic, feedback]) => (
                      <div key={topic} className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="font-bold text-gray-900 mb-4 text-lg">{topic}</h4>
                        
                        {feedback.geri_bildirim && (
                          <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <h5 className="font-semibold text-blue-900 mb-2">Koçluk Geri Bildirimi:</h5>
                            <p className="text-blue-800 text-sm">{feedback.geri_bildirim}</p>
                          </div>
                        )}
                        
                        {feedback.gelisim_alani && feedback.gelisim_alani.length > 0 && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <h5 className="font-semibold text-green-900 mb-2">Gelişim Alanı:</h5>
                            <ul className="space-y-1">
                              {feedback.gelisim_alani.map((action, index) => (
                                <li key={index} className="text-green-800 text-sm flex items-start space-x-2">
                                  <Target className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {assessmentResult.action_plan && assessmentResult.action_plan.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <h5 className="font-bold text-orange-900 mb-3 flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Genel Aksiyon Planı:</span>
                    </h5>
                    <ul className="space-y-2">
                      {assessmentResult.action_plan.map((action, index) => (
                        <li key={index} className="text-orange-800 flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={resetAssessment}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Yeni Değerlendirme
                </button>
                <button
                  onClick={() => {
                    if (onAssessmentCompleted) onAssessmentCompleted();
                    handleClose();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                >
                  Tamamla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerimlilikoAssessment;