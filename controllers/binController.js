const BinType = require('../models/BinType');
const BinSize = require('../models/BinSize');
const ServiceArea = require('../models/ServiceArea');
const ServiceAreaBin = require('../models/ServiceAreaBin');
const pool = require('../config/database');
const PhysicalBin = require('../models/PhysicalBin');

// Bin Types
const getAllBinTypes = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const binTypes = await BinType.findAll(includeInactive);
    res.json({
      success: true,
      data: { binTypes },
    });
  } catch (error) {
    console.error('Get bin types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bin types',
      error: error.message,
    });
  }
};

const getBinTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const binType = await BinType.findById(id);

    if (!binType) {
      return res.status(404).json({
        success: false,
        message: 'Bin type not found',
      });
    }

    res.json({
      success: true,
      data: { binType },
    });
  } catch (error) {
    console.error('Get bin type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bin type',
      error: error.message,
    });
  }
};

const createBinType = async (req, res) => {
  try {
    const { name, description, display_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const binType = await BinType.create({ name, description, display_order });

    res.status(201).json({
      success: true,
      message: 'Bin type created successfully',
      data: { binType },
    });
  } catch (error) {
    console.error('Create bin type error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Bin type with this name already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating bin type',
      error: error.message,
    });
  }
};

const updateBinType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, display_order } = req.body;

    const binType = await BinType.update(id, { name, description, is_active, display_order });

    if (!binType) {
      return res.status(404).json({
        success: false,
        message: 'Bin type not found',
      });
    }

    res.json({
      success: true,
      message: 'Bin type updated successfully',
      data: { binType },
    });
  } catch (error) {
    console.error('Update bin type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bin type',
      error: error.message,
    });
  }
};

const deleteBinType = async (req, res) => {
  try {
    const { id } = req.params;
    const binType = await BinType.delete(id);

    if (!binType) {
      return res.status(404).json({
        success: false,
        message: 'Bin type not found',
      });
    }

    res.json({
      success: true,
      message: 'Bin type deleted successfully',
    });
  } catch (error) {
    console.error('Delete bin type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bin type',
      error: error.message,
    });
  }
};

// Bin Sizes
const getAllBinSizes = async (req, res) => {
  try {
    const binTypeId = req.query.binTypeId ? parseInt(req.query.binTypeId) : null;
    const includeInactive = req.query.includeInactive === 'true';
    const binSizes = await BinSize.findAll(binTypeId, includeInactive);
    res.json({
      success: true,
      data: { binSizes },
    });
  } catch (error) {
    console.error('Get bin sizes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bin sizes',
      error: error.message,
    });
  }
};

const getBinSizeById = async (req, res) => {
  try {
    const { id } = req.params;
    const binSize = await BinSize.findById(id);

    if (!binSize) {
      return res.status(404).json({
        success: false,
        message: 'Bin size not found',
      });
    }

    res.json({
      success: true,
      data: { binSize },
    });
  } catch (error) {
    console.error('Get bin size error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bin size',
      error: error.message,
    });
  }
};

const createBinSize = async (req, res) => {
  try {
    const { bin_type_id, size, capacity_cubic_meters, display_order } = req.body;

    if (!bin_type_id || !size || !capacity_cubic_meters) {
      return res.status(400).json({
        success: false,
        message: 'bin_type_id, size, and capacity_cubic_meters are required',
      });
    }

    const binSize = await BinSize.create({
      bin_type_id,
      size,
      capacity_cubic_meters,
      display_order
    });

    res.status(201).json({
      success: true,
      message: 'Bin size created successfully',
      data: { binSize },
    });
  } catch (error) {
    console.error('Create bin size error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Bin size with this size already exists for this bin type',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating bin size',
      error: error.message,
    });
  }
};

const updateBinSize = async (req, res) => {
  try {
    const { id } = req.params;
    const { bin_type_id, size, capacity_cubic_meters, is_active, display_order } = req.body;

    const binSize = await BinSize.update(id, { bin_type_id, size, capacity_cubic_meters, is_active, display_order });

    if (!binSize) {
      return res.status(404).json({
        success: false,
        message: 'Bin size not found',
      });
    }

    res.json({
      success: true,
      message: 'Bin size updated successfully',
      data: { binSize },
    });
  } catch (error) {
    console.error('Update bin size error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bin size',
      error: error.message,
    });
  }
};

const deleteBinSize = async (req, res) => {
  try {
    const { id } = req.params;
    const binSize = await BinSize.delete(id);

    if (!binSize) {
      return res.status(404).json({
        success: false,
        message: 'Bin size not found',
      });
    }

    res.json({
      success: true,
      message: 'Bin size deleted successfully',
    });
  } catch (error) {
    console.error('Delete bin size error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bin size',
      error: error.message,
    });
  }
};

const getBinPricesByLocation = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    // 1. Find service areas covering this location
    const serviceAreas = await ServiceArea.findInRange(parseFloat(lat), parseFloat(lon));

    if (serviceAreas.length === 0) {
      return res.json({
        success: true,
        data: { prices: [] },
        message: 'No suppliers found in this area'
      });
    }

    // 2. Get finalized prices for these service areas
    const areaIds = serviceAreas.map(sa => sa.id);
    const prices = await ServiceAreaBin.getFinalPricesForAreas(areaIds);

    if (prices.length === 0) {
      return res.json({
        success: true,
        data: { prices: [] },
        message: 'Suppliers have not your selected bin for this location'
      });
    }

    res.json({
      success: true,
      data: { prices },
    });
  } catch (error) {
    console.error('Get bin prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bin prices',
      error: error.message,
    });
  }
};

const getSupplierBinPrices = async (req, res) => {
  try {
    const { binTypeId, binSizeId } = req.query;
    const supplierId = req.user.id;

    if (!binTypeId) {
      return res.status(400).json({
        success: false,
        message: 'binTypeId is required',
      });
    }

    // 1. Get all service areas for this supplier
    const serviceAreas = await ServiceArea.findBySupplierId(supplierId);

    if (serviceAreas.length === 0) {
      return res.json({
        success: true,
        data: { areas: [] },
      });
    }

    // 2. Get existing prices for these areas + bin type/size
    const areaIds = serviceAreas.map(sa => sa.id);
    const query = `
      SELECT service_area_id, supplier_price, admin_final_price, is_active
      FROM service_area_bins
      WHERE service_area_id = ANY($1)
        AND bin_type_id = $2
        AND (bin_size_id = $3 OR (bin_size_id IS NULL AND $3 IS NULL))
    `;
    const result = await pool.query(query, [areaIds, parseInt(binTypeId), binSizeId ? parseInt(binSizeId) : null]);
    
    const areasWithPrices = serviceAreas.map(area => {
      const priceData = result.rows.find(r => r.service_area_id === area.id);
      return {
        id: area.id,
        city: area.city,
        country: area.country,
        currentPrice: priceData ? priceData.supplier_price : null,
        isActive: priceData ? priceData.is_active : false,
        adminPrice: priceData ? priceData.admin_final_price : null
      };
    });

    res.json({
      success: true,
      data: { areas: areasWithPrices },
    });
  } catch (error) {
    console.error('Get supplier bin prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier bin prices',
      error: error.message,
    });
  }
};

const getSupplierAssignedTypes = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const binTypes = await PhysicalBin.findAssignedTypes(supplierId);
    res.json({
      success: true,
      data: { binTypes },
    });
  } catch (error) {
    console.error('Get supplier assigned types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned bin types',
      error: error.message,
    });
  }
};

const getSupplierAssignedSizes = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { binTypeId } = req.query;

    const binSizes = await PhysicalBin.findAssignedSizes(
      supplierId, 
      binTypeId ? parseInt(binTypeId) : null
    );
    res.json({
      success: true,
      data: { binSizes },
    });
  } catch (error) {
    console.error('Get supplier assigned sizes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned bin sizes',
      error: error.message,
    });
  }
};

const getAvailableBinTypesForLocation = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    // 1. Find service areas covering this location
    const serviceAreas = await ServiceArea.findInRange(parseFloat(lat), parseFloat(lon));

    if (serviceAreas.length === 0) {
      return res.json({
        success: true,
        data: { binTypes: [] },
        message: 'No suppliers found in this area'
      });
    }

    // 2. Get service area IDs
    const areaIds = serviceAreas.map(sa => sa.id);

    // 3. Get distinct bin types with approved admin prices AND available bins from same supplier
    const query = `
      SELECT DISTINCT bt.*
      FROM bin_types bt
      INNER JOIN service_area_bins sab ON bt.id = sab.bin_type_id
      INNER JOIN service_areas sa ON sab.service_area_id = sa.id
      INNER JOIN physical_bins pb 
        ON bt.id = pb.bin_type_id 
        AND pb.supplier_id = sa.supplier_id
        AND (sab.bin_size_id IS NULL OR pb.bin_size_id = sab.bin_size_id)
      WHERE sab.service_area_id = ANY($1)
        AND sab.is_active = true
        AND sab.admin_final_price IS NOT NULL
        AND pb.status = 'available'
        AND bt.is_active = true
      ORDER BY bt.display_order ASC, bt.name ASC
    `;
    const result = await pool.query(query, [areaIds]);

    res.json({
      success: true,
      data: { binTypes: result.rows },
    });
  } catch (error) {
    console.error('Get available bin types for location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available bin types',
      error: error.message,
    });
  }
};

const getAvailableBinSizesForLocationAndType = async (req, res) => {
  try {
    const { lat, lon, binTypeId } = req.query;

    if (!lat || !lon || !binTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and binTypeId are required',
      });
    }

    // 1. Find service areas covering this location
    const serviceAreas = await ServiceArea.findInRange(parseFloat(lat), parseFloat(lon));

    if (serviceAreas.length === 0) {
      return res.json({
        success: true,
        data: { binSizes: [] },
        message: 'No suppliers found in this area'
      });
    }

    // 2. Get service area IDs
    const areaIds = serviceAreas.map(sa => sa.id);

    // 3. Get distinct bin sizes with approved admin prices AND available bins from same supplier
    const query = `
      SELECT DISTINCT bs.*
      FROM bin_sizes bs
      INNER JOIN service_area_bins sab ON bs.id = sab.bin_size_id
      INNER JOIN service_areas sa ON sab.service_area_id = sa.id
      INNER JOIN physical_bins pb 
        ON bs.id = pb.bin_size_id 
        AND pb.bin_type_id = $2
        AND pb.supplier_id = sa.supplier_id
      WHERE sab.service_area_id = ANY($1)
        AND sab.bin_type_id = $2
        AND bs.bin_type_id = $2
        AND sab.is_active = true
        AND sab.admin_final_price IS NOT NULL
        AND pb.status = 'available'
        AND bs.is_active = true
      ORDER BY bs.display_order ASC, bs.size ASC
    `;
    const result = await pool.query(query, [areaIds, parseInt(binTypeId)]);

    res.json({
      success: true,
      data: { binSizes: result.rows },
    });
  } catch (error) {
    console.error('Get available bin sizes for location and type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available bin sizes',
      error: error.message,
    });
  }
};

module.exports = {
  getAllBinTypes,
  getBinTypeById,
  createBinType,
  updateBinType,
  deleteBinType,
  getAllBinSizes,
  getBinSizeById,
  createBinSize,
  updateBinSize,
  deleteBinSize,
  getBinPricesByLocation,
  getSupplierBinPrices,
  getSupplierAssignedTypes,
  getSupplierAssignedSizes,
  getAvailableBinTypesForLocation,
  getAvailableBinSizesForLocationAndType,
};
