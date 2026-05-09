import React from 'react';
import Section from './Section';
import useStore from '../../store/useStore';
import './SeatMap.css';

/**
 * Builds the section data structures needed by <Section />.
 * Platinum: rows B-I with left + right groups separated by an aisle.
 * Upper Sofa (Row A) / Lounger (Row J): single row with left (and optional right for Lounger gap).
 */
function buildSections(seats) {
  const byId = Object.fromEntries(seats.map((s) => [s.id, s]));

  // ── Upper Sofa ────────────────────────────────────────────────────────────
  const upperSofa = seats.filter((s) => s.section === 'upper_sofa');
  const upperRows = {
    A: { left: upperSofa.sort((a, b) => a.number - b.number), right: [] },
  };

  // ── Platinum ──────────────────────────────────────────────────────────────
  const plat = seats.filter((s) => s.section === 'platinum');
  const platRows = {};
  for (const seat of plat) {
    const r = seat.row || 'A';
    if (!platRows[r]) platRows[r] = { left: [], right: [] };
    if (seat.number <= 9) platRows[r].left.push(seat);
    else platRows[r].right.push(seat);
  }
  // sort each group
  for (const r of Object.keys(platRows)) {
    platRows[r].left.sort((a, b) => a.number - b.number);
    platRows[r].right.sort((a, b) => a.number - b.number);
  }
  const sortedPlatRows = Object.fromEntries(
    Object.entries(platRows).sort(([a], [b]) => a.localeCompare(b))
  );

  // ── Lounger ───────────────────────────────────────────────────────────────
  const lounger = seats.filter((s) => s.section === 'lounger').sort((a, b) => a.number - b.number);
  const lLeft = lounger.filter((s) => s.number <= 6);
  const lRight = lounger.filter((s) => s.number >= 7);
  const loungerRows = { J: { left: lLeft, right: lRight } };

  return { upperRows, sortedPlatRows, loungerRows };
}

export default function SeatMap() {
  const seats = useStore((s) => s.seats);
  const { upperRows, sortedPlatRows, loungerRows } = buildSections(seats);

  return (
    <div className="seatmap" role="region" aria-label="Cinema seat map">
      {/* Legend */}
      <div className="seatmap__legend">
        {[
          { cls: 'available', label: 'Available' },
          { cls: 'selected',  label: 'Selected'  },
          { cls: 'locked',    label: 'Pending'    },
          { cls: 'sold',      label: 'Sold'       },
          { cls: 'blocked',   label: 'Blocked'    },
        ].map(({ cls, label }) => (
          <div key={cls} className="legend-item">
            <div className={`legend-dot legend-dot--${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Map Content */}
      <div className="seatmap__inner">
        {/* Sections */}
        <Section title="Upper Sofa" price={150} rows={upperRows} hasAisle={false} showLabel={true} />
        <Section title="Platinum"   price={100} rows={sortedPlatRows} hasAisle={true} />
        <Section title="Lounger"    price={150} rows={loungerRows} hasAisle={true} />

        {/* Screen */}
        <div className="screen-wrap">
          <div className="screen" aria-label="Screen">SCREEN</div>
        </div>
      </div>
    </div>
  );
}
