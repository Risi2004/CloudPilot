import React from 'react';

export function TagList({ items, empty = 'None detected' }) {
  if (!items?.length) return <span className="fact-muted">{empty}</span>;
  return (
    <div className="fact-tag-list">
      {items.map((item) => (
        <span key={item} className="fact-tag">
          {item}
        </span>
      ))}
    </div>
  );
}

export function FactSection({ title, children }) {
  return (
    <div className="fact-section-card">
      <h4 className="section-sub-title">{title}</h4>
      {children}
    </div>
  );
}

export function KeyValue({ label, value }) {
  return (
    <div>
      <span className="fact-k">{label}</span>
      <span className="fact-v">{value ?? '—'}</span>
    </div>
  );
}

export function KeyValueGrid({ children }) {
  return <div className="fact-kv-grid">{children}</div>;
}

export function FactBlock({ label, children }) {
  return (
    <div className="fact-block">
      <span className="fact-k">{label}</span>
      {children}
    </div>
  );
}
