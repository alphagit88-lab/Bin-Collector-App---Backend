const ServiceArea = require('../models/ServiceArea');
const ServiceAreaBin = require('../models/ServiceAreaBin');
const BinSize = require('../models/BinSize');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const { sendPushNotifications } = require('../utils/pushNotification');

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

        const result = await ServiceArea.delete(id, supplierId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Service area not found or unauthorized'
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
};

const getDrivers = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const drivers = await User.findBySupplierId(supplierId);
        res.json({
            success: true,
            data: { drivers }
        });
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching drivers',
            error: error.message
        });
    }
};

const addDriver = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { name, phone, email, password } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByPhone(phone);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this phone number already exists'
            });
        }

        const driver = await User.create({
            name,
            phone,
            email,
            password,
            role: 'driver',
            supplierId
        });

        res.status(201).json({
            success: true,
            data: { driver },
            message: 'Driver added successfully'
        });
    } catch (error) {
        console.error('Add driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding driver',
            error: error.message
        });
    }
};

const assignDriver = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { requestId, driverId } = req.body;

        if (!requestId || !driverId) {
            return res.status(400).json({
                success: false,
                message: 'Request ID and Driver ID are required'
            });
        }

        // Verify driver belongs to this supplier
        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'driver' || parseInt(driver.supplierId) !== supplierId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Driver does not belong to you'
            });
        }

        // Verify booking belongs to this supplier
        const booking = await ServiceRequest.findById(requestId);
        if (!booking || parseInt(booking.supplier_id) !== supplierId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Booking does not belong to you'
            });
        }

        const updatedBooking = await ServiceRequest.assignDriver(requestId, driverId);

        // Send notification to driver
        if (driver.pushToken) {
            try {
                await sendPushNotifications(
                    driver.pushToken,
                    'New Job Assigned',
                    `You have been assigned to a new job: ${booking.request_id}`,
                    {
                        type: 'NEW_JOB_ASSIGNED',
                        requestId: booking.id,
                        orderId: booking.request_id
                    }
                );
            } catch (notifError) {
                console.error('Error sending notification to driver:', notifError);
            }
        }

        res.json({
            success: true,
            data: { booking: updatedBooking },
            message: 'Driver assigned successfully'
        });
    } catch (error) {
        console.error('Assign driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning driver',
            error: error.message
        });
    }
};

const getBinSizes = async (req, res) => {
    try {
        const binSizes = await BinSize.findAll();
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

const getServiceAreaBins = async (req, res) => {
    try {
        const { id } = req.params; // service_area_id
        const bins = await ServiceAreaBin.findByServiceArea(id);
        res.json({
            success: true,
            data: { bins },
        });
    } catch (error) {
        console.error('Get service area bins error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service area bins',
            error: error.message,
        });
    }
};

const updateServiceAreaBinPrice = async (req, res) => {
    try {
        const { serviceAreaId, binSizeId, binTypeId, supplierPrice } = req.body;

        if (!serviceAreaId || (!binSizeId && !binTypeId) || !supplierPrice) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const bin = await ServiceAreaBin.create({
            service_area_id: serviceAreaId,
            bin_size_id: binSizeId || null,
            bin_type_id: binTypeId || null,
            supplier_price: parseFloat(supplierPrice)
        });

        res.json({
            success: true,
            data: { bin },
            message: 'Bin price updated successfully. It will be active after admin approval.',
        });
    } catch (error) {
        console.error('Update service area bin price error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating bin price',
            error: error.message,
        });
    }
};

module.exports = {
    getAvailability,
    updateAvailability,
    getServiceAreas,
    createServiceArea,
    deleteServiceArea,
    getBinSizes,
    getServiceAreaBins,
    updateServiceAreaBinPrice,
    getDrivers,
    addDriver,
    assignDriver
};
