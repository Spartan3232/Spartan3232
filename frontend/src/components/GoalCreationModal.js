import React, { useState, useEffect, useContext } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { X, Target, Zap, Calendar, CheckSquare, Brain, Lightbulb } from 'lucide-react';

const GoalCreationModal = ({ isOpen, onClose, onGoalCreated }) => {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const [rotaFramework, setRotaFramework] = useState({});
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    target_value: 100,
    deadline: '',
    action_steps: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchRotaFramework();
    }
  }, [isOpen]);

  const fetchRotaFramework = async () => {
    try {
      const response = await axios.get(`${API}/rota/framework`);
      setRotaFramework(response.data.framework);
    } catch (err) {
      console.error('ROTA framework fetch error:', err);
    }
  };

  const getAISuggestion = async () => {
    if (!formData.category) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API}/ai/suggest-goal?user_id=${user.id}&focus_area=${formData.category}&experience_level=orta`
      );
      
      if (response.data.suggestion) {
        const suggestion = response.data.suggestion;
        setAiSuggestion(suggestion);
        
        // Auto-fill form with AI suggestion
        setFormData(prev => ({
          ...prev,
          title: suggestion.title || prev.title,
          description: suggestion.description || prev.description,
          category: suggestion.category || prev.category,
          subcategory: suggestion.subcategory || prev.subcategory,
          target_value: suggestion.target_value || prev.target_value,
          deadline: suggestion.suggested_deadline || prev.deadline,
          action_steps: suggestion.action_steps || []
        }));
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError('AI önerisi alınırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.deadline) {
      setError('Lütfen zorunlu alanları doldurun');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const goalData = {
        ...formData,
        user_id: user.id
      };

      await axios.post(`${API}/goals`, goalData);
      onGoalCreated();
      onClose();
      resetForm();
    } catch (err) {
      setError('Hedef oluşturulurken hata oluştu');
      console.error('Goal creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      title: '',
      description: '',
      category: '',
      subcategory: '',
      target_value: 100,
      deadline: '',
      action_steps: []
    });
    setAiSuggestion(null);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addActionStep = () => {
    setFormData(prev => ({
      ...prev,
      action_steps: [...prev.action_steps, '']
    }));
  };

  const updateActionStep = (index, value) => {
    setFormData(prev => ({
      ...prev,
      action_steps: prev.action_steps.map((step, i) => i === index ? value : step)
    }));
  };

  const removeActionStep = (index) => {
    setFormData(prev => ({
      ...prev,
      action_steps: prev.action_steps.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 p-2 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ROTA Hedef Oluştur</h2>
              <p className="text-gray-600">Hedef Bazlı Koçluk Metodolojisi</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  1. ROTA Kategorisi Seçin
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(rotaFramework).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, category, subcategory: '' }));
                        setStep(2);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.category === category
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {category === 'ETKİNLİK' ? (
                          <Zap className="w-6 h-6 text-orange-500" />
                        ) : (
                          <Brain className="w-6 h-6 text-purple-500" />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{category}</h4>
                          <p className="text-sm text-gray-600">
                            {category === 'ETKİNLİK' 
                              ? 'Bilgi ve planlama odaklı gelişim' 
                              : 'Sunum ve iletişim becerileri'
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subcategory and AI Suggestion */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  2. {formData.category} Alt Alanı Seçin
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {rotaFramework[formData.category] && 
                    Object.keys(rotaFramework[formData.category]).map((subcategory) => (
                      <button
                        key={subcategory}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, subcategory }));
                          setStep(3);
                          setTimeout(getAISuggestion, 500);
                        }}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                          formData.subcategory === subcategory
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900">{subcategory}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {rotaFramework[formData.category][subcategory][0]}
                        </p>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Geri
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Goal Details with AI Suggestion */}
          {step === 3 && (
            <div className="space-y-6">
              {/* AI Suggestion Card */}
              {isLoading ? (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
                    <span className="font-medium text-purple-800">AI Önerisi Hazırlanıyor...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-purple-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-purple-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                </div>
              ) : aiSuggestion && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">AI Koç Önerisi</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{aiSuggestion.title}</h4>
                  <p className="text-sm text-gray-700 mb-3">{aiSuggestion.description}</p>
                  
                  {aiSuggestion.action_steps && (
                    <div className="mb-3">
                      <p className="font-medium text-gray-800 mb-2">Önerilen Adımlar:</p>
                      <ul className="space-y-1">
                        {aiSuggestion.action_steps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                            <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={getAISuggestion}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Yeni Öneri Al
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hedef Başlığı *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Ürün Bilgisi Geliştirme"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hedef Değeri (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="100"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hedefinizi detaylı olarak açıklayın..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamamlanma Tarihi *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Action Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Aksiyon Adımları
                  </label>
                  <button
                    type="button"
                    onClick={addActionStep}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Adım Ekle
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.action_steps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => updateActionStep(index, e.target.value)}
                        placeholder={`Adım ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeActionStep(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Geri
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isLoading ? 'Oluşturuluyor...' : 'Hedef Oluştur'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default GoalCreationModal;