import React from "react";

const CircleProgress = ({ percent = 0, size = 40, strokeWidth = 3 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ width: size, height: size, margin: "10px auto" }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />

        {/* Progress circle */}
        <circle
          stroke="var(--color-main)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.5s ease",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />

        {/* Text percent */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="18"
          fill="#111"
        >
          {/* {progress.toFixed(1)}% */}
        </text>
      </svg>
    </div>
  );
};

export default CircleProgress;