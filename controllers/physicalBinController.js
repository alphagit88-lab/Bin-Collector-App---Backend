const PhysicalBin = require('../models/PhysicalBin');
const pool = require('../config/database');

// Get all bins (with filters)
exports.getAllBins = async (req, res) => {
  try {
    const filters = {};
    
    // If user is supplier, only show their bins
    if (req.user.role === 'supplier') {
      filters.supplier_id = req.user.id;
    } else if (req.query.supplier_id) {
      filters.supplier_id = parseInt(req.query.supplier_id);
    }
    
    if (req.query.status) filters.status = req.query.status;
    if (req.query.bin_code) filters.bin_code = req.query.bin_code;
    if (req.query.bin_type_id) filters.bin_type_id = parseInt(req.query.bin_type_id);
    if (req.query.bin_size_id) filters.bin_size_id = parseInt(req.query.bin_size_id);

    const bins = await PhysicalBin.findAll(filters);
    res.json({ success: true, bins });
  } catch (error) {
    console.error('Error fetching bins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bins', error: error.message });
  }
};

// Get bin by ID
exports.getBinById = async (req, res) => {
  try {
    const bin = await PhysicalBin.findById(parseInt(req.params.id));
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }
    res.json({ success: true, bin });
  } catch (error) {
    console.error('Error fetching bin:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bin', error: error.message });
  }
};

// Get bin by code
exports.getBinByCode = async (req, res) => {
  try {
    const bin = await PhysicalBin.findByCode(req.params.code);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }
    res.json({ success: true, bin });
  } catch (error) {
    console.error('Error fetching bin:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bin', error: error.message });
  }
};

// Create bin
exports.createBin = async (req, res) => {
  try {
    const { bin_code, bin_type_id, bin_size_id, supplier_id, status, notes } = req.body;

    if (!bin_type_id || !bin_size_id) {
      return res.status(400).json({ success: false, message: 'Bin type and size are required' });
    }

    // If user is supplier, assign bin to themselves
    let finalSupplierId = supplier_id;
    if (req.user.role === 'supplier') {
      finalSupplierId = req.user.id;
    } else if (!finalSupplierId && req.user.role === 'admin') {
      finalSupplierId = null; // Admin can create unassigned bins
    }

    // Generate bin code if not provided
    let finalBinCode = bin_code;
    if (!finalBinCode) {
      finalBinCode = await PhysicalBin.generateBinCode();
    } else {
      // Check if code already exists
      const existing = await PhysicalBin.findByCode(finalBinCode);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bin code already exists' });
      }
    }

    const bin = await PhysicalBin.create({
      bin_code: finalBinCode,
      bin_type_id,
      bin_size_id,
      supplier_id: finalSupplierId,
      status: status || 'available',
      notes
    });

    const fullBin = await PhysicalBin.findById(bin.id);
    res.status(201).json({ success: true, bin: fullBin });
  } catch (error) {
    console.error('Error creating bin:', error);
    res.status(500).json({ success: false, message: 'Failed to create bin', error: error.message });
  }
};

// Update bin
exports.updateBin = async (req, res) => {
  try {
    const binId = parseInt(req.params.id);
    const updates = req.body;

    // Check if bin exists and user has permission
    const existingBin = await PhysicalBin.findById(binId);
    if (!existingBin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    // Suppliers can only update their own bins (and can't change supplier_id)
    if (req.user.role === 'supplier') {
      if (existingBin.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only update your own bins' });
      }
      // Remove supplier_id from updates if supplier is trying to change it
      delete updates.supplier_id;
    }

    const bin = await PhysicalBin.update(binId, updates);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const fullBin = await PhysicalBin.findById(binId);
    res.json({ success: true, bin: fullBin });
  } catch (error) {
    console.error('Error updating bin:', error);
    res.status(500).json({ success: false, message: 'Failed to update bin', error: error.message });
  }
};

// Delete bin
exports.deleteBin = async (req, res) => {
  try {
    const binId = parseInt(req.params.id);
    
    // Check if bin is in use
    const bin = await PhysicalBin.findById(binId);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    if (bin.current_service_request_id) {
      return res.status(400).json({ success: false, message: 'Cannot delete bin that is currently in use' });
    }

    await PhysicalBin.delete(binId);
    res.json({ success: true, message: 'Bin deleted successfully' });
  } catch (error) {
    console.error('Error deleting bin:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bin', error: error.message });
  }
};

// Assign bin to supplier
exports.assignBinToSupplier = async (req, res) => {
  try {
    const binId = parseInt(req.params.id);
    const { supplier_id } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ success: false, message: 'Supplier ID is required' });
    }

    // Verify supplier exists and is a supplier
    const supplierCheck = await pool.query('SELECT id, role FROM users WHERE id = $1 AND role = $2', [supplier_id, 'supplier']);
    if (supplierCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const bin = await PhysicalBin.update(binId, { supplier_id });
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const fullBin = await PhysicalBin.findById(binId);
    res.json({ success: true, bin: fullBin });
  } catch (error) {
    console.error('Error assigning bin:', error);
    res.status(500).json({ success: false, message: 'Failed to assign bin', error: error.message });
  }
};
