import React, { useEffect, useState } from "react";
import axios from "axios";
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from "react-chartjs-2";

// Register chart.js components
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
        } catch (err) {
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
                                "#5f8f6a8e", "#A9B8A4", "#6B7C56", "#C4D2B0", "#D1C6A1",
                                "#B4A798", "#4E7A5F", "#6A9A72", "#588868", "#3F6E53",
                                "#62876A", "#B2C3AE", "#9FAC9B", "#BCCBB9", "#A3B49F",
                                "#C0D1BC", "#5F6F4C", "#758B61", "#667B52", "#7C8D69",
                                "#586A46", "#D0DEC2", "#BBD1A6", "#C9D8B5", "#D3E0C4",
                                "#D6E3CC", "#DDD2AF", "#C9BC9B", "#E1D7BA", "#D9CCA8",
                                "#BFB38C", "#C1B2A3", "#A9998B", "#B7A99A", "#CBBBAE",
                                "#AD9E90",
                            ],
                            borderColor: "#4B6F44",
                            borderWidth: 1,
                        },
                    ],
                };
                setPieChartData(chartData);
                setError(null);
            })
            .catch(() => {
                setError("Failed to fetch pie chart data. Please try again later.");
            });
    };

    useEffect(() => {
        fetchPieChartData();
        const POLL_INTERVAL_SECONDS = 60;
        const interval = setInterval(() => fetchPieChartData(), POLL_INTERVAL_SECONDS * 1000);
        return () => clearInterval(interval);
    }, []);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: "bottom",
                labels: { font: { family: "Quicksand", weight: "Bold" } },
            },
            tooltip: {
                bodyFont: { family: "Quicksand", weight: "Bold" },
                titleFont: { family: "Quicksand", weight: "Bold" },
            },
        },
    };

    return (
        <Paper elevation={1} sx={{ p: 2 }} className="visual-card">
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* <Typography variant="h6">Data Analytics</Typography> */}
                <Typography variant="caption" color="text.secondary">Category distribution</Typography>
            </Box>

            {!pieChartData && !error && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {pieChartData && <Pie data={pieChartData} options={chartOptions} />}

            {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
        </Paper>
    );
};

export default VisualCard;