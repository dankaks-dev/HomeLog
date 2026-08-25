export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST method' });
  }

  const { postcode, houseNumber } = req.body;

  if (!postcode || !houseNumber) {
    return res.status(400).json({ error: 'Postcode and house number required' });
  }

  try {
    // Clean the postcode
    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
    
    // 1. Validate postcode using postcodes.io
    const pcResponse = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
    const pcData = await pcResponse.json();
    
    if (!pcData.result) {
      return res.status(404).json({ error: 'Invalid postcode' });
    }

    // 2. Get EPC data from government API
    const epcResponse = await fetch(
      `https://get-energy-performance-data.communities.gov.uk/api/domestic/search?postcode=${cleanPostcode}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EPC_BEARER_TOKEN || ''}`
        }
      }
    );

    // Check if EPC API is working
    if (!epcResponse.ok) {
      return res.status(503).json({ 
        error: 'EPC service temporarily unavailable',
        message: 'Please try again later'
      });
    }

    const epcData = await epcResponse.json();

    // Check if we got results
    if (!epcData.rows || epcData.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No EPC certificate found',
        message: 'This property may not have an EPC certificate yet'
      });
    }

    // Find the specific property by house number
    let property = null;
    if (houseNumber) {
      property = epcData.rows.find(p => 
        p.address?.includes(houseNumber) || 
        p.address?.includes(` ${houseNumber} `)
      );
    }
    
    // If not found, use the first result
    if (!property && epcData.rows.length > 0) {
      property = epcData.rows[0];
    }

    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found',
        message: `No property with number ${houseNumber} found at this postcode`
      });
    }

    // Calculate valuation
    const floorArea = property.totalFloorArea || 80;
    const pricePerSqm = 2500; // UK average
    const estimatedValue = Math.round(floorArea * pricePerSqm);

    // Return the result
    return res.status(200).json({
      success: true,
      valuation: {
        estimatedValue: estimatedValue,
        floorArea: floorArea,
        propertyType: property.propertyType || 'Unknown',
        energyRating: property.energyRating || 'Unknown',
        address: property.address || 'Address not available',
        postcode: property.postcode || postcode
      },
      source: 'UK Government EPC Data'
    });

  } catch (error) {
    console.error('Valuation error:', error);
    return res.status(500).json({ 
      error: 'Valuation service error',
      message: error.message || 'Internal server error'
    });
  }
}
