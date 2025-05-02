import "./card.scss";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from "react-chartjs-2";

//Register chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const VisualCard = () => {
    const [pieChartData, setPieChartData] = useState(null);
    const [error, setError] = useState(null);

    // Get the user ID from the token
    const getUserIdFromToken = () => {
        const token = localStorage.getItem("token");
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch (error) {
            return null;
        }
    };

    // Function to fetch categories from the backend
    const fetchPieChartData = () => {
        const userId = getUserIdFromToken();
        if (!userId) {
            setError("User ID not found. Please log in.");
            return;
        }

        axios.get(`http://localhost:8000/pie_chart/${userId}`)
            .then((response) => {
                const data = response.data;

                if (!data || Object.keys(data).length === 0) {
                    setError("No data available to display.");
                    return;
                }

                // Transform the data into the format for react-chartjs-2
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
                setError(null); // Clear any previous errors
            })
            .catch(() => {
                setError("Failed to fetch pie chart data. Please try again later.");
            });
    };

    // useEffect to fetch data when the component mounts
    useEffect(() => {
        // Initial data fetch
        fetchPieChartData();

        // Refreshes every minute
        const POLL_INTERVAL_SECONDS = 60;
        
        const interval = setInterval(() => {
            fetchPieChartData();
        }, POLL_INTERVAL_SECONDS * 1000); // fetch data every POLL_INTERVAL_SECONDS

        // Clean up the interval when the component is unmounted
        return () => clearInterval(interval);
    }, []);

    const chartOptions = {
        responsive: true, //still keeping responsive
        plugins:{
            legend: {
                position: "bottom",
                labels: {
                    font: {
                        family: "Quicksand",
                        weight: "Bold",
                    },
                },
            },
            tooltip: {
                bodyFont:{
                    family: "Quicksand",
                    weight: "Bold",
                },
                titleFont: {
                    family: "Quicksand",
                    weight: "Bold",
                },
            },
        },
    };

    return (
        <div className="visual-card" 
            style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "auto",
                margin: "0 auto",
            }}
        >
            {pieChartData ? (
                <Pie data={pieChartData} options={chartOptions} />
            ) : (
                <p>Loading chart data...</p>
            )}
            {error && <p>{error}</p>}
        </div>
    );
};

export default VisualCard;