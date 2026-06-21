import React from 'react';
import './SwarmStatCards.css';

const CARDS_DATA = [
  {
    id: 'status',
    title: 'SWARM STATUS',
    value: 'Optimal',
    valueClass: 'text-optimal',
    desc: '98.4% uptime',
    descClass: 'text-optimal'
  },
  {
    id: 'active',
    title: 'ACTIVE AGENTS',
    value: '09 / 09',
    valueClass: 'text-white',
    desc: 'Fully deployed',
    descClass: 'text-gray'
  },
  {
    id: 'response-time',
    title: 'AVG RESPONSE TIME',
    value: '142ms',
    valueClass: 'text-white',
    desc: '↓ 12ms',
    descClass: 'text-trend-down'
  },
  {
    id: 'tasks',
    title: 'TOTAL TASKS (24H)',
    value: '12,842',
    valueClass: 'text-white',
    desc: 'Real-time',
    descClass: 'text-gray'
  }
];

function SwarmStatCards() {
  return (
    <div className="swarm-stats-grid">
      {CARDS_DATA.map((card) => (
        <div key={card.id} className="swarm-stat-card">
          <span className="swarm-stat-title">{card.title}</span>
          <span className={`swarm-stat-value ${card.valueClass}`}>{card.value}</span>
          <span className={`swarm-stat-desc ${card.descClass}`}>{card.desc}</span>
        </div>
      ))}
    </div>
  );
}

export default SwarmStatCards;
