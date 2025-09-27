import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext, API } from '../App';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Brain, User, Zap, MessageCircle, Lightbulb, Target } from 'lucide-react';

const AICoach = () => {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickQuestions = [
    "Satış tekniklerimi nasıl geliştirebilirim?",
    "Müşteri itirazlarını nasıl yönetirim?",
    "Daha etkili ürün sunumu nasıl yaparım?",
    "Zaman yönetimimi nasıl iyileştirebilirim?",
    "İletişim becerilerimi geliştirmek istiyorum"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        user_id: user.id,
        message: message.trim(),
        context: `Son mesajlar: ${messages.slice(-3).map(m => `${m.type}: ${m.content}`).join('; ')}`
      });

      const aiMessage = {
        type: 'ai',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        type: 'ai',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date(),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col">
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
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Koç Asistanı</h1>
                <p className="text-blue-100">Satış performansınızı geliştirmek için uzman desteği</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <Brain className="w-20 h-20 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Koçunuzla Tanışın</h2>
                <p className="text-gray-600 mb-8">
                  Size özel koçluk desteği almak için sorularınızı sorun. İlaç satışından 
                  kişisel gelişime kadar her konuda yardımcı olmaya hazırım.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                    <Target className="w-8 h-8 text-blue-500 mb-2" />
                    <h4 className="font-semibold text-blue-800 mb-1">Hedef Odaklı</h4>
                    <p className="text-blue-600 text-sm">Spesifik hedeflerinize ulaşmanız için rehberlik</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                    <Zap className="w-8 h-8 text-purple-500 mb-2" />
                    <h4 className="font-semibold text-purple-800 mb-1">Anında Destek</h4>
                    <p className="text-purple-600 text-sm">7/24 koçluk desteği ve hızlı cevaplar</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                    <Lightbulb className="w-8 h-8 text-green-500 mb-2" />
                    <h4 className="font-semibold text-green-800 mb-1">Pratik Öneriler</h4>
                    <p className="text-green-600 text-sm">Uygulanabilir aksiyon adımları</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                    <MessageCircle className="w-8 h-8 text-orange-500 mb-2" />
                    <h4 className="font-semibold text-orange-800 mb-1">Kişisel Yaklaşım</h4>
                    <p className="text-orange-600 text-sm">Size özel koçluk stratejileri</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Hızlı Başlangıç Soruları</h3>
                  <div className="space-y-2">
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(question)}
                        className="block w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      >
                        <span className="text-gray-700 hover:text-blue-700">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Chat Messages
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : `bg-white text-gray-800 shadow-lg ${
                            message.isError ? 'border-l-4 border-red-500' : ''
                          }`
                    }`}
                  >
                    {message.type === 'ai' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-500">AI Koçunuz</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-lg px-4 py-3 rounded-2xl max-w-xs">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">AI Koçunuz</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-gray-600">Düşünüyor...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-white/20 bg-white/10 backdrop-blur-md p-6">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="AI koçunuza sorunuzu yazın..."
                className="w-full px-4 py-3 bg-white rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                rows="2"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-3 rounded-2xl hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2 text-center">
            Enter ile gönderin • AI koçunuz size özel tavsiyelerde bulunur
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICoach;