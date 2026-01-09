const BinType = require('../models/BinType');
const BinSize = require('../models/BinSize');

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
    const { size, capacity_cubic_meters, is_active, display_order } = req.body;

    const binSize = await BinSize.update(id, { size, capacity_cubic_meters, is_active, display_order });
    
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
};
