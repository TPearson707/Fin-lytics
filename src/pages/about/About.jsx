import React, { useState, useEffect } from "react";
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
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const About = () => {
    const [currentDeveloper, setCurrentDeveloper] = useState(0);
    const [fadeIn, setFadeIn] = useState(true);
    const [slideDirection, setSlideDirection] = useState(0); // -1 for left, 1 for right, 0 for no direction

    const developers = [
        {
            name: "Lilly Ngo",
            bio: "Focused on frontend development, UX design, and shaping the core application concept for Fin-lytics.",
            grad: "Spring 2026",
            linkedin: "https://www.linkedin.com/in/lillyn-g",
            email: "wlillyngo@gmail.com",
            github: "https://github.com/ngosterly",
            role: "Full-Stack Developer"
        },
        {
            name: "Hayden Komasz",
            bio: "Specialized in backend architecture, core database logic, and API development/integration.",
            grad: "Spring 2026",
            linkedin: "https://www.linkedin.com/in/hayden-komasz-37b938393",
            email: "haydenkomasz@gmail.com",
            github: "https://github.com/HaydenK19",
            role: "Full-Stack Developer"
        },
        {
            name: "Adam Plankey",
            bio: "Concentrated on AI/ML implementation and data analytics for stock prediction features.",
            grad: "Fall 2025",
            linkedin: "https://www.linkedin.com/in/adam-plankey-23189226a/",
            email: "adameplankey@gmail.com",
            github: "https://github.com/adamplankey",
            role: "Backend Developer"
        },
        {
            name: "Thomas Pearson",
            bio: "Implemented key frontend–backend endpoints and contributed across the full stack.",
            grad: "Spring 2026",
            linkedin: "https://www.linkedin.com/in/thomas-pearson-b85ab122b/",
            email: "pearson.e.thomas@gmail.com",
            github: "https://github.com/TPearson707",
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
            className="about-page"
            sx={{ 
                background: 'linear-gradient(120deg, #f7faf8 0%, #e4ede5 100%)', // subtle light green gradient
                minHeight: '100vh',
                py: 4,
                backgroundAttachment: 'fixed',
                position: 'relative',
                zIndex: 1,
                marginTop: '-2px'
            }}
        >
            <Container maxWidth="lg" sx={{ padding: "2rem 1rem" }}>
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
                elevation={8}
                sx={{ 
                    mb: 6,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.10)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    transition: 'box-shadow 0.3s',
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
                                return (
                                    <>
                                        {visibleCards.map(({ developer, index, position }, cardIndex) => {
                                            const isCenter = position === 'center';
                                            const cardSlideDirection = position === 'prev' ? -1 : position === 'next' ? 1 : 0;
                                            return (
                                                <Box
                                                    key={`bg-${index}-${position}`}
                                                    sx={{
                                                        position: 'relative',
                                                        flex: '0 0 280px',
                                                        height: isCenter ? '320px' : '280px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: 4,
                                                            boxShadow: isCenter ? '0 8px 32px rgba(31, 38, 135, 0.10)' : '0 4px 16px rgba(31, 38, 135, 0.07)',
                                                            border: '1px solid rgba(255,255,255,0.18)',
                                                            zIndex: 1,
                                                        }}
                                                    />
                                                    <Card
                                                        elevation={isCenter ? 12 : 4}
                                                        sx={{
                                                            flex: '1 1 auto',
                                                            height: '100%',
                                                            borderRadius: 4,
                                                            background: 'rgba(255,255,255,0.97)',
                                                            border: 'none',
                                                            transition: 'none',
                                                            transform: `scale(1) translateX(0px) translateY(0px) rotateY(0deg)`,
                                                            opacity: 1,
                                                            cursor: 'pointer',
                                                            overflow: 'visible',
                                                            boxShadow: 'none',
                                                            zIndex: 2,
                                                            transformStyle: 'preserve-3d',
                                                        }}
                                                        onClick={() => {
                                                            if (!isCenter) {
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
                                                            {/* ...existing card content... */}
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
                                                                        mb: 0.5
                                                                    }}
                                                                >
                                                                    {developer.name}
                                                                </Typography>
                                                                <Typography 
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: '#888',
                                                                        fontSize: isCenter ? '0.85rem' : '0.75rem',
                                                                        mb: 1.2,
                                                                        display: 'block',
                                                                        lineHeight: 1
                                                                    }}
                                                                >
                                                                    Graduates: {developer.grad}
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
                                                                    gap: 2,
                                                                    opacity: fadeIn ? 1 : 0.4,
                                                                    transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
                                                                    transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s'
                                                                }}>
                                                                    {/* ...existing icon buttons... */}
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
                                                                    <Box
                                                                        component="a"
                                                                        href={developer.github}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            textDecoration: 'none'
                                                                        }}
                                                                    >
                                                                        <GitHubIcon
                                                                            sx={{ 
                                                                                color: '#23272f', 
                                                                                fontSize: 25,
                                                                                cursor: 'pointer',
                                                                                ml: 0.5,
                                                                                '&:hover': { 
                                                                                    color: '#444950', 
                                                                                    transform: 'scale(1.15)',
                                                                                    filter: 'drop-shadow(0 2px 8px rgba(35, 39, 47, 0.18))'
                                                                                },
                                                                                transition: 'all 0.3s ease'
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                    <Box
                                                                        component="a"
                                                                        href={`mailto:${developer.email}`}
                                                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            textDecoration: 'none'
                                                                        }}
                                                                    >
                                                                        <EmailIcon
                                                                            sx={{ 
                                                                                color: '#ffb300', // orange/yellow
                                                                                fontSize: 25,
                                                                                cursor: 'pointer',
                                                                                ml: 0.5,
                                                                                '&:hover': { 
                                                                                    color: '#ff8f00', // darker orange
                                                                                    transform: 'scale(1.15)',
                                                                                    filter: 'drop-shadow(0 2px 8px rgba(255, 179, 0, 0.3))'
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
                                                </Box>
                                            );
                                        })}
                                    </>
                                );
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
                                In a world crowded with financial platforms, we saw an opportunity to do something different. Despite the wide range of tools available, many retail traders and newcomers still find investing and financial management complex and inaccessible. We set out to change that by creating a solution that’s approachable, engaging, and genuinely empowering.

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