import React, { useEffect, useRef } from "react";
import '../../style/Home.scss'
import FunctionComponent from "./ComponentFunction/FunctionComponent.jsx";
import TimeLineComponent2 from "./ComponentFunction/TimeLineComponent2.jsx";
import VideoPlayer from "./ComponentFunction/VideoPlayer.jsx";
import '../../style/effect.css'
import { showDynamic } from "../../app/ComponentSupport/functions.js";
import { useDispatch } from "react-redux";
import DynamicIsland from "./DynamicIsland.jsx";
const Home = () => {
    const effect_custom = localStorage.getItem("effect_custom");
     const styleElementRef = useRef(null);
    
      // Inject CSS vào <head>
      useEffect(() => {
        if (!styleElementRef.current && typeof document !== 'undefined') {
          const style = document.createElement('style');
          style.id = 'dynamic-runtime-css';
          document.head.appendChild(style);
          styleElementRef.current = style;
        }
    
        styleElementRef.current.textContent = `
          ${effect_custom}
        `;
    
        return () => {
          if (styleElementRef.current && typeof document !== 'undefined') {
            document.head.removeChild(styleElementRef.current);
            styleElementRef.current = null;
          }
        };
      }, []);
    
    return (
        <div className="home-container">
          <DynamicIsland />
            <div className="top-container">
                <FunctionComponent />
                {/* <VideoPlayer /> */}
            </div>
            <TimeLineComponent2 />
        </div>
    )
}

export default Home;
