import { Link } from "react-router-dom"
import "./intronav.scss"
import finLogo from "../../assets/finLogo.png";


const IntroNavbar = () => {
    return (
        <div className="navbar">
             <div className="nav-left">
                 <Link to="/"><img src={finLogo} alt="Logo" className="logo" /></Link>
            </div>
            <div className="nav-mid">
                <ul>
                    {/* <li><Link to="/">Home</Link></li> */}
                    
                    {/* <li><Link to="/dashboard">Features</Link></li> */}
                </ul>
            </div>
            <div className="nav-right">
                {/* <Link to="/contact">Contact Us</Link> */}
                <Link to="/about">About</Link>
                {/* <Link to="/">Log In</Link>  */}
                
            </div>
        </div>
    )
}

export default IntroNavbar