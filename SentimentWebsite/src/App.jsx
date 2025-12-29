import { useState, useEffect } from 'react';
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';
import LoginModal from './components/LoginModal';
import DataCollectionPage from './pages/DataCollectionPage';
import PreProcessingPage from './pages/PreProcessingPage';
import LabellingPage from './pages/LabellingPage';
import TFIDFPage from './pages/TFIDFPage';
import DataSplittingPage from './pages/DataSplittingPage';
import DataBalancingPage from './pages/DataBalancingPage';
import NaiveBayesPage from './pages/NaiveBayesPage';
import AnalysisPage from './pages/AnalysisPage';
import NaiveBayesPageTrain from './pages/NaiveBayesPageTrain ';
import api from '../api/axios';
import TestPage from './pages/TestPage';


export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Di dalam fungsi App(), tambahkan state jika belum ada
  const [testResults, setTestResults] = useState(null);

  // Existing states
  const [activeMenu, setActiveMenu] = useState('Data Collection YouTube');
  const [videoUrl, setVideoUrl] = useState('');
  const [maxComments, setMaxComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectedData, setCollectedData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [labelledData, setLabelledData] = useState([]);
  const [tfidfData, setTfIdfData] = useState(null);
  const [splitData, setSplitData] = useState(null);
  const [balancedData, setBalancedData] = useState([]);
  const [sentimentResults, setSentimentResults] = useState([]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setCurrentUser(response.data.username);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth failed:', error);
          localStorage.removeItem('token');
        }
      }
      
      setCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (username) => {
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const appState = {
    activeMenu,
    setActiveMenu,
    videoUrl,
    setVideoUrl,
    maxComments,
    setMaxComments,
    isLoading,
    setIsLoading,
    collectedData,
    setCollectedData,
    processedData,
    setProcessedData,
    labelledData,
    setLabelledData,
    tfidfData,
    setTfIdfData,
    splitData,
    setSplitData,
    balancedData,
    setBalancedData,
    sentimentResults,
    setSentimentResults,
    currentUser,
    testResults,
    setTestResults,
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'Data Collection YouTube':
        return <DataCollectionPage {...appState} />;
      case 'Pre Processing Data':
        return <PreProcessingPage {...appState} />;
      case 'Labelling Data':
        return <LabellingPage {...appState} />;
      case 'TF-IDF Vectorization':
        return <TFIDFPage {...appState} />;
      case 'Training':
        return <NaiveBayesPageTrain {...appState} />;
      case 'Uji Test':
        return <TestPage {...appState} />;
      default:
        return <DataCollectionPage {...appState} />;
    }
  };

  // Loading
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <h2 className="text-2xl font-bold">Loading...</h2>
        </div>
      </div>
    );
  }

  // Login
  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  // Main App
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} onLogout={handleLogout} />
        <Breadcrumb activeMenu={activeMenu} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
