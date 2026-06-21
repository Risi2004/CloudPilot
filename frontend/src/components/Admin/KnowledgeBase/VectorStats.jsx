import React from 'react';
import './VectorStats.css';

function VectorStats({ vectorsCount }) {
  const displayVectors = vectorsCount ? vectorsCount.toLocaleString() : '1,248,302';

  const STATS_DATA = [
    {
      id: 'total-vectors',
      title: 'Total Vectors',
      value: displayVectors,
      colorClass: 'text-white'
    },
    {
      id: 'storage',
      title: 'Storage Capacity',
      value: '42.8 GB',
      colorClass: 'text-green'
    },
    {
      id: 'latency',
      title: 'Index Latency',
      value: '14ms',
      colorClass: 'text-cyan'
    }
  ];

  return (
    <div className="vector-stats-grid">
      {STATS_DATA.map((stat) => (
        <div key={stat.id} className="vector-stat-card">
          <span className="vector-stat-title">{stat.title}</span>
          <span className={`vector-stat-value ${stat.colorClass}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

export default VectorStats;
