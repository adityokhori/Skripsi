import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';
import DataCollectionPage from './pages/DataCollectionPage';
import PreProcessingPage from './pages/PreProcessingPage';
import LabellingPage from './pages/LabellingPage';
import TFIDFPage from './pages/TFIDFPage';
import DataBalancingPage from './pages/DataBalancingPage';
import NaiveBayesPage from './pages/NaiveBayesPage';
import AnalysisPage from './pages/AnalysisPage';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('Data Collection YouTube');
  const [videoUrl, setVideoUrl] = useState('');
  const [maxComments, setMaxComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectedData, setCollectedData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [labelledData, setLabelledData] = useState([]);
  const [tfidfData, setTfIdfData] = useState(null);
  const [balancedData, setBalancedData] = useState([]);
  const [sentimentResults, setSentimentResults] = useState([]);

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
    balancedData,
    setBalancedData,
    sentimentResults,
    setSentimentResults,
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
      case 'Data Balancing':
        return <DataBalancingPage {...appState} />;
      case 'Naïve Bayes Training':
        return <NaiveBayesPage {...appState} />;
      case 'Analisis Sentimen':
        return <AnalysisPage {...appState} />;
      default:
        return <DataCollectionPage {...appState} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        <Breadcrumb activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}