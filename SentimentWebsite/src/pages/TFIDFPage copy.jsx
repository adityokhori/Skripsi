import React, { useState } from 'react';
import { Database, BarChart3, Hash, TrendingUp } from 'lucide-react';

const TFIDFPage = ({ labelledData, tfidfData, setTfIdfData, isLoading, setIsLoading }) => {
  const [selectedFeatures, setSelectedFeatures] = useState(1000);
  const [minDf, setMinDf] = useState(2);
  const [maxDf, setMaxDf] = useState(0.95);
  const [error, setError] = useState("");
  const [matrixData, setMatrixData] = useState(null);

  const fetchMatrixPreview = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/tfidf-matrix?limit_docs=10&limit_features=20");
      const data = await res.json();
      setMatrixData(data);
    } catch (err) {
      console.error("Error fetching TF-IDF matrix", err);
    }
  };


  const handleTFIDFExtraction = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/tfidf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_features: selectedFeatures,
          min_df: minDf,
          max_df: maxDf
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTfIdfData(data);
      }
    } catch (err) {
      setError("Gagal memanggil API TF-IDF");
    } finally {
      setIsLoading(false);
    }
  };

  const getTopFeatures = (n = 10) => {
    if (!tfidfData || !tfidfData.top_features) return [];
    return tfidfData.top_features.slice(0, n);
  };

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-8 w-8 text-indigo-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            TF-IDF Vectorization - Feature Extraction
          </h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengkonversi teks komentar menjadi numerical features menggunakan TF-IDF
          (Term Frequency-Inverse Document Frequency) untuk input model Naïve Bayes.
        </p>

        
          <div className="space-y-6">
            {/* Config */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">⚙️ Konfigurasi TF-IDF</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Features</label>
                  <select
                    value={selectedFeatures}
                    onChange={(e) => setSelectedFeatures(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={2000}>2000</option>
                    <option value={5000}>5000</option>
                    <option value={10000}>10000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Document Frequency</label>
                  <input
                    type="number"
                    value={minDf}
                    onChange={(e) => setMinDf(Number(e.target.value))}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Document Frequency</label>
                  <input
                    type="number"
                    value={maxDf}
                    onChange={(e) => setMaxDf(Number(e.target.value))}
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Extract Button */}
            <button
              onClick={handleTFIDFExtraction}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isLoading ? "Mengekstrak TF-IDF..." : "Mulai TF-IDF Vectorization"}
            </button>

            {error && <p className="text-red-600">{error}</p>}

            {/* Results */}
            {tfidfData && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-4">📊 TF-IDF Results</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{tfidfData.total_texts}</p>
                      <p className="text-green-700">Documents</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{tfidfData.num_features}</p>
                      <p className="text-blue-700">Features</p>
                    </div>
                  </div>
                </div>

                {/* Top Features */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                    Top TF-IDF Features
                  </h4>
                  <div className="space-y-2">
                    {getTopFeatures(10).map((term, index) => (
                      <div key={term} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-mono text-sm">#{index + 1} {term}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* TF-IDF Matrix Preview */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">📑 TF-IDF Matrix Preview</h4>
                  <button
                    onClick={fetchMatrixPreview}
                    className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Load Matrix Preview
                  </button>

                  {matrixData ? (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-100">
                          <tr>
                            {matrixData.features.map((f, idx) => (
                              <th key={idx} className="border px-2 py-1">{f}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.data.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((val, cIdx) => (
                                <td key={cIdx} className="border px-2 py-1 text-right font-mono">
                                  {val.toFixed(4)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Klik tombol di atas untuk melihat preview matrix.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        
      </div>
    </div>
  );
};

export default TFIDFPage;
