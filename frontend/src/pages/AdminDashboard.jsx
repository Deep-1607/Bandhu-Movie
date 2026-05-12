import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useStore from '../store/useStore';
import './AdminDashboard.css';

import { API_URL as BASE_API, BASE_URL } from '../api';
const API = `${BASE_API}/admin`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [seats, setSeats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);

  const fetchData = async () => {
    try {
      const headers = { 'X-Admin-User': currentUser?.username };
      const [s, ss] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/seats`, { headers }),
      ]);
      setStats(s.data);
      setSeats(ss.data);
    } catch (err) {
      console.error("Admin fetch failed", err);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  const handleBlock = async (seat_id, isBlocked) => {
    const url = `${API}/seats/${seat_id}/${isBlocked ? 'unblock' : 'block'}`;
    const headers = { 'X-Admin-User': currentUser?.username };
    await axios.post(url, {}, { headers }).catch(() => {});
    fetchData();
  };

  const handleRelease = async (seat_id) => {
    if (!window.confirm("Are you sure you want to cancel this booking and make the seat available?")) return;
    const url = `${API}/seats/${seat_id}/release-sold`;
    const headers = { 'X-Admin-User': currentUser?.username };
    await axios.post(url, {}, { headers }).catch(() => {});
    fetchData();
  };

  const filteredSeats = filter === 'all' ? seats : seats.filter((s) => s.status === filter);
  const soldSeats = seats.filter((s) => s.status === 'sold');

  // --- Premium Ticket Generation Logic ---
  const generateTicket = (doc, grp, isFirstPage = true) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const formattedReceipt = String(grp.receipt_no || '0').padStart(3, '0');
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    if (!isFirstPage) doc.addPage();

    // -- Header --
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BandhuShow', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL BOOKING TICKET', pageWidth / 2, 26, { align: 'center' });
    doc.text('Dhabkaaro | Apple Multiplex, Maninagar', pageWidth / 2, 33, { align: 'center' });

    // -- Receipt Info Box --
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, 50, 180, 20, 3, 3, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(15, 50, 180, 20, 3, 3, 'D');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`RECEIPT NO: #${formattedReceipt}`, 25, 62);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`BOOKED ON: ${grp.booked_at ? new Date(grp.booked_at).toLocaleString() : now}`, 185, 62, { align: 'right' });

    // -- Details --
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MOVIE: DHABKAARO', 15, 85);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Date & Time: 12 May 2026, 8:45 PM', 15, 93);
    doc.text('Venue: Apple Multiplex, Maninagar', 15, 99);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', 15, 115);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Name: ${grp.customer_name || '—'}`, 15, 123);
    doc.text(`Phone: ${grp.customer_phone || '—'}`, 15, 129);

    // -- Table --
    const tableData = grp.seats.map(s => [
      `ROW ${s.row || 'A'} - ${s.label}`,
      s.section.replace('_', ' ').toUpperCase(),
      `Rs. ${s.price}`
    ]);
    const finalTotal = grp.seats.reduce((sum, s) => sum + s.price, 0);

    autoTable(doc, {
      startY: 138,
      head: [['Seat', 'Section', 'Price']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 2: { halign: 'right' } },
      foot: [['', 'TOTAL AMOUNT', `Rs. ${finalTotal}`]],
      footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', halign: 'right' }
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for booking with BandhuShow. Enjoy the show!', pageWidth / 2, finalY, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, finalY + 10, pageWidth - 15, finalY + 10);
    doc.setLineDashPattern([], 0);
  };

  const handleDownloadSingle = (receiptNo) => {
    try {
      const groupSeats = seats.filter(s => s.receipt_no === receiptNo);
      if (groupSeats.length === 0) return;

      const doc = new jsPDF();
      const grp = {
        receipt_no: receiptNo,
        customer_name: groupSeats[0].customer_name,
        customer_phone: groupSeats[0].customer_phone,
        booked_at: groupSeats[0].booked_at,
        seats: groupSeats
      };

      generateTicket(doc, grp, true);
      doc.save(`Ticket_#${String(receiptNo).padStart(3, '0')}.pdf`);
    } catch (err) {
      console.error(err);
      showToast("Download failed", "error");
    }
  };

  const generateAllTicketsPDF = () => {
    try {
      if (soldSeats.length === 0) {
        showToast('No sold tickets to download.', 'warning');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cover Page
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, pageWidth, 297, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('BandhuShow', pageWidth / 2, 100, { align: 'center' });
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Consolidated Tickets Export', pageWidth / 2, 115, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 130, { align: 'center' });
      doc.text(`Total Tickets: ${soldSeats.length}`, pageWidth / 2, 140, { align: 'center' });

      // Grouping
      const groups = {};
      for (const seat of soldSeats) {
        const key = seat.receipt_no || 'N/A';
        if (!groups[key]) {
          groups[key] = {
            receipt_no: seat.receipt_no,
            customer_name: seat.customer_name,
            customer_phone: seat.customer_phone,
            booked_at: seat.booked_at,
            seats: [],
          };
        }
        groups[key].seats.push(seat);
      }

      const sortedGroups = Object.values(groups).sort((a, b) => (a.receipt_no || 0) - (b.receipt_no || 0));

      for (let i = 0; i < sortedGroups.length; i++) {
        generateTicket(doc, sortedGroups[i], i === 0);
      }

      doc.save(`BandhuShow_All_Tickets_${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      showToast('Failed to generate PDF.', 'error');
    }
  };

  const generateRangeTicketsPDF = () => {
    try {
      const from = parseInt(rangeFrom);
      const to = parseInt(rangeTo);

      if (!from || !to || from > to) {
        showToast('Please enter a valid range (e.g., 1 to 15).', 'error');
        return;
      }

      const filtered = soldSeats.filter(s => s.receipt_no >= from && s.receipt_no <= to);
      if (filtered.length === 0) {
        showToast(`No sold tickets found in range #${from} to #${to}.`, 'warning');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cover Page
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, pageWidth, 297, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('BandhuShow', pageWidth / 2, 100, { align: 'center' });
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tickets: #${from} to #${to}`, pageWidth / 2, 115, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 130, { align: 'center' });
      doc.text(`Tickets in Range: ${filtered.length}`, pageWidth / 2, 140, { align: 'center' });

      // Grouping
      const groups = {};
      for (const seat of filtered) {
        const key = seat.receipt_no || 'N/A';
        if (!groups[key]) {
          groups[key] = {
            receipt_no: seat.receipt_no,
            customer_name: seat.customer_name,
            customer_phone: seat.customer_phone,
            booked_at: seat.booked_at,
            seats: [],
          };
        }
        groups[key].seats.push(seat);
      }

      const sortedGroups = Object.values(groups).sort((a, b) => (a.receipt_no || 0) - (b.receipt_no || 0));
      for (let i = 0; i < sortedGroups.length; i++) {
        generateTicket(doc, sortedGroups[i], i === 0);
      }

      doc.save(`BandhuShow_Tickets_${from}_to_${to}.pdf`);
      showToast(`Downloaded ${filtered.length} tickets successfully!`, 'success');
    } catch (error) {
      console.error('Range PDF failed:', error);
      showToast('Failed to generate range PDF.', 'error');
    }
  };

  return (
    <div className="admin">
      <header className="admin__header">
        <h1>🎬 BandhuShow Admin</h1>
        <div className="admin__header-actions">
          <div className="admin__range-download">
            <input 
              type="number" 
              placeholder="From #" 
              value={rangeFrom} 
              onChange={e => setRangeFrom(e.target.value)} 
              className="range-input"
            />
            <input 
              type="number" 
              placeholder="To #" 
              value={rangeTo} 
              onChange={e => setRangeTo(e.target.value)} 
              className="range-input"
            />
            <button className="admin__download-range" onClick={generateRangeTicketsPDF}>
              Download Range
            </button>
          </div>
          <button 
            className="admin__download-all" 
            onClick={generateAllTicketsPDF} 
            disabled={soldSeats.length === 0}
            title={soldSeats.length > 0 ? `Download all ${soldSeats.length} sold tickets as one PDF` : "No sold tickets to download"}
            style={{ opacity: soldSeats.length === 0 ? 0.6 : 1, cursor: soldSeats.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            📥 All ({soldSeats.length})
          </button>
          <button className="admin__refresh" onClick={fetchData}>↻</button>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="admin__stats">
          {[
            { label: 'Total Seats',  value: stats.total,     color: '#6366f1' },
            { label: 'Available',    value: stats.available, color: '#22c55e' },
            { label: 'Locked',       value: stats.locked,    color: '#f97316' },
            { label: 'Sold',         value: stats.sold,      color: '#94a3b8' },
            { label: 'Blocked',      value: stats.blocked,   color: '#ef4444' },
            { label: 'Revenue',      value: `₹${stats.revenue}`, color: '#fbbf24' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ '--accent': color }}>
              <div className="stat-card__value">{value}</div>
              <div className="stat-card__label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="admin__filters">
        {['all', 'available', 'locked', 'sold', 'blocked'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Seat Grid */}
      <div className="admin__grid">
        {filteredSeats.map((seat) => (
          <div key={seat.id} className={`admin-seat admin-seat--${seat.status}`}>
            <div className="admin-seat__main">
              <div className="admin-seat__id">{seat.id}</div>
              <div className="admin-seat__status">{seat.status}</div>
              <div className="admin-seat__price">₹{seat.price}</div>
            </div>

            {seat.customer_name && (
              <div className="admin-seat__customer">
                <div className="receipt-no">🎟️ Receipt: #{String(seat.receipt_no).padStart(3, '0')}</div>
                <div className="customer-name">👤 {seat.customer_name}</div>
                <div className="customer-phone">📞 {seat.customer_phone}</div>
                
                <div className="admin-seat__customer-actions">
                  {seat.screenshot && (
                    <button 
                      onClick={() => setPreviewImage(seat.screenshot.startsWith('data:') ? seat.screenshot : `${BASE_URL}${seat.screenshot}`)}
                      className="view-proof-btn"
                    >
                      🖼️ View Proof
                    </button>
                  )}
                  <button 
                    onClick={() => handleDownloadSingle(seat.receipt_no)}
                    className="download-ticket-btn"
                  >
                    📄 Download Ticket
                  </button>
                </div>
              </div>
            )}

            <div className="admin-seat__actions">
              {seat.status !== 'sold' ? (
                <button
                  className="admin-seat__toggle"
                  onClick={() => handleBlock(seat.id, seat.status === 'blocked')}
                >
                  {seat.status === 'blocked' ? 'Unblock' : 'Block'}
                </button>
              ) : (
                <button
                  className="admin-seat__release"
                  onClick={() => handleRelease(seat.id)}
                >
                  ❌ Cancel Booking
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="admin-modal" onClick={() => setPreviewImage(null)}>
          <div className="admin-modal__content" onClick={e => e.stopPropagation()}>
            <button className="admin-modal__close" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="Payment Proof" />
          </div>
        </div>
      )}
    </div>
  );
}
