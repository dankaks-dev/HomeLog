import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

export default function HomeLog() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showWhatIfCalc, setShowWhatIfCalc] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [isPro, setIsPro] = useState(localStorage.getItem('homelogProStatus') === 'true');

  // ===== PAYMENT SUCCESS HANDLER =====
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      const verifyPayment = async () => {
        try {
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });

          const data = await response.json();

          if (data.success) {
            localStorage.setItem('homelogProStatus', 'true');
            localStorage.setItem('homelogProEmail', data.email);
            setIsPro(true);
            
            window.history.replaceState({}, document.title, window.location.pathname);
            
            alert('🎉 Welcome to HomeLog Pro! You now have unlimited properties.');
          } else {
            alert('Payment verification failed. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Verification error:', error);
          alert('Error verifying payment. Please contact support.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      verifyPayment();
    }
    
    if (paymentStatus === 'cancelled') {
      alert('Payment cancelled. You can upgrade anytime.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('homelogProperties');
    if (saved) {
      setProperties(JSON.parse(saved));
      const firstId = JSON.parse(saved)[0]?.id;
      if (firstId) setSelectedPropertyId(firstId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('homelogProperties', JSON.stringify(properties));
  }, [properties]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const addProperty = (newProperty) => {
    if (!isPro && properties.length >= 1) {
      setShowUpgradePrompt(true);
      return;
    }
    setProperties([...properties, newProperty]);
    setSelectedPropertyId(newProperty.id);
    setShowNewPropertyForm(false);
  };

  const addEntry = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const cost = parseInt(formData.get('cost')) || 0;
    const impactPercentage = Math.min((cost / selectedProperty.baselineValue) * 100, 15);
    
    const photos = [];
    const photoInputs = e.target.querySelectorAll('input[name="photos"]');
    let totalFiles = 0;

    photoInputs.forEach(input => {
      if (input.files) {
        totalFiles += input.files.length;
        Array.from(input.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
            photos.push({
              id: Date.now() + Math.random(),
              data: event.target.result,
              name: file.name
            });
            if (photos.length === totalFiles) {
              finishEntry();
            }
          };
          reader.readAsDataURL(file);
        });
      }
    });

    const finishEntry = () => {
      const epcBefore = formData.get('epcBefore');
      const epcAfter = formData.get('epcAfter');
      
      const validEPC = ['A', 'B', 'C', 'D', 'E', 'F', 'G', ''];
      if ((epcBefore && !validEPC.includes(epcBefore)) || (epcAfter && !validEPC.includes(epcAfter))) {
        alert('Invalid EPC rating. Please select A-G.');
        return;
      }

      const newEntry = {
        id: Date.now(),
        date: formData.get('date'),
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        cost: cost,
        receipt: formData.get('receipt') === 'on',
        epcBefore: epcBefore,
        epcAfter: epcAfter,
        epcImprovement: epcBefore && epcAfter ? calculateEPCImprovement(epcBefore, epcAfter) : null,
        warranty: {
          duration: formData.get('warranty'),
          expiryDate: formData.get('expiryDate')
        },
        impact: impactPercentage.toFixed(1),
        impactValue: Math.round(selectedProperty.baselineValue * (impactPercentage / 100)),
        photos: photos
      };

      setProperties(properties.map(p => 
        p.id === selectedPropertyId 
          ? { ...p, entries: [...p.entries, newEntry] }
          : p
      ));
      setShowEntryForm(false);
      e.target.reset();
    };

    if (totalFiles === 0) {
      finishEntry();
    }
  };

  const calculateEPCImprovement = (before, after) => {
    const epcScale = { 'G': 0, 'F': 1, 'E': 2, 'D': 3, 'C': 4, 'B': 5, 'A': 6 };
    return epcScale[after] - epcScale[before];
  };

  const exportToPDF = async () => {
    if (!selectedProperty) return;

    setExportingPDF(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(54, 117, 111);
      doc.text('HomeLog', 20, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(139, 139, 139);
      doc.text('Property Maintenance & Valuation Record', 20, yPosition);
      yPosition += 30;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(139, 139, 139);
      doc.text('PROPERTY', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(54, 117, 111);
      doc.text(selectedProperty.name, 20, yPosition);
      yPosition += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(44, 44, 44);
      doc.text(`${selectedProperty.location}`, 20, yPosition);
      yPosition += 6;
      doc.text(`${selectedProperty.postcode}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Property Type: ${selectedProperty.propertyType}`, 20, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(166, 139, 91);
      doc.text('ESTIMATED PROPERTY VALUE', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(54, 117, 111);
      doc.text(`£${selectedProperty.baselineValue.toLocaleString()}`, 20, yPosition);
      yPosition += 15;

      const totalInvested = selectedProperty.entries.reduce((sum, e) => sum + e.cost, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(166, 139, 91);
      doc.text('TOTAL DOCUMENTED IMPROVEMENTS', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(166, 139, 91);
      doc.text(`£${totalInvested.toLocaleString()}`, 20, yPosition);
      yPosition += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(139, 139, 139);
      const totalPhotos = selectedProperty.entries.reduce((sum, e) => sum + (e.photos ? e.photos.length : 0), 0);
      doc.text(`${selectedProperty.entries.length} records documented`, 20, yPosition);
      yPosition += 5;
      doc.text(`${selectedProperty.entries.filter(e => e.receipt).length} invoices attached`, 20, yPosition);
      yPosition += 5;
      doc.text(`${totalPhotos} photographs included`, 20, yPosition);

      doc.addPage();
      yPosition = 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(54, 117, 111);
      doc.text('MAINTENANCE RECORDS', 20, yPosition);
      yPosition += 15;

      const sortedEntries = selectedProperty.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];

        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(54, 117, 111);
        doc.text(`${i + 1}. ${entry.title}`, 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(139, 139, 139);
        const dateStr = new Date(entry.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(`${dateStr} | ${entry.category} | £${entry.cost.toLocaleString()}`, 20, yPosition);
        yPosition += 6;

        if (entry.epcBefore || entry.epcAfter) {
          const epcText = entry.epcBefore && entry.epcAfter 
            ? `Energy Rating: ${entry.epcBefore} → ${entry.epcAfter}` 
            : `Energy Rating: ${entry.epcBefore || entry.epcAfter}`;
          doc.setTextColor(166, 139, 91);
          doc.text(epcText, 20, yPosition);
          yPosition += 6;
        }

        if (entry.description) {
          doc.setTextColor(44, 44, 44);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(entry.description, pageWidth - 40);
          doc.text(lines, 20, yPosition);
          yPosition += lines.length * 5 + 2;
        }

        if (entry.impact) {
          doc.setTextColor(166, 139, 91);
          doc.setFont('helvetica', 'bold');
          doc.text(`Impact: +${entry.impact}% (~£${entry.impactValue.toLocaleString()})`, 20, yPosition);
          yPosition += 6;
        }

        if (entry.photos && entry.photos.length > 0) {
          yPosition += 2;

          for (let j = 0; j < entry.photos.length; j++) {
            const photo = entry.photos[j];

            if (yPosition > pageHeight - 120) {
              doc.addPage();
              yPosition = 15;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(166, 139, 91);
            doc.text(`Photo ${j + 1} of ${entry.photos.length}`, 20, yPosition);
            yPosition += 5;

            try {
              const imgWidth = 160;
              const imgHeight = 100;

              if (yPosition + imgHeight > pageHeight - 20) {
                doc.addPage();
                yPosition = 15;
              }

              let format = 'JPEG';
              if (photo.data.includes('data:image/png')) format = 'PNG';
              else if (photo.data.includes('data:image/webp')) format = 'WEBP';

              doc.addImage(photo.data, format, 20, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 8;
            } catch (err) {
              console.error('Error adding photo:', err);
              doc.setTextColor(200, 0, 0);
              doc.text('Error: Photo could not be embedded', 20, yPosition);
              yPosition += 6;
            }
          }
        }

        yPosition += 6;
        doc.setDrawColor(232, 227, 219);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 8;
      }

      doc.addPage();
      yPosition = 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(54, 117, 111);
      doc.text('SUMMARY', 20, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(44, 44, 44);

      const epcImprovements = selectedProperty.entries.filter(e => e.epcImprovement);
      const totalEPCGain = epcImprovements.reduce((sum, e) => sum + e.epcImprovement, 0);

      const summaryItems = [
        ['Property Address:', `${selectedProperty.name}, ${selectedProperty.location}, ${selectedProperty.postcode}`],
        ['Property Type:', selectedProperty.propertyType],
        ['Baseline Value:', `£${selectedProperty.baselineValue.toLocaleString()}`],
        ['Total Improvements:', `£${totalInvested.toLocaleString()}`],
        ['Total Records:', `${selectedProperty.entries.length}`],
        ['Energy Improvements:', epcImprovements.length > 0 ? `${totalEPCGain} rating band${totalEPCGain !== 1 ? 's' : ''} improved` : 'None recorded'],
        ['Invoices:', `${selectedProperty.entries.filter(e => e.receipt).length} attached`],
        ['Photos:', `${totalPhotos} included`],
        ['Report Date:', new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })]
      ];

      summaryItems.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        const valueLines = doc.splitTextToSize(value, pageWidth - 100);
        doc.text(valueLines, 90, yPosition);
        yPosition += Math.max(6, valueLines.length * 5) + 2;
      });

      yPosition += 10;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(139, 139, 139);
      doc.text('Professional evidence of property maintenance and improvements.', 20, yPosition);
      yPosition += 5;
      doc.text('Generated by HomeLog - Property Maintenance & Valuation Record', 20, yPosition);

      const filename = `${selectedProperty.name.replace(/\s/g, '_')}_HomeLog_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Error exporting PDF: ${error.message}`);
    }

    setExportingPDF(false);
  };

  const getCompleteness = () => {
    if (!selectedProperty) return 0;
    return Math.round(Math.min((selectedProperty.entries.length / 10) * 100, 100));
  };

  const getTotalInvested = () => {
    if (!selectedProperty) return 0;
    return selectedProperty.entries.reduce((sum, e) => sum + e.cost, 0);
  };

  const getLatestEPC = () => {
    if (!selectedProperty || selectedProperty.entries.length === 0) return null;
    const entriesWithEPC = selectedProperty.entries.filter(e => e.epcAfter || e.epcBefore);
    if (entriesWithEPC.length === 0) return null;
    return entriesWithEPC[entriesWithEPC.length - 1].epcAfter || entriesWithEPC[entriesWithEPC.length - 1].epcBefore;
  };

  if (properties.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFBF7', fontFamily: '"Lora", Georgia, serif', color: '#2C2C2C' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E3DB', padding: '24px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>HomeLog</h1>
          <p style={{ margin: 0, color: '#8B8B8B', fontSize: '13px' }}>Property Maintenance & Valuation Log</p>
        </div>

        <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏠</div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif', marginBottom: '16px' }}>No properties yet</h2>
          <p style={{ color: '#8B8B8B', marginBottom: '32px', fontSize: '15px' }}>Create your first property to start tracking maintenance and building evidence for your home's value.</p>
          <button onClick={() => setShowNewPropertyForm(true)} style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>+ Add Your First Property</button>
        </div>

        {showNewPropertyForm && <PropertyFormModal onClose={() => setShowNewPropertyForm(false)} onAddProperty={addProperty} />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFBF7', fontFamily: '"Lora", Georgia, serif', color: '#2C2C2C' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E3DB', padding: '24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>HomeLog</h1>
            <p style={{ margin: 0, color: '#8B8B8B', fontSize: '13px' }}>Property Maintenance & Valuation Log {isPro ? '(PRO)' : `(Free: ${properties.length}/1)`}</p>
          </div>
          {isPro && (
            <div style={{ backgroundColor: '#FAF8F3', padding: '8px 16px', borderRadius: '6px', border: '1px solid #E8E3DB' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#A68B5B' }}>✓ Pro Active</p>
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={selectedPhoto.data} alt="Full view" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {selectedProperty && (
          <>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 2px 12px rgba(54, 117, 111, 0.08)', border: '1px solid #E8E3DB' }}>
              <div style={{ width: '100%', height: '300px', backgroundColor: '#A68B5B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>🏘️ [Property photograph]</div>

              <div style={{ padding: '36px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>{selectedProperty.name}</h2>
                <p style={{ margin: '0 0 24px 0', color: '#8B8B8B', fontSize: '14px' }}>{selectedProperty.location} · {selectedProperty.postcode}</p>

                <div style={{ display: 'flex', gap: '40px', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                    <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
                      <circle cx="70" cy="70" r="55" fill="none" stroke="#E8E3DB" strokeWidth="9" />
                      <circle cx="70" cy="70" r="55" fill="none" stroke="#A68B5B" strokeWidth="9" strokeDasharray="289" strokeDashoffset={289 - (getCompleteness() / 100) * 289} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>{getCompleteness()}%</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Documented</p>
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Record</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#2C2C2C', lineHeight: '1.8' }}>
                      <span style={{ color: '#A68B5B' }}>✓</span> {selectedProperty.entries.filter(e => e.category === 'Maintenance').length} Maintenance<br/>
                      <span style={{ color: '#A68B5B' }}>✓</span> {selectedProperty.entries.filter(e => e.category === 'Improvement').length} Improvements<br/>
                      <span style={{ color: '#A68B5B' }}>✓</span> {selectedProperty.entries.length} Total Records<br/>
                      {getLatestEPC() && <><span style={{ color: '#A68B5B' }}>⚡</span> EPC: {getLatestEPC()}</>}
                    </p>
                  </div>
                </div>

                <div style={{ backgroundColor: '#FAF8F3', borderLeft: '5px solid #A68B5B', padding: '24px', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Estimated Property Value</p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>£{selectedProperty.baselineValue.toLocaleString()}</p>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8B8B8B' }}>Based on {selectedProperty.postcode} postcode</p>

                  <p style={{ margin: '16px 0 0 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Total Documented Improvements</p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '36px', fontWeight: '700', color: '#A68B5B', fontFamily: '"Playfair Display", serif', lineHeight: '1' }}>£{getTotalInvested().toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8B8B8B' }}>{selectedProperty.entries.length} records · {selectedProperty.entries.filter(e => e.receipt).length} invoices · {selectedProperty.entries.reduce((sum, e) => sum + (e.photos ? e.photos.length : 0), 0)} photos</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
              <button onClick={() => setShowEntryForm(true)} style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>+ Log Maintenance Record</button>
              <button onClick={() => setShowWhatIfCalc(!showWhatIfCalc)} style={{ backgroundColor: '#A68B5B', color: 'white', border: 'none', padding: '16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>💡 What If Calculator</button>
              <button onClick={exportToPDF} disabled={exportingPDF} style={{ backgroundColor: exportingPDF ? '#999' : '#36756F', color: 'white', border: 'none', padding: '16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: exportingPDF ? 'not-allowed' : 'pointer', fontFamily: '"Lora", serif' }}>
                {exportingPDF ? '⏳ Generating PDF...' : '📄 Export as PDF'}
              </button>
              <button onClick={() => setShowNewPropertyForm(true)} style={{ backgroundColor: '#E8E3DB', color: '#36756F', border: 'none', padding: '16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>+ Add Property</button>
            </div>

            {showWhatIfCalc && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', marginBottom: '40px', border: '1px solid #E8E3DB', boxShadow: '0 2px 12px rgba(54, 117, 111, 0.08)' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>What If You...</h3>
                <WhatIfCalc baselineValue={selectedProperty.baselineValue} />
              </div>
            )}

            {selectedProperty.entries.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>Your Home's Story</h3>

                <div style={{ display: 'grid', gap: '24px' }}>
                  {selectedProperty.entries.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                    <div key={entry.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '24px', border: '1px solid #E8E3DB', borderLeftWidth: '5px', borderLeftColor: entry.category === 'Improvement' ? '#36756F' : '#A68B5B', boxShadow: '0 1px 4px rgba(54, 117, 111, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>{entry.title}</h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#8B8B8B' }}>{new Date(entry.date).toLocaleDateString()} · £{entry.cost.toLocaleString()}</p>
                        </div>
                        {entry.impact && (
                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Impact</p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#A68B5B', fontFamily: '"Playfair Display", serif' }}>+{entry.impact}%</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8B8B8B' }}>~£{entry.impactValue.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      <p style={{ margin: '12px 0', fontSize: '13px', color: '#2C2C2C' }}>{entry.description}</p>

                      {(entry.epcBefore || entry.epcAfter) && (
                        <div style={{ backgroundColor: '#FAF8F3', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #E8E3DB' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>⚡ Energy Rating</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#36756F' }}>
                            {entry.epcBefore ? `${entry.epcBefore}` : 'N/A'} {entry.epcAfter ? `→ ${entry.epcAfter}` : ''}
                            {entry.epcImprovement && <span style={{ color: '#A68B5B', fontWeight: 'bold' }}> (+{entry.epcImprovement} band)</span>}
                          </p>
                        </div>
                      )}

                      {entry.photos && entry.photos.length > 0 && (
                        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>📷 {entry.photos.length} Photo{entry.photos.length !== 1 ? 's' : ''}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                            {entry.photos.map(photo => (
                              <div key={photo.id} onClick={() => setSelectedPhoto(photo)} style={{ cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', border: '2px solid #E8E3DB', transition: 'all 0.2s' }}>
                                <img src={photo.data} alt={photo.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: '12px', color: '#8B8B8B' }}>
                        {entry.receipt && <><span style={{ color: '#A68B5B' }}>✓</span> Invoice · </>}
                        {entry.warranty.duration && <><span style={{ color: '#A68B5B' }}>✓</span> {entry.warranty.duration} warranty · </>}
                        <span style={{ color: '#A68B5B' }}>✓</span> {entry.category}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showUpgradePrompt && <UpgradePrompt onClose={() => setShowUpgradePrompt(false)} />}
      {showEntryForm && <EntryFormModal onClose={() => setShowEntryForm(false)} onSubmit={addEntry} />}
      {showNewPropertyForm && <PropertyFormModal onClose={() => setShowNewPropertyForm(false)} onAddProperty={addProperty} />}
    </div>
  );
}

function UpgradePrompt({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleUpgrade = async () => {
    if (!userEmail) {
      setError('Please enter your email');
      return;
    }

    if (!validateEmail(userEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!process.env.REACT_APP_STRIPE_PUBLIC_KEY) {
      setError('Payment system not configured. Please try again later.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Payment system error');
        setLoading(false);
        return;
      }

      if (data.sessionId) {
        const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        if (!stripe) {
          setError('Payment system unavailable. Please try again.');
          setLoading(false);
          return;
        }
        
        const { error: redirectError } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (redirectError) {
          setError('Redirect failed: ' + redirectError.message);
          setLoading(false);
        }
      } else {
        setError(data.error || 'Failed to create checkout session');
        setLoading(false);
      }
    } catch (error) {
      setError('Connection error: ' + error.message);
      console.error('Stripe error:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '40px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(54, 117, 111, 0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>Upgrade to HomeLog Pro</h2>
        <p style={{ margin: '0 0 32px 0', fontSize: '15px', color: '#8B8B8B', lineHeight: '1.6' }}>Unlock unlimited properties and advanced features.</p>

        <div style={{ backgroundColor: '#FAF8F3', borderRadius: '8px', padding: '20px', marginBottom: '32px', border: '1px solid #E8E3DB' }}>
          <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#36756F' }}><span style={{ color: '#A68B5B', fontWeight: 'bold' }}>✓</span> Unlimited properties</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#36756F' }}><span style={{ color: '#A68B5B', fontWeight: 'bold' }}>✓</span> Professional PDF exports</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#36756F' }}><span style={{ color: '#A68B5B', fontWeight: 'bold' }}>✓</span> Energy efficiency tracking</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#36756F' }}><span style={{ color: '#A68B5B', fontWeight: 'bold' }}>✓</span> Priority support</p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>£4.99</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#8B8B8B' }}>per month • Cancel anytime</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
          <input 
            type="email" 
            value={userEmail} 
            onChange={(e) => {
              setUserEmail(e.target.value);
              setError('');
            }} 
            placeholder="you@example.com" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: error ? '2px solid #d32f2f' : '1px solid #E8E3DB', 
              borderRadius: '6px', 
              fontFamily: '"Lora", serif', 
              fontSize: '14px', 
              boxSizing: 'border-box', 
              marginBottom: '8px' 
            }} 
          />
          {error && <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#d32f2f', fontWeight: '500' }}>⚠️ {error}</p>}
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <button 
            onClick={handleUpgrade} 
            disabled={loading || !userEmail} 
            style={{ 
              backgroundColor: loading || !userEmail ? '#CCC' : '#36756F', 
              color: 'white', 
              border: 'none', 
              padding: '14px', 
              borderRadius: '6px', 
              fontSize: '15px', 
              fontWeight: '600', 
              cursor: loading || !userEmail ? 'not-allowed' : 'pointer', 
              fontFamily: '"Lora", serif',
              transition: 'all 0.2s'
            }}>
            {loading ? '⏳ Processing...' : 'Upgrade Now'}
          </button>
          <button 
            onClick={onClose} 
            style={{ 
              backgroundColor: '#E8E3DB', 
              color: '#36756F', 
              border: 'none', 
              padding: '14px', 
              borderRadius: '6px', 
              fontSize: '15px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              fontFamily: '"Lora", serif' 
            }}>
            Continue with Free Tier
          </button>
        </div>
      </div>
    </div>
  );
}

function PropertyFormModal({ onClose, onAddProperty }) {
  const [postcode, setPostcode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [propertyType, setPropertyType] = useState('Terraced');
  const [manualValue, setManualValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState(null);

  const handleLookup = async () => {
    if (!postcode || !houseNumber) {
      alert('Please enter postcode and house number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/valuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode, houseNumber, propertyType })
      });
      
      const data = await response.json();
      if (data.success) {
        setEstimatedValue(data);
        setManualValue(data.estimatedValue.toString());
      } else {
        alert('Property not found. Please enter value manually.');
      }
    } catch (error) {
      alert('Lookup failed. Please enter value manually.');
      console.error(error);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onAddProperty({
      id: Date.now(),
      name: formData.get('name'),
      location: formData.get('location'),
      postcode: postcode.toUpperCase(),
      propertyType,
      baselineValue: parseInt(manualValue),
      entries: [],
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 40px rgba(54, 117, 111, 0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>Add Property</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Postcode</label>
            <input placeholder="e.g., CR2 6DZ" required value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>House Number</label>
            <input placeholder="e.g., 42" required value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Property Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }}>
              <option>Flat</option>
              <option>Terraced</option>
              <option>Semi-detached</option>
              <option>Detached</option>
              <option>Bungalow</option>
            </select>
          </div>

          <button type="button" onClick={handleLookup} disabled={!postcode || !houseNumber || loading} style={{ backgroundColor: loading ? '#999' : '#A68B5B', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>
            {loading ? '🔍 Looking up...' : '🔍 Look Up Valuation'}
          </button>

          {estimatedValue && (
            <div style={{ backgroundColor: '#FAF8F3', padding: '16px', borderRadius: '8px', border: '1px solid #E8E3DB' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Estimated Value</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>£{estimatedValue.estimatedValue.toLocaleString()}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8B8B8B' }}>{estimatedValue.method}</p>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Property Name</label>
            <input name="name" placeholder="e.g., 42 Kensington Road" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Location</label>
            <input name="location" placeholder="e.g., Croydon, South London" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Property Value (£)</label>
            <input type="number" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Auto-filled from lookup" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={!manualValue} style={{ backgroundColor: manualValue ? '#36756F' : '#CCC', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: manualValue ? 'pointer' : 'not-allowed', marginTop: '16px', fontFamily: '"Lora", serif' }}>Create Property</button>
        </form>
      </div>
    </div>
  );
}

function EntryFormModal({ onClose, onSubmit }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleSubmit = (e) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'photos';
    input.multiple = true;
    
    selectedFiles.forEach(file => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const newInput = document.createElement('input');
      newInput.type = 'file';
      newInput.name = 'photos';
      
      Object.defineProperty(newInput, 'files', {
        value: dataTransfer.files,
        writable: false,
      });
      e.target.appendChild(newInput);
    });

    onSubmit(e);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 40px rgba(54, 117, 111, 0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>Log Maintenance Record</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Title</label>
            <input name="title" placeholder="e.g., Kitchen Renovation" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Description</label>
            <textarea name="description" placeholder="Details about the work..." style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Category</label>
            <select name="category" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }}>
              <option>Maintenance</option>
              <option>Improvement</option>
              <option>Repair</option>
              <option>Issue</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Cost (£)</label>
            <input name="cost" type="number" placeholder="0" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>⚡ EPC Before</label>
              <select name="epcBefore" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="">Not recorded</option>
                <option value="A">A (Most Efficient)</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G (Least Efficient)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>⚡ EPC After</label>
              <select name="epcAfter" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="">Not recorded</option>
                <option value="A">A (Most Efficient)</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G (Least Efficient)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>📷 Upload Photos</label>
            <div style={{ border: '2px dashed #A68B5B', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#FAF8F3' }}>
              <input type="file" name="photos" multiple accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} id="photoInput" />
              <label htmlFor="photoInput" style={{ display: 'block', cursor: 'pointer' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#36756F' }}>Click to select</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#8B8B8B' }}>or drag & drop</p>
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FAF8F3', borderRadius: '6px', border: '1px solid #E8E3DB' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#36756F' }}>✓ {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#2C2C2C', cursor: 'pointer' }}>
              <input name="receipt" type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Receipt Attached
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Warranty Duration (optional)</label>
            <input name="warranty" placeholder="e.g., 10 years" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Warranty Expiry Date (optional)</label>
            <input name="expiryDate" type="date" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '16px', fontFamily: '"Lora", serif' }}>Save Record</button>
        </form>
      </div>
    </div>
  );
}

function WhatIfCalc({ baselineValue }) {
  const [improvementType, setImprovementType] = useState('');
  const [cost, setCost] = useState('');

  const calculateImpact = () => {
    if (!cost) return null;
    const costNum = parseInt(cost);
    const basePercentage = Math.min((costNum / baselineValue) * 100, 15);
    return { percentage: basePercentage.toFixed(1), value: Math.round(baselineValue * (basePercentage / 100)) };
  };

  const impact = calculateImpact();

  return (
    <form style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Improvement</label>
          <input type="text" value={improvementType} onChange={(e) => setImprovementType(e.target.value)} placeholder="e.g., Heat pump" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B8B8B', marginBottom: '6px', textTransform: 'uppercase' }}>Cost</label>
          <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="£" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', fontFamily: '"Lora", serif', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
      </div>

      {impact && (
        <div style={{ backgroundColor: '#FAF8F3', borderRadius: '8px', padding: '20px', border: '1px solid #E8E3DB' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Impact</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#2C2C2C' }}>{improvementType}</p>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>+{impact.percentage}%</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8B8B8B' }}>£{impact.value.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
