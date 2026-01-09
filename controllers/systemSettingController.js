const SystemSetting = require('../models/SystemSetting');

const getAllSettings = async (req, res) => {
  try {
    const category = req.query.category || null;
    const includePublic = req.query.includePublic === 'true';
    const settings = await SystemSetting.findAll(category, includePublic);
    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message,
    });
  }
};

const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findByKey(key);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }

    res.json({
      success: true,
      data: { setting },
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching setting',
      error: error.message,
    });
  }
};

const createSetting = async (req, res) => {
  try {
    const { key, value, type, description, category, is_public } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'key and value are required',
      });
    }

    const setting = await SystemSetting.create({ 
      key, 
      value: String(value), 
      type: type || 'string', 
      description, 
      category: category || 'general',
      is_public: is_public || false
    });
    
    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: { setting },
    });
  } catch (error) {
    console.error('Create setting error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Setting with this key already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating setting',
      error: error.message,
    });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category, is_public } = req.body;

    // Convert value to string if provided
    const updateData = {};
    if (value !== undefined) updateData.value = String(value);
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (is_public !== undefined) updateData.is_public = is_public;

    const setting = await SystemSetting.update(key, updateData);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: { setting },
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting',
      error: error.message,
    });
  }
};

const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.delete(key);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }

    res.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting setting',
      error: error.message,
    });
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};
