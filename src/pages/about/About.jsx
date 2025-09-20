import React from "react";
import "../../styles/pages/about.scss";
import { Box, Typography, Grid, Card, CardContent } from "@mui/material";

const About = () => {
    const developers = [
        {
            name: "Lilly Ngo",
            bio: "bio information, prob major, graduation time, and what u worked on", 
        },
        {
            name: "Hayden Komasz",
            bio: "bio information, prob major, graduation time, and what u worked on", 
        },
        {
            name: "Adam Plankey",
            bio: "bio information, prob major, graduation time, and what u worked on", 
        },
        {
            name: "Thomas Pearson",
            bio: "bio information, prob major, graduation time, and what u worked on", 
        },
    ];

    return (
        <Box sx={{ padding: "2rem" }}>
            <Typography variant="h3" gutterBottom>
                About Finlytics
            </Typography>
            <Typography variant="body1" paragraph>
                Finlytics is a project developed as part of Salisbury University's COSC 425/426 course. 
                Our goal is to provide users with a comprehensive financial management tool that leverages AI-driven insights to help them make informed decisions about their finances. 
                This project represents the culmination of our studies and teamwork as computer science/software engineering majors.
            </Typography>

            <Typography variant="h4" gutterBottom>
                Meet the Developers
            </Typography>
            <Grid container spacing={4}>
                {developers.map((developer, index) => (
                    <Grid key={index}>
                        <Card>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>
                                    {developer.name}
                                </Typography>
                                <Typography variant="body2">
                                    {developer.bio}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default About;