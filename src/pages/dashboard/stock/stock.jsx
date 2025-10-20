import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const navigate = useNavigate();

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

  // ✅ helper to handle row clicks
  const handleRowClick = (ticker) => {
    navigate(`${ticker}`);
  };

  return (
    <div className="stock-page">
      <h2 className="stock-page__title">Stock Predictions Dashboard</h2>

      {/* ===== Search Bar ===== */}
      <div className="stock-page__search-container">
        <input
          type="text"
          className="stock-page__search"
          placeholder="Search"
        />
      </div>

      {/* ===== Table 1: Chronos Predictions ===== */}
      <h3 style={{ textAlign: "center", marginTop: "1.5rem" }}>
        Chronos Predictions (10 Stocks)
      </h3>
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
          {/* ✅ Added clickable Link for ticker names */}
          <tr onClick={() => handleRowClick('NVDA')}>
            <td>NVDA</td>
            <td>$942.21</td><td>$910.00 – $970.50</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('MSFT')}>
            <td>MSFT</td>
            <td>$415.32</td><td>$400.12 – $429.76</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('AAPL')}>
            <td>AAPL</td>
            <td>$210.44</td><td>$204.11 – $217.09</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('AMZN')}>
            <td>AMZN</td>
            <td>$178.89</td><td>$171.35 – $186.10</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('GOOGL')}>
            <td>GOOGL</td>
            <td>$152.77</td><td>$148.45 – $158.20</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('META')}>
            <td>META</td>
            <td>$495.66</td><td>$480.90 – $512.22</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('BRK.B')}>
            <td>BRK.B</td>
            <td>$402.15</td><td>$395.88 – $410.23</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('TSLA')}>
            <td>TSLA</td>
            <td>$263.05</td><td>$250.80 – $276.44</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('AVGO')}>
            <td>AVGO</td>
            <td>$1,412.75</td><td>$1,385.20 – $1,442.60</td><td>10/01/2025, 6:30 PM</td>
          </tr>
          <tr onClick={() => handleRowClick('PLTR')}>
            <td>PLTR</td>
            <td>$27.38</td><td>$25.22 – $29.44</td><td>10/01/2025, 6:30 PM</td>
          </tr>
        </tbody>
      </table>

      {/* ===== Table 2: Top 5 Gainers ===== */}
      <h3 style={{ textAlign: "center", marginTop: "2rem" }}>Top 5 Gainers (Today)</h3>
      <table className="stock-page__table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Price</th>
            <th>Change %</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          <tr onClick={() => handleRowClick('SMCI')}>
            <td>SMCI</td>
            <td>Super Micro Computer</td><td>$1,216.70</td>
            <td className="stock-page__positive">+8.73%</td><td>4,820,000</td>
          </tr>
          <tr onClick={() => handleRowClick('NVDA')}>
            <td>NVDA</td>
            <td>NVIDIA Corp</td><td>$950.24</td>
            <td className="stock-page__positive">+6.42%</td><td>75,000,000</td>
          </tr>
          <tr onClick={() => handleRowClick('TSLA')}>
            <td>TSLA</td>
            <td>Tesla Inc</td><td>$265.77</td>
            <td className="stock-page__positive">+5.13%</td><td>103,000,000</td>
          </tr>
          <tr onClick={() => handleRowClick('AMZN')}>
            <td>AMZN</td>
            <td>Amazon.com Inc</td><td>$175.11</td>
            <td className="stock-page__positive">+4.58%</td><td>92,000,000</td>
          </tr>
          <tr onClick={() => handleRowClick('META')}>
            <td>META</td>
            <td>Meta Platforms</td><td>$505.12</td>
            <td className="stock-page__positive">+4.32%</td><td>43,000,000</td>
          </tr>
        </tbody>
      </table>

      {/* ===== Table 3: Top 5 Losers ===== */}
      <h3 style={{ textAlign: "center", marginTop: "2rem" }}>Top 5 Losers (Today)</h3>
      <table className="stock-page__table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Price</th>
            <th>Change %</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          <tr onClick={() => handleRowClick('INTC')}>
            <td>INTC</td>
            <td>Intel Corp</td><td>$32.18</td>
            <td className="stock-page__negative">-3.44%</td><td>60,100,000</td>
          </tr>
          <tr onClick={() => handleRowClick('AMD')}>
            <td>AMD</td>
            <td>Advanced Micro Devices</td><td>$103.45</td>
            <td className="stock-page__negative">-2.92%</td><td>54,300,000</td>
          </tr>
          <tr onClick={() => handleRowClick('CSCO')}>
            <td>CSCO</td>
            <td>Cisco Systems</td><td>$51.22</td>
            <td className="stock-page__negative">-2.35%</td><td>48,000,000</td>
          </tr>
          <tr onClick={() => handleRowClick('NFLX')}>
            <td>NFLX</td>
            <td>Netflix Inc</td><td>$412.15</td>
            <td className="stock-page__negative">-2.12%</td><td>21,900,000</td>
          </tr>
          <tr onClick={() => handleRowClick('PYPL')}>
            <td>PYPL</td>
            <td>PayPal Holdings</td><td>$60.33</td>
            <td className="stock-page__negative">-1.98%</td><td>18,700,000</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Stock;
