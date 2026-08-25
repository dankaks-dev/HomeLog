import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_STRIPE_PUBLIC_KEY);

const COLORS = {
  primary: '#36756F',
  accent: '#A68B5B',
  background: '#FFFBF7',
  surface: '#FAF8F3',
  border: '#E8E3DB',
  text: '#2C2C2C',
  secondary: '#8B8B8B'
};

function HomeLog() {
  const [properties, setProperties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('homelog_properties');
    const proStatus = localStorage.getItem('homelog_pro');
    if (saved) setProperties(JSON.parse(saved));
    if (proStatus) setIsPro(JSON.parse(proStatus));
  }, []);

  useEffect(() => {
    localStorage.setItem('homelog_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && params.get('payment') === 'success') {
      fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setIsPro(true);
            localStorage.setItem('homelog_pro', 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
    }
  }, []);

  const addProperty = (formData) => {
    const newProperty = {
      id: Date.now(),
      ...formData,
      entries: [],
      createdAt: new Date().toISOString()
    };
    setProperties([...properties, newProperty]);
    setShowAddForm(false);
  };

  const deleteProperty = (id) => {
    if (confirm('Delete this property?')) {
      setProperties(properties.filter(p => p.id !== id));
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  if (selectedProperty) {
    return (
      <Elements stripe={stripePromise}>
        <PropertyDetailPage
          property={selectedProperty}
          isPro={isPro}
          onBack={() => setSelectedPropertyId(null)}
          onDelete={() => {
            deleteProperty(selectedProperty.id);
            setSelectedPropertyId(null);
          }}
          onAddProperty={() => setShowAddForm(true)}
        />
        {showAddForm && (
          <AddPropertyForm
            onSubmit={addProperty}
            onCancel={() => setShowAddForm(false)}
            isPro={isPro}
            propertiesCount={properties.length}
          />
        )}
      </Elements>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          backgroundColor: COLORS.primary,
          color: 'white',
          padding: '48px 40px',
          borderBottom: `4px solid ${COLORS.accent}`,
          boxShadow: '0 4px 16px rgba(54, 117, 111, 0.12)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '48px',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-1px'
            }}>
              HomeLog
            </h1>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '16px',
              margin: '8px 0 0 0',
              opacity: 0.95,
              fontWeight: 300
            }}>
              Your property. Your records. Your proof.
            </p>
          </div>
        </header>

        {/* Main */}
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 40px' }}>
          {properties.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              backgroundColor: COLORS.surface,
              borderRadius: '16px',
              border: `1px solid ${COLORS.border}`
            }}>
              <h2 style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: '42px',
                fontWeight: 700,
                color: COLORS.primary,
                margin: '0 0 20px 0',
                letterSpacing: '-0.5px'
              }}>
                Welcome to HomeLog
              </h2>
              <p style={{
                fontFamily: '"Lora", serif',
                fontSize: '18px',
                color: COLORS.secondary,
                maxWidth: '600px',
                margin: '0 auto 48px',
                lineHeight: '1.6'
              }}>
                Start by adding your first property to track maintenance, improvements, and prove its value over time.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  backgroundColor: COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '18px 48px',
                  fontFamily: '"Lora", serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: `0 6px 20px rgba(54, 117, 111, 0.25)`,
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#2a5a57';
                  e.target.style.transform = 'translateY(-3px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = COLORS.primary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                + Add Your First Property
              </button>
            </div>
          ) : (
            properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                isPro={isPro}
                onViewDetails={() => setSelectedPropertyId(property.id)}
              />
            ))
          )}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          padding: '40px',
          textAlign: 'center',
          color: COLORS.secondary,
          fontFamily: '"Lora", serif',
          fontSize: '13px',
          marginTop: '60px'
        }}>
          <p style={{ margin: 0 }}>
            HomeLog by Crown and Capital • Your property records, perfectly maintained
          </p>
        </footer>

        {showAddForm && (
          <AddPropertyForm
            onSubmit={addProperty}
            onCancel={() => setShowAddForm(false)}
            isPro={isPro}
            propertiesCount={properties.length}
          />
        )}
      </div>
    </Elements>
  );
}

function PropertyCard({ property, isPro, onViewDetails }) {
  const totalImprovement = property.entries.reduce((sum, entry) => sum + (entry.impactValue || 0), 0);
  const improvementValue = property.baselineValue + totalImprovement;

  return (
    <div
      onClick={onViewDetails}
      style={{
        backgroundColor: COLORS.surface,
        border: `2px solid ${COLORS.border}`,
        borderRadius: '14px',
        padding: '40px',
        marginBottom: '32px',
        boxShadow: '0 4px 12px rgba(54, 117, 111, 0.08)',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(54, 117, 111, 0.16)';
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.borderColor = COLORS.accent;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(54, 117, 111, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h3 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '32px',
            fontWeight: 700,
            color: COLORS.primary,
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px'
          }}>
            {property.name}
          </h3>
          <p style={{
            fontFamily: '"Lora", serif',
            fontSize: '15px',
            color: COLORS.secondary,
            margin: 0
          }}>
            {property.location} • {property.postcode}
          </p>
        </div>
        {isPro && (
          <span style={{
            fontFamily: '"Lora", serif',
            fontSize: '11px',
            fontWeight: 700,
            color: COLORS.accent,
            backgroundColor: 'rgba(166, 139, 91, 0.1)',
            padding: '8px 14px',
            borderRadius: '6px'
          }}>
            ✓ PRO
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '32px',
        paddingTop: '32px',
        borderTop: `2px solid ${COLORS.border}`
      }}>
        <div>
          <p style={{
            fontFamily: '"Lora", serif',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: COLORS.secondary,
            margin: '0 0 12px 0',
            fontWeight: 700
          }}>
            Property Value
          </p>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '36px',
            fontWeight: 700,
            color: COLORS.primary,
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            £{improvementValue.toLocaleString()}
          </p>
          <p style={{
            fontFamily: '"Lora", serif',
            fontSize: '13px',
            color: COLORS.secondary,
            margin: 0
          }}>
            +£{totalImprovement.toLocaleString()} from improvements
          </p>
        </div>

        <div>
          <p style={{
            fontFamily: '"Lora", serif',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: COLORS.secondary,
            margin: '0 0 12px 0',
            fontWeight: 700
          }}>
            Total Improvements
          </p>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '36px',
            fontWeight: 700,
            color: COLORS.accent,
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            {property.entries.length}
          </p>
          <p style={{
            fontFamily: '"Lora", serif',
            fontSize: '13px',
            color: COLORS.secondary,
            margin: 0
          }}>
            records logged
          </p>
        </div>
      </div>
    </div>
  );
}

function PropertyDetailPage({ property, isPro, onBack, onDelete, onAddProperty }) {
  const totalImprovement = property.entries.reduce((sum, entry) => sum + (entry.impactValue || 0), 0);
  const improvementValue = property.baselineValue + totalImprovement;

  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh' }}>
      <header style={{
        backgroundColor: COLORS.primary,
        color: 'white',
        padding: '48px 40px',
        borderBottom: `4px solid ${COLORS.accent}`
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontFamily: '"Lora", serif',
              fontSize: '18px',
              padding: '8px 16px',
              marginRight: '32px'
            }}
          >
            ← Back
          </button>
          <h1 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '42px',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            {property.name}
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '28px',
          marginBottom: '48px'
        }}>
          <div style={{
            backgroundColor: COLORS.surface,
            border: `2px solid ${COLORS.border}`,
            borderRadius: '14px',
            padding: '40px',
            boxShadow: '0 4px 12px rgba(54, 117, 111, 0.08)'
          }}>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: COLORS.secondary,
              margin: '0 0 16px 0',
              fontWeight: 700
            }}>
              Property Value
            </p>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '48px',
              fontWeight: 700,
              color: COLORS.primary,
              margin: '0 0 12px 0',
              letterSpacing: '-1px'
            }}>
              £{improvementValue.toLocaleString()}
            </p>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              color: COLORS.secondary,
              margin: 0
            }}>
              +£{totalImprovement.toLocaleString()} gain from improvements
            </p>
          </div>

          <div style={{
            backgroundColor: COLORS.surface,
            border: `2px solid ${COLORS.border}`,
            borderRadius: '14px',
            padding: '40px',
            boxShadow: '0 4px 12px rgba(54, 117, 111, 0.08)'
          }}>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: COLORS.secondary,
              margin: '0 0 16px 0',
              fontWeight: 700
            }}>
              Total Improvements
            </p>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '48px',
              fontWeight: 700,
              color: COLORS.accent,
              margin: '0 0 12px 0',
              letterSpacing: '-1px'
            }}>
              {property.entries.length}
            </p>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              color: COLORS.secondary,
              margin: 0
            }}>
              maintenance records logged
            </p>
          </div>

          <div style={{
            backgroundColor: COLORS.surface,
            border: `2px solid ${COLORS.border}`,
            borderRadius: '14px',
            padding: '40px',
            boxShadow: '0 4px 12px rgba(54, 117, 111, 0.08)'
          }}>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: COLORS.secondary,
              margin: '0 0 16px 0',
              fontWeight: 700
            }}>
              Property Details
            </p>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.text,
              margin: '0 0 12px 0'
            }}>
              {property.propertyType}
            </p>
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              color: COLORS.secondary,
              margin: 0
            }}>
              {property.location}, {property.postcode}
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: COLORS.surface,
          border: `2px solid ${COLORS.border}`,
          borderRadius: '14px',
          padding: '40px',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '32px',
            fontWeight: 700,
            color: COLORS.primary,
            margin: '0 0 32px 0',
            letterSpacing: '-0.5px'
          }}>
            Improvement Records
          </h2>

          {property.entries.length === 0 ? (
            <p style={{
              fontFamily: '"Lora", serif',
              fontSize: '16px',
              color: COLORS.secondary,
              textAlign: 'center',
              padding: '60px 0',
              margin: 0
            }}>
              No records yet. Start logging improvements to track your property's value.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {property.entries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: COLORS.background,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '10px',
                    padding: '28px'
                  }}
                >
                  <p style={{
                    fontFamily: '"Lora", serif',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: COLORS.secondary,
                    margin: '0 0 12px 0',
                    fontWeight: 700
                  }}>
                    {entry.category || 'Improvement'}
                  </p>
                  <h4 style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: COLORS.primary,
                    margin: '0 0 12px 0'
                  }}>
                    {entry.title}
                  </h4>
                  <p style={{
                    fontFamily: '"Lora", serif',
                    fontSize: '14px',
                    color: COLORS.secondary,
                    margin: '0 0 16px 0',
                    lineHeight: '1.6'
                  }}>
                    {entry.description}
                  </p>
                  <p style={{
                    fontFamily: '"Lora", serif',
                    fontSize: '12px',
                    color: COLORS.secondary,
                    margin: 0
                  }}>
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <button
            onClick={() => alert('Record logging coming soon')}
            style={{
              backgroundColor: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '18px 28px',
              fontFamily: '"Lora", serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(54, 117, 111, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2a5a57';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = COLORS.primary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            + Log Record
          </button>

          <button
            onClick={onAddProperty}
            style={{
              backgroundColor: COLORS.accent,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '18px 28px',
              fontFamily: '"Lora", serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(166, 139, 91, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            + Add Property
          </button>

          <button
            onClick={onDelete}
            style={{
              backgroundColor: 'transparent',
              color: COLORS.secondary,
              border: `2px solid ${COLORS.border}`,
              borderRadius: '10px',
              padding: '18px 28px',
              fontFamily: '"Lora", serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#D97757';
              e.target.style.color = '#D97757';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = COLORS.border;
              e.target.style.color = COLORS.secondary;
            }}
          >
            🗑 Delete Property
          </button>
        </div>
      </main>
    </div>
  );
}

function AddPropertyForm({ onSubmit, onCancel, isPro, propertiesCount }) {
  const [formData, setFormData] = useState({
    name: '',
    postcode: '',
    houseNumber: '',
    propertyType: 'Detached',
    location: '',
    baselineValue: 250000
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isPro && propertiesCount >= 1) {
    return <UpgradeModal onCancel={onCancel} />;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: COLORS.background,
        borderRadius: '16px',
        padding: '48px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: '36px',
          fontWeight: 700,
          color: COLORS.primary,
          margin: '0 0 32px 0',
          letterSpacing: '-0.5px'
        }}>
          Add Property
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.text,
              display: 'block',
              marginBottom: '10px'
            }}>
              Property Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., 32 Higher Drive"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${COLORS.border}`,
                borderRadius: '10px',
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: COLORS.surface
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                display: 'block',
                marginBottom: '10px'
              }}>
                Postcode
              </label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value.toUpperCase()})}
                placeholder="CR8 2HE"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '10px',
                  fontFamily: '"Lora", serif',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: COLORS.surface
                }}
                required
              />
            </div>
            <div>
              <label style={{
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                display: 'block',
                marginBottom: '10px'
              }}>
                House Number
              </label>
              <input
                type="text"
                value={formData.houseNumber}
                onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
                placeholder="32"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '10px',
                  fontFamily: '"Lora", serif',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: COLORS.surface
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.text,
              display: 'block',
              marginBottom: '10px'
            }}>
              Property Type
            </label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${COLORS.border}`,
                borderRadius: '10px',
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: COLORS.surface,
                color: COLORS.text
              }}
            >
              <option>Detached</option>
              <option>Semi-detached</option>
              <option>Terraced</option>
              <option>Flat</option>
              <option>Bungalow</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.text,
              display: 'block',
              marginBottom: '10px'
            }}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Croydon"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${COLORS.border}`,
                borderRadius: '10px',
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: COLORS.surface
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.text,
              display: 'block',
              marginBottom: '10px'
            }}>
              Estimated Value (£)
            </label>
            <input
              type="number"
              value={formData.baselineValue}
              onChange={(e) => setFormData({...formData, baselineValue: parseInt(e.target.value)})}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${COLORS.border}`,
                borderRadius: '10px',
                fontFamily: '"Lora", serif',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: COLORS.surface
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              type="submit"
              style={{
                backgroundColor: COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '16px 24px',
                fontFamily: '"Lora", serif',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(54, 117, 111, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#2a5a57';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = COLORS.primary;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Create Property
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                backgroundColor: 'transparent',
                color: COLORS.secondary,
                border: `2px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '16px 24px',
                fontFamily: '"Lora", serif',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpgradeModal({ onCancel }) {
  const [email, setEmail] = useState('');
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!stripe || !email) return;

    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const { sessionId } = await response.json();
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) console.error(error);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: COLORS.background,
        borderRadius: '16px',
        padding: '56px 48px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: '40px',
          fontWeight: 700,
          color: COLORS.primary,
          margin: '0 0 20px 0',
          letterSpacing: '-0.5px'
        }}>
          Unlock Pro
        </h2>
        
        <p style={{
          fontFamily: '"Lora", serif',
          fontSize: '18px',
          color: COLORS.secondary,
          margin: '0 0 40px 0',
          lineHeight: '1.6'
        }}>
          Unlimited properties and full features for just £4.99/month
        </p>

        <form onSubmit={handleUpgrade}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `2px solid ${COLORS.border}`,
              borderRadius: '10px',
              fontFamily: '"Lora", serif',
              fontSize: '14px',
              marginBottom: '20px',
              boxSizing: 'border-box',
              backgroundColor: COLORS.surface
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: COLORS.accent,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '16px 24px',
              fontFamily: '"Lora", serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginBottom: '12px',
              boxShadow: '0 4px 12px rgba(166, 139, 91, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: COLORS.secondary,
              border: `2px solid ${COLORS.border}`,
              borderRadius: '10px',
              padding: '16px 24px',
              fontFamily: '"Lora", serif',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Continue Free
          </button>
        </form>
      </div>
    </div>
  );
}

export default HomeLog;
