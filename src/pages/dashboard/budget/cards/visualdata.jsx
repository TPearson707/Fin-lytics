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
                                "#4E7A5F", // Forest Fern
                                "#6A9A72", // Dusty Jade
                                "#588868", // Mellow Pine
                                "#3F6E53", // Deep Sage
                                "#62876A", // Dull Spruce
                                "#B2C3AE", // Sage Mist
                                "#9FAC9B", // Soft Juniper
                                "#BCCBB9", // Faded Eucalyptus
                                "#A3B49F", // Gray Sage
                                "#C0D1BC", // Light Herb
                                "#5F6F4C", // Shadow Olive
                                "#758B61", // Dusty Avocado
                                "#667B52", // Toned Moss
                                "#7C8D69", // Soft Military
                                "#586A46", // Woodland Green
                                "#D0DEC2", // Pale Fern
                                "#BBD1A6", // Soft Lichen
                                "#C9D8B5", // Misty Leaf
                                "#D3E0C4", // Light Herb Green
                                "#D6E3CC", // Hushed Green
                                "#DDD2AF", // Sandstone
                                "#C9BC9B", // Dried Grass
                                "#E1D7BA", // Linen Gold
                                "#D9CCA8", // Morning Wheat
                                "#BFB38C", // Pale Khaki
                                "#C1B2A3", // Dusty Rose Beige
                                "#A9998B", // Ash Taupe
                                "#B7A99A", // Weathered Clay
                                "#CBBBAE", // Muted Putty
                                "#AD9E90", // Cocoa Dust
                                
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
