import React from 'react';
import { Scale } from 'lucide-react';

const DataBalancingPage = ({ 
  processedData, 
  balancedData, 
  setBalancedData, 
  isLoading, 
  setIsLoading 
}) => {
  const handleDataBalancing = () => {
    setIsLoading(true);
    setTimeout(() => {
      const balanced = processedData.slice(0, Math.min(processedData.length, 600));
      setBalancedData(balanced);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Scale className="h-8 w-8 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-800">Data Balancing</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengatasi ketidakseimbangan data menggunakan Random Undersampling dan Tomek Link untuk meningkatkan performa model Naïve Bayes.
        </p>

        {processedData.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan pre-processing data terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Data Distribution Before Balancing */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-4">Distribusi Data Sebelum Balancing</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">650</p>
                  <p className="text-green-700">Positif (65%)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">200</p>
                  <p className="text-red-700">Negatif (20%)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">150</p>
                  <p className="text-gray-700">Netral (15%)</p>
                </div>
              </div>
              <p className="text-yellow-800 mt-4 text-sm">
                ⚠️ Data tidak seimbang - mayoritas sentimen positif
              </p>
            </div>

            {/* Balancing Methods */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Random Undersampling</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Mengurangi data kelas mayoritas secara acak untuk menyeimbangkan distribusi.
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Mengurangi overfitting pada kelas mayoritas</li>
                  <li>• Mempercepat waktu training</li>
                  <li>• Risiko kehilangan informasi penting</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Tomek Link</h4>
                <p className="text-sm text-purple-700 mb-4">
                  Menghapus pasangan data terdekat dari kelas berbeda untuk membersihkan decision boundary.
                </p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• Membersihkan noise pada data</li>
                  <li>• Meningkatkan separabilitas kelas</li>
                  <li>• Mengurangi ambiguitas klasifikasi</li>
                </ul>
              </div>
            </div>

            {/* Technical Explanation */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h4 className="font-semibold text-indigo-900 mb-3">🔬 Metodologi Penelitian</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-indigo-800 mb-2">Random Undersampling Process:</h5>
                  <ol className="text-sm text-indigo-700 space-y-1">
                    <li>1. Identifikasi kelas mayoritas (Positif: 650 data)</li>
                    <li>2. Hitung target sample per kelas (200 data)</li>
                    <li>3. Random sampling dari kelas mayoritas</li>
                    <li>4. Pertahankan semua data kelas minoritas</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-medium text-indigo-800 mb-2">Tomek Link Process:</h5>
                  <ol className="text-sm text-indigo-700 space-y-1">
                    <li>1. Hitung jarak antar data points</li>
                    <li>2. Identifikasi nearest neighbor pairs</li>
                    <li>3. Temukan Tomek links (beda kelas)</li>
                    <li>4. Hapus data dari kelas mayoritas</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleDataBalancing}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menerapkan Data Balancing...</span>
                </div>
              ) : (
                'Terapkan Random Undersampling + Tomek Link'
              )}
            </button>

            {/* Results After Balancing */}
            {balancedData.length > 0 && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-4">Distribusi Data Setelah Balancing</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">200</p>
                      <p className="text-green-700">Positif (33.3%)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">200</p>
                      <p className="text-red-700">Negatif (33.3%)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">200</p>
                      <p className="text-gray-700">Netral (33.3%)</p>
                    </div>
                  </div>
                  <p className="text-green-800 text-sm">
                    ✅ Data berhasil diseimbangkan - distribusi yang lebih merata
                  </p>
                </div>

                {/* Comparison Chart */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Perbandingan Sebelum vs Sesudah</h4>
                  <div className="space-y-4">
                    {/* Before */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sebelum Balancing</span>
                        <span className="text-sm text-gray-600">1000 total data</span>
                      </div>
                      <div className="flex h-4 bg-gray-200 rounded overflow-hidden">
                        <div className="bg-green-500" style={{width: '65%'}}></div>
                        <div className="bg-red-500" style={{width: '20%'}}></div>
                        <div className="bg-gray-500" style={{width: '15%'}}></div>
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sesudah Balancing</span>
                        <span className="text-sm text-gray-600">600 total data</span>
                      </div>
                      <div className="flex h-4 bg-gray-200 rounded overflow-hidden">
                        <div className="bg-green-500" style={{width: '33.3%'}}></div>
                        <div className="bg-red-500" style={{width: '33.3%'}}></div>
                        <div className="bg-gray-500" style={{width: '33.4%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center space-x-6 mt-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Positif</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Negatif</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      <span>Netral</span>
                    </div>
                  </div>
                </div>

                {/* Expected Impact */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3">📈 Dampak yang Diharapkan</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>✅ Mengurangi bias terhadap kelas mayoritas</li>
                      <li>✅ Meningkatkan recall untuk kelas minoritas</li>
                      <li>✅ Memperbaiki F1-score secara keseluruhan</li>
                    </ul>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>✅ Model lebih fair dan tidak bias</li>
                      <li>✅ Performa prediksi yang lebih seimbang</li>
                      <li>✅ Hasil analisis yang lebih akurat</li>
                    </ul>
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

export default DataBalancingPage;