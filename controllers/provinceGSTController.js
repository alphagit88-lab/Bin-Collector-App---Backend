const ProvinceGST = require('../models/ProvinceGST');

const getAllProvinceGST = async (req, res) => {
  try {
    const provinceGST = await ProvinceGST.findAll();
    res.json({
      success: true,
      data: { provinceGST },
    });
  } catch (error) {
    console.error('Get province GST error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching province GST rates',
      error: error.message,
    });
  }
};

const getProvinceGSTByCode = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const provinceGST = await ProvinceGST.findByProvinceCode(provinceCode);
    
    if (!provinceGST) {
      return res.status(404).json({
        success: false,
        message: 'Province not found',
      });
    }

    res.json({
      success: true,
      data: { provinceGST },
    });
  } catch (error) {
    console.error('Get province GST error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching province GST rate',
      error: error.message,
    });
  }
};

const updateProvinceGST = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const { gstRate } = req.body;

    if (gstRate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'gstRate is required',
      });
    }

    const provinceGST = await ProvinceGST.updateByProvinceCode(provinceCode, { gstRate });
    
    if (!provinceGST) {
      return res.status(404).json({
        success: false,
        message: 'Province not found',
      });
    }

    res.json({
      success: true,
      message: 'Province GST updated successfully',
      data: { provinceGST },
    });
  } catch (error) {
    console.error('Update province GST error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating province GST rate',
      error: error.message,
    });
  }
};

const createProvinceGST = async (req, res) => {
  try {
    const { provinceCode, provinceName, gstRate } = req.body;

    if (!provinceCode || !provinceName || gstRate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'provinceCode, provinceName, and gstRate are required',
      });
    }

    const provinceGST = await ProvinceGST.create({ provinceCode, provinceName, gstRate });
    
    res.status(201).json({
      success: true,
      message: 'Province GST created successfully',
      data: { provinceGST },
    });
  } catch (error) {
    console.error('Create province GST error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Province with this code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating province GST',
      error: error.message,
    });
  }
};

const deleteProvinceGST = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const provinceGST = await ProvinceGST.delete(provinceCode);
    
    if (!provinceGST) {
      return res.status(404).json({
        success: false,
        message: 'Province not found',
      });
    }

    res.json({
      success: true,
      message: 'Province GST deleted successfully',
    });
  } catch (error) {
    console.error('Delete province GST error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting province GST',
      error: error.message,
    });
  }
};

module.exports = {
  getAllProvinceGST,
  getProvinceGSTByCode,
  updateProvinceGST,
  createProvinceGST,
  deleteProvinceGST,
};
