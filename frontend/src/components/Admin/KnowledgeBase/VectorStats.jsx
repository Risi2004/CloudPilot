import React from 'react';
import './VectorStats.css';

function VectorStats({ storageCapacity, mdFileCount }) {
  const STATS_DATA = [
    {
      id: 'total-vectors',
      title: 'Total Vectors',
      value: '-',
      colorClass: 'text-white'
    },
    {
      id: 'storage',
      title: 'Storage Capacity',
      value: storageCapacity || '-',
      colorClass: 'text-green'
    },
    {
      id: 'latency',
      title: 'Index Latency',
      value: '-',
      colorClass: 'text-cyan'
    },
    {
      id: 'file-count',
      title: 'File Count',
      value: mdFileCount !== undefined && mdFileCount !== null ? mdFileCount : '-',
      colorClass: 'text-purple'
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
