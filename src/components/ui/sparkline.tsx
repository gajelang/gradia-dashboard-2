import React from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  strokeColor?: string;
  fill?: string;
  fillOpacity?: number;
  className?: string;
  children?: React.ReactNode;
}

interface SparklinePointProps {
  index: number;
  value: number;
  size?: number;
  color?: string;
  filled?: boolean;
  className?: string;
  x?: number; // x coordinate (set by parent Sparkline)
  y?: number; // y coordinate (set by parent Sparkline)
}

export const SparklinePoint: React.FC<SparklinePointProps> = ({
  index,
  value,
  size = 4,
  color = "currentColor",
  filled = false,
  className = "",
  x,
  y
}) => {
  if (x === undefined || y === undefined) {
    return null; // Skip rendering if coordinates aren't provided
  }

  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill={filled ? color : "white"}
      stroke={color}
      strokeWidth={1}
      className={cn("", className)}
    />
  );
};

export const Sparkline: React.FC<SparklineProps> = ({
  data = [],
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  strokeColor = "currentColor",
  fill = "none",
  fillOpacity = 0.2,
  className = "",
  children
}) => {
  // Validasi data
  if (!data || data.length === 0) {
    return null;
  }

  // Menghitung nilai minimum dan maksimum dari data
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Hindari pembagian dengan nol

  // Menghitung koordinat SVG untuk setiap titik data
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  // Simpan koordinat untuk penggunaan SparklinePoint
  const coordinates = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y, value, index };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
    >
      {fill !== "none" && (
        <path
          d={`M0,${height} ${points.join(" ")} ${width},${height} Z`}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke="none"
        />
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {React.Children.map(children, child => {
        if (React.isValidElement<SparklinePointProps>(child) && 
            typeof child.type === 'function' && 
            child.type.name === SparklinePoint.name) {
          const index = child.props.index;
          const coord = coordinates[index];
          
          if (!coord) return null;
          
          return React.cloneElement(child, {
            ...child.props,
            x: coord.x,
            y: coord.y
          });
        }
        
        return child;
      })}
    </svg>
  );
};