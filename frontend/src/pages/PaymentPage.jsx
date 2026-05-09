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
    const doc = new jsPDF();
    const formattedReceipt = String(rNo).padStart(3, '0');
    
    doc.setFontSize(22);
    doc.text('BandhuShow - Booking Confirmation', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Receipt No: #${formattedReceipt}`, 20, 35);
    doc.text(`Customer: ${name}`, 20, 45);
    doc.text(`Phone: ${phone}`, 20, 55);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 65);
    
    const tableData = confirmedSeats.map(s => [
      `ROW ${s.row || 'A'} ${s.label}`,
      s.section.replace('_', ' ').toUpperCase(),
      `₹${s.price}`
    ]);
    
    autoTable(doc, {
      startY: 75,
      head: [['Seat Details', 'Section', 'Price']],
      body: tableData,
    });
    
    doc.text(`Total Amount: ₹${finalTotal}`, 20, doc.lastAutoTable.finalY + 20);
    doc.text('Enjoy your movie!', 105, doc.lastAutoTable.finalY + 40, { align: 'center' });
    
    doc.save(`BandhuShow_Ticket_${formattedReceipt}.pdf`);
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
      
      // Auto-generate PDF (wrapped to avoid crashing the success screen)
      try {
        generatePDF(seatsToConfirm, finalTotal, rNo);
      } catch (pdfErr) {
        console.error("PDF Generation failed:", pdfErr);
        showToast("Booking successful, but PDF generation failed. Try downloading manually.", "warning");
      }
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
            <button className="pdf-btn" onClick={() => {
              try {
                generatePDF(bookedSeats, bookedTotal, receiptNo);
              } catch (e) {
                showToast("PDF generation failed. Please contact support.", "error");
              }
            }}>
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
