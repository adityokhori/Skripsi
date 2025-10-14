import React, { useState, useEffect } from 'react';
import { Scissors, Database, TrendingUp, CheckCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react';

const DataSplittingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [splitResult, setSplitResult] = useState(null);
  const [splitRatio, setSplitRatio] = useState(80);
  const [randomState, setRandomState] = useState(42);
  const [stratify, setStratify] = useState(true);
  const [datasetInfo, setDatasetInfo] = useState(null);

  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  const fetchDatasetInfo = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/dataset-info");
      const data = await res.json();
      if (!data.error) {
        setDatasetInfo(data);
      }
    } catch (err) {
      console.error("Error fetching dataset info:", err);
    }
  };

  const handleSplit = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/split-data?test_size=${(100 - splitRatio) / 100}&random_state=${randomState}&stratify=${stratify}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSplitResult(data);
      }
    } catch (err) {
      setError("Gagal melakukan splitting data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Scissors className="h-8 w-8 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-800">Data Splitting</h2>
        </div>
        
        <p className="text-gray-600 mb-8">
          Memisahkan dataset menjadi data training dan testing untuk evaluasi model yang objektif. 
          Data training akan digunakan untuk balancing dan training model, sedangkan data testing untuk evaluasi.
        </p>

        {datasetInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="font-bold text-blue-900">Informasi Dataset</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Total Data</p>
                <p className="text-3xl font-bold text-blue-600">{datasetInfo.data.total}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Total Features (TF-IDF)</p>
                <p className="text-3xl font-bold text-purple-600">{datasetInfo.data.num_features}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {datasetInfo.data.distribution?.Positif || 0}
                </p>
                <p className="text-xs text-green-700">Positif ({datasetInfo.data.percentages?.Positif?.toFixed(1)}%)</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {datasetInfo.data.distribution?.Negatif || 0}
                </p>
                <p className="text-xs text-red-700">Negatif ({datasetInfo.data.percentages?.Negatif?.toFixed(1)}%)</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {datasetInfo.data.distribution?.Netral || 0}
                </p>
                <p className="text-xs text-gray-700">Netral ({datasetInfo.data.percentages?.Netral?.toFixed(1)}%)</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900">Train/Test Split</h4>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Memisahkan data menjadi training set untuk melatih model dan testing set untuk evaluasi.
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Training: untuk learning pattern</li>
              <li>• Testing: untuk validasi objektif</li>
              <li>• Mencegah overfitting</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-900">Stratified Split</h4>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Mempertahankan proporsi kelas yang sama di training dan testing set.
            </p>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>• Distribusi kelas terjaga</li>
              <li>• Evaluasi lebih representative</li>
              <li>• Cocok untuk imbalanced data</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-900">Random State</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Seed untuk reprodusibilitas hasil splitting yang konsisten.
            </p>
            <ul className="text-xs text-green-600 space-y-1">
              <li>• Hasil dapat direproduksi</li>
              <li>• Konsistensi eksperimen</li>
              <li>• Default: 42</li>
            </ul>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-indigo-900 mb-4">Konfigurasi Splitting</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Rasio Training/Testing: {splitRatio}% / {100 - splitRatio}%
              </label>
              <input
                type="range"
                min="60"
                max="90"
                step="5"
                value={splitRatio}
                onChange={(e) => setSplitRatio(Number(e.target.value))}
                disabled={isLoading}
                className="w-full h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>60/40</span>
                <span>70/30</span>
                <span className="font-bold text-blue-600">80/20</span>
                <span>85/15</span>
                <span>90/10</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Random State (Seed)
                </label>
                <input
                  type="number"
                  value={randomState}
                  onChange={(e) => setRandomState(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="42"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stratify}
                    onChange={(e) => setStratify(e.target.checked)}
                    disabled={isLoading}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Gunakan Stratified Split
                  </span>
                </label>
              </div>
            </div>
          </div>

          {datasetInfo && (
            <div className="mt-6 bg-white rounded-lg p-4 border-2 border-dashed border-blue-300">
              <p className="text-sm text-gray-700 mb-2 font-semibold">Prediksi Hasil Split:</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-blue-900 font-bold mb-1">Training Set</p>
                  <p className="text-blue-700">≈ {Math.round(datasetInfo.data.total * splitRatio / 100)} data</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-purple-900 font-bold mb-1">Testing Set</p>
                  <p className="text-purple-700">≈ {Math.round(datasetInfo.data.total * (100 - splitRatio) / 100)} data</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSplit}
          disabled={isLoading || !datasetInfo}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all text-lg ${
            isLoading || !datasetInfo
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses Splitting...</span>
            </div>
          ) : (
            "Split Dataset"
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {splitResult && (
          <div className="mt-6 space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                <CheckCircle className="mr-2 h-6 w-6" />
                Splitting Berhasil!
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-5 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-blue-900">Training Set</h4>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                      {splitResult.data.train_percentage}%
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-4">{splitResult.data.train_count} data</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Positif:</span>
                      <span className="font-bold text-green-600">{splitResult.data.train_distribution?.Positif || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">Negatif:</span>
                      <span className="font-bold text-red-600">{splitResult.data.train_distribution?.Negatif || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Netral:</span>
                      <span className="font-bold text-gray-600">{splitResult.data.train_distribution?.Netral || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-5 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-purple-900">Testing Set</h4>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                      {splitResult.data.test_percentage}%
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 mb-4">{splitResult.data.test_count} data</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Positif:</span>
                      <span className="font-bold text-green-600">{splitResult.data.test_distribution?.Positif || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">Negatif:</span>
                      <span className="font-bold text-red-600">{splitResult.data.test_distribution?.Negatif || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Netral:</span>
                      <span className="font-bold text-gray-600">{splitResult.data.test_distribution?.Netral || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">Konfigurasi yang Digunakan:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <p>• Random State: <span className="font-bold">{splitResult.data.random_state}</span></p>
                    <p>• Stratified: <span className="font-bold">{splitResult.data.stratified ? "Ya" : "Tidak"}</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h4 className="font-semibold text-indigo-900 mb-3">Langkah Selanjutnya</h4>
              <p className="text-sm text-indigo-800 mb-3">
                Data sudah berhasil di-split! Anda sekarang dapat melanjutkan ke tahap:
              </p>
              <ul className="text-sm text-indigo-700 space-y-2">
                <li className="flex items-center">
                  <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">1</span>
                  <span>Data Balancing pada Training Set untuk mengatasi imbalance</span>
                </li>
                <li className="flex items-center">
                  <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">2</span>
                  <span>Training model Naive Bayes menggunakan Training Set</span>
                </li>
                <li className="flex items-center">
                  <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">3</span>
                  <span>Evaluasi model menggunakan Testing Set yang belum pernah dilihat model</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {!datasetInfo && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Data Belum Tersedia</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Pastikan Anda sudah melakukan langkah-langkah berikut:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Get Comments dari YouTube</li>
                    <li>Pre-processing data</li>
                    <li>Auto Labelling sentimen</li>
                    <li>TF-IDF Vectorization</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-50 border rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-3">Penjelasan Teknis</h4>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">1. Train/Test Split:</h5>
              <p className="ml-4">
                Memisahkan dataset menjadi dua bagian: training set (untuk melatih model) dan testing set (untuk evaluasi). 
                Rasio umum adalah 80/20 atau 70/30. Testing set tidak boleh digunakan saat training untuk menghindari data leakage.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">2. Stratified Split:</h5>
              <p className="ml-4">
                Mempertahankan proporsi distribusi kelas yang sama antara training dan testing set. Sangat penting untuk 
                imbalanced dataset agar kedua set merepresentasikan distribusi populasi dengan baik.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">3. Random State:</h5>
              <p className="ml-4">
                Seed untuk random number generator yang memastikan hasil splitting dapat direproduksi. 
                Dengan random state yang sama, hasil split akan selalu identik, penting untuk reprodusibilitas penelitian.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSplittingPage;