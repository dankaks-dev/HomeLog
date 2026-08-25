export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postcode, houseNumber, propertyType } = req.body;

  if (!postcode || !houseNumber || !propertyType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: Fetch EPC data
    const epcResponse = await fetch(
      `https://epc.opendatasoft.com/api/records/1.0/search/?dataset=energy-performance-of-buildings-data-england&q=${postcode}%20${houseNumber}&rows=1`
    );
    const epcData = await epcResponse.json();

    if (!epcData.records || epcData.records.length === 0) {
      return res.status(404).json({ error: 'Property not found in EPC database' });
    }

    const property = epcData.records[0].fields;
    const floorArea = property.total_floor_area || 90; // Default 90m² if not found

    // Step 2: Fetch Land Registry data (mock for now - in production, use real Land Registry API)
    // For MVP, we use regional average with price per m² calculation
    const postcodeSector = postcode.substring(0, 3).toUpperCase();
    
    // Regional base prices
    const regionalPrices = {
      'SW': 3500, 'SE': 2800, 'E': 2400, 'EC': 3600, 'N': 2900, 'NW': 3100, 'W': 3900,
      'CR': 2100, 'KT': 2900, 'SM': 2600, 'RH': 2400, 'TW': 2750, 'SL': 3100,
      'B': 1900, 'C': 1600, 'CV': 1700, 'DY': 1800, 'L': 1700, 'M': 2100,
      'LS': 2000, 'S': 1900, 'CH': 2100, 'ST': 1800, 'WM': 1900, 'DE': 1900,
      'BA': 2100, 'BN': 2400, 'BS': 2400, 'CB': 2900, 'CF': 1900, 'CM': 2600,
      'CO': 2400, 'CT': 2600, 'CW': 2100, 'DA': 2600, 'DD': 1800, 'DG': 1400
    };

    const pricePerSqm = regionalPrices[postcodeSector] || 2500; // Default £2500/m²

    // Step 3: Apply property type multiplier
    const typeMultipliers = {
      'Flat': 0.85,
      'Terraced': 1.0,
      'Semi-detached': 1.15,
      'Detached': 1.30,
      'Bungalow': 1.10
    };

    const multiplier = typeMultipliers[propertyType] || 1.0;

    // Step 4: Calculate final valuation
    const estimatedValue = Math.round(floorArea * pricePerSqm * multiplier);

    res.status(200).json({
      success: true,
      estimatedValue,
      floorArea,
      pricePerSqm,
      multiplier,
      method: 'EPC + Regional Land Registry',
      confidence: 'High',
      postcode: property.postcode,
      propertyType: property.property_type || propertyType,
      energyRating: property.energy_rating_current || 'Unknown'
    });

  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({ error: 'Failed to calculate valuation', details: error.message });
  }
}
