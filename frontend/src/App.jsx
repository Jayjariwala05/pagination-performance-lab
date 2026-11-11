
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Database, Play, Activity, Clock3,
  Layers, CheckCircle2, AlertCircle
} from "lucide-react";
import "./App.css";

const API = "http://localhost:8081";

export default function App() {
  const [count, setCount] = useState(10000);
  const [page, setPage] = useState(100);
  const [pageSize, setPageSize] = useState(20);
  const [runs, setRuns] = useState(10);

  const [datasetCount, setDatasetCount] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function generateData() {
    setLoading("generate");
    setError("");
    setMessage("");
    setResult(null);

    try {
      const data = await request("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: Number(count) })
      });

      setDatasetCount(data.totalRecords);
      setMessage(`Successfully generated ${data.totalRecords.toLocaleString()} records.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  async function runBenchmark() {
    setLoading("benchmark");
    setError("");
    setMessage("");

    try {
      const data = await request("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: Number(page),
          pageSize: Number(pageSize),
          runs: Number(runs)
        })
      });

      setResult(data);
      setDatasetCount(data.totalRecords);
      setMessage("Benchmark completed using live MongoDB measurements.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  const chartData = result ? [
    { name: "Offset", latency: result.offset.medianMs },
    { name: "Cursor", latency: result.cursor.medianMs }
  ] : [];

  const keysData = result ? [
    { name: "Offset", keys: result.offset.keysExamined },
    { name: "Cursor", keys: result.cursor.keysExamined }
  ] : [];

  const ratio = result && result.cursor.medianMs > 0
    ? (result.offset.medianMs / result.cursor.medianMs).toFixed(2)
    : null;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon"><Database size={23} /></div>
          <div>
            <h1>Pagination Performance Lab</h1>
            <p>Live MongoDB Benchmarking Application</p>
          </div>
        </div>
        <span className="status">● Live Benchmarking</span>
      </header>

      <main className="container">
        <section className="intro">
          <h2>Offset vs Cursor Pagination</h2>
          <p>
            Generate synthetic data, run controlled benchmarks,
            and compare real MongoDB query performance.
          </p>
        </section>

        <div className="controls">
          <section className="panel">
            <div className="panel-heading">
              <Database size={20} />
              <h3>Dataset Configuration</h3>
            </div>

            <label htmlFor="count">Number of Records</label>
            <input
              id="count"
              type="number"
              min="1"
              max="500000"
              value={count}
              disabled={!!loading}
              onChange={(e) => setCount(e.target.value)}
            />

            <p className="hint">
              Generate between 1 and 500,000 synthetic records.
              This replaces the current benchmark dataset.
            </p>

            <button
              onClick={generateData}
              disabled={!!loading}
              className="secondary-button"
            >
              <Database size={17} />
              {loading === "generate" ? "Generating..." : "Generate Dataset"}
            </button>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <Activity size={20} />
              <h3>Benchmark Configuration</h3>
            </div>

            <div className="field-grid">
              <div>
                <label htmlFor="page">Page Number</label>
                <input
                  id="page"
                  type="number"
                  min="1"
                  value={page}
                  disabled={!!loading}
                  onChange={(e) => setPage(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="pageSize">Page Size</label>
                <input
                  id="pageSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={pageSize}
                  disabled={!!loading}
                  onChange={(e) => setPageSize(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="runs">Benchmark Runs</label>
                <input
                  id="runs"
                  type="number"
                  min="1"
                  max="100"
                  value={runs}
                  disabled={!!loading}
                  onChange={(e) => setRuns(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={runBenchmark}
              disabled={!!loading}
              className="primary-button"
            >
              <Play size={17} />
              {loading === "benchmark" ? "Running Benchmark..." : "Run Live Benchmark"}
            </button>
          </section>
        </div>

        {error && (
          <div className="alert error">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {message && (
          <div className="alert success">
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        {loading && (
          <div className="alert info">
            Processing live MongoDB operations. Please wait...
          </div>
        )}

        <section className="results">
          <div className="section-heading">
            <h2>Performance Results</h2>
            <p>Measurements are retrieved directly from the backend.</p>
          </div>

          {!result ? (
            <div className="empty">
              <Layers size={38} />
              <h3>No benchmark results yet</h3>
              <p>
                Configure your settings and click Run Live Benchmark
                to see performance comparisons.
              </p>
              {datasetCount !== null && (
                <p>Current generated dataset: {datasetCount.toLocaleString()} records</p>
              )}
            </div>
          ) : (
            <>
              <div className="stats">
                <div className="stat-card">
                  <Database size={20} />
                  <span>Dataset Size</span>
                  <strong>{result.totalRecords.toLocaleString()}</strong>
                  <small>Total records</small>
                </div>

                <div className="stat-card">
                  <Clock3 size={20} />
                  <span>Offset Median</span>
                  <strong>{result.offset.medianMs} ms</strong>
                  <small>{result.runs} measured runs</small>
                </div>

                <div className="stat-card">
                  <Clock3 size={20} />
                  <span>Cursor Median</span>
                  <strong>{result.cursor.medianMs} ms</strong>
                  <small>{result.runs} measured runs</small>
                </div>

                <div className="stat-card">
                  <Activity size={20} />
                  <span>Offset / Cursor Ratio</span>
                  <strong>{ratio ? `${ratio}×` : "N/A"}</strong>
                  <small>Greater than 1 means cursor was faster</small>
                </div>
              </div>

              <div className="charts">
                <div className="panel chart-panel">
                  <h3>Median Execution Time</h3>
                  <p>Lower is better · milliseconds</p>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="latency"
                          name="Execution Time (ms)"
                          fill="#2563eb"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel chart-panel">
                  <h3>Index Keys Examined</h3>
                  <p>MongoDB execution statistics</p>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={keysData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="keys"
                          name="Keys Examined"
                          fill="#0d9488"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <section className="panel details">
                <h3>Detailed Comparison</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Offset Pagination</th>
                        <th>Cursor Pagination</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Median execution time</td>
                        <td>{result.offset.medianMs} ms</td>
                        <td>{result.cursor.medianMs} ms</td>
                      </tr>
                      <tr>
                        <td>Keys examined</td>
                        <td>{result.offset.keysExamined}</td>
                        <td>{result.cursor.keysExamined}</td>
                      </tr>
                      <tr>
                        <td>Documents examined</td>
                        <td>{result.offset.docsExamined}</td>
                        <td>{result.cursor.docsExamined}</td>
                      </tr>
                      <tr>
                        <td>Records returned</td>
                        <td>{result.offset.recordsReturned}</td>
                        <td>{result.cursor.recordsReturned}</td>
                      </tr>
                      <tr>
                        <td>Individual timings (ms)</td>
                        <td>{result.offset.timesMs.join(", ")}</td>
                        <td>{result.cursor.timesMs.join(", ")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="verification">
                  {result.resultsMatch
                    ? "✓ Both algorithms returned identical records."
                    : "⚠ Returned records do not match."}
                </p>
                <p className="hint">{result.comparisonNote}</p>
              </section>
            </>
          )}
        </section>
      </main>

      <footer>
        Software Engineering Research Project · Live Pagination Benchmarking
      </footer>
    </div>
  );
}
