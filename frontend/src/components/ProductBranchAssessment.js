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
  Package,
  Building,
  Zap
} from 'lucide-react';

const ProductBranchAssessment = () => {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const [systemData, setSystemData] = useState({
    products: {},
    branches: {},
    coachingAreas: {}
  });
  const [formData, setFormData] = useState({
    coaching_area: '',
    selected_product: '',
    selected_branch: '',
    performance_score: 75,
    strengths: [],
    improvement_areas: []
  });
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      const [productsRes, branchesRes, areasRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/coaching-areas`)
      ]);
      
      setSystemData({
        products: productsRes.data.products,
        branches: branchesRes.data.branches,
        coachingAreas: areasRes.data.areas
      });
    } catch (err) {
      console.error('System data fetch error:', err);
    }
  };

  const handleAreaSelection = (area) => {
    setFormData(prev => ({ ...prev, coaching_area: area }));
    setStep(2);
  };

  const handleProductBranchSelection = (product, branch) => {
    setFormData(prev => ({ 
      ...prev, 
      selected_product: product,
      selected_branch: branch 
    }));
    setStep(3);
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
    if (!formData.coaching_area || !formData.selected_product || !formData.selected_branch) {
      setError('Lütfen tüm seçimleri yapın');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const assessmentData = {
        user_id: user.id,
        coach_id: user.id,
        ...formData
      };

      const response = await axios.post(`${API}/assessment/product-branch`, assessmentData);
      setResult(response.data);
      setStep(5);
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
      selected_product: '',
      selected_branch: '',
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

  const getCompatibleBranches = (productKey) => {
    const product = systemData.products[productKey];
    if (!product || !product.target_branches) return Object.keys(systemData.branches);
    
    return product.target_branches.filter(branch => systemData.branches[branch]);
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
              <h1 className="text-2xl font-bold text-white">Ürün & Branş Değerlendirmesi</h1>
              <p className="text-blue-100">Spesifik ürün-branş kombinasyonu için AI koçluk</p>
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

        {/* Step 1: Coaching Area Selection */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Koçluk Alanını Seçin</h2>
              <p className="text-gray-600">Hangi alanda gelişmek istiyorsunuz?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(systemData.coachingAreas).map(([areaKey, area]) => (
                <button
                  key={areaKey}
                  onClick={() => handleAreaSelection(areaKey)}
                  className="p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left group"
                >
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600">{areaKey}</h3>
                  <p className="text-sm text-gray-600 mb-4">{area.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {area.key_skills?.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {area.product_specific && <Package className="w-3 h-3" />}
                    {area.branch_specific && <Building className="w-3 h-3" />}
                    <span>
                      {area.product_specific && area.branch_specific ? 'Ürün & Branş Spesifik' :
                       area.product_specific ? 'Ürün Spesifik' :
                       area.branch_specific ? 'Branş Spesifik' : 'Genel'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Product-Branch Selection */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Package className="w-12 h-12 text-green-500" />
                <span className="text-2xl font-bold text-gray-400">×</span>
                <Building className="w-12 h-12 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {formData.coaching_area} - Ürün & Branş Seçimi
              </h2>
              <p className="text-gray-600">Hangi ürün ve branş kombinasyonunu değerlendirmek istiyorsunuz?</p>
            </div>

            <div className="space-y-6">
              {Object.entries(systemData.products).map(([productKey, product]) => {
                const compatibleBranches = getCompatibleBranches(productKey);
                
                return (
                  <div key={productKey} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Package className="w-6 h-6 text-blue-500" />
                      <div>
                        <h3 className="font-bold text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {compatibleBranches.map((branchKey) => {
                        const branch = systemData.branches[branchKey];
                        if (!branch) return null;
                        
                        return (
                          <button
                            key={`${productKey}-${branchKey}`}
                            onClick={() => handleProductBranchSelection(productKey, branchKey)}
                            className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 text-left"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Building className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-gray-800 text-sm">{branch.name}</span>
                            </div>
                            <p className="text-xs text-gray-600">{branch.approach}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Geri
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Self Assessment */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="bg-green-100 px-3 py-1 rounded-full text-green-800 text-sm font-medium">
                  {systemData.products[formData.selected_product]?.name}
                </div>
                <span className="text-gray-400">+</span>
                <div className="bg-purple-100 px-3 py-1 rounded-full text-purple-800 text-sm font-medium">
                  {systemData.branches[formData.selected_branch]?.name}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Performans Değerlendirmesi</h2>
              <p className="text-gray-600">Bu ürün-branş kombinasyonundaki performansınızı değerlendirin</p>
            </div>

            <div className="space-y-8">
              {/* Performance Score */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Genel Performans: {formData.performance_score}/100
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.performance_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, performance_score: parseInt(e.target.value) }))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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

              {/* Strengths & Areas for Improvement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Güçlü Yönler (Max 4)
                  </h3>
                  <div className="space-y-2">
                    {systemData.coachingAreas[formData.coaching_area]?.key_skills?.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => handleSkillToggle(skill, 'strengths')}
                        disabled={!formData.strengths.includes(skill) && formData.strengths.length >= 4}
                        className={`w-full p-2 rounded-lg border transition-all duration-200 text-sm text-left ${
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

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Gelişim Alanları (Max 3)
                  </h3>
                  <div className="space-y-2">
                    {systemData.coachingAreas[formData.coaching_area]?.key_skills?.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => handleSkillToggle(skill, 'improvement_areas')}
                        disabled={!formData.improvement_areas.includes(skill) && formData.improvement_areas.length >= 3}
                        className={`w-full p-2 rounded-lg border transition-all duration-200 text-sm text-left ${
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
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={formData.strengths.length === 0 || formData.improvement_areas.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
              >
                Değerlendir
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Değerlendirme Özeti</h2>
              <p className="text-gray-600">AI koçunuz bu kombinasyon için özel geri bildirim hazırlayacak</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h4 className="font-bold text-gray-800 mb-4">Seçimleriniz</h4>
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="bg-green-100 px-4 py-2 rounded-lg">
                    <Package className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="font-semibold text-green-800">{systemData.products[formData.selected_product]?.name}</p>
                  </div>
                  <span className="text-2xl text-gray-400">×</span>
                  <div className="bg-purple-100 px-4 py-2 rounded-lg">
                    <Building className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="font-semibold text-purple-800">{systemData.branches[formData.selected_branch]?.name}</p>
                  </div>
                </div>
                <div className="bg-blue-100 px-4 py-2 rounded-lg inline-block">
                  <p className="font-semibold text-blue-800">{formData.coaching_area}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                onClick={submitAssessment}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>AI Analiz Ediyor...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>AI Koçluk Al</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 5 && result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Koç Geri Bildirimi</h2>
              <p className="text-gray-600">Ürün & branş spesifik koçluk planınız hazır</p>
            </div>

            <div className="space-y-6">
              {/* AI Feedback */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-3">
                  🤖 AI Koçunuzun Değerlendirmesi
                </h3>
                <div className="text-purple-700 whitespace-pre-line text-sm">
                  {result.ai_feedback}
                </div>
              </div>

              {/* ROTA Recommendations */}
              {result.rota_recommendations && result.rota_recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-3">
                    🎯 ROTA Metodolojisi Önerileri
                  </h3>
                  <ul className="space-y-2">
                    {result.rota_recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-3 text-sm">
                        <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1">
                          {index + 1}
                        </div>
                        <span className="text-blue-800">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Plan */}
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="font-bold text-green-800 mb-3">
                  ✅ Aksiyon Planı
                </h3>
                <ul className="space-y-2">
                  {result.action_plan.map((action, index) => (
                    <li key={index} className="flex items-start space-x-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <span className="text-green-800">{action}</span>
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
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 flex items-center space-x-2"
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

export default ProductBranchAssessment;