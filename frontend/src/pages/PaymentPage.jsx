import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import upiQR from '../assets/upi_qr.png';
import './PaymentPage.css';

import { API_URL as API } from '../api';

export default function PaymentPage() {
  const {
    seats, selectedSeats, sessionId, currentUser,
    markSeatSoldLocal, clearSelected, showToast, setSeats, targetSeatCount
  } = useStore();
  const navigate = useNavigate();

  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [bookedTotal, setBookedTotal] = useState(0);
  const [receiptNo, setReceiptNo] = useState(null);

  useEffect(() => {
    if (selectedSeats.length === 0 && !success) {
      navigate('/');
    }
  }, [selectedSeats, success, navigate]);

  const mySeats = seats.filter(s => selectedSeats.includes(s.id));
  const total = mySeats.reduce((sum, s) => sum + s.price, 0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setScreenshot(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const generatePDF = (confirmedSeats, finalTotal, rNo) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const formattedReceipt = String(rNo).padStart(3, '0');
      const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // -- Background & Header --
      doc.setFillColor(17, 24, 39); // Dark blue/gray
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('BandhuShow', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL BOOKING TICKET', pageWidth / 2, 26, { align: 'center' });
      doc.text('Dhabkaaro | Apple Multiplex, Maninagar', pageWidth / 2, 33, { align: 'center' });

      // -- Ticket Body --
      doc.setTextColor(30, 30, 30);
      
      // Receipt Info Box
      doc.setFillColor(240, 253, 244); // Light green
      doc.roundedRect(15, 50, 180, 20, 3, 3, 'F');
      doc.setDrawColor(34, 197, 94); // Green border
      doc.roundedRect(15, 50, 180, 20, 3, 3, 'D');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61);
      doc.text(`RECEIPT NO: #${formattedReceipt}`, 25, 62);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`BOOKED ON: ${now}`, 185, 62, { align: 'right' });

      // Movie Details Section
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MOVIE: DHABKAARO', 15, 85);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Date & Time: 12 May 2026, 8:45 PM', 15, 93);
      doc.text('Venue: Apple Multiplex, Maninagar', 15, 99);

      // Customer Details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER DETAILS', 15, 115);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`Name: ${name}`, 15, 123);
      doc.text(`Phone: +91 ${phone}`, 15, 129);

      // Seats Table
      const tableData = confirmedSeats.map(s => [
        `ROW ${s.row || 'A'} - ${s.label}`,
        s.section.replace('_', ' ').toUpperCase(),
        `Rs. ${s.price}`
      ]);

      autoTable(doc, {
        startY: 138,
        head: [['Seat', 'Section', 'Price']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          2: { halign: 'right' }
        },
        foot: [['', 'TOTAL AMOUNT', `Rs. ${finalTotal}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', halign: 'right' }
      });

      // Footer Note
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for booking with BandhuShow. Please carry a digital copy of this ticket.', pageWidth / 2, finalY, { align: 'center' });
      doc.text('Enjoy your show!', pageWidth / 2, finalY + 8, { align: 'center' });

      // Decorative dashed line
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(15, finalY + 15, pageWidth - 15, finalY + 15);
      doc.setLineDashPattern([], 0);

      doc.save(`BandhuShow_Ticket_${formattedReceipt}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Could not generate PDF. Please screenshot this page.", "error");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !screenshot) {
      showToast('Please fill all details and upload a screenshot.', 'error');
      return;
    }

    if (phone.length !== 10) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    
    setPaying(true);
    
    let finalTotal = total;
    let seatsToConfirm = [...mySeats];

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('seat_ids', selectedSeats.join(','));
      formData.append('customer_name', name);
      formData.append('customer_phone', `+91${phone}`);
      formData.append('screenshot', screenshot);

      const resp = await axios.post(`${API}/seats/confirm-manual`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const rNo = resp.data.receipt_no;
      setReceiptNo(rNo);
      setBookedTotal(finalTotal);
      setBookedSeats(seatsToConfirm);
      
      selectedSeats.forEach(id => markSeatSoldLocal(id));
      clearSelected();
      setSuccess(true);
      
      // Auto-generate PDF
      setTimeout(() => {
        generatePDF(seatsToConfirm, finalTotal, rNo);
      }, 500);

    } catch (err) {
      showToast(err.response?.data?.detail || 'Booking failed. Try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (success) {
    return (
      <div className="payment-page payment-page--success">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2>Booking Confirmed!</h2>
          <p>Your tickets have been successfully booked.</p>
          
          <div className="ticket-info">
            <div className="receipt-badge">Receipt No: #{String(receiptNo).padStart(3, '0')}</div>
            <h3>Seats: {bookedSeats.map(s => `${s.label} (${s.section.split('_')[0].toUpperCase()})`).join(', ')}</h3>
            <p>Total Paid: ₹{bookedTotal}</p>
          </div>

          <div className="success-actions">
            <button className="pdf-btn" onClick={() => generatePDF(bookedSeats, bookedTotal, receiptNo)}>
              📄 Download PDF Ticket
            </button>
            <button className="home-btn" onClick={() => navigate('/')}>
              Back to Movies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        <header className="payment-header">
          <button className="back-btn" onClick={() => navigate('/')}>←</button>
          <h2>Complete Your Booking</h2>
        </header>

        <section className="booking-summary-mini">
          <div className="summary-info">
            <span className="summary-count">{mySeats.length} Seats Selected</span>
            <span className="summary-total">Total: ₹{total}</span>
          </div>
          <div className="summary-seats">
            {mySeats.map(s => (
              <span key={s.id} className="seat-tag">{s.label}</span>
            ))}
          </div>
        </section>

        <section className="payment-instructions">
          <div className="qr-card">
            <h3>Scan & Pay with any UPI App</h3>
            <div className="qr-container">
              <img src={upiQR} alt="UPI QR Code" className="upi-qr" />
            </div>
            <div className="upi-details">
              <p className="upi-id">UPI ID: <strong>dds@ptyes</strong></p>
              <p className="payment-note">Pay the total amount and upload your screenshot below for instant confirmation.</p>
            </div>
          </div>
        </section>

        <form className="payment-form" onSubmit={handleManualSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Enter your name"
              required 
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <div className="phone-input-wrap">
              <span className="phone-prefix">+91</span>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }} 
                placeholder="Enter 10-digit number"
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Payment Screenshot</label>
            <div className="file-input-wrapper">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange} 
                required 
              />
              {preview ? (
                <div className="screenshot-preview">
                  <img src={preview} alt="Payment Proof" />
                  <span className="file-hint">Click to change screenshot</span>
                </div>
              ) : (
                <span className="file-hint">Upload the screenshot of your payment</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className={`pay-btn ${paying ? 'loading' : ''}`}
            disabled={paying}
          >
            {paying ? 'Processing...' : `Confirm & Book ₹${total}`}
          </button>
        </form>
      </div>
    </div>
  );
}
