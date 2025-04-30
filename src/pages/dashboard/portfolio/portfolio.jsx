import React from 'react';
import './portfolio.scss';

const Portfolio = () => {
  const holdings = [
    { name: 'APPL', shares: 10, price: 165.3, value: 1653, percentage: '13.27%' },
    { name: 'MSFT', shares: 15, price: 291.5, value: 4373, percentage: '35.12%' },
    { name: 'GOOGL', shares: 8, price: 125.8, value: 1007, percentage: '8.09%' },
    { name: 'AMZN', shares: 5, price: 117.8, value: 589, percentage: '4.73%' },
  ];

  const totalValue = holdings.reduce((acc, stock) => acc + stock.value, 0);

  return (
    <div className="portfolio-page">
      <h2 className="section-title">Portfolio</h2>

      <div className="card-grid">
        <div className="card value-card">
          <div className="arrow-icon" />
          <div className="portfolio-value">
            <p>$12,450</p>
            <span>Portfolio Value</span>
          </div>
        </div>

        <div className="card top-stocks-card">
          <h3>Top Performing Stocks</h3>
          <ul>
            <li><span>Apple</span><span className="positive">+ 3.15%</span></li>
            <li><span>MSFT</span><span className="positive">+ 2.48%</span></li>
            <li><span>AMZN</span><span className="positive">+ 1.92%</span></li>
          </ul>
        </div>
      </div>

      <div className="card holdings-section">
        <h3>Holdings</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Value</th>
              <th>Portfolio %</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((stock, idx) => (
              <tr key={idx}>
                <td>{stock.name}</td>
                <td>{stock.shares}</td>
                <td>${stock.price.toFixed(2)}</td>
                <td>${stock.value.toLocaleString()}</td>
                <td>{stock.percentage}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="3">Total</td>
              <td>${totalValue.toLocaleString()}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Portfolio;
