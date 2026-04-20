import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import yahooFinance from "yahoo-finance2";

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 10000);
const app = express();
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

async function runMigrations() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS watchlist_items (
        id        SERIAL PRIMARY KEY,
        ticker    TEXT    NOT NULL,
        added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_note TEXT
      );
    `);
  } finally {
    client.release();
  }
}

// ── Stock Universe ────────────────────────────────────────────────────────────
const DEFAULT_STOCKS = [
  "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS",
  "SBIN.NS","WIPRO.NS","TATASTEEL.NS","TATAMOTORS.NS","BAJFINANCE.NS",
  "ADANIENT.NS","MARUTI.NS","SUNPHARMA.NS","HCLTECH.NS","AXISBANK.NS",
  "LT.NS","ONGC.NS","COALINDIA.NS","NTPC.NS","POWERGRID.NS",
  "KOTAKBANK.NS","BHARTIARTL.NS","ITC.NS","HINDUNILVR.NS","ASIANPAINT.NS",
  "BAJAJ-AUTO.NS","BAJAJFINSV.NS","TITAN.NS","TECHM.NS","ULTRACEMCO.NS",
  "INDUSINDBK.NS","JSWSTEEL.NS","HINDALCO.NS","BPCL.NS","ADANIPORTS.NS",
  "DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","APOLLOHOSP.NS","BRITANNIA.NS",
  "NESTLEIND.NS","TATACONSUM.NS","EICHERMOT.NS","HEROMOTOCO.NS","BEL.NS",
  "HDFCLIFE.NS","SBILIFE.NS","SHRIRAMFIN.NS","GRASIM.NS","ZOMATO.NS"
];

const SECTORS = {
  "IT": ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS"],
  "Banking": ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS","INDUSINDBK.NS"],
  "Finance": ["BAJFINANCE.NS","BAJAJFINSV.NS","HDFCLIFE.NS","SBILIFE.NS","SHRIRAMFIN.NS"],
  "Auto": ["TATAMOTORS.NS","MARUTI.NS","BAJAJ-AUTO.NS","EICHERMOT.NS","HEROMOTOCO.NS"],
  "Steel/Metal": ["TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","COALINDIA.NS"],
  "Energy": ["ONGC.NS","NTPC.NS","POWERGRID.NS","BPCL.NS","ADANIPORTS.NS"],
  "Conglomerate": ["RELIANCE.NS","ADANIENT.NS","LT.NS","GRASIM.NS"],
  "Pharma": ["SUNPHARMA.NS","CIPLA.NS","DRREDDY.NS","DIVISLAB.NS","APOLLOHOSP.NS"],
  "FMCG": ["HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS"],
  "Others": ["ASIANPAINT.NS","TITAN.NS","ULTRACEMCO.NS","BHARTIARTL.NS","BEL.NS","ZOMATO.NS"]
};

// ── Stock Analysis ────────────────────────────────────────────────────────────
async function fetchStockData(ticker, days = 90) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  try {
    const result = await yahooFinance.chart(ticker, { period1: startDate, period2: endDate, interval: "1d" });
    if (!result.quotes || !result.quotes.length) return [];
    return result.quotes
      .filter(q => q.open != null && q.close != null && q.volume != null)
      .map(q => ({ date: new Date(q.date), open: q.open??0, high: q.high??0, low: q.low??0, close: q.close??0, volume: q.volume??0 }));
  } catch { return []; }
}

function rollingMean(arr, window, idx) {
  const slice = arr.slice(Math.max(0, idx - window + 1), idx + 1);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeFeatures(rows) {
  const vols = rows.map(r => r.volume);
  return rows.slice(20).map((row, i) => {
    const idx = i + 20;
    const vma = rollingMean(vols, 20, idx);
    const vr = vma > 0 ? row.volume / vma : 1;
    const pc = rows[idx-1].close > 0 ? ((row.close - rows[idx-1].close) / rows[idx-1].close) * 100 : 0;
    const pr = row.close > 0 ? (row.high - row.low) / row.close : 0;
    const vpd = vr / (Math.abs(pc) + 0.01);
    const br = Math.abs(row.close - row.open) / (row.high - row.low + 0.001);
    return { ...row, volume_ratio: vr, price_change_pct: pc, price_range_ratio: pr, volume_price_divergence: vpd, body_ratio: br };
  });
}

function runIsolationForest(rows) {
  if (!rows.length) return [];
  const features = rows.map(r => [r.volume_ratio, r.price_change_pct, r.price_range_ratio, r.volume_price_divergence, r.body_ratio]);
  const n = features[0].length;
  const means = Array.from({ length: n }, (_, c) => features.reduce((s, r) => s + r[c], 0) / features.length);
  const stds = Array.from({ length: n }, (_, c) => { const v = features.reduce((s, r) => s + (r[c] - means[c]) ** 2, 0) / features.length; return Math.sqrt(v) || 1; });
  const scaled = features.map(r => r.map((v, c) => (v - means[c]) / stds[c]));
  const scores = scaled.map(r => -Math.sqrt(r.reduce((s, v) => s + v * v, 0)));
  const sorted = [...scores].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0];
  return rows.map((row, i) => ({ ...row, anomaly_score: +(scores[i]?.toFixed(4) ?? "0"), is_anomaly: scores[i] <= threshold }));
}

function classifyPattern(row) {
  if (row.volume_ratio > 2.0 && Math.abs(row.price_change_pct) < 0.8 && row.volume_price_divergence > 3) return "Smart Money Accumulation";
  if (row.volume_ratio > 1.8 && row.price_change_pct < -1.0) return "Distribution Phase";
  if (row.price_change_pct > 3.0 && row.volume_ratio > 2.0) return "Pump Setup";
  if (row.volume_ratio < 0.5 && row.price_range_ratio < 0.01) return "Volatility Squeeze";
  if (row.volume_ratio > 2.0 && row.price_change_pct > 2.0) return "Normal Breakout";
  return "Normal Activity";
}

function estimateBlockOrders(rows) {
  if (rows.length < 2) return 0;
  const recent = rows.slice(-21);
  const avg = recent.slice(0, -1).reduce((s, r) => s + r.volume, 0) / Math.max(1, recent.length - 1);
  const last = recent[recent.length - 1].volume;
  return last > avg * 1.5 ? Math.round((last / avg) * 3) : 0;
}

function emaCalc(prices, period) {
  const k = 2 / (period + 1);
  const result = [prices[0]];
  for (let i = 1; i < prices.length; i++) result.push(prices[i] * k + result[i-1] * (1 - k));
  return result;
}

function rsiCalc(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i-1]; if (d > 0) g += d; else l -= d; }
  let ag = g / period, al = l / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (al === 0) return 100;
  return 100 - (100 / (1 + ag / al));
}

function computeAllIndicators(rows) {
  const results = {};
  if (rows.length < 26) return results;
  const closes = rows.map(r => r.close), highs = rows.map(r => r.high), lows = rows.map(r => r.low);
  const volumes = rows.map(r => r.volume), opens = rows.map(r => r.open);
  const price = closes[closes.length - 1];

  const rv = rsiCalc(closes);
  results["RSI"] = { value: +rv.toFixed(1), verdict: rv > 70 ? "Bearish" : rv < 30 ? "Bullish" : "Neutral", label: rv > 70 ? "Overbought — reversal likely" : rv < 30 ? "Oversold — bounce likely" : `Healthy momentum (${rv.toFixed(1)})`, signal: rv > 70 ? "bearish" : rv < 30 ? "bullish" : "neutral" };

  const e12 = emaCalc(closes, 12), e26 = emaCalc(closes, 26);
  const macd = e12[e12.length-1] - e26[e26.length-1];
  const macdSeries = closes.map((_, i) => emaCalc(closes.slice(0, i+1), 12).at(-1) - emaCalc(closes.slice(0, i+1), 26).at(-1));
  const sigLine = emaCalc(macdSeries, 9).at(-1);
  results["MACD"] = { value: +macd.toFixed(4), verdict: macd > sigLine ? "Bullish" : "Bearish", label: macd > sigLine ? "Bullish crossover — momentum rising" : "Bearish crossover — momentum falling", signal: macd > sigLine ? "bullish" : "bearish" };

  const bbS = closes.slice(-20), bbM = bbS.reduce((a,b) => a+b, 0)/20;
  const bbStd = Math.sqrt(bbS.reduce((s,v) => s+(v-bbM)**2, 0)/20);
  const bbU = bbM + 2*bbStd, bbL = bbM - 2*bbStd;
  const bbP = (bbU - bbL > 0) ? (price - bbL) / (bbU - bbL) : 0.5;
  results["Bollinger Bands"] = { value: +(bbP*100).toFixed(1), verdict: bbP > 0.95 ? "Bearish" : bbP < 0.05 ? "Bullish" : "Neutral", label: bbP > 0.95 ? "At upper band — overbought zone" : bbP < 0.05 ? "At lower band — oversold zone" : bbP > 0.45 && bbP < 0.55 ? "Breakout imminent — tight squeeze" : `Mid-band (${Math.round(bbP*100)}%)`, signal: bbP > 0.95 ? "bearish" : bbP < 0.05 ? "bullish" : "neutral" };

  const e9 = emaCalc(closes, 9).at(-1), e21 = emaCalc(closes, 21).at(-1);
  results["EMA 9/21"] = { value: +(e9-e21).toFixed(2), verdict: e9 > e21 ? "Bullish" : "Bearish", label: e9 > e21 ? "Golden cross — short-term trend bullish" : "Death cross — short-term trend bearish", signal: e9 > e21 ? "bullish" : "bearish" };

  const tp = rows.map(r => (r.high+r.low+r.close)/3);
  const vwap = tp.reduce((a,b) => a+b, 0) / tp.length;
  results["VWAP"] = { value: +vwap.toFixed(2), verdict: price < vwap ? "Bullish" : "Bearish", label: price < vwap ? "Trading below VWAP — potential value entry" : "Trading above VWAP — premium zone", signal: price < vwap ? "bullish" : "bearish" };

  const tr = [], dp = [], dm = [];
  for (let i = 1; i < rows.length; i++) {
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])));
    const u = highs[i]-highs[i-1], dn = lows[i-1]-lows[i];
    dp.push(u > dn && u > 0 ? u : 0);
    dm.push(dn > u && dn > 0 ? dn : 0);
  }
  const sTR = tr.slice(-14).reduce((a,b) => a+b, 0), sDp = dp.slice(-14).reduce((a,b) => a+b, 0), sDm = dm.slice(-14).reduce((a,b) => a+b, 0);
  const diP = sTR > 0 ? (sDp/sTR)*100 : 0, diM = sTR > 0 ? (sDm/sTR)*100 : 0;
  const adx = (diP+diM > 0) ? (Math.abs(diP-diM)/(diP+diM))*100 : 0;
  results["ADX"] = { value: +adx.toFixed(1), verdict: adx > 25 ? "Bullish" : "Neutral", label: adx > 40 ? "Very strong trend" : adx > 25 ? "Strong trend in place — not a fake move" : "Weak trend — sideways market", signal: adx > 25 ? "bullish" : "neutral" };

  const rH = highs.slice(-14), rL = lows.slice(-14);
  const hH = Math.max(...rH), lL = Math.min(...rL);
  const stk = (hH-lL > 0) ? ((price-lL)/(hH-lL))*100 : 50;
  results["Stochastic"] = { value: +stk.toFixed(1), verdict: stk > 80 ? "Bearish" : stk < 20 ? "Bullish" : "Neutral", label: stk > 80 ? "Overbought — exit zone" : stk < 20 ? "Oversold — good entry zone" : `Neutral zone (${Math.round(stk)})`, signal: stk > 80 ? "bearish" : stk < 20 ? "bullish" : "neutral" };

  let obv = 0;
  const obvS = [0];
  for (let i = 1; i < closes.length; i++) { if (closes[i] > closes[i-1]) obv += volumes[i]; else if (closes[i] < closes[i-1]) obv -= volumes[i]; obvS.push(obv); }
  const oT = obvS.at(-1) - (obvS.at(-6) ?? 0), pT = closes.at(-1) - (closes.at(-6) ?? closes.at(-1));
  const oC = (oT > 0 && pT > 0) || (oT < 0 && pT < 0);
  results["OBV"] = { value: Math.round(obv), verdict: oC && pT > 0 ? "Bullish" : !oC ? "Bearish" : "Neutral", label: oC ? "Volume confirming the price move" : "Volume NOT confirming — divergence detected", signal: (oC && pT > 0) ? "bullish" : !oC ? "bearish" : "neutral" };

  const pH = highs.at(-2)??0, pL = lows.at(-2)??0, pC = closes.at(-2)??0;
  const piv = (pH+pL+pC)/3, res = 2*piv-pL, sup = 2*piv-pH;
  const dR = res > 0 ? ((res-price)/price)*100 : 100, dS = sup > 0 ? ((price-sup)/price)*100 : 100;
  results["Support/Resistance"] = { value: +res.toFixed(2), verdict: dR < 1.5 ? "Bearish" : dS < 1.5 ? "Bullish" : "Neutral", label: dR < 1.5 ? `Near resistance at ${res.toFixed(1)} — watch for rejection` : dS < 1.5 ? `Near support at ${sup.toFixed(1)} — good bounce zone` : `Resistance: ${res.toFixed(1)} | Support: ${sup.toFixed(1)}`, signal: dR < 1.5 ? "bearish" : dS < 1.5 ? "bullish" : "neutral" };

  const lC = closes.at(-1), lO = opens.at(-1), lH = highs.at(-1), lLow = lows.at(-1);
  const body = Math.abs(lC-lO), tot = lH-lLow+0.001, bRatio = body/tot;
  const uS = lH - Math.max(lC,lO), lS = Math.min(lC,lO) - lLow;
  let cp, cl, cs;
  if (bRatio < 0.1) { cp="Doji"; cl="Doji formed — indecision, watch closely"; cs="neutral"; }
  else if (lS > 2*body && uS < body) { cp="Hammer"; cl="Hammer — potential reversal from low"; cs="bullish"; }
  else if (uS > 2*body && lS < body) { cp="Shooting Star"; cl="Shooting Star — potential reversal from high"; cs="bearish"; }
  else if (bRatio > 0.7 && lC > lO) { cp="Bullish Marubozu"; cl="Strong bullish candle — buyers in full control"; cs="bullish"; }
  else if (bRatio > 0.7 && lC < lO) { cp="Bearish Marubozu"; cl="Strong bearish candle — sellers in full control"; cs="bearish"; }
  else { cp="Normal"; cl="No significant candlestick pattern"; cs="neutral"; }
  results["Candlestick"] = { value: cp, verdict: cs[0].toUpperCase()+cs.slice(1), label: cl, signal: cs };

  return results;
}

function computeConsensus(indicators) {
  const vals = Object.values(indicators);
  const b = vals.filter(v => v.signal === "bullish").length;
  const bear = vals.filter(v => v.signal === "bearish").length;
  const n = vals.filter(v => v.signal === "neutral").length;
  const total = vals.length;
  const score = total > 0 ? Math.round((b/total)*100) : 0;
  let verdict;
  if (b >= 7) verdict = "STRONGLY BULLISH";
  else if (b >= 5) verdict = "CAUTIOUSLY BULLISH";
  else if (bear >= 7) verdict = "STRONGLY BEARISH";
  else if (bear >= 5) verdict = "CAUTIOUSLY BEARISH";
  else verdict = "NEUTRAL";
  return { verdict, score, bullish_count: b, bearish_count: bear, neutral_count: n, total };
}

function computeSmartMoneyScore(vr, pc, bo, isAno) {
  const vs = Math.min(vr/5.0, 1.0)*40;
  const sup = Math.max(0, 1 - Math.abs(pc)/5.0);
  const vss = Math.min(vr/3.0, 1.0)*sup*30;
  const bs = Math.min(bo/20.0, 1.0)*30;
  const ab = isAno ? 5 : 0;
  return Math.min(Math.round(vs+vss+bs+ab), 100);
}

function getScoreLabel(score) {
  if (score >= 75) return { label: "Very High Institutional Interest", color: "red" };
  if (score >= 50) return { label: "Moderate Institutional Activity", color: "orange" };
  if (score >= 25) return { label: "Low Activity", color: "yellow" };
  return { label: "Normal Market Behaviour", color: "green" };
}

async function analyzeStock(ticker) {
  try {
    const rows = await fetchStockData(ticker, 120);
    if (rows.length < 25) return null;
    const wf = computeFeatures(rows);
    if (!wf.length) return null;
    const wa = runIsolationForest(wf);
    const latest = wa[wa.length - 1];
    const pt = classifyPattern(latest);
    const bo = estimateBlockOrders(rows);
    const sms = computeSmartMoneyScore(latest.volume_ratio, latest.price_change_pct, bo, latest.is_anomaly);
    const { label: sl, color: sc } = getScoreLabel(sms);
    const ind = computeAllIndicators(rows);
    const cons = computeConsensus(ind);
    const hc = sms >= 65 && cons.bullish_count >= 6;
    const ph = rows.slice(-60).map(r => ({ date: r.date.toISOString().split("T")[0], close: +r.close.toFixed(2), volume: r.volume }));
    return { ticker, current_price: +latest.close.toFixed(2), price_change_pct: +latest.price_change_pct.toFixed(2), volume: latest.volume, volume_ratio: +latest.volume_ratio.toFixed(2), is_anomaly: latest.is_anomaly, anomaly_score: latest.anomaly_score, pattern_type: pt, block_orders: bo, smart_money_score: sms, score_label: sl, score_color: sc, is_high_conviction: hc, consensus: cons, indicators: ind, price_history: ph };
  } catch { return null; }
}

async function runBacktest(ticker) {
  try {
    const rows = await fetchStockData(ticker, 730);
    if (rows.length < 50) return null;
    const wa = runIsolationForest(computeFeatures(rows));
    const fw = 5, results = [];
    for (let i = 0; i < wa.length - fw; i++) {
      const row = wa[i];
      if (!row.is_anomaly) continue;
      const pt = classifyPattern(row);
      if (pt === "Normal Activity") continue;
      const ep = row.close;
      const fp = wa.slice(i+1, i+fw+1).map(r => r.close);
      const mr = fp.length > 0 ? ((Math.max(...fp) - ep) / ep) * 100 : 0;
      results.push({ date: row.date.toISOString().split("T")[0], pattern: pt, entry_price: +ep.toFixed(2), max_return_pct: +mr.toFixed(2), correct: mr > 1.5 });
    }
    if (!results.length) return { ticker, total_signals: 0, correct_signals: 0, precision: 0, avg_return_pct: 0, signals: [] };
    const total = results.length, correct = results.filter(r => r.correct).length;
    return { ticker, total_signals: total, correct_signals: correct, precision: +((correct/total)*100).toFixed(1), avg_return_pct: +(results.reduce((s,r) => s+r.max_return_pct, 0)/total).toFixed(2), signals: results.slice(-20) };
  } catch { return null; }
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/api/signals", async (_req, res) => {
  const results = await Promise.allSettled(DEFAULT_STOCKS.map(t => analyzeStock(t)));
  const signals = results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean);
  signals.sort((a, b) => (b?.smart_money_score ?? 0) - (a?.smart_money_score ?? 0));
  res.json(signals);
});

app.get("/api/signals/:ticker", async (req, res) => {
  const t = req.params.ticker.toUpperCase();
  const full = t.includes(".") ? t : `${t}.NS`;
  const data = await analyzeStock(full);
  if (!data) return res.status(404).json({ error: "Could not fetch data for ticker" });
  res.json(data);
});

app.get("/api/sectors", async (_req, res) => {
  const entries = Object.entries(SECTORS);
  const results = await Promise.allSettled(entries.map(async ([sector, tickers]) => {
    const a = await Promise.allSettled(tickers.map(t => analyzeStock(t)));
    const valid = a.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean);
    return {
      sector,
      avg_change_pct: valid.length ? +(valid.reduce((s,v) => s+(v?.price_change_pct??0), 0)/valid.length).toFixed(2) : 0,
      avg_sms: valid.length ? Math.round(valid.reduce((s,v) => s+(v?.smart_money_score??0), 0)/valid.length) : 0,
      tickers,
      signals: valid.map(v => ({ ticker: v?.ticker, price_change_pct: v?.price_change_pct, smart_money_score: v?.smart_money_score }))
    };
  }));
  res.json(results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean));
});

app.get("/api/leaderboard", async (_req, res) => {
  const results = await Promise.allSettled(DEFAULT_STOCKS.map(t => analyzeStock(t)));
  const signals = results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean);
  signals.sort((a, b) => (b?.smart_money_score ?? 0) - (a?.smart_money_score ?? 0));
  res.json(signals.slice(0, 10).map(s => ({
    ticker: s?.ticker, smart_money_score: s?.smart_money_score, score_label: s?.score_label,
    score_color: s?.score_color, pattern_type: s?.pattern_type, price_change_pct: s?.price_change_pct,
    volume_ratio: s?.volume_ratio, current_price: s?.current_price, is_high_conviction: s?.is_high_conviction
  })));
});

app.get("/api/watchlist", async (_req, res) => {
  if (!pool) return res.json([]);
  try {
    const { rows } = await pool.query("SELECT * FROM watchlist_items ORDER BY added_at ASC");
    res.json(rows.map(r => ({ ...r, added_at: r.added_at.toISOString() })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

app.post("/api/watchlist", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not configured" });
  const { ticker, user_note } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker is required" });
  const t = ticker.toUpperCase().includes(".") ? ticker.toUpperCase() : `${ticker.toUpperCase()}.NS`;
  try {
    const { rows } = await pool.query("INSERT INTO watchlist_items (ticker, user_note) VALUES ($1, $2) RETURNING *", [t, user_note ?? null]);
    res.status(201).json({ ...rows[0], added_at: rows[0].added_at.toISOString() });
  } catch { res.status(500).json({ error: "Database error" }); }
});

app.delete("/api/watchlist/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not configured" });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    await pool.query("DELETE FROM watchlist_items WHERE id = $1", [id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

app.get("/api/backtest/:ticker", async (req, res) => {
  const t = req.params.ticker.toUpperCase();
  const full = t.includes(".") ? t : `${t}.NS`;
  const result = await runBacktest(full);
  if (!result) return res.status(404).json({ error: "Insufficient data for backtesting" });
  res.json(result);
});

// ── Serve Frontend ────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, "dist", "public");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch(err => {
    console.error("Migration failed:", err);
    app.listen(PORT, () => console.log(`Server listening on port ${PORT} (no DB)`));
  });
