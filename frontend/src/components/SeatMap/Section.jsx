import React from 'react';
import Seat from './Seat';
import './Section.css';

/**
 * Renders one cinema section (Upper Sofa | Platinum | Lounger).
 * `rows` is an object: { rowKey: { left: [seats], right: [seats] } }
 * For single-row sections (Upper Sofa / Lounger), rows = { A: { left, right? } }
 */
export default function Section({ title, price, rows, hasAisle = false, showLabel = false }) {
  return (
    <div className="section">
      <div className="section__header">
        <span className="section__price">₹{price}</span>
        <h2 className="section__title">{title}</h2>
        <div className="section__divider" />
      </div>

      <div className="section__rows">
        {Object.entries(rows).map(([rowKey, { left, right }]) => (
          <div key={rowKey} className="row">
            {/* Row label */}
            {(hasAisle || showLabel) && <span className="row__label">{rowKey}</span>}

            {/* Left seat group */}
            <div className="seat-group">
              {left.map((seat) => (
                <Seat key={seat.id} seat={seat} />
              ))}
            </div>

            {/* Aisle gap */}
            {hasAisle && <div className="aisle" aria-hidden="true" />}

            {/* Right seat group (may be empty) */}
            {right && right.length > 0 && (
              <div className="seat-group">
                {right.map((seat) => (
                  <Seat key={seat.id} seat={seat} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
