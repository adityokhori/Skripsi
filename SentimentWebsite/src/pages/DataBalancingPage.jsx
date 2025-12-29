import React, { useState, useEffect, useRef } from 'react';
import { Scale, BarChart3, TrendingUp, Zap, Filter, Database, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as d3 from 'd3';

const DataBalancingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState(null);
  const [balancedResult, setBalancedResult] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("both");
  const [dataMode, setDataMode] = useState("original");
  const [imbalancedPoints, setImbalancedPoints] = useState([]);
  const [balancedPoints, setBalancedPoints] = useState([]);
  const [samplingInfo, setSamplingInfo] = useState({ imbalanced: null, balanced: null });
  
  const svgRefImbalanced = useRef(null);
  const svgRefBalanced = useRef(null);
  
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
      // Fetch dengan parameter untuk menampilkan semua data atau sample
      const res1 = await fetch("http://127.0.0.1:8000/visualize-distribution?mode=original&sample_size=1000");
      const data1 = await res1.json();
      if (!data1.error) {
        setImbalancedPoints(data1.points);
        console.log("Imbalanced data:", {
          total_data: data1.total_data,
          visualized: data1.total_points,
          is_sampled: data1.is_sampled,
          distribution: data1.visualization_distribution
        });
      }
  
      const res2 = await fetch("http://127.0.0.1:8000/visualize-distribution?mode=balanced&sample_size=1000");
      const data2 = await res2.json();
      if (!data2.error) {
        setBalancedPoints(data2.points);
        console.log("Balanced data:", {
          total_data: data2.total_data,
          visualized: data2.total_points,
          is_sampled: data2.is_sampled,
          distribution: data2.visualization_distribution
        });
      }
    } catch (err) {
      console.error("Error fetching visualization:", err);
    }
  };
  
  useEffect(() => {
    fetchVisualization();
  }, []);

  useEffect(() => {
    if (imbalancedPoints.length > 0) {
      renderScatterPlot(svgRefImbalanced.current, imbalancedPoints, 'imbalanced');
    }
  }, [imbalancedPoints]);

  useEffect(() => {
    if (balancedPoints.length > 0) {
      renderScatterPlot(svgRefBalanced.current, balancedPoints, 'balanced');
    }
  }, [balancedPoints]);

  const renderScatterPlot = (svgElement, data, type) => {
    if (!svgElement || data.length === 0) return;

    d3.select(svgElement).selectAll("*").remove();

    const margin = { top: 40, right: 80, bottom: 60, left: 70 };
    const width = 1100 - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    const svg = d3.select(svgElement)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#fafafa")
      .style("border-radius", "8px");

    const mainGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(data, d => d.x);
    const yExtent = d3.extent(data, d => d.y);
    
    const xScale = d3.scaleLinear()
      .domain([xExtent[0] * 1.15, xExtent[1] * 1.15])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] * 1.15, yExtent[1] * 1.15])
      .range([height, 0]);

    const colorMap = {
      "Positif": "#22c55e",
      "Negatif": "#ef4444",
      "Netral": "#6b7280"
    };

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    const zoomGroup = mainGroup.append("g");

    // Grid
    zoomGroup.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.15)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "#cbd5e1");

    zoomGroup.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.15)
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "#cbd5e1");

    // Axes
    const xAxis = zoomGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(12));

    const yAxis = zoomGroup.append("g")
      .call(d3.axisLeft(yScale).ticks(12));

    xAxis.selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#475569");
    
    yAxis.selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#475569");

    xAxis.selectAll("line, path")
      .style("stroke", "#94a3b8");
    
    yAxis.selectAll("line, path")
      .style("stroke", "#94a3b8");

    // Axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + 50)
      .style("font-size", "15px")
      .style("font-weight", "700")
      .style("fill", "#1e293b")
      .text("PCA Component 1");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2 + margin.top))
      .attr("y", 18)
      .style("font-size", "15px")
      .style("font-weight", "700")
      .style("fill", "#1e293b")
      .text("PCA Component 2");

    // Title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2 + margin.left)
      .attr("y", 25)
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", type === 'imbalanced' ? "#b45309" : "#15803d")
      .text(type === 'imbalanced' ? "📉 Original Dataset (Imbalanced)" : "✅ Balanced Dataset");

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip-" + type)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(15, 23, 42, 0.95)")
      .style("color", "white")
      .style("padding", "10px 14px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("z-index", "10000")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
      .style("font-family", "system-ui, -apple-system, sans-serif");

    // Plot points
    zoomGroup.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 4.5)
      .attr("fill", d => colorMap[d.label])
      .attr("opacity", 0.65)
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 9)
          .attr("opacity", 1)
          .attr("stroke-width", 2.5);
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: 600; margin-bottom: 6px; color: ${colorMap[d.label]}; font-size: 14px;">
              ${d.label}
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
              <strong>X:</strong> ${d.x.toFixed(4)}<br/>
              <strong>Y:</strong> ${d.y.toFixed(4)}
            </div>
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.pageY - 70) + "px")
          .style("left", (event.pageX + 15) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 4.5)
          .attr("opacity", 0.65)
          .attr("stroke-width", 1.5);
        
        tooltip.style("visibility", "hidden");
      });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 80 + margin.left}, ${margin.top})`);

    const labels = ["Positif", "Negatif", "Netral"];
    labels.forEach((label, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      legendRow.append("circle")
        .attr("r", 7)
        .attr("fill", colorMap[label])
        .attr("opacity", 0.75)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

      legendRow.append("text")
        .attr("x", 18)
        .attr("y", 5)
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#334155")
        .text(label);
    });

    // Zoom controls
    const zoomControls = svg.append("g")
      .attr("transform", `translate(${margin.left + 10}, ${margin.top})`);

    // Zoom in
    const zoomInButton = zoomControls.append("g")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.4);
      });

    zoomInButton.append("rect")
      .attr("width", 36)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#3b82f6")
      .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .on("mouseover", function() {
        d3.select(this).attr("fill", "#2563eb");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#3b82f6");
      });

    zoomInButton.append("text")
      .attr("x", 18)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text("+");

    // Zoom out
    const zoomOutButton = zoomControls.append("g")
      .attr("transform", "translate(0, 42)")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    zoomOutButton.append("rect")
      .attr("width", 36)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#3b82f6")
      .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .on("mouseover", function() {
        d3.select(this).attr("fill", "#2563eb");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#3b82f6");
      });

    zoomOutButton.append("text")
      .attr("x", 18)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text("−");

    // Reset
    const resetButton = zoomControls.append("g")
      .attr("transform", "translate(0, 84)")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });

    resetButton.append("rect")
      .attr("width", 36)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#8b5cf6")
      .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .on("mouseover", function() {
        d3.select(this).attr("fill", "#7c3aed");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#8b5cf6");
      });

    resetButton.append("text")
      .attr("x", 18)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text("⟲");

    // Data count badge
    svg.append("rect")
      .attr("x", width + margin.left - 100)
      .attr("y", height + margin.top + 10)
      .attr("width", 90)
      .attr("height", 28)
      .attr("rx", 14)
      .attr("fill", type === 'imbalanced' ? "#fef3c7" : "#d1fae5")
      .attr("stroke", type === 'imbalanced' ? "#f59e0b" : "#10b981")
      .attr("stroke-width", 2);

    svg.append("text")
      .attr("x", width + margin.left - 55)
      .attr("y", height + margin.top + 28)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("fill", type === 'imbalanced' ? "#92400e" : "#065f46")
      .text(`${data.length} pts`);
  };
  
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
              <h4 className="font-semibold text-gray-800 mb-4">🔄 Preview Data (10 data pertama)</h4>
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

        {(imbalancedPoints.length > 0 || balancedPoints.length > 0) && (
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-blue-300 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <BarChart3 className="mr-3 h-7 w-7 text-blue-600" />
                📊 Visualisasi Distribusi Data (PCA 2D)
              </h3>
              <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
                <ZoomIn className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Scroll atau gunakan kontrol zoom</span>
              </div>
            </div>

            {/* Grafik Original (Imbalanced) */}
            <div className="mb-10 bg-white rounded-2xl border-3 border-yellow-400 shadow-2xl p-8 hover:shadow-3xl transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-xl text-yellow-900 flex items-center">
                  <span className="w-4 h-4 bg-yellow-500 rounded-full mr-3 shadow-md"></span>
                  📉 Original Dataset (Imbalanced)
                </h4>
                <div className="flex items-center space-x-3">
                  <span className="text-sm bg-yellow-100 text-yellow-900 px-4 py-2 rounded-full font-bold border-2 border-yellow-400 shadow-sm">
                    {imbalancedPoints.length} points (visualisasi)
                  </span>
                  {comparison?.original && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-semibold border border-gray-300">
                      Total asli: {comparison.original.total}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 flex justify-center overflow-auto border-2 border-gray-200 shadow-inner">
                <svg ref={svgRefImbalanced}></svg>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-green-700">
                    {imbalancedPoints.filter(p => p.label === "Positif").length}
                  </div>
                  <div className="text-green-600 font-semibold mt-1">Positif</div>
                  <div className="text-xs text-green-500 mt-1">
                    {((imbalancedPoints.filter(p => p.label === "Positif").length / imbalancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.original?.distribution?.Positif && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.original.distribution.Positif}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-red-700">
                    {imbalancedPoints.filter(p => p.label === "Negatif").length}
                  </div>
                  <div className="text-red-600 font-semibold mt-1">Negatif</div>
                  <div className="text-xs text-red-500 mt-1">
                    {((imbalancedPoints.filter(p => p.label === "Negatif").length / imbalancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.original?.distribution?.Negatif && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.original.distribution.Negatif}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-gray-700">
                    {imbalancedPoints.filter(p => p.label === "Netral").length}
                  </div>
                  <div className="text-gray-600 font-semibold mt-1">Netral</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((imbalancedPoints.filter(p => p.label === "Netral").length / imbalancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.original?.distribution?.Netral && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.original.distribution.Netral}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grafik Balanced */}
            <div className="bg-white rounded-2xl border-3 border-green-400 shadow-2xl p-8 hover:shadow-3xl transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-xl text-green-900 flex items-center">
                  <span className="w-4 h-4 bg-green-500 rounded-full mr-3 shadow-md"></span>
                  ✅ Balanced Dataset
                </h4>
                <div className="flex items-center space-x-3">
                  <span className="text-sm bg-green-100 text-green-900 px-4 py-2 rounded-full font-bold border-2 border-green-400 shadow-sm">
                    {balancedPoints.length} points (visualisasi)
                  </span>
                  {comparison?.balanced && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-semibold border border-gray-300">
                      Total asli: {comparison.balanced.total}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 flex justify-center overflow-auto border-2 border-gray-200 shadow-inner">
                <svg ref={svgRefBalanced}></svg>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-green-700">
                    {balancedPoints.filter(p => p.label === "Positif").length}
                  </div>
                  <div className="text-green-600 font-semibold mt-1">Positif</div>
                  <div className="text-xs text-green-500 mt-1">
                    {((balancedPoints.filter(p => p.label === "Positif").length / balancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.balanced?.distribution?.Positif && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.balanced.distribution.Positif}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-red-700">
                    {balancedPoints.filter(p => p.label === "Negatif").length}
                  </div>
                  <div className="text-red-600 font-semibold mt-1">Negatif</div>
                  <div className="text-xs text-red-500 mt-1">
                    {((balancedPoints.filter(p => p.label === "Negatif").length / balancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.balanced?.distribution?.Negatif && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.balanced.distribution.Negatif}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                  <div className="font-bold text-2xl text-gray-700">
                    {balancedPoints.filter(p => p.label === "Netral").length}
                  </div>
                  <div className="text-gray-600 font-semibold mt-1">Netral</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((balancedPoints.filter(p => p.label === "Netral").length / balancedPoints.length) * 100).toFixed(1)}% (dari visualisasi)
                  </div>
                  {comparison?.balanced?.distribution?.Netral && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Asli: {comparison.balanced.distribution.Netral}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-500 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-900 font-semibold mb-2">💡 Informasi Teknis:</p>
                  <p className="text-sm text-blue-800 leading-relaxed mb-3">
                    Visualisasi menggunakan <strong>PCA (Principal Component Analysis)</strong> untuk mereduksi dimensi TF-IDF ke ruang 2D. 
                    Setiap titik mewakili satu dokumen/komentar dengan warna berbeda untuk setiap kelas sentimen. 
                    Gunakan <strong>mouse wheel</strong> untuk zoom in/out, atau klik tombol kontrol zoom di kiri atas grafik. 
                    Hover pada titik untuk melihat detail koordinat.
                  </p>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-sm text-yellow-800 font-semibold mb-1">⚠️ Catatan Penting:</p>
                    <p className="text-xs text-yellow-700 leading-relaxed">
                      Jumlah data point yang ditampilkan dalam visualisasi PCA mungkin <strong>berbeda</strong> dengan jumlah total dataset. 
                      Ini karena backend melakukan <strong>sampling/pengurangan data</strong> untuk optimasi performa rendering grafik. 
                      Visualisasi ini bertujuan untuk menunjukkan <strong>distribusi dan pola clustering</strong> secara representatif, 
                      bukan untuk menampilkan seluruh data. Untuk informasi jumlah data yang akurat, silakan lihat statistik di bagian atas halaman.
                    </p>
                  </div>
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
      </div>
    </div>
  );
};

export default DataBalancingPage;