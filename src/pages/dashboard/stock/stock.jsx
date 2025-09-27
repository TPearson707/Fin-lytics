import React, { useState } from "react";
import "./stock.scss";

function Stock() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // List of stock tickers to generate predictions for
  const tickers = [
    "NVDA", "MSFT", "AAPL", "AMZN", "GOOGL",
    "META", "BRK.B", "TSLA", "AVGO", "PLTR", "VOO",
  ];

  async function generatePredictions() {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/stocks/predictions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ tickers }),
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      // Backend returns { predictions: [...] }
      setPredictions(data.predictions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stock-page">
      <h2 className="stock-page__title">Stock Predictions (Testing)</h2>

      <button onClick={generatePredictions} className="stock-page__button">
        Generate Predictions
      </button>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}

      {predictions.length > 0 && (
        <table className="stock-page__table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Predicted Price</th>
              <th>Confidence Range</th>
              <th>Prediction Time</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred, i) => (
              <tr key={i}>
                <td>{pred.ticker}</td>
                <td>${pred.predicted_price.toFixed(2)}</td>
                <td>
                  ${pred.confidence_low?.toFixed(2)} – ${pred.confidence_high?.toFixed(2)}
                </td>
                <td>{new Date(pred.prediction_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Stock;
