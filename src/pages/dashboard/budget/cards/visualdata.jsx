import "./card.scss";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";

// Register chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const VisualCard = () => {
    const [pieChartData, setPieChartData] = useState(null);

    // Function to fetch categories from the backend
    const fetchPieChartData = () => {
    axios.get("http://localhost:8000/pie_chart/").then((response) => {
        const data = response.data;
        const chartData = {
            labels: Object.keys(data),
            datasets: [
                {
                    label: "Category Distribution",
                    data: Object.values(data),
                    backgroundColor: [
                    "#5f8f6a8e", // Base Green
                    "#A9B8A4", // Soft Sage
                    "#6B7C56", // Muted Olive
                    "#C4D2B0", // Light Moss
                    "#D1C6A1", // Warm Beige
                    "#B4A798", // Soft Taupe
                    ],
                    borderColor: "#4B6F44", // Dark Green
                    borderWidth: 1,
                },
            ],
        };
        setPieChartData(chartData); // Update the state with the new data
    }).catch((error) => console.error("Error fetching data:", error));
    };

    // useEffect to fetch data when the component mounts
    useEffect(() => {
        // Initial data fetch
        fetchPieChartData();

        // Set up an interval to fetch data every 60 seconds (adjust as needed)
        const POLL_INTERVAL_SECONDS = 5;
        
        const interval = setInterval(() => {
            fetchPieChartData();
        }, POLL_INTERVAL_SECONDS * 1000); // fetch data every POLL_INTERVAL_SECONDS

        // Clean up the interval when the component is unmounted
        return () => clearInterval(interval);
    }, []);

    return (
    <div className="visual-card">
        {pieChartData ? (
        <Pie data={pieChartData} options={{ responsive: true }} />
        ) : (
        <p>Loading chart data...</p>
        )}
    </div>
    );
};

export default VisualCard;
