import React, { useState } from 'react';
import HealthMate from './health';
import { FiActivity, FiX, FiMessageSquare, FiImage, FiUpload, FiMinimize } from 'react-icons/fi';
import './App.css';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleChatbot = (prompt = '') => {
    setShowChatbot(!showChatbot);
    setInitialPrompt(prompt);
    setIsFullScreen(true); // Always open in full screen
  };

  const closeChatbot = () => {
    setShowChatbot(false);
    setIsFullScreen(false);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const features = [
    {
      icon: <FiMessageSquare className="feature-icon" />,
      title: "Medical Q&A",
      description: "Get answers to your health-related questions instantly",
      prompt: "I have a health-related question..."
    },
    {
      icon: <FiImage className="feature-icon" />,
      title: "Image Analysis",
      description: "Upload medical images for preliminary assessment",
      prompt: "I'd like to analyze a medical image..."
    },
    {
      icon: <FiUpload className="feature-icon" />,
      title: "Quick Reports",
      description: "Receive detailed analysis reports in seconds",
      prompt: "Generate a report about..."
    }
  ];

  return (
    <div className={`app-container ${isFullScreen ? 'chatbot-open' : ''}`}>
      {/* Main App Content (hidden when chatbot is open) */}
      {!isFullScreen && (
        <>
          <header className="app-header">
            <div className="header-content">
              <h1>HealthMate AI</h1>
              <p>Your Intelligent Medical Assistant</p>
            </div>
          </header>

          <main className="app-main">
            <div className="app-content">
              <div className="features-container">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="feature-card"
                    onClick={() => toggleChatbot(feature.prompt)}
                  >
                    {feature.icon}
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Chatbot Toggle Button */}
          <button 
            className="chatbot-toggle"
            onClick={() => toggleChatbot()}
          >
            <FiActivity className="toggle-icon" />
            <span className="toggle-text">HealthMate</span>
            <span className="notification-dot"></span>
          </button>

          <footer className="app-footer">
            <p>For informational purposes only. Not a substitute for professional medical advice.</p>
            <p className="disclaimer">
              Always consult with a qualified healthcare provider for diagnosis and treatment.
            </p>
          </footer>
        </>
      )}

      {/* Full-Screen Chatbot */}
      {showChatbot && (
        <div className="chatbot-fullscreen">
          <div className="chatbot-container">
            <div className="chatbot-header">
              <h3>HealthMate AI Assistant</h3>
              <div className="chatbot-controls">
                <button onClick={toggleFullScreen} className="control-button">
                  <FiMinimize />
                </button>
                <button onClick={closeChatbot} className="control-button close">
                  <FiX />
                </button>
              </div>
            </div>
            <div className="chatbot-content">
              <HealthMate initialPrompt={initialPrompt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;