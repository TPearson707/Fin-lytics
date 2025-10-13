import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./StockInsights.scss";

function StockInsights() {
  const { ticker } = useParams(); // ✅ grab ticker from URL
  const navigate = useNavigate();

  const goBack = () => navigate("/Stock"); // ✅ back navigation

  return (
    <div className="stock-insights">
      {/* ===== Top Bar ===== */}
      <div className="stock-insights__top">
        <button className="stock-insights__back" onClick={goBack}>
          ← Back to Stocks
        </button>
        <input
          type="text"
          className="stock-insights__search"
          placeholder="Search..."
        />
      </div>

      {/* ===== Header ===== */}
      <h2 className="stock-insights__title">{ticker} — Stock Details</h2>

      {/* ===== Main Content ===== */}
      <div className="stock-insights__content">
        {/* Placeholder for chart area */}
        <div className="stock-insights__chart">
          <p style={{ textAlign: "center", color: "#777" }}>
            [Stock chart will appear here]
          </p>
        </div>

        {/* ===== Predictions Table ===== */}
        <div className="stock-insights__predictions">
          <h3>Projected Predictions</h3>
          <table className="stock-insights__table">
            <thead>
              <tr>
                <th>Interval</th>
                <th>Projected Price</th>
                <th>Change %</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>5m</td><td>$254.22</td><td className="stock-insights__positive">+0.31%</td></tr>
              <tr><td>15m</td><td>$255.48</td><td className="stock-insights__positive">+0.87%</td></tr>
              <tr><td>30m</td><td>$257.02</td><td className="stock-insights__positive">+1.45%</td></tr>
              <tr><td>1h</td><td>$260.43</td><td className="stock-insights__positive">+2.72%</td></tr>
              <tr><td>1d</td><td>$272.17</td><td className="stock-insights__positive">+7.63%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StockInsights;
