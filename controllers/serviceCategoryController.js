const ServiceCategory = require('../models/ServiceCategory');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.findAll(req.query);
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service categories',
      error: error.message
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    const category = await ServiceCategory.create({ name, description });
    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.update(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.json({
      success: true,
      message: 'Service category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await ServiceCategory.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.json({
      success: true,
      message: 'Service category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};
