import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import Sidebar from './Sidebar';
import { Send, Bot, User, Zap, Brain, Sparkles, MessageSquare } from 'lucide-react';

const AIChat = () => {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const models = [
    { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', icon: '🤖', color: 'from-blue-500 to-blue-600' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', icon: '🧠', color: 'from-purple-500 to-purple-600' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', icon: '✨', color: 'from-green-500 to-green-600' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchChatHistory();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/${user.id}`);
      setChatHistory(response.data);
      
      // Convert history to messages format
      const formattedMessages = [];
      response.data.forEach(chat => {
        formattedMessages.push({
          type: 'user',
          content: chat.message,
          timestamp: chat.timestamp
        });
        formattedMessages.push({
          type: 'ai',
          content: chat.response,
          model: chat.model_used,
          timestamp: chat.timestamp
        });
      });
      
      setMessages(formattedMessages.reverse());
    } catch (err) {
      console.error('Chat history fetch error:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        user_id: user.id,
        message: userMessage.content,
        model: selectedModel
      });

      const aiMessage = {
        type: 'ai',
        content: response.data.response,
        model: response.data.model_used,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Send message error:', err);
      const errorMessage = {
        type: 'ai',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        model: selectedModel,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getModelIcon = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model?.icon || '🤖';
  };

  const getModelColor = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model?.color || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 flex flex-col">
        {/* Header */}
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-b border-white border-opacity-20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Koçluk Asistanı</h1>
                <p className="text-blue-100">Satış hedeflerinizi gerçekleştirmek için uzman desteği</p>
              </div>
            </div>
            
            {/* Model Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-white text-sm font-medium">Model:</span>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id} className="text-gray-800">
                    {model.icon} {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-2xl shadow-strong p-8 animate-fade-in">
                  <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">AI Koçunuzla Sohbete Başlayın</h3>
                  <p className="text-gray-600 mb-6">
                    Satış teknikleri, müşteri ilişkileri, motivasyon ve daha fazlası hakkında 
                    uzman tavsiyeleri almak için sorularınızı sorun.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
                      <h4 className="font-semibold text-blue-800 mb-1">Satış Teknikleri</h4>
                      <p className="text-blue-600 text-sm">Etkili satış stratejileri öğrenin</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <Zap className="w-8 h-8 text-green-500 mb-2" />
                      <h4 className="font-semibold text-green-800 mb-1">Motivasyon</h4>
                      <p className="text-green-600 text-sm">Hedeflerinize odaklanın</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                      <Brain className="w-8 h-8 text-purple-500 mb-2" />
                      <h4 className="font-semibold text-purple-800 mb-1">İletişim</h4>
                      <p className="text-purple-600 text-sm">Müşteri ilişkilerini geliştirin</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                      : `bg-white text-gray-800 shadow-soft ${message.isError ? 'border-l-4 border-red-500' : ''}`
                  } chat-bubble`}>
                    {message.type === 'ai' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getModelColor(message.model)} flex items-center justify-center text-white text-xs`}>
                          {getModelIcon(message.model)}
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {models.find(m => m.id === message.model)?.name || 'AI Koç'}
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white text-gray-800 shadow-soft px-4 py-3 rounded-2xl max-w-xs">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getModelColor(selectedModel)} flex items-center justify-center text-white text-xs`}>
                      {getModelIcon(selectedModel)}
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {models.find(m => m.id === selectedModel)?.name || 'AI Koç'}
                    </span>
                  </div>
                  <div className="typing-animation text-gray-600">Düşünüyor</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-white border-opacity-20 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Satış koçunuza sorunuzu yazın..."
                  className="w-full px-4 py-3 bg-white rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 resize-none"
                  rows="2"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white p-3 rounded-2xl hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-hover-lift"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-blue-100 text-sm mt-2 text-center">
              Enter ile gönderin • Shift+Enter ile yeni satır
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;