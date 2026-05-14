import React, { useState } from "react";

const WebEmbedComponent = ({url}) => {


console.log(url)
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div
        style={{
          padding: "10px",
          display: "flex",
          gap: "10px",
          background: "#111",
        }}
      >      </div>

      <iframe
        src={url}
        title="webview"
        width="100%"
        height="100%"
        style={{
          border: "none",
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default WebEmbedComponent;