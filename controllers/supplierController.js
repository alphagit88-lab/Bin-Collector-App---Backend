const SupplierAvailability = require('../models/SupplierAvailability');
const ServiceArea = require('../models/ServiceArea');

const getAvailability = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const availability = await SupplierAvailability.findBySupplierId(supplierId);

        // If no availability data exists, return empty array (frontend can default)
        // or we could return a default schedule here.

        res.json({
            success: true,
            data: { availability },
        });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching availability',
            error: error.message,
        });
    }
};

const updateAvailability = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { schedule } = req.body; // Expecting an array of day objects

        if (!Array.isArray(schedule)) {
            return res.status(400).json({
                success: false,
                message: 'Schedule must be an array',
            });
        }

        const updatedSchedule = await SupplierAvailability.bulkUpdate(supplierId, schedule);

        res.json({
            success: true,
            data: { schedule: updatedSchedule },
            message: 'Availability updated successfully',
        });
    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating availability',
            error: error.message,
        });
    }
};

const getServiceAreas = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const serviceAreas = await ServiceArea.findBySupplierId(supplierId);

        res.json({
            success: true,
            data: { serviceAreas },
        });
    } catch (error) {
        console.error('Get service areas error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service areas',
            error: error.message,
        });
    }
};

const createServiceArea = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { country, city, areaRadiusKm, latitude, longitude } = req.body;

        if (!country || !city || !areaRadiusKm) {
            return res.status(400).json({
                success: false,
                message: 'Country, city, and radius are required'
            });
        }

        const serviceArea = await ServiceArea.create({
            supplierId,
            country,
            city,
            areaRadiusKm: parseInt(areaRadiusKm),
            latitude,
            longitude
        });

        res.json({
            success: true,
            data: { serviceArea },
            message: 'Service area added successfully',
        });
    } catch (error) {
        console.error('Create service area error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service area',
            error: error.message,
        });
    }
};

const deleteServiceArea = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { id } = req.params;

        const deleted = await ServiceArea.delete(id, supplierId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Service area not found or not authorized'
            });
        }

        res.json({
            success: true,
            message: 'Service area deleted successfully'
        });
    } catch (error) {
        console.error('Delete service area error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting service area',
            error: error.message
        });
    }
}

module.exports = {
    getAvailability,
    updateAvailability,
    getServiceAreas,
    createServiceArea,
    deleteServiceArea
};
