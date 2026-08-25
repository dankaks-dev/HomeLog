import React, { useState, useEffect } from 'react';

export default function HomeLog() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showWhatIfCalc, setShowWhatIfCalc] = useState(false);

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
    setProperties([...properties, newProperty]);
    setSelectedPropertyId(newProperty.id);
    setShowNewPropertyForm(false);
  };

  const addEntry = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const cost = parseInt(formData.get('cost')) || 0;
    const impactPercentage = Math.min((cost / selectedProperty.baselineValue) * 100, 15);
    
    const newEntry = {
      id: Date.now(),
      date: formData.get('date'),
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      cost: cost,
      receipt: formData.get('receipt') === 'on',
      warranty: { duration: formData.get('warranty'), expiryDate: formData.get('expiryDate') },
      impact: impactPercentage.toFixed(1),
      impactValue: Math.round(selectedProperty.baselineValue * (impactPercentage / 100))
    };

    setProperties(properties.map(p => p.id === selectedPropertyId ? { ...p, entries: [...p.entries, newEntry] } : p));
    setShowEntryForm(false);
    e.target.reset();
  };

  const getCompleteness = () => {
    if (!selectedProperty) return 0;
    return Math.round(Math.min((selectedProperty.entries.length / 10) * 100, 100));
  };

  const getTotalInvested = () => {
    if (!selectedProperty) return 0;
    return selectedProperty.entries.reduce((sum, e) => sum + e.cost, 0);
  };

  if (properties.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFBF7', fontFamily: '"Lora", serif', color: '#2C2C2C' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E3DB', padding: '24px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>HomeLog</h1>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏠</div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif', marginBottom: '16px' }}>No properties yet</h2>
          <p style={{ color: '#8B8B8B', marginBottom: '32px', fontSize: '15px' }}>Create your first property to start tracking maintenance.</p>
          <button onClick={() => setShowNewPropertyForm(true)} style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: '"Lora", serif' }}>+ Add Your First Property</button>
        </div>
        {showNewPropertyForm && <PropertyFormModal onClose={() => setShowNewPropertyForm(false)} onAddProperty={addProperty} />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFBF7', fontFamily: '"Lora", serif', color: '#2C2C2C' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E3DB', padding: '24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>HomeLog</h1>
      </div>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {selectedProperty && (
          <>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 2px 12px rgba(54, 117, 111, 0.08)', border: '1px solid #E8E3DB' }}>
              <div style={{ width: '100%', height: '300px', backgroundColor: '#A68B5B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>[Property photo]</div>
              <div style={{ padding: '36px' }}>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif', marginBottom: '8px' }}>{selectedProperty.name}</h2>
                <p style={{ margin: '0 0 24px 0', color: '#8B8B8B', fontSize: '14px' }}>{selectedProperty.location} · {selectedProperty.postcode}</p>
                <div style={{ backgroundColor: '#FAF8F3', borderLeft: '5px solid #A68B5B', padding: '24px', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Property Value</p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>£{selectedProperty.baselineValue.toLocaleString()}</p>
                  <p style={{ margin: '16px 0 0 0', fontSize: '11px', fontWeight: '600', color: '#8B8B8B', textTransform: 'uppercase' }}>Total Improvements</p>
                  <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: '#A68B5B', fontFamily: '"Playfair Display", serif' }}>£{getTotalInvested().toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
              <button onClick={() => setShowEntryForm(true)} style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '16px', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Lora", serif', fontWeight: '600' }}>+ Log Record</button>
              <button onClick={() => setShowWhatIfCalc(!showWhatIfCalc)} style={{ backgroundColor: '#A68B5B', color: 'white', border: 'none', padding: '16px', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Lora", serif', fontWeight: '600' }}>💡 What If</button>
              <button onClick={() => setShowNewPropertyForm(true)} style={{ backgroundColor: '#E8E3DB', color: '#36756F', border: 'none', padding: '16px', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Lora", serif', fontWeight: '600' }}>+ Add Property</button>
            </div>
            {showWhatIfCalc && <WhatIfCalc baselineValue={selectedProperty.baselineValue} />}
            {selectedProperty.entries.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F', fontFamily: '"Playfair Display", serif' }}>Your Home's Story</h3>
                <div style={{ display: 'grid', gap: '24px' }}>
                  {selectedProperty.entries.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                    <div key={entry.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '24px', border: '1px solid #E8E3DB', borderLeftColor: '#36756F', borderLeftWidth: '5px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#36756F' }}>{entry.title}</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#8B8B8B' }}>{new Date(entry.date).toLocaleDateString()} · £{entry.cost.toLocaleString()}</p>
                      <p style={{ margin: '12px 0', fontSize: '13px', color: '#2C2C2C' }}>{entry.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showEntryForm && <EntryFormModal onClose={() => setShowEntryForm(false)} onSubmit={addEntry} />}
      {showNewPropertyForm && <PropertyFormModal onClose={() => setShowNewPropertyForm(false)} onAddProperty={addProperty} />}
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
      alert('Lookup failed: ' + error.message);
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
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F' }}>Add Property</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Postcode</label>
            <input placeholder="CR2 6DZ" required value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>House Number</label>
            <input placeholder="42" required value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Property Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }}>
              <option>Flat</option>
              <option>Terraced</option>
              <option>Semi-detached</option>
              <option>Detached</option>
              <option>Bungalow</option>
            </select>
          </div>
          <button type="button" onClick={handleLookup} disabled={!postcode || !houseNumber || loading} style={{ backgroundColor: loading ? '#CCC' : '#A68B5B', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Lora", serif', fontWeight: '600' }}>
            {loading ? '🔍 Looking up...' : '🔍 Look Up Valuation'}
          </button>
          {estimatedValue && (
            <div style={{ backgroundColor: '#FAF8F3', padding: '16px', borderRadius: '8px', border: '1px solid #E8E3DB' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#8B8B8B' }}>Estimated: £{estimatedValue.estimatedValue.toLocaleString()}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8B8B8B' }}>{estimatedValue.method}</p>
            </div>
          )}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Property Name</label>
            <input name="name" placeholder="42 Kensington Road" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Location</label>
            <input name="location" placeholder="Croydon, London" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Value (£)</label>
            <input type="number" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="350000" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={!manualValue} style={{ backgroundColor: manualValue ? '#36756F' : '#CCC', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px', fontFamily: '"Lora", serif', fontWeight: '600' }}>Create</button>
        </form>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', position: 'absolute', top: '16px', right: '16px' }}>×</button>
      </div>
    </div>
  );
}

function EntryFormModal({ onClose, onSubmit }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F' }}>Log Record</h3>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Date</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Title</label><input name="title" placeholder="Kitchen Renovation" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Description</label><textarea name="description" placeholder="Details..." style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box', minHeight: '80px' }} /></div>
          <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Category</label><select name="category" required style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }}><option>Maintenance</option><option>Improvement</option><option>Repair</option></select></div>
          <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#8B8B8B', display: 'block', marginBottom: '6px' }}>Cost (£)</label><input name="cost" type="number" placeholder="0" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
          <button type="submit" style={{ backgroundColor: '#36756F', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px', fontFamily: '"Lora", serif', fontWeight: '600' }}>Save</button>
        </form>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', position: 'absolute', top: '16px', right: '16px' }}>×</button>
      </div>
    </div>
  );
}

function WhatIfCalc({ baselineValue }) {
  const [cost, setCost] = useState('');
  const impact = cost ? ((parseInt(cost) / baselineValue) * 100).toFixed(1) : null;

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', marginBottom: '40px', border: '1px solid #E8E3DB' }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#36756F' }}>What If Calculator</h3>
      <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Enter cost (£)" style={{ width: '100%', padding: '12px', border: '1px solid #E8E3DB', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '16px' }} />
      {impact && (
        <div style={{ backgroundColor: '#FAF8F3', padding: '20px', borderRadius: '8px', border: '1px solid #E8E3DB' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#2C2C2C' }}>Impact: <strong>+{impact}%</strong></p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#8B8B8B' }}>Value add: £{Math.round(baselineValue * (impact / 100)).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
