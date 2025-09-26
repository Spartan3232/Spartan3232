import React, { useState } from 'react';
import { Calendar, TrendingUp, CheckCircle, Clock, Edit, BarChart3 } from 'lucide-react';
import { API } from '../App';
import axios from 'axios';

const GoalCard = ({ goal, index, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateProgress = async (newValue) => {
    setIsUpdating(true);
    try {
      await axios.put(`${API}/goals/${goal.id}/progress?current_value=${newValue}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Progress update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressPercentage = () => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getStatusColor = () => {
    const progress = getProgressPercentage();
    if (goal.status === 'completed') return 'text-green-600 bg-green-50 border-green-200';
    if (progress >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = () => {
    if (goal.status === 'completed') return CheckCircle;
    return Clock;
  };

  const StatusIcon = getStatusIcon();

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR');
    } catch {
      return 'Tarih belirtilmemiş';
    }
  };

  return (
    <div 
      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-300 animate-slide-in border-l-4 border-blue-500"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-semibold text-gray-900">{goal.title}</h4>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {goal.category}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">{goal.description}</p>
          {goal.subcategory && (
            <p className="text-xs text-blue-600 font-medium">📋 {goal.subcategory}</p>
          )}
        </div>
        
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-medium ${getStatusColor()}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{goal.status === 'completed' ? 'Tamamlandı' : 'Aktif'}</span>
        </div>
      </div>

      {/* Progress Bar with Interactive Update */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">İlerleme</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-gray-900">
              {getProgressPercentage().toFixed(0)}%
            </span>
            <button
              onClick={() => {
                const newValue = prompt('Yeni ilerleme değeri (0-' + goal.target_value + '):', goal.current_value);
                if (newValue !== null && !isNaN(newValue)) {
                  updateProgress(Number(newValue));
                }
              }}
              disabled={isUpdating}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <Edit className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
          {isUpdating && (
            <div className="absolute inset-0 bg-blue-200 animate-pulse rounded-full"></div>
          )}
        </div>
      </div>

      {/* Action Steps Preview */}
      {goal.action_steps && goal.action_steps.length > 0 && (
        <div className="mb-3 bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Aksiyon Adımları:</p>
          <div className="space-y-1">
            {goal.action_steps.slice(0, 2).map((step, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">{step}</p>
              </div>
            ))}
            {goal.action_steps.length > 2 && (
              <p className="text-xs text-blue-600 font-medium">+{goal.action_steps.length - 2} adım daha...</p>
            )}
          </div>
        </div>
      )}

      {/* Goal Details */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <BarChart3 className="w-4 h-4" />
            <span>{goal.current_value} / {goal.target_value}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(goal.deadline)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => updateProgress(goal.current_value + 10)}
            disabled={isUpdating || goal.status === 'completed'}
            className="text-green-600 hover:text-green-700 font-medium transition-colors duration-200 disabled:opacity-50 text-xs"
          >
            +10 İlerleme
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;