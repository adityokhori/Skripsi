import React, { useState } from "react";
import {
  Target,
  Loader2,
} from "lucide-react";

const LabellingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [labelledData, setLabelledData] = useState([]);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const handleAutoLabel = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/auto-label", {
        method: "POST",
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLabelledData(data.data || []);
        setCurrentPage(1);
      }
    } catch (err) {
      setError("Gagal memanggil API auto-label");
    } finally {
      setIsLoading(false);
    }
  };

  // Distribusi label
  const stats = {
    total: labelledData.length,
    positif: labelledData.filter((d) => d.sentiment === "Positif").length,
    negatif: labelledData.filter((d) => d.sentiment === "Negatif").length,
    netral: labelledData.filter((d) => d.sentiment === "Netral").length,
  };

  // Pagination
  const totalPages = Math.ceil(labelledData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = labelledData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            Labelling Data - Manual Annotation
          </h2>
        </div>

        <p className="text-gray-600 mb-8">
          Proses pelabelan data komentar dengan sentimen (Positif, Negatif,
          Netral) sebagai ground truth untuk training model Naive Bayes.
        </p>

        {/* Tombol Auto Labelling */}
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">🤖 Auto Labelling</h3>
          <button
            onClick={handleAutoLabel}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin h-5 w-5" />}
            {isLoading ? "Memproses..." : "Mulai Auto Labelling"}
          </button>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>

        {/* Statistik */}
        {labelledData.length > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              📊 Distribusi Label Sentimen
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-600">Total</p>
                <p className="font-bold">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-green-700">Positif</p>
                <p className="font-bold">{stats.positif}</p>
              </div>
              <div className="text-center">
                <p className="text-red-700">Negatif</p>
                <p className="font-bold">{stats.negatif}</p>
              </div>
              <div className="text-center">
                <p className="text-yellow-700">Netral</p>
                <p className="font-bold">{stats.netral}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabel hasil */}
        {labelledData.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              📝 Hasil Labelling
            </h3>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border px-2 py-1">ID</th>
                  <th className="border px-2 py-1">Comment</th>
                  <th className="border px-2 py-1">Final Text</th>
                  <th className="border px-2 py-1">Sentiment</th>
                  <th className="border px-2 py-1">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row) => (
                  <tr key={row.id}>
                    <td className="border px-2 py-1">{row.id}</td>
                    <td className="border px-2 py-1">{row.comment}</td>
                    <td className="border px-2 py-1">{row.finalText}</td>
                    <td className="border px-2 py-1">{row.sentiment}</td>
                    <td className="border px-2 py-1">{row.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-3">
              <div>
                <label className="mr-2">Rows per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabellingPage;
