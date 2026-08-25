import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postcode, houseNumber, propertyType } = req.body;

  if (!postcode || !houseNumber || !propertyType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.EPC_BEARER_TOKEN) {
    console.error('EPC_BEARER_TOKEN not configured');
    return res.status(500).json({ error: 'Valuation service not configured' });
  }

  try {
    // Step 1: Validate postcode with postcodes.io
    const postcodeResponse = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const postcodeData = await postcodeResponse.json();

    if (!postcodeData.result) {
      return res.status(400).json({ error: 'Invalid postcode', success: false });
    }

    const region = postcodeData.result.region || 'Unknown';
    const latitude = postcodeData.result.latitude;
    const longitude = postcodeData.result.longitude;

    // Step 2: Get EPC data
    const epcResponse = await fetch(
      `https://api.epc.opendatasoft.com/api/v3/efficiency/search?postcode=${encodeURIComponent(postcode)}&house_number=${encodeURIComponent(houseNumber)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EPC_BEARER_TOKEN}`
        }
      }
    );

    const epcData = await epcResponse.json();
    let floorArea = 100; // Default
    let energyRating = 'D'; // Default

    if (epcData.results && epcData.results.length > 0) {
      const latestEPC = epcData.results[0];
      floorArea = latestEPC.total_floor_area || 100;
      energyRating = latestEPC.energy_efficiency_rating || 'D';
    }

    // Step 3: Calculate valuation
    const pricePerSqMByRegion = {
      'East Midlands': 2100,
      'East of England': 2800,
      'London': 5200,
      'Merseyside': 2800,
      'North East': 1800,
      'North West': 3100,
      'Northern Ireland': 1900,
      'Scotland': 2400,
      'South East': 2800,
      'South West': 3500,
      'Stoke-on-Trent': 2200,
      'West Midlands': 2600,
      'Yorkshire and The Humber': 2400,
      'Wales': 2200,
      'Unknown': 2800
    };

    const typeMultipliers = {
      'Flat': 0.85,
      'Terraced': 1.0,
      'Semi-detached': 1.15,
      'Detached': 1.30,
      'Bungalow': 1.10
    };

    const pricePerSqM = pricePerSqMByRegion[region] || 2800;
    const multiplier = typeMultipliers[propertyType] || 1.0;
    const estimatedValue = Math.round(floorArea * pricePerSqM * multiplier);

    res.status(200).json({
      success: true,
      estimatedValue,
      floorArea: Math.round(floorArea),
      pricePerSqm: pricePerSqM,
      propertyType,
      region,
      energyRating,
      method: `Based on ${floorArea}m² in ${region}`,
      latitude,
      longitude
    });

  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({ error: error.message, success: false });
  }
}
