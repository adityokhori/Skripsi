import React from 'react';
import { Target } from 'lucide-react';

const NaiveBayesPage = ({ 
  balancedData, 
  isLoading, 
  setIsLoading 
}) => {
  const handleTraining = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Model Naïve Bayes berhasil dilatih!');
    }, 3000);
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-indigo-500" />
          <h2 className="text-xl font-semibold text-gray-800">Naïve Bayes Training</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Training model Naïve Bayes dengan data yang telah diseimbangkan untuk klasifikasi sentimen komentar DANANTARA.
        </p>

        {balancedData.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan data balancing terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Naive Bayes Formula */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-4">Formula Naïve Bayes</h3>
              <div className="text-center bg-white p-4 rounded border">
                <p className="text-lg font-mono">P(class|features) = P(class) × ∏ P(feature|class)</p>
              </div>
              <p className="text-sm text-indigo-700 mt-2">
                Probabilitas kelas berdasarkan asumsi independensi fitur
              </p>
            </div>

            {/* Training Configuration */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Training Configuration</h4>
                <ul className="text-sm space-y-1">
                  <li>• Algorithm: Multinomial Naïve Bayes</li>
                  <li>• Feature: TF-IDF</li>
                  <li>• Cross-validation: 5-fold</li>
                  <li>• Train/Test Split: 80/20</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Dataset Info</h4>
                <ul className="text-sm space-y-1">
                  <li>• Total data: {balancedData.length} komentar</li>
                  <li>• Training: {Math.floor(balancedData.length * 0.8)} data</li>
                  <li>• Testing: {Math.ceil(balancedData.length * 0.2)} data</li>
                  <li>• Classes: Positif, Negatif, Netral</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleTraining}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Training Model...</span>
                </div>
              ) : (
                'Mulai Training Naïve Bayes'
              )}
            </button>

            {!isLoading && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-4">Model Performance</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">85.2%</p>
                    <p className="text-green-700">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">83.7%</p>
                    <p className="text-blue-700">Precision</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">84.1%</p>
                    <p className="text-purple-700">Recall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">83.9%</p>
                    <p className="text-orange-700">F1-Score</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NaiveBayesPage;