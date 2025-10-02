import React, { useState, useEffect } from 'react';
import { Scale, BarChart3, TrendingUp, Zap, Filter, Database, Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const DataBalancingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState(null);
  const [balancedResult, setBalancedResult] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("both");
  const [dataMode, setDataMode] = useState("original");
  const [points, setPoints] = useState([]);
  const [imbalancedPoints, setImbalancedPoints] = useState([]);
  const [balancedPoints, setBalancedPoints] = useState([]);
  
  useEffect(() => {
    fetchComparison();
  }, []);

  const fetchComparison = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/dataset-comparison");
      const data = await res.json();
      if (!data.error) {
        setComparison(data);
      }
    } catch (err) {
      console.error("Error fetching comparison:", err);
    }
  };

  const fetchVisualization = async () => {
    try {
      const res1 = await fetch("http://127.0.0.1:8000/visualize-distribution?mode=original");
      const data1 = await res1.json();
      if (!data1.error) setImbalancedPoints(data1.points);
  
      const res2 = await fetch("http://127.0.0.1:8000/visualize-distribution?mode=balanced");
      const data2 = await res2.json();
      if (!data2.error) setBalancedPoints(data2.points);
    } catch (err) {
      console.error("Error fetching visualization:", err);
    }
  };
  
  useEffect(() => {
    fetchVisualization();
  }, []);
  
  
  const handleBalancing = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/apply-balancing?method=${selectedMethod}`, {
        method: "POST",
      });
      const data = await res.json();
  
      if (data.error) {
        setError(data.error);
      } else {
        setBalancedResult(data);
        await fetchComparison();
        setDataMode("balanced");
  
        // 🔥 fetch ulang scatter plot supaya grafik balanced muncul
        await fetchVisualization();
      }
    } catch (err) {
      setError("Gagal melakukan balancing");
    } finally {
      setIsLoading(false);
    }
  };
  

  const currentData = dataMode === "balanced" && comparison?.balanced?.exists
    ? comparison.balanced
    : comparison?.original;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Scale className="h-8 w-8 text-purple-500" />
          <h2 className="text-2xl font-bold text-gray-800">Data Balancing</h2>
        </div>
        
        <p className="text-gray-600 mb-8">
          Mengatasi ketidakseimbangan data menggunakan Random Undersampling dan Tomek Link 
          untuk meningkatkan performa model Naïve Bayes dalam analisis sentimen.
        </p>

        {comparison?.balanced?.exists && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-700">Mode Dataset:</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDataMode("original")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dataMode === "original"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Original (Imbalanced)
                </button>
                <button
                  onClick={() => setDataMode("balanced")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dataMode === "balanced"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Balanced
                </button>
              </div>
            </div>
          </div>
        )}

        {currentData && (
          <div className={`border rounded-lg p-6 mb-6 ${
            dataMode === "balanced" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${
                dataMode === "balanced" ? "text-green-900" : "text-yellow-900"
              }`}>
                📊 Distribusi Data {dataMode === "balanced" ? "(Balanced)" : "(Original)"}
              </h3>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                dataMode === "balanced" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                Total: {currentData.total} data
              </span>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-green-600">
                  {currentData.distribution?.Positif || 0}
                </p>
                <p className="text-green-700 font-medium">Positif</p>
                <p className="text-sm text-gray-500">
                  {currentData.percentages?.Positif?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-red-600">
                  {currentData.distribution?.Negatif || 0}
                </p>
                <p className="text-red-700 font-medium">Negatif</p>
                <p className="text-sm text-gray-500">
                  {currentData.percentages?.Negatif?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-gray-600">
                  {currentData.distribution?.Netral || 0}
                </p>
                <p className="text-gray-700 font-medium">Netral</p>
                <p className="text-sm text-gray-500">
                  {currentData.percentages?.Netral?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded p-3">
              <div className="flex h-6 rounded overflow-hidden">
                <div 
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{width: `${currentData.percentages?.Positif || 0}%`}}
                >
                  {currentData.percentages?.Positif > 10 && `${currentData.percentages?.Positif.toFixed(1)}%`}
                </div>
                <div 
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{width: `${currentData.percentages?.Negatif || 0}%`}}
                >
                  {currentData.percentages?.Negatif > 10 && `${currentData.percentages?.Negatif.toFixed(1)}%`}
                </div>
                <div 
                  className="bg-gray-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{width: `${currentData.percentages?.Netral || 0}%`}}
                >
                  {currentData.percentages?.Netral > 10 && `${currentData.percentages?.Netral.toFixed(1)}%`}
                </div>
              </div>
            </div>

            {dataMode === "original" && currentData.total > 0 && (
              <p className="text-yellow-800 mt-4 text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                Data tidak seimbang - dapat menyebabkan bias dalam model
              </p>
            )}
            
            {dataMode === "balanced" && (
              <p className="text-green-800 mt-4 text-sm flex items-center">
                <span className="mr-2">✅</span>
                Data sudah diseimbangkan - distribusi yang lebih merata
              </p>
            )}
          </div>
        )}

        {comparison?.balanced?.exists && (
          <div className="bg-gray-50 border rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-purple-600" />
              Perbandingan Dataset
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border-2 border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-3">Sebelum Balancing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Data:</span>
                    <span className="font-bold">{comparison.original.total}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Positif:</span>
                    <span className="font-bold">{comparison.original.distribution.Positif || 0}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Negatif:</span>
                    <span className="font-bold">{comparison.original.distribution.Negatif || 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Netral:</span>
                    <span className="font-bold">{comparison.original.distribution.Netral || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">Sesudah Balancing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Data:</span>
                    <span className="font-bold">{comparison.balanced.total}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Positif:</span>
                    <span className="font-bold">{comparison.balanced.distribution.Positif || 0}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Negatif:</span>
                    <span className="font-bold">{comparison.balanced.distribution.Negatif || 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Netral:</span>
                    <span className="font-bold">{comparison.balanced.distribution.Netral || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900">Random Undersampling</h4>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Mengurangi data kelas mayoritas secara acak untuk menyeimbangkan distribusi.
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Mengurangi overfitting pada kelas mayoritas</li>
              <li>• Mempercepat waktu training model</li>
              <li>• Distribusi kelas menjadi seimbang</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-900">Tomek Link</h4>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Menghapus pasangan data terdekat dari kelas berbeda untuk membersihkan decision boundary.
            </p>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>• Membersihkan noise pada data</li>
              <li>• Meningkatkan separabilitas antar kelas</li>
              <li>• Mengurangi ambiguitas klasifikasi</li>
            </ul>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-indigo-900 mb-4">⚙️ Pilih Metode Balancing</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <button
              onClick={() => setSelectedMethod("undersampling")}
              disabled={isLoading}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMethod === "undersampling"
                  ? "border-blue-500 bg-blue-100 text-blue-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold text-sm">Undersampling</div>
              <div className="text-xs mt-1">Only</div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("tomek")}
              disabled={isLoading}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMethod === "tomek"
                  ? "border-purple-500 bg-purple-100 text-purple-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold text-sm">Tomek Link</div>
              <div className="text-xs mt-1">Only</div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("both")}
              disabled={isLoading}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMethod === "both"
                  ? "border-green-500 bg-green-100 text-green-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold text-sm">Both</div>
              <div className="text-xs mt-1">Kombinasi</div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("none")}
              disabled={isLoading}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMethod === "none"
                  ? "border-gray-500 bg-gray-100 text-gray-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold text-sm">None</div>
              <div className="text-xs mt-1">Tanpa Balancing</div>
            </button>
          </div>
        </div>

        <button
          onClick={handleBalancing}
          disabled={isLoading || !comparison?.original?.total}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all text-lg ${
            isLoading || !comparison?.original?.total
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Menerapkan Balancing...</span>
            </div>
          ) : (
            `🚀 Terapkan ${
              selectedMethod === "both" ? "Both Methods" : 
              selectedMethod === "undersampling" ? "Random Undersampling" : 
              selectedMethod === "tomek" ? "Tomek Link" : 
              "Original Data"
            }`
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {balancedResult && (
          <div className="mt-6 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                ✅ Balancing Berhasil!
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 mb-1">Metode yang Digunakan:</p>
                  <p className="font-bold text-lg capitalize">{balancedResult.method}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 mb-1">Data Dihapus:</p>
                  <p className="font-bold text-lg text-red-600">{balancedResult.removed_count}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 mb-1">Data Sebelum:</p>
                  <p className="font-bold text-lg">{balancedResult.original_count}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 mb-1">Data Sesudah:</p>
                  <p className="font-bold text-lg text-green-600">{balancedResult.balanced_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3">📈 Dampak yang Diharapkan</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Mengurangi bias terhadap kelas mayoritas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Meningkatkan recall untuk kelas minoritas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Memperbaiki F1-score secara keseluruhan</span>
                  </li>
                </ul>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Model lebih fair dan tidak bias</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Performa prediksi yang lebih seimbang</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Hasil analisis sentimen lebih akurat</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">📄 Preview Data (10 data pertama)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-3 py-2 text-left">ID</th>
                      <th className="border px-3 py-2 text-left">Comment</th>
                      <th className="border px-3 py-2 text-left">Final Text</th>
                      <th className="border px-3 py-2 text-center">Sentiment</th>
                      <th className="border px-3 py-2 text-center">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancedResult.data.slice(0, 10).map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="border px-3 py-2">{row.id}</td>
                        <td className="border px-3 py-2 max-w-xs truncate">
                          {row.comment || "-"}
                        </td>
                        <td className="border px-3 py-2 max-w-xs truncate">
                          {row.finalText || "-"}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            row.sentiment === "Positif" 
                              ? "bg-green-100 text-green-800"
                              : row.sentiment === "Negatif"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {row.sentiment}
                          </span>
                        </td>
                        <td className="border px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            row.confidence === "High"
                              ? "bg-blue-100 text-blue-800"
                              : row.confidence === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {row.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!comparison?.original?.total && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Scale className="h-6 w-6 text-yellow-600" />
              </div>
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
          <h4 className="font-semibold text-gray-800 mb-3">🔬 Penjelasan Teknis</h4>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">1. Random Undersampling:</h5>
              <p className="ml-4">
                Mengurangi jumlah sampel dari kelas mayoritas secara random hingga seimbang dengan kelas minoritas. 
                Metode ini sederhana dan efektif untuk dataset besar, namun berpotensi kehilangan informasi penting.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">2. Tomek Link:</h5>
              <p className="ml-4">
                Mengidentifikasi pasangan data dari kelas berbeda yang merupakan nearest neighbor satu sama lain (Tomek Link), 
                kemudian menghapus sampel dari kelas mayoritas. Metode ini membantu membersihkan decision boundary dan 
                meningkatkan separabilitas antar kelas.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">3. Kombinasi (Both):</h5>
              <p className="ml-4">
                Menerapkan Random Undersampling terlebih dahulu untuk menyeimbangkan distribusi, 
                kemudian dilanjutkan dengan Tomek Link untuk membersihkan noise dan ambiguitas. 
                Pendekatan ini memberikan hasil terbaik dengan menggabungkan kelebihan kedua metode.
              </p>
            </div>
          </div>
        </div>

        {balancedResult && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h4 className="font-semibold text-indigo-900 mb-3">🚀 Langkah Selanjutnya</h4>
            <p className="text-sm text-indigo-800 mb-3">
              Data sudah berhasil di-balance! Anda sekarang dapat melanjutkan ke tahap:
            </p>
            <ul className="text-sm text-indigo-700 space-y-2">
              <li className="flex items-center">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">1</span>
                <span>Training model Naïve Bayes dengan data balanced</span>
              </li>
              <li className="flex items-center">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">2</span>
                <span>Evaluasi performa model (Accuracy, Precision, Recall, F1-Score)</span>
              </li>
              <li className="flex items-center">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">3</span>
                <span>Bandingkan hasil dengan model yang dilatih menggunakan data imbalanced</span>
              </li>
            </ul>
          </div>
        )}

{(imbalancedPoints.length > 0 || balancedPoints.length > 0) && (
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-blue-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <BarChart3 className="mr-2 h-6 w-6 text-blue-600" />
                📊 Visualisasi Distribusi Data (PCA 2D)
              </h3>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Grafik Original */}
              <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-yellow-900 flex items-center">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    Original (Imbalanced)
                  </h4>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold">
                    {imbalancedPoints.length} points
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 flex justify-center">
                  <ScatterChart width={480} height={400}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Komponen 1" 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'PCA Component 1', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Komponen 2" 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'PCA Component 2', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => `Point: ${value}`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      iconType="circle"
                    />
                    <Scatter 
                      name="Positif" 
                      data={imbalancedPoints.filter(p => p.label === "Positif")} 
                      fill="#22c55e"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                    <Scatter 
                      name="Negatif" 
                      data={imbalancedPoints.filter(p => p.label === "Negatif")} 
                      fill="#ef4444"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                    <Scatter 
                      name="Netral" 
                      data={imbalancedPoints.filter(p => p.label === "Netral")} 
                      fill="#6b7280"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                  </ScatterChart>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                    <div className="font-bold text-green-700">
                      {imbalancedPoints.filter(p => p.label === "Positif").length}
                    </div>
                    <div className="text-green-600">Positif</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                    <div className="font-bold text-red-700">
                      {imbalancedPoints.filter(p => p.label === "Negatif").length}
                    </div>
                    <div className="text-red-600">Negatif</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                    <div className="font-bold text-gray-700">
                      {imbalancedPoints.filter(p => p.label === "Netral").length}
                    </div>
                    <div className="text-gray-600">Netral</div>
                  </div>
                </div>
              </div>

              {/* Grafik Balanced */}
              <div className="bg-white rounded-xl border-2 border-green-300 shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-green-900 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Balanced
                  </h4>
                  <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                    {balancedPoints.length} points
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 flex justify-center">
                  <ScatterChart width={480} height={400}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Komponen 1" 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'PCA Component 1', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Komponen 2" 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'PCA Component 2', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => `Point: ${value}`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      iconType="circle"
                    />
                    <Scatter 
                      name="Positif" 
                      data={balancedPoints.filter(p => p.label === "Positif")} 
                      fill="#22c55e"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                    <Scatter 
                      name="Negatif" 
                      data={balancedPoints.filter(p => p.label === "Negatif")} 
                      fill="#ef4444"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                    <Scatter 
                      name="Netral" 
                      data={balancedPoints.filter(p => p.label === "Netral")} 
                      fill="#6b7280"
                      fillOpacity={0.7}
                      shape="circle"
                    />
                  </ScatterChart>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                    <div className="font-bold text-green-700">
                      {balancedPoints.filter(p => p.label === "Positif").length}
                    </div>
                    <div className="text-green-600">Positif</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                    <div className="font-bold text-red-700">
                      {balancedPoints.filter(p => p.label === "Negatif").length}
                    </div>
                    <div className="text-red-600">Negatif</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                    <div className="font-bold text-gray-700">
                      {balancedPoints.filter(p => p.label === "Netral").length}
                    </div>
                    <div className="text-gray-600">Netral</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Informasi:</span> Visualisasi menggunakan PCA (Principal Component Analysis) untuk mereduksi dimensi TF-IDF ke 2D. 
                Setiap titik mewakili satu dokumen/komentar. Perbedaan yang terlihat menunjukkan efek dari teknik balancing dalam mengurangi dominasi kelas mayoritas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataBalancingPage;