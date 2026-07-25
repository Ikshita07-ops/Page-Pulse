import React, { useState, useMemo, useCallback } from 'react';
import { useAudit } from './hooks/useAudit';
import {
  Search, Activity, Clock, Type, AlignLeft,
  Image as ImageIcon, Copy, RotateCcw, AlertTriangle,
  Download, Globe, Zap, FileText, CheckCircle2, AlertCircle,
  XCircle, Check, X, Wifi
} from 'lucide-react';


// Maps an HTTP status code to its category and description
const getHttpStatusInfo = (code) => {
  if (code >= 200 && code < 300) return { category: 'excellent', description: 'Website is reachable and healthy.' };
  if (code >= 300 && code < 400) return { category: 'attention', description: 'Website redirects to another location.' };
  if (code === 400) return { category: 'issue', description: 'The request was malformed or invalid.' };
  if (code === 401) return { category: 'issue', description: 'Authentication is required to access this page.' };
  if (code === 403) return { category: 'issue', description: 'Access denied by the remote server.' };
  if (code === 404) return { category: 'issue', description: 'The requested page was not found.' };
  if (code === 429) return { category: 'issue', description: 'Too many requests — rate limiting is active.' };
  if (code >= 500) return { category: 'issue', description: 'The remote server encountered an error.' };
  return { category: 'attention', description: 'Unexpected status code received.' };
};

// Categorize response time into a human-readable label
const getResponseTimeInfo = (ms) => {
  if (ms < 300) return { label: 'Fast', category: 'excellent', description: 'Excellent response time.' };
  if (ms < 800) return { label: 'Good', category: 'excellent', description: 'Good response time.' };
  if (ms < 1500) return { label: 'Average', category: 'attention', description: 'Response is a bit slow.' };
  return { label: 'Slow', category: 'issue', description: 'Server response is sluggish. May affect user experience.' };
};

// Score label helper
const getScoreLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Attention';
  return 'Poor';
};

const getScoreColor = (score) => {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#fbbf24';
  return '#f87171';
};

// Build a plain-text PDF-style report string
const buildTextReport = (data) => {
  const lines = [
    '==============================================',
    '          PAGE PULSE — AUDIT REPORT',
    '==============================================',
    '',
    `Website   : ${data.url}`,
    `Hostname  : ${data.hostname}`,
    `Analyzed  : ${new Date(data.timestamp).toLocaleString()}`,
    '',
    '--- SCORES ---',
    `SEO Score    : ${data.seoScore}/100 (${getScoreLabel(data.seoScore)})`,
    `Health Score : ${data.healthScore}/100 (${getScoreLabel(data.healthScore)})`,
    '',
    '--- PERFORMANCE ---',
    `HTTP Status   : ${data.httpStatus} ${data.httpStatusText}`,
    `Response Time : ${data.responseTimeMs}ms`,
    '',
    '--- SEO METRICS ---',
    `Page Title        : ${data.pageTitle || 'Missing'}`,
    `Meta Description  : ${data.metaDescription ? 'Present' : 'Missing'}`,
    `H1 Count          : ${data.h1Count}`,
    `Images Missing ALT: ${data.imagesMissingAlt}`,
    `Word Count        : ${data.wordCount}`,
    '',
    '--- FLAGS ---',
    `Bot Protection Detected: ${data.hasBotProtection ? 'Yes' : 'No'}`,
    '',
    '==============================================',
    '     Built with Page Pulse | digitalheroesco.com',
    '==============================================',
  ];
  return lines.join('\n');
};

// Generate the analysis summary checklist items automatically from audit data
const buildSummaryItems = (data) => [
  {
    ok: data.httpStatus >= 200 && data.httpStatus < 400,
    text: data.httpStatus >= 200 && data.httpStatus < 400
      ? 'Website is reachable'
      : `Server returned ${data.httpStatus} ${data.httpStatusText}`,
  },
  {
    ok: data.responseTimeMs < 800,
    text: data.responseTimeMs < 800
      ? `Fast response time (${data.responseTimeMs}ms)`
      : `Slow response time (${data.responseTimeMs}ms)`,
  },
  { ok: !!data.pageTitle, text: data.pageTitle ? 'Page title present' : 'Missing page title' },
  { ok: !!data.metaDescription, text: data.metaDescription ? 'Meta description present' : 'Missing meta description' },
  { ok: data.h1Count === 1, text: data.h1Count === 1 ? 'Single H1 tag — perfect structure' : `H1 count: ${data.h1Count} (expected 1)` },
  { ok: data.imagesMissingAlt === 0, text: data.imagesMissingAlt === 0 ? 'All images have ALT text' : `${data.imagesMissingAlt} image(s) missing ALT text` },
  { ok: data.wordCount >= 300, text: data.wordCount >= 300 ? `Good content length (${data.wordCount} words)` : `Thin content (${data.wordCount} words — aim for 300+)` },
  ...(data.hasBotProtection ? [{ ok: false, text: 'CAPTCHA / bot protection detected on this page' }] : []),
];

function Toast({ message, onDone }) {
  return (
    <div className="toast" onAnimationEnd={onDone}>
      <Check size={16} /> {message}
    </div>
  );
}

function ScoreCard({ label, score, icon }) {
  const color = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  return (
    <div className="metric-card score-card glass-panel">
      <div className="metric-header">
        {icon} {label}
      </div>
      <div className="score-value" style={{ color }}>{score}<span className="score-max">/100</span></div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <div className="metric-explanation">{scoreLabel}</div>
    </div>
  );
}

function MetricCard({ label, value, icon, statusType, explanation, badge }) {
  const statusMap = {
    excellent: { className: 'status-excellent', Icon: CheckCircle2, text: 'Excellent' },
    attention: { className: 'status-attention', Icon: AlertCircle, text: 'Needs Attention' },
    issue: { className: 'status-issue', Icon: XCircle, text: 'Issue Found' },
  };
  const status = statusMap[statusType];

  return (
    <div className="metric-card glass-panel">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        {label}
      </div>
      <div className="metric-value">{value}</div>
      {status && (
        <div className={`metric-status ${status.className}`}>
          <status.Icon size={12} />
          {badge || status.text}
        </div>
      )}
      <div className="metric-explanation">{explanation}</div>
    </div>
  );
}

function AnalysisSummary({ data }) {
  const items = buildSummaryItems(data);
  return (
    <div className="analysis-summary glass-panel">
      <div className="summary-title">
        <Activity size={16} /> Overall Analysis
      </div>
      <ul className="summary-list">
        {items.map((item, i) => (
          <li key={i} className={`summary-item ${item.ok ? 'summary-ok' : 'summary-warn'}`}>
            {item.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Stable particles — only computed once per mount, not on every render
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${(i * 6.7) % 100}vw`,
  delay: `${(i * 0.7) % 10}s`,
  duration: `${12 + (i * 1.3) % 18}s`,
}));

function App() {
  const { data, isLoading, error, recentSearches, auditUrl, reset } = useAudit();
  const [urlInput, setUrlInput] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (trimmed) auditUrl(trimmed);
  };

  const handleRecentClick = (url) => {
    setUrlInput(url);
    auditUrl(url);
  };

  const copyJson = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      showToast('JSON copied successfully');
    } catch {
      showToast('Copy failed — please try again');
    }
  };

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `pagepulse-${data.hostname}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(blobUrl);
    showToast('JSON report downloaded');
  };

  const exportPdf = () => {
    if (!data) return;
    const report = buildTextReport(data);
    const blob = new Blob([report], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `pagepulse-${data.hostname}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(blobUrl);
    showToast('Text report downloaded');
  };

  // Render individual metric cards
  const renderResults = () => {
    if (!data) return null;
    const httpInfo = getHttpStatusInfo(data.httpStatus);
    const timeInfo = getResponseTimeInfo(data.responseTimeMs);

    return (
      <div className="results-container">


        {/* Action bar */}
        <div className="action-bar">
          <div className="report-meta">
            <img
              src={data.favicon}
              alt={`${data.hostname} favicon`}
              className="host-favicon"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <div className="host-name">{data.hostname}</div>
              <div className="timestamp">Analyzed on {new Date(data.timestamp).toLocaleString()}</div>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={copyJson} aria-label="Copy JSON">
              <Copy size={15} /> Copy JSON
            </button>
            <button className="btn-secondary" onClick={exportJson} aria-label="Export JSON">
              <Download size={15} /> JSON
            </button>
            <button className="btn-secondary" onClick={exportPdf} aria-label="Export Text Report">
              <FileText size={15} /> Report
            </button>
            <button className="btn-secondary" onClick={reset} aria-label="Reset">
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Analysis Summary */}
        <AnalysisSummary data={data} />

        {/* Score Cards */}
        <div className="scores-grid">
          <ScoreCard label="SEO Score" score={data.seoScore} icon={<Zap size={16} />} />
          <ScoreCard label="Health Score" score={data.healthScore} icon={<Activity size={16} />} />
        </div>

        {/* Metric Cards */}
        <div className="results-grid">
          <MetricCard
            label="HTTP Status"
            value={`${data.httpStatus} ${data.httpStatusText}`}
            icon={<Wifi size={22} />}
            statusType={httpInfo.category}
            explanation={httpInfo.description}
          />
          <MetricCard
            label="Response Time"
            value={`${data.responseTimeMs} ms`}
            icon={<Clock size={22} />}
            statusType={timeInfo.category}
            badge={timeInfo.label}
            explanation={timeInfo.description}
          />
          <MetricCard
            label="Page Title"
            value={data.pageTitle || 'Missing'}
            icon={<Type size={22} />}
            statusType={data.pageTitle ? 'excellent' : 'issue'}
            explanation={data.pageTitle ? 'Crucial for SEO and browser tab identification.' : 'Missing a <title> tag. Critical SEO issue.'}
          />
          <MetricCard
            label="Meta Description"
            value={data.metaDescription ? 'Present' : 'Missing'}
            icon={<AlignLeft size={22} />}
            statusType={data.metaDescription ? 'excellent' : 'attention'}
            explanation={data.metaDescription ? 'Helps search engines understand page context.' : 'Meta description helps search engines understand the page.'}
          />
          <MetricCard
            label="H1 Count"
            value={data.h1Count}
            icon={<Type size={22} />}
            statusType={data.h1Count === 1 ? 'excellent' : data.h1Count === 0 ? 'issue' : 'attention'}
            explanation={
              data.h1Count === 1 ? 'Optimal — one primary heading detected.' :
              data.h1Count === 0 ? 'No primary heading detected. Add a single H1.' :
              'Multiple H1 tags can confuse search engine crawlers.'
            }
          />
          <MetricCard
            label="Images Missing ALT"
            value={data.imagesMissingAlt}
            icon={<ImageIcon size={22} />}
            statusType={data.imagesMissingAlt === 0 ? 'excellent' : 'issue'}
            explanation={data.imagesMissingAlt === 0 ? 'All images are accessible.' : 'Accessibility improvement recommended.'}
          />
          <MetricCard
            label="Word Count"
            value={data.wordCount.toLocaleString()}
            icon={<FileText size={22} />}
            statusType={data.wordCount >= 300 ? 'excellent' : 'attention'}
            explanation={data.wordCount >= 300 ? 'Healthy amount of visible text.' : 'Content may be considered thin by search engines.'}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="background-wrapper" aria-hidden="true">
        <div className="bg-orb orb-purple" />
        <div className="bg-orb orb-blue" />
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="app-container">
        <header className="hero-section">
          <h1 className="title">Page Pulse</h1>
          <p className="subtitle">
            Audit any website in seconds. Analyze HTTP performance, metadata,
            accessibility and page structure using a clean modern interface.
          </p>
        </header>

        <main>
          <div className="audit-form-container">
            <form className="audit-form" onSubmit={handleSubmit}>
              <div className="input-wrapper">
                <Search className="input-icon" size={20} />
                <input
                  type="url"
                  id="url-input"
                  className="url-input"
                  placeholder="Enter website URL (e.g., https://example.com)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  required
                  aria-label="Website URL to audit"
                />
              </div>
              <button type="submit" className="analyze-btn" disabled={isLoading}>
                {isLoading ? <><Activity size={18} /> Analyzing...</> : <><Zap size={18} /> Analyze</>}
              </button>
            </form>

            {recentSearches.length > 0 && (
              <div className="recent-searches" aria-label="Recent searches">
                {recentSearches.map(search => (
                  <button
                    key={search}
                    className="search-pill"
                    onClick={() => handleRecentClick(search)}
                    aria-label={`Re-audit ${search}`}
                  >
                    <Globe size={12} />
                    {search.replace(/^https?:\/\//, '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-alert" role="alert">
              <AlertTriangle size={22} />
              <div>
                <strong>Audit Failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="skeleton-container" aria-busy="true" aria-label="Loading results">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-card glass-panel">
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-data" />
                  <div className="skeleton skeleton-badge" />
                  <div className="skeleton skeleton-desc" />
                </div>
              ))}
            </div>
          )}

          {!data && !isLoading && !error && (
            <div className="empty-state">
              <Globe size={56} />
              <h2>Ready to Audit</h2>
              <p>Enter a URL above to generate a comprehensive SEO and performance report.</p>
            </div>
          )}

          {data && !isLoading && renderResults()}
        </main>

        <footer>
          Built for{' '}
          <a href="https://digitalheroesco.com" target="_blank" rel="noopener noreferrer">
            Digital Heroes Training Task
          </a>
        </footer>
      </div>
    </>
  );
}

export default App;
