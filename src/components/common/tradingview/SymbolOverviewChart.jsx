// SymbolOverviewChart.jsx
import React, { useEffect, useRef, memo } from "react";

function SymbolOverviewChart({ symbol = "NASDAQ:AAPL", theme = "light" }) {
  const container = useRef();

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbols": [["${symbol}"]],
        "chartOnly": true,
        "width": "100%",
        "height": "100%",
        "locale": "en",
        "colorTheme": "${theme}",
        "autosize": true,
        "showVolume": false,
        "showMA": true,
        "hideDateRanges": false,
        "hideMarketStatus": false,
        "hideSymbolLogo": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "Quicksand, sans-serif",
        "noTimeScale": false,
        "chartType": "candlesticks"
      }`;
    container.current.appendChild(script);
  }, [symbol, theme]);

  return (
    <div
      className="symbol-overview-container"
      ref={container}
      style={{ height: "100%", width: "100%" }}
    ></div>
  );
}

export default memo(SymbolOverviewChart);
