import "./intropage.scss";
import React from "react";
import LoginBlock from "./login";

const Intropage = ({ setIsAuthenticated }) => {
  return (
    <div>
      <LoginBlock setIsAuthenticated={setIsAuthenticated} />
    </div>
  );
};

export default Intropage;
