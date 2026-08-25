// api/value.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST method' });
  }

  const { postcode, houseNumber } = req.body;

  // Check required fields
  if (!postcode || !houseNumber) {
    return res.status(400).json({ error: 'Postcode and house number required' });
  }

  try {
    // 1. Validate the postcode
    const cleanPostcode = postcode.replace(/\s/g, '');
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
          'Authorization': `Bearer ${process.env.EPC_BEARER_TOKEN}`
        }
      }
    );

    const epcData = await epcResponse.json();

    // 3. Check if we found any properties
    if (!epcData.rows || epcData.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No EPC found for this postcode',
        message: 'Try a different postcode or add the full address'
      });
    }

    // 4. Find the specific property by house number
    const property = epcData.rows.find(p => 
      p.address?.includes(houseNumber) || 
      p.address?.includes(` ${houseNumber} `)
    );

    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found',
        message: `No property with number ${houseNumber} found at this postcode`
      });
    }

    // 5. Calculate valuation
    const floorArea = property.totalFloorArea || 80;
    const pricePerSqm = 2500; // UK average (you can enhance this later)
    const estimatedValue = Math.round(floorArea * pricePerSqm);

    // 6. Return the result
    return res.status(200).json({
      success: true,
      valuation: {
        estimatedValue,
        floorArea,
        propertyType: property.propertyType || 'Unknown',
        energyRating: property.energyRating || 'Unknown',
        address: property.address || 'Address not available',
        postcode: property.postcode || postcode
      },
      dataSource: 'UK Government EPC Data'
    });

  } catch (error) {
    console.error('Valuation error:', error);
    return res.status(500).json({ 
      error: 'Valuation service error', 
      message: error.message 
    });
  }
}
