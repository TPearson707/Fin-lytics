import { Link } from "react-router-dom";
import "../../styles/components/intronav.scss";
import finLogo from "../../assets/finLogo.png";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

const IntroNavbar = () => {
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{ backgroundColor: 'white', color: 'black' }}>
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Link to="/">
                        <img src={finLogo} alt="Logo" style={{ height: '35px', marginRight: '10px', cursor: 'pointer' }} />
                    </Link>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    </Typography>
                    <Button color="inherit" href="/about">About</Button>
                </Toolbar>
            </AppBar>
        </Box>
    )
}

export default IntroNavbar