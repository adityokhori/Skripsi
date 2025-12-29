import React, { useState, useEffect } from 'react';
import {
  BarChart3, RefreshCw, Trophy, Target, Zap,
  AlertCircle, CheckCircle2, XCircle, Download
} from 'lucide-react';

const BASE_URL = "http://localhost:8000";

const AnalysisPage = () => {
  const [selectedApproach, setSelectedApproach] = useState("balanced");
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [modelComparison, setModelComparison] = useState(null);
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadPredictions(selectedApproach, currentPage);
  }, [selectedApproach, currentPage]);

  const loadAllData = async () => {
    setIsLoadingSummary(true);
    setErrorMsg(null);
    try {
      const [comparisonRes, summaryRes] = await Promise.all([
        fetch(`${BASE_URL}/compare-models`),
        fetch(`${BASE_URL}/analysis-summary`)
      ]);

      const comparisonData = await comparisonRes.json();
      const summaryData = await summaryRes.json();

      if (comparisonData.status === "success") {
        setModelComparison(comparisonData.data);
      } else {
        setModelComparison(null);
      }

      if (summaryData.status === "success") {
        setAnalysisSummary(summaryData.data);
      } else {
        setAnalysisSummary(null);
      }
    } catch (error) {
      console.error("Error loading analysis data:", error);
      setErrorMsg("Gagal memuat data analisis dari server.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadPredictions = async (approach, page = 1) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(
        `${BASE_URL}/predictions?approach=${approach}&page=${page}&page_size=${itemsPerPage}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setPredictions(data.data || []);
      } else {
        setPredictions([]);
        setErrorMsg(data.error || "Tidak ada data prediksi tersedia.");
      }
    } catch (error) {
      console.error("Error loading predictions:", error);
      setPredictions([]);
      setErrorMsg("Gagal mengambil data prediksi dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAllData();
    loadPredictions(selectedApproach);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${BASE_URL}/export-predictions?approach=${selectedApproach}`);
      if (!response.ok) throw new Error("File tidak ditemukan.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `predictions_${selectedApproach}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal export CSV: " + error.message);
    }
  };

  const getSentimentColor = (s) => {
    switch (s) {
      case "Positif":
        return "bg-green-100 text-green-800 border-green-200";
      case "Negatif":
        return "bg-red-100 text-red-800 border-red-200";
      case "Netral":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWinner = () => {
    if (!modelComparison?.imbalanced || !modelComparison?.balanced) return null;
    const imb = modelComparison.imbalanced;
    const bal = modelComparison.balanced;
    if (imb.error || bal.error) return null;

    const imbScore = imb.accuracy + imb.precision + imb.recall + imb.f1_score;
    const balScore = bal.accuracy + bal.precision + bal.recall + bal.f1_score;

    if (Math.abs(imbScore - balScore) < 1) return "draw";
    return imbScore > balScore ? "imbalanced" : "balanced";
  };

  const winner = getWinner();
  const totalPages = analysisSummary?.[selectedApproach]?.exists
    ? Math.ceil(analysisSummary[selectedApproach].total_predictions / itemsPerPage)
    : 1;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-800">Sentiment Analysis Comparison</h2>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* === MODEL COMPARISON === */}
        {isLoadingSummary ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 mb-8">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Memuat perbandingan model...</p>
          </div>
        ) : !modelComparison || !analysisSummary ? (
          <div className="text-center py-10 bg-yellow-50 border border-yellow-200 rounded-lg mb-8">
            <AlertCircle className="mx-auto h-10 w-10 text-yellow-600 mb-3" />
            <p className="text-yellow-800">Data perbandingan model belum tersedia.</p>
          </div>
        ) : (
          <>
            {/* == Winner and Stats == */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
              <div className="text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <h3 className="text-2xl font-bold">IMBALANCED vs BALANCED</h3>
                <p className="text-green-100 text-sm">Multinomial Naive Bayes Performance</p>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-8 border-x-2 border-gray-700">
              <div className="grid grid-cols-3 items-center text-center max-w-4xl mx-auto">
                <div>
                  <Target className={`h-12 w-12 mx-auto mb-2 ${winner === 'imbalanced' ? 'text-yellow-400' : 'text-gray-500'}`} />
                  <h4 className="text-xl font-bold">IMBALANCED</h4>
                  <p className="text-gray-400 text-sm">Original Data</p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-yellow-500 mb-1">VS</div>
                  <p className="text-sm text-gray-400">{winner === 'draw' ? '⚖️ Draw' : winner === 'imbalanced' ? '🏆 Imbalanced Wins!' : '🏆 Balanced Wins!'}</p>
                </div>
                <div>
                  <Zap className={`h-12 w-12 mx-auto mb-2 ${winner === 'balanced' ? 'text-yellow-400' : 'text-gray-500'}`} />
                  <h4 className="text-xl font-bold">BALANCED</h4>
                  <p className="text-gray-400 text-sm">Resampled Data</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* === TABEL PREDIKSI === */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading predictions...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <p className="text-gray-600">{errorMsg || "Tidak ada data prediksi"}</p>
          </div>
        ) : (
          <div className="bg-white border-2 rounded-lg overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b-2 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Detail Prediksi - {selectedApproach}</h3>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Komentar</th>
                    <th className="px-4 py-3 text-left font-semibold">Aktual</th>
                    <th className="px-4 py-3 text-left font-semibold">Prediksi</th>
                    <th className="px-4 py-3 text-center font-semibold">Confidence</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, idx) => (
                    <tr key={pred.id || idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{pred.id}</td>
                      <td className="px-4 py-3 max-w-md truncate" title={pred.comment}>
                        {pred.comment}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(pred.actual_sentiment)}`}>
                          {pred.actual_sentiment}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(pred.predicted_sentiment)}`}>
                          {pred.predicted_sentiment}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {pred.confidence ? `${pred.confidence}%` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pred.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 inline" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
