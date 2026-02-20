import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";

const API_URL = "https://fingraph-sentinel.onrender.com/analyze";
 // Change later

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [selectedRingFilter, setSelectedRingFilter] = useState("all");
  const [patternFilter, setPatternFilter] = useState("all");
  const fgRef = useRef()
  const [graphKey, setGraphKey] = useState(0);



  const handleUpload = async () => {
    if (!file) return alert("Upload CSV file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await axios.post(API_URL, formData);
      setResult(response.data);
      prepareGraph(response.data);
    } catch (err) {
      console.error(err);
      alert("Error processing file");
    } finally {
      setLoading(false);
    }
  };

    const prepareGraph = (data) => {
      if (!data || !data.graph) return;

      const suspiciousMap = {};
      data.suspicious_accounts.forEach((acc) => {
        suspiciousMap[acc.account_id] = acc;
      });

      let nodes = data.graph.nodes.map((id) => ({
        id,
        suspicious: !!suspiciousMap[id],
        details: suspiciousMap[id] || null,
      }));

      // ✅ IMPORTANT: Clone links (DO NOT reuse backend objects)
      let links = data.graph.links.map((l) => ({
        source: l.source,
        target: l.target,
      }));

      const filterLinks = (allowedSet) => {
        return links.filter((l) => {
          const src = typeof l.source === "object" ? l.source.id : l.source;
          const tgt = typeof l.target === "object" ? l.target.id : l.target;
          return allowedSet.has(src) && allowedSet.has(tgt);
        });
      };

      // Suspicious filter
      if (filterMode === "suspicious") {
        nodes = nodes.filter((n) => n.suspicious);
        const allowed = new Set(nodes.map((n) => n.id));
        links = filterLinks(allowed);
      }

      // Normal filter
      if (filterMode === "normal") {
        nodes = nodes.filter((n) => !n.suspicious);
        const allowed = new Set(nodes.map((n) => n.id));
        links = filterLinks(allowed);
      }

      // Ring filter
      if (selectedRingFilter !== "all") {
        const ring = data.fraud_rings.find(
          (r) => r.ring_id === selectedRingFilter
        );

        if (ring) {
          const ringSet = new Set(ring.member_accounts);
          nodes = nodes.filter((n) => ringSet.has(n.id));
          links = filterLinks(ringSet);
        }
      }

      // Pattern filter
      if (patternFilter !== "all") {
        const rings = data.fraud_rings.filter(
          (r) => r.pattern_type === patternFilter
        );

        const allowed = new Set(
          rings.flatMap((r) => r.member_accounts)
        );

        nodes = nodes.filter((n) => allowed.has(n.id));
        links = filterLinks(allowed);
      }

      setGraphData({ nodes, links });
      setGraphKey((prev) => prev + 1);
    };

  useEffect(() => {
  if (result) {
    prepareGraph(result);
  }
  }, [filterMode, selectedRingFilter, patternFilter]);



  const downloadJSON = () => {
  if (!result) return;

  // Clone result
  const cleanResult = { ...result };

  // Remove graph section for download only
  delete cleanResult.graph;

  const blob = new Blob(
    [JSON.stringify(cleanResult, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fraud_results.json";
  a.click();
  };


  const getRingDetails = (ringId) => {
  if (!result || !result.fraud_rings) return null;

  const ring = result.fraud_rings.find(
    (r) => r.ring_id === ringId
  );

  if (!ring) return null;

  // Leader logic:
  // Choose member with highest suspicion score
  let leader = null;
  let maxScore = -1;

  ring.member_accounts.forEach((acc) => {
    const accDetails = result.suspicious_accounts.find(
      (a) => a.account_id === acc
    );
    if (accDetails && accDetails.suspicion_score > maxScore) {
      maxScore = accDetails.suspicion_score;
      leader = acc;
    }
  });

  return {
    leader,
    members: ring.member_accounts,
    pattern: ring.pattern_type
  };
  };


  const getRingTransactions = (ringId) => {
  if (!result || !result.graph || !result.fraud_rings) return [];

  const ring = result.fraud_rings.find(
    (r) => r.ring_id === ringId
  );

  if (!ring) return [];

  const memberSet = new Set(ring.member_accounts);

  return result.graph.links.filter((link) => {
    const src =
      typeof link.source === "object"
        ? link.source.id
        : link.source;

    const tgt =
      typeof link.target === "object"
        ? link.target.id
        : link.target;

    return memberSet.has(src) && memberSet.has(tgt);
  });
  };


  return (
    <div className="min-h-screen bg-primary text-white flex justify-center">
      <div className="w-full max-w-7xl px-6 py-10">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-accent mb-3">
            Money Muling Detection Engine
          </h1>
          <p className="text-gray-300 text-lg">
            Graph-Based Financial Crime Detection System
          </p>
        </div>

        {/* UPLOAD SECTION */}
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl mb-10">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Upload Transaction CSV
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <input
              type="file"
              accept=".csv"
              className="bg-gray-700 p-2 rounded-lg w-full md:w-auto"
              onChange={(e) => setFile(e.target.files[0])}
            />

            <button
              onClick={handleUpload}
              className="bg-accent px-8 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Analyze CSV
            </button>
          </div>

          {loading && (
            <p className="mt-6 text-center text-yellow-400">
              Processing dataset... Running graph algorithms...
            </p>
          )}
        </div>

        {/* RESULTS */}
        {result && result.summary && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <h3 className="text-gray-400 mb-2">Total Accounts</h3>
                <p className="text-3xl font-bold text-accent">
                  {result.summary.total_accounts_analyzed}
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <h3 className="text-gray-400 mb-2">Suspicious Accounts</h3>
                <p className="text-3xl font-bold text-danger">
                  {result.summary.suspicious_accounts_flagged}
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <h3 className="text-gray-400 mb-2">Fraud Rings</h3>
                <p className="text-3xl font-bold text-yellow-400">
                  {result.summary.fraud_rings_detected}
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <h3 className="text-gray-400 mb-2">Processing Time</h3>
                <p className="text-3xl font-bold text-blue-400">
                  {result.summary.processing_time_seconds}s
                </p>
              </div>
            </div>

            {/* GRAPH SECTION */}
            <div className="bg-gray-800 p-8 rounded-2xl mb-12">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Interactive Transaction Graph
              </h2>

              <div className="h-[600px] flex justify-center items-center relative">
                {/* LEGEND PANEL */}
                <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded-xl shadow-lg border border-gray-700 text-sm space-y-3 z-10">

                  {/* Normal */}
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-white">Normal</span>
                  </div>

                  {/* Suspicious */}
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-white">Suspicious</span>
                  </div>

                  {/* Money Flow */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[2px] bg-yellow-400 relative">
                      <div className="absolute right-0 top-[-4px] w-0 h-0 border-l-4 border-l-yellow-400 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                    </div>
                    <span className="text-white">Money Flow</span>
                  </div>

                  {/* Fraud Ring */}
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span className="text-white">Fraud Ring</span>
                  </div>

                </div>
  {/* FILTER PANEL */}
                {/* FILTER PANEL - Bottom Left */}
                <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-95 p-4 rounded-xl shadow-lg border border-gray-700 text-sm space-y-3 z-10 w-60">

                  <h3 className="text-white font-semibold text-center mb-2">
                    Graph Filters
                  </h3>

                  {/* Show All */}
                  <button
                    onClick={() => {
                      setFilterMode("all");
                      setSelectedRingFilter("all");
                      setPatternFilter("all");
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-white transition"
                  >
                    Show All
                  </button>

                  {/* Show Suspicious */}
                  <button
                    onClick={() => {
                      setFilterMode("suspicious");
                      setSelectedRingFilter("all");
                      setPatternFilter("all");
                    }}
                    className="w-full bg-red-600 hover:bg-red-500 py-2 rounded-lg text-white transition"
                  >
                    Show Only Suspicious
                  </button>

                  {/* Show Normal */}
                  <button
                    onClick={() => {
                      setFilterMode("normal");
                      setSelectedRingFilter("all");
                      setPatternFilter("all");
                    }}
                    className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-lg text-white transition"
                  >
                    Show Normal Network
                  </button>

                  {/* Ring Dropdown */}
                  <select
                    value={selectedRingFilter}
                    onChange={(e) => {
                      setFilterMode("all");
                      setPatternFilter("all");
                      setSelectedRingFilter(e.target.value);
                    }}
                    className="w-full bg-gray-700 py-2 px-2 rounded-lg text-white"
                  >
                    <option value="all">Show All Rings</option>
                    {result?.fraud_rings?.map((ring) => (
                      <option key={ring.ring_id} value={ring.ring_id}>
                        {ring.ring_id}
                      </option>
                    ))}
                  </select>

                  {/* Pattern Dropdown */}
                  <select
                    value={patternFilter}
                    onChange={(e) => {
                      setFilterMode("all");
                      setSelectedRingFilter("all");
                      setPatternFilter(e.target.value);
                    }}
                    className="w-full bg-gray-700 py-2 px-2 rounded-lg text-white"
                  >
                    <option value="all">All Patterns</option>
                    <option value="cycle">Cycle</option>
                    <option value="smurfing">Smurfing</option>
                    <option value="shell_chain">Shell Chain</option>
                  </select>

                </div>

                <ForceGraph2D
                  key={graphKey}
                  ref={fgRef}
                  graphData={graphData}

                  width={900}
                  height={600}

                  linkWidth={2}
                  linkColor={() => "#9ca3af"}
                  linkDirectionalArrowLength={10}
                  linkDirectionalArrowRelPos={0.9}
                  linkDirectionalArrowColor={() => "#facc15"}
                  linkCurvature={0.08}

                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;

                    let color = "#22c55e";
                    let size = 6;

                    if (node.suspicious) {
                      color = "#ef4444";
                      size = 10;
                    }

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();

                    if (node.suspicious) {
                      ctx.lineWidth = 2;
                      ctx.strokeStyle = "#ffffff";
                      ctx.stroke();
                    }

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(node.id, node.x + size + 3, node.y + 3);
                  }}

                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
                    ctx.fill();
                  }}

                  onNodeClick={(node) => {
                    setSelectedNode(node);
                  }}

                  nodeLabel={(node) =>
                    `Account ID: ${node.id}\nSuspicious: ${
                      node.suspicious ? "Yes" : "No"
                    }`
                  }
                />

                {/* SIDE INFO PANEL */}
                {selectedNode && (
                  <div className="absolute right-4 top-4 bg-gray-900 p-6 rounded-2xl w-96 shadow-2xl border border-gray-700">

                    {/* RING MODE PANEL */}
                    {selectedRingFilter !== "all" ? (
                      (() => {
                        const ringDetails = getRingDetails(selectedRingFilter);
                        const transactions = getRingTransactions(selectedRingFilter);
                        if (!ringDetails) return null;

                        return (
                          <>
                            <h3 className="text-xl font-bold mb-4 text-yellow-400 text-center">
                              Ring Intelligence
                            </h3>

                            <div className="space-y-3 text-sm">

                              <div>
                                <span className="text-gray-400">Ring Type:</span>
                                <span className="ml-2 font-semibold capitalize text-white">
                                  {ringDetails.pattern.replace("_", " ")}
                                </span>
                              </div>

                              <div>
                                <span className="text-gray-400">Ring Leader:</span>
                                <span className="ml-2 font-bold text-red-400">
                                  {ringDetails.leader}
                                </span>
                              </div>

                              <div>
                                <span className="text-gray-400">Members:</span>
                                <div className="mt-2 bg-gray-800 p-3 rounded-lg max-h-40 overflow-y-auto text-xs text-white">
                                  {ringDetails.members.join(", ")}
                                </div>
                              </div>

                              <div>
                                <span className="text-gray-400">Transactions:</span>

                                <div className="mt-2 bg-gray-800 p-3 rounded-lg max-h-48 overflow-y-auto text-xs text-white space-y-2">

                                  {transactions.length === 0 && (
                                    <p className="text-gray-500 text-center">
                                      No intra-ring transactions found
                                    </p>
                                  )}

                                  {transactions.map((tx, index) => {
                                    const src =
                                      typeof tx.source === "object"
                                        ? tx.source.id
                                        : tx.source;

                                    const tgt =
                                      typeof tx.target === "object"
                                        ? tx.target.id
                                        : tx.target;

                                    return (
                                      <div
                                        key={index}
                                        className="border-b border-gray-700 pb-2"
                                      >
                                        <div className="text-yellow-400 font-semibold">
                                          {src} → {tgt}
                                        </div>

                                        <div className="text-gray-400 text-[11px]">
                                          {tx.timestamp}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>



                            </div>
                          </>
                        );
                      })()
                    ) : (

                      /* NORMAL MODE PANEL */
                      <>
                        <h3 className="text-lg font-semibold mb-4 text-accent text-center">
                          Account Details
                        </h3>

                        <p className="mb-2">
                          <span className="text-gray-400">Account ID:</span>{" "}
                          <span className="font-semibold">{selectedNode.id}</span>
                        </p>

                        <p className="mb-2">
                          <span className="text-gray-400">Suspicious:</span>{" "}
                          <span
                            className={
                              selectedNode.suspicious
                                ? "text-danger font-semibold"
                                : "text-green-400 font-semibold"
                            }
                          >
                            {selectedNode.suspicious ? "Yes" : "No"}
                          </span>
                        </p>

                        {selectedNode.suspicious && selectedNode.details && (
                          <>
                            <p className="mb-2">
                              <span className="text-gray-400">Suspicion Score:</span>{" "}
                              <span className="font-semibold">
                                {selectedNode.details.suspicion_score}
                              </span>
                            </p>

                            <p className="mb-2">
                              <span className="text-gray-400">Detected Patterns:</span>
                            </p>

                            <ul className="list-disc list-inside text-sm text-yellow-400">
                              {selectedNode.details.detected_patterns.map((pattern, index) => (
                                <li key={index}>{pattern}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => setSelectedNode(null)}
                      className="mt-6 bg-gray-700 px-4 py-2 rounded-lg w-full hover:bg-gray-600 transition"
                    >
                      Close
                    </button>
                  </div>
                )}

              </div>

            </div>

            {/* FRAUD RING TABLE */}
            <div className="bg-gray-800 p-8 rounded-2xl mb-12">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Fraud Ring Summary
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="border-b border-gray-600 text-gray-400 text-center">
                      <th className="p-3">Ring ID</th>
                      <th className="p-3">Pattern Type</th>
                      <th className="p-3">Member Count</th>
                      <th className="p-3">Risk Score</th>
                      <th className="p-3">Member Account IDs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.fraud_rings?.map((ring) => (
                      <tr
                        key={ring.ring_id}
                        className="border-b border-gray-700 hover:bg-gray-700 transition"
                      >
                        <td className="p-3 font-semibold text-accent">
                          {ring.ring_id}
                        </td>

                        <td className="p-3 capitalize">
                          {ring.pattern_type.replace("_", " ")}
                        </td>

                        <td className="p-3 font-semibold text-yellow-400">
                          {ring.member_count}
                        </td>

                        <td className="p-3 font-bold text-danger">
                          {ring.risk_score}
                        </td>

                        <td className="p-3 text-gray-300 text-sm max-w-md break-words">
                          {ring.member_accounts.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>

            {/* DOWNLOAD BUTTON */}
            <div className="text-center">
              <button
                onClick={downloadJSON}
                className="bg-blue-600 px-10 py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Download JSON Output
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
