import React, { useState, useEffect } from "react";
import "../../styles/pages/about.scss";
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    Container,
    Fade,
    IconButton,
    Chip,
    Divider,
    Grid
} from "@mui/material";
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const About = () => {
    const [currentDeveloper, setCurrentDeveloper] = useState(0);
    const [fadeIn, setFadeIn] = useState(true);
    const [slideDirection, setSlideDirection] = useState(0); // -1 for left, 1 for right, 0 for no direction

    const developers = [
        {
            name: "Lilly Ngo",
            bio: "Computer Science major graduating Spring 2025. Focused on frontend development and user experience design for Fin-lytics.",
            linkedin: "https://linkedin.com/in/ADD YOUR LINKED IN",
            role: "Frontend Developer & UX Designer"
        },
        {
            name: "Hayden Komasz",
            bio: "Software Engineering major graduating Spring 2025. Specialized in backend architecture and API development for financial data integration.",
            linkedin: "https://linkedin.com/in/ADD YOUR LINKED IN",
            role: "Full-Stack Developer"
        },
        {
            name: "Adam Plankey",
            bio: "Computer Science major graduating Spring 2025. Concentrated on AI/ML implementation and data analytics for stock prediction features.",
            linkedin: "https://linkedin.com/in/ADD YOUR LINKED IN",
            role: "AI/ML Engineer & Data Analytics"
        },
        {
            name: "Thomas Pearson",
            bio: "Software Engineering major graduating Spring 2025. Led full-stack development and system architecture design for the financial platform.",
            linkedin: "https://linkedin.com/in/ADD YOUR LINKED IN",
            role: "Full-Stack Developer"
        },
    ];

    // Auto-advance carousel every 8 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            handleNextDeveloper();
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const handlePreviousDeveloper = () => {
        setSlideDirection(-1); // sliding left
        setFadeIn(false);
        setTimeout(() => {
            setCurrentDeveloper((prev) => (prev - 1 + developers.length) % developers.length);
            setFadeIn(true);
        }, 300);
        setTimeout(() => setSlideDirection(0), 700); // reset direction after animation
    };

    const handleNextDeveloper = () => {
        setSlideDirection(1); // sliding right
        setFadeIn(false);
        setTimeout(() => {
            setCurrentDeveloper((prev) => (prev + 1) % developers.length);
            setFadeIn(true);
        }, 300);
        setTimeout(() => setSlideDirection(0), 700); // reset direction after animation
    };

    return (
        <Box 
            sx={{ 
                background: 'linear-gradient(135deg, #fdfefd 0%, #fbfcfb 50%, #fcfdfc 100%)',
                minHeight: '100vh',
                py: 4,
                backgroundAttachment: 'fixed',
                position: 'relative',
                zIndex: 1,
                marginTop: '-2px'
            }}
        >
            <Container maxWidth="lg" sx={{ padding: "2rem 1rem" }}>
            {/* Header Section */}
            <Box textAlign="center" mb={6}>
                <Typography 
                    variant="h2" 
                    component="h1" 
                    gutterBottom 
                    sx={{ 
                        fontWeight: 700,
                        color: '#749181',
                        mb: 2
                    }}
                >
                    Fin-lytics
                </Typography>
                <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 300 }}>
                    Empowering Financial Literacy Through Innovation
                </Typography>
            </Box>

            <Card 
                elevation={3} 
                sx={{ 
                    mb: 6,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(116, 145, 129, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 32px rgba(116, 145, 129, 0.15)'
                    }
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom textAlign="center" sx={{ fontWeight: 600, color: '#749181', mb: 4 }}>
                        Meet Our Development Team
                    </Typography>
                    
                    <Box sx={{ position: 'relative', overflow: 'hidden', py: 2 }}>
                        <Box 
                            sx={{ 
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                gap: 3,
                                px: 2,
                                minHeight: '340px',
                                transform: `translateX(${fadeIn ? '0px' : `${slideDirection * 40}px`})`,
                                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: fadeIn ? 1 : 0.7
                            }}
                        >
                            {(() => {
                                const prevIndex = (currentDeveloper - 1 + developers.length) % developers.length;
                                const nextIndex = (currentDeveloper + 1) % developers.length;
                                const visibleCards = [
                                    { developer: developers[prevIndex], index: prevIndex, position: 'prev' },
                                    { developer: developers[currentDeveloper], index: currentDeveloper, position: 'center' },
                                    { developer: developers[nextIndex], index: nextIndex, position: 'next' }
                                ];

                                return visibleCards.map(({ developer, index, position }, cardIndex) => {
                                    const isCenter = position === 'center';
                                    const cardSlideDirection = position === 'prev' ? -1 : position === 'next' ? 1 : 0;
                                    
                                    return (
                                        <Card
                                            key={`${index}-${position}`}
                                            elevation={isCenter ? 12 : 4}
                                            sx={{
                                                flex: '0 0 280px',
                                                height: isCenter ? '320px' : '280px',
                                                borderRadius: 4,
                                                background: isCenter 
                                                    ? 'linear-gradient(135deg, #ffffff 0%, #f8fcf9 50%, #f0f7f2 100%)'
                                                    : 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                                                border: isCenter ? '3px solid rgba(116, 145, 129, 0.5)' : '2px solid rgba(116, 145, 129, 0.3)',
                                                transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                                transform: `
                                                    scale(${isCenter ? 1.03 : 0.92}) 
                                                    translateX(${cardSlideDirection * 10}px) 
                                                    translateY(${isCenter ? '-3px' : '8px'})
                                                    rotateY(${cardSlideDirection * 3}deg)
                                                `,
                                                opacity: isCenter ? 1 : 0.85,
                                                cursor: 'pointer',
                                                overflow: 'visible',
                                                boxShadow: isCenter 
                                                    ? '0 12px 36px rgba(116, 145, 129, 0.25), 0 0 0 1px rgba(116, 145, 129, 0.1)'
                                                    : '0 6px 20px rgba(0, 0, 0, 0.12)',
                                                zIndex: isCenter ? 10 : 5,
                                                transformStyle: 'preserve-3d',
                                                '&:hover': {
                                                    transform: `
                                                        scale(${isCenter ? 1.04 : 0.94}) 
                                                        translateX(${cardSlideDirection * 8}px) 
                                                        translateY(${isCenter ? '-5px' : '5px'})
                                                        rotateY(${cardSlideDirection * 2}deg)
                                                    `,
                                                    opacity: 1,
                                                    boxShadow: isCenter 
                                                        ? '0 16px 48px rgba(116, 145, 129, 0.3), 0 0 0 1px rgba(116, 145, 129, 0.2)'
                                                        : '0 8px 28px rgba(116, 145, 129, 0.18)'
                                                }
                                            }}
                                            onClick={() => {
                                                if (!isCenter) {
                                                    // Determine slide direction based on which card was clicked
                                                    const direction = position === 'prev' ? -1 : 1;
                                                    setSlideDirection(direction);
                                                    setFadeIn(false);
                                                    setTimeout(() => {
                                                        setCurrentDeveloper(index);
                                                        setFadeIn(true);
                                                    }, 200);
                                                    setTimeout(() => setSlideDirection(0), 700);
                                                }
                                            }}
                                        >
                                        <CardContent sx={{ 
                                            textAlign: 'center', 
                                            p: isCenter ? 3 : 2.5,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: isCenter ? 2 : 1.5
                                        }}>
                                            <Box sx={{ 
                                                opacity: fadeIn ? 1 : 0.8,
                                                transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
                                                transition: `all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${cardIndex * 0.1}s`
                                            }}>
                                                <Typography 
                                                    variant={isCenter ? "h5" : "h6"} 
                                                    gutterBottom 
                                                    sx={{ 
                                                        fontWeight: 600, 
                                                        color: isCenter ? '#749181' : '#666',
                                                        minHeight: isCenter ? '40px' : '32px',
                                                        fontSize: isCenter ? '1.5rem' : '1.1rem',
                                                        mb: 1
                                                    }}
                                                >
                                                    {developer.name}
                                                </Typography>
                                                
                                                <Chip 
                                                    label={developer.role}
                                                    size={isCenter ? "medium" : "small"}
                                                    sx={{ 
                                                        backgroundColor: isCenter ? 'rgba(116, 145, 129, 0.9)' : 'rgba(116, 145, 129, 0.15)', 
                                                        color: isCenter ? 'white' : '#749181',
                                                        fontWeight: 500,
                                                        fontSize: isCenter ? '0.875rem' : '0.75rem'
                                                    }}
                                                />
                                            </Box>
                                            
                                            <Box sx={{ 
                                                opacity: fadeIn ? 1 : 0.6,
                                                transform: fadeIn ? 'translateY(0)' : 'translateY(15px)',
                                                transition: `all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${cardIndex * 0.15}s`
                                            }}>
                                                <Typography 
                                                    variant={isCenter ? "body2" : "caption"} 
                                                    sx={{ 
                                                        lineHeight: isCenter ? 1.6 : 1.5, 
                                                        color: isCenter ? '#333' : '#666',
                                                        fontSize: isCenter ? '0.875rem' : '0.75rem',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: isCenter ? 5 : 4,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {isCenter ? developer.bio : developer.bio.length > 80 ? `${developer.bio.substring(0, 80)}...` : developer.bio}
                                                </Typography>
                                            </Box>
                                            
                                            {isCenter && (
                                                <Box sx={{ 
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    opacity: fadeIn ? 1 : 0.4,
                                                    transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
                                                    transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s'
                                                }}>
                                                    <Box
                                                        component="a"
                                                        href={developer.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{ 
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <LinkedInIcon
                                                            sx={{ 
                                                                color: '#0077b5',
                                                                fontSize: 26,
                                                                cursor: 'pointer',
                                                                '&:hover': { 
                                                                    color: '#005885',
                                                                    transform: 'scale(1.15)',
                                                                    filter: 'drop-shadow(0 2px 8px rgba(0, 119, 181, 0.3))'
                                                                },
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            )}
                                            
                                            {!isCenter && (
                                                <Box sx={{ 
                                                    mt: 1,
                                                    opacity: fadeIn ? 0.7 : 0.3,
                                                    transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
                                                    transition: `all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${cardIndex * 0.2}s`
                                                }}>
                                                    <Typography variant="caption" sx={{ 
                                                        color: '#999', 
                                                        fontStyle: 'italic',
                                                        fontSize: '0.7rem'
                                                    }}>
                                                        Click to learn more
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            });
                            })()}
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
                            <IconButton 
                                onClick={handlePreviousDeveloper}
                                sx={{ 
                                    color: '#749181',
                                    backgroundColor: 'rgba(116, 145, 129, 0.1)',
                                    border: '2px solid rgba(116, 145, 129, 0.2)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(116, 145, 129, 0.2)',
                                        transform: 'scale(1.1)',
                                        boxShadow: '0 4px 12px rgba(116, 145, 129, 0.3)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                                size="large"
                            >
                                <ArrowBackIosIcon />
                            </IconButton>
                            
                            {developers.map((_, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        mx: 0.5,
                                        backgroundColor: currentDeveloper === index ? '#749181' : '#c0c0c0',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': { 
                                            backgroundColor: '#749181',
                                            transform: 'scale(1.3)',
                                            boxShadow: '0 0 10px rgba(116, 145, 129, 0.5)'
                                        },
                                        ...(currentDeveloper === index && {
                                            boxShadow: '0 0 8px rgba(116, 145, 129, 0.6)',
                                            transform: 'scale(1.1)'
                                        })
                                    }}
                                    onClick={() => {
                                        const direction = index > currentDeveloper ? 1 : -1;
                                        setSlideDirection(direction);
                                        setFadeIn(false);
                                        setTimeout(() => {
                                            setCurrentDeveloper(index);
                                            setFadeIn(true);
                                        }, 300);
                                        setTimeout(() => setSlideDirection(0), 700);
                                    }}
                                />
                            ))}
                            
                            <IconButton 
                                onClick={handleNextDeveloper}
                                sx={{ 
                                    color: '#749181',
                                    backgroundColor: 'rgba(116, 145, 129, 0.1)',
                                    border: '2px solid rgba(116, 145, 129, 0.2)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(116, 145, 129, 0.2)',
                                        transform: 'scale(1.1)',
                                        boxShadow: '0 4px 12px rgba(116, 145, 129, 0.3)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                                size="large"
                            >
                                <ArrowForwardIosIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card 
                elevation={3} 
                sx={{ 
                    mb: 6,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(116, 145, 129, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 32px rgba(116, 145, 129, 0.15)'
                    }
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#749181', textAlign: 'center', mb: 4 }}>
                        Our Mission
                    </Typography>
                    
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" paragraph sx={{ fontWeight: 500, color: '#333' }}>
                                The Challenge
                            </Typography>
                            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                                In a world crowded with financial apps, we saw an opportunity to do something different.
                                Despite the abundance of tools available, many young people still find financial literacy and money management out of reach.
                                We set out to change that by creating a solution that’s accessible, engaging, and truly empowering.
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" paragraph sx={{ fontWeight: 500, color: '#333' }}>
                                Our Solution
                            </Typography>
                            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                                Fin-lytics brings together the excitement of modern technology and the essential need for financial education.
                                Our platform makes managing money simple and engaging by turning complex financial data into clear, actionable insights powered by AI.
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" paragraph sx={{ fontWeight: 500, color: '#333' }}>
                                Academic Connection
                            </Typography>
                            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                                This project represents the culmination of our Computer Science and Software Engineering studies at Salisbury University’s COSC 425/426 capstone course. 
                                It reflects our ability to take classroom concepts into the real world—designing, implementing, and testing our own ideas to create a functional, impactful solution.
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>


            <Card 
                elevation={3} 
                sx={{ 
                    mb: 6, 
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(116, 145, 129, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 32px rgba(116, 145, 129, 0.15)'
                    }
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#749181', textAlign: 'center', mb: 4 }}>
                        Platform Capabilities
                    </Typography>
                    
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 500, mb: 2, color: '#000' }}>
                            Portfolio Management & Investment Tracking
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, ml: 2, mb: 3 }}>
                            Real-time portfolio monitoring with comprehensive stock tracking, performance analytics, and 
                            top-performing investment highlights. Our platform provides instant portfolio health assessments 
                            with actionable insights for users of all investment experience levels.
                        </Typography>

                        <Typography variant="h6" sx={{ fontWeight: 500, mb: 2, color: '#000' }}>
                            Intelligent Budgeting & Financial Planning
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, ml: 2, mb: 3 }}>
                            Advanced budgeting tools featuring calendar integration, automated transaction categorization, 
                            and predictive spending forecasts. Seamless integration between Plaid-connected and manual accounts 
                            ensures comprehensive financial oversight regardless of your banking setup.
                        </Typography>

                        <Typography variant="h6" sx={{ fontWeight: 500, mb: 2, color: '#000' }}>
                            AI-Powered Financial Intelligence
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, ml: 2, mb: 3 }}>
                            Cutting-edge AI analysis providing stock insights, market sentiment evaluation, and personalized 
                            investment recommendations. Our transparent AI reasoning helps users understand the 'why' behind 
                            every suggestion, promoting financial education alongside practical guidance.
                        </Typography>

                        <Typography variant="h6" sx={{ fontWeight: 500, mb: 2, color: '#000' }}>
                            Target Audience & Impact
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.7, ml: 2 }}>
                            Designed for young adults, college students, and early-career professionals who want to build 
                            strong financial foundations. Our platform serves users regardless of their financial literacy 
                            background, providing both beginner-friendly guidance and advanced analytical tools for 
                            experienced investors.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>


        </Container>
        </Box>
    );
};

export default About;