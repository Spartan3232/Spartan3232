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
      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-300 animate-slide-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{goal.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
        </div>
        
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-medium ${getStatusColor()}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{goal.status === 'completed' ? 'Tamamlandı' : 'Aktif'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">İlerleme</span>
          <span className="text-sm font-bold text-gray-900">
            {getProgressPercentage().toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Goal Details */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>{goal.current_value} / {goal.target_value}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(goal.deadline)}</span>
          </div>
        </div>
        
        <button className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200">
          Düzenle
        </button>
      </div>
    </div>
  );
};

export default GoalCard;