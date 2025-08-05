import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiPaperclip, 
  FiSend, 
  FiImage, 
  FiUser, 
  FiActivity, 
  FiLoader,
  FiX,
  FiUpload,
  FiMessageCircle,
  FiHeart,
  FiShield,
  FiZap,
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiTrendingUp
} from 'react-icons/fi';
import './health.css';


const HealthMate = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "👋 Hello! I'm **HealthMate AI**, your intelligent medical image analysis assistant.\n\n🔬 I can analyze medical images including:\n• X-rays and scans\n• Skin conditions\n• Lab results\n• Medical photographs\n\n📤 Simply upload an image and ask your question!", 
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'welcome'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  // Enhanced quick action prompts with more medical focus
  const quickPrompts = [
    { 
      text: "Analyze this dermatology image", 
      icon: <FiCamera />, 
      category: "dermatology",
      color: "#10b981"
    },
    { 
      text: "Interpret these radiology findings", 
      icon: <FiShield />, 
      category: "radiology",
      color: "#3b82f6" 
    },
    { 
      text: "Compare with normal anatomy", 
      icon: <FiTrendingUp />, 
      category: "comparison",
      color: "#06b6d4"
    },
    { 
      text: "Identify potential abnormalities", 
      icon: <FiAlertCircle />, 
      category: "assessment",
      color: "#ef4444"
    },
    { 
      text: "Explain these lab results", 
      icon: <FiInfo />, 
      category: "explanation",
      color: "#8b5cf6"
    },
    { 
      text: "Suggest next diagnostic steps", 
      icon: <FiZap />, 
      category: "recommendation",
      color: "#f59e0b"
    }
  ];

  // Check screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom with smoother behavior
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    };
    
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Check API connection with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          setConnectionStatus('connected');
          retryCount = 0;
        } else {
          setConnectionStatus('error');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkConnection, 5000);
          }
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkConnection, 5000);
        }
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Progress simulation with more realistic timing
  const simulateProgress = useCallback(() => {
    setAnalysisProgress(0);
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 8 + 3; // Slower, more realistic progress
      });
    }, 400);
    return interval;
  }, []);

  const addMessage = (message) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const sendToBackend = async (message, imageFile = null) => {
    let progressInterval;
    
    try {
      progressInterval = imageFile ? simulateProgress() : null;
      
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('prompt', message);

        const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (progressInterval) {
          clearInterval(progressInterval);
          setAnalysisProgress(100);
        }
        
        if (data.status === 'success' && data.results) {
          let responseText = "🔬 **Medical Image Analysis Complete**\n\n";
          
          Object.entries(data.results).forEach(([key, result]) => {
            if (result.status === 'success') {
              responseText += `${result.response}\n\n`;
            } else {
              responseText += `❌ Analysis failed - ${result.error}\n\n`;
            }
          });
          
          responseText += "⚠️ **Medical Disclaimer:** This AI analysis is for informational purposes only. Please consult healthcare professionals for medical advice.";
          
          return { text: responseText, type: 'analysis' };
        } else {
          return { 
            text: `❌ **Analysis Failed**\n\n${data.error || 'Unknown error occurred'}\n\nPlease try again or check your connection.`, 
            type: 'error' 
          };
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();
        
        if (data.status === 'success') {
          return { text: data.response, type: 'chat' };
        } else {
          return { 
            text: `❌ **Error:** ${data.error || 'Unknown error occurred'}`, 
            type: 'error' 
          };
        }
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Backend communication error:', error);
      
      return { 
        text: `🔌 **Connection Error**\n\nUnable to connect to the medical analysis server.\n\n**Troubleshooting:**\n• Check if the backend server is running on ${API_BASE_URL}\n• Verify your internet connection\n• Try refreshing the page`, 
        type: 'error' 
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !attachment) return;

    const userMessage = {
      text: inputValue || "Please analyze this medical image",
      sender: 'user',
      attachment: attachment
    };

    addMessage(userMessage);
    
    const messageText = inputValue;
    const imageFile = attachment?.file || null;
    
    setInputValue('');
    setAttachment(null);
    setIsTyping(true);
    setIsAnalyzing(!!imageFile);
    setShowQuickActions(false);

    try {
      const response = await sendToBackend(messageText, imageFile);
      
      setTimeout(() => {
        addMessage({
          ...response,
          sender: 'bot'
        });
        setIsTyping(false);
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 500);
      
    } catch (error) {
      addMessage({
        text: `❌ **Unexpected Error**\n\n${error.message}`,
        sender: 'bot',
        type: 'error'
      });
      setIsTyping(false);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      addMessage({
        text: "❌ Please select a valid image file (JPEG, PNG, GIF, BMP, WebP)",
        sender: 'bot',
        type: 'error'
      });
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      addMessage({
        text: "❌ File size too large. Please select an image under 16MB.",
        sender: 'bot',
        type: 'error'
      });
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    
    setAttachment({
      type: 'image',
      url: fileUrl,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      file: file
    });
    setShowAttachmentOptions(false);
    
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const renderMessage = (msg) => {
    const isBot = msg.sender === 'bot';
    const messageClass = `healthmate-message ${msg.sender} ${msg.type || ''}`;
    
    return (
      <div key={msg.id} className={messageClass}>
        <div className="message-avatar">
          {isBot ? <FiActivity size={18} /> : <FiUser size={18} />}
        </div>
        <div className="message-content">
          <div className="message-text">
            {formatMessageText(msg.text)}
          </div>
          {msg.attachment && renderAttachment(msg.attachment)}
          <div className="message-time">{msg.timestamp}</div>
        </div>
      </div>
    );
  };

  const formatMessageText = (text) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={index} className="message-bold">{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('• ')) {
        return <div key={index} className="message-bullet">{line}</div>;
      }
      if (line.startsWith('🔬') || line.startsWith('⚠️') || line.startsWith('❌')) {
        return <div key={index} className="message-highlight">{line}</div>;
      }
      return <div key={index}>{line || <br />}</div>;
    });
  };

  const renderAttachment = (attachment) => {
    if (attachment.type === 'image') {
      return (
        <div className="attachment-preview image-attachment">
          <img src={attachment.url} alt={attachment.name} />
          <div className="attachment-info">
            <span className="attachment-name">{attachment.name}</span>
            <span className="attachment-size">{attachment.size}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <FiCheckCircle className="status-icon connected" />;
      case 'disconnected':
        return <FiX className="status-icon disconnected" />;
      case 'error':
        return <FiAlertCircle className="status-icon error" />;
      default:
        return <FiLoader className="status-icon checking spinning" />;
    }
  };

  return (
    <div className="healthmate-chatbot">
      {/* Header */}
      <div className="healthmate-header">
        <div className="healthmate-logo">
          <FiActivity size={28} />
        </div>
        <div className="header-text">
          <h1>HealthMate AI</h1>
          <p>Medical Image Analysis Assistant</p>
        </div>
        <div className="connection-status">
          {getConnectionStatusIcon()}
          <span className={`status-text ${connectionStatus}`}>
            {connectionStatus === 'connected' ? 'Online' : 
             connectionStatus === 'disconnected' ? 'Offline' :
             connectionStatus === 'error' ? 'Error' : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className={`healthmate-messages ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        ref={dropZoneRef}
      >
        {dragOver && (
          <div className="drop-overlay">
            <FiUpload size={48} />
            <h3>Drop medical image here</h3>
            <p>Supports JPEG, PNG, GIF, BMP, WebP</p>
          </div>
        )}
        
        {messages.map(renderMessage)}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="healthmate-typing">
            <div className="message-avatar">
              <FiActivity size={18} />
            </div>
            <div className="typing-content">
              {isAnalyzing ? (
                <div className="analysis-indicator">
                  <div className="analysis-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <FiLoader className="spinning" size={16} />
                      <span>Analyzing medical image... {Math.round(analysisProgress)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="healthmate-input-container">
        {/* Attachment Preview */}
        {attachment && (
          <div className="attachment-preview-container">
            <div className="attachment-preview">
              {renderAttachment(attachment)}
              <button 
                className="remove-attachment"
                onClick={() => setAttachment(null)}
                title="Remove image"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions - Only show when no attachment and not on mobile */}
        {showQuickActions && !attachment && !isMobile && (
          <div className="quick-actions-container">
            <h4>💡 Quick Analysis Prompts:</h4>
            <div className="quick-actions">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  style={{ '--accent-color': prompt.color }}
                  onClick={() => {
                    setInputValue(prompt.text);
                    inputRef.current?.focus();
                  }}
                  disabled={isTyping}
                >
                  {prompt.icon}
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input Row */}
        <div className="healthmate-input">
          <button 
            className="attachment-button"
            onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
            title="Attach medical image"
            disabled={isTyping}
          >
            <FiPaperclip size={20} />
          </button>
          
          {showAttachmentOptions && (
            <div className="attachment-options">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="attachment-option"
              >
                <FiImage size={16} />
                <span>Choose Image</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="attachment-option"
              >
                <FiCamera size={16} />
                <span>Medical Photo</span>
              </button>
            </div>
          )}
          
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={attachment ? "Describe what you'd like me to analyze..." : "Ask about medical images or type your question..."}
              className="message-input"
              disabled={isTyping}
              rows="1"
            />
          </div>
          
          <button 
            className="send-button"
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !attachment) || isTyping}
            title="Send message"
          >
            {isTyping ? (
              <FiLoader size={20} className="spinning" />
            ) : (
              <FiSend size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default HealthMate;