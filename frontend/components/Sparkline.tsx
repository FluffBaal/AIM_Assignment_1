'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { configureChartDefaults } from '@/lib/chartDefaults';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

// Configure chart defaults once
configureChartDefaults();

interface SparklineProps {
  data: number[];
  label?: string;
  color?: string;
  height?: number;
}

export function Sparkline({ 
  data, 
  label = 'Score', 
  color = 'rgb(59, 130, 246)',
  height = 60 
}: SparklineProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Ensure data is valid
  const validData = data.filter(d => typeof d === 'number' && !isNaN(d));
  
  // If no valid data, show a message
  if (validData.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-muted-foreground text-sm">No data available</span>
      </div>
    );
  }

  const chartData = {
    labels: validData.map((_, i) => i + 1),
    datasets: [
      {
        label,
        data: validData,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations to prevent rendering issues
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            return `${label}: ${(context.parsed.y * 100).toFixed(0)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        display: false,
        min: 0,
        max: 1,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      line: {
        borderJoinStyle: 'round',
      },
    },
  };

  // Simple SVG sparkline as fallback
  const renderSvgSparkline = () => {
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min || 1;
    const width = 400;
    const padding = 2;
    
    const points = validData.map((value, index) => {
      const x = (index / (validData.length - 1 || 1)) * (width - 2 * padding) + padding;
      const y = height - ((value - min) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        <polyline
          fill={color}
          fillOpacity="0.1"
          stroke="none"
          points={`0,${height} ${points} ${width},${height}`}
        />
      </svg>
    );
  };

  // Use SVG fallback if Chart.js is not ready
  if (!isClient) {
    return (
      <div style={{ height, position: 'relative' }}>
        {renderSvgSparkline()}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        height, 
        position: 'relative',
        backgroundColor: 'transparent'
      }}
    >
      <Line 
        data={chartData} 
        options={options}
        key={validData.join(',')} // Force re-render when data changes
      />
    </div>
  );
}