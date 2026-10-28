const pool = require('../config/database');
const ServiceArea = require('../models/ServiceArea');
const ServiceAreaBin = require('../models/ServiceAreaBin');
const BinSize = require('../models/BinSize');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const SupplierAvailability = require('../models/SupplierAvailability');
const { sendPushNotifications } = require('../utils/pushNotification');
const { sendEmailConflict } = require('../utils/emailConflict');

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

        await User.assertEmailAvailable(email);

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
        if (sendEmailConflict(res, error)) return;
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

const getCustomers = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const result = await pool.query(
            `SELECT u.id, u.name, u.phone, u.email, u.created_at
             FROM users u
             INNER JOIN supplier_customers sc ON sc.customer_id = u.id
             WHERE sc.supplier_id = $1 AND u.is_deleted = FALSE
             ORDER BY u.name ASC`,
            [supplierId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Error fetching customers' });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const customerId = parseInt(req.params.id);
        const { name, email } = req.body;

        const check = await pool.query(
            'SELECT id FROM supplier_customers WHERE supplier_id = $1 AND customer_id = $2',
            [supplierId, customerId]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You can only edit your own customers' });
        }

        const updatedCustomer = await User.update(customerId, { name, email });
        res.json({ success: true, data: updatedCustomer });
    } catch (error) {
        if (sendEmailConflict(res, error)) return;
        console.error('Error updating customer:', error);
        res.status(500).json({ success: false, message: 'Error updating customer' });
    }
};

const removeCustomer = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const customerId = parseInt(req.params.id);

        const check = await pool.query(
            'SELECT id FROM supplier_customers WHERE supplier_id = $1 AND customer_id = $2',
            [supplierId, customerId]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You can only remove your own customers' });
        }

        // Delete only the pivot row — preserves user account and order history
        await pool.query(
            'DELETE FROM supplier_customers WHERE supplier_id = $1 AND customer_id = $2',
            [supplierId, customerId]
        );
        res.json({ success: true, message: 'Customer removed from your account' });
    } catch (error) {
        console.error('Error removing customer:', error);
        res.status(500).json({ success: false, message: 'Error removing customer' });
    }
};

const addCustomer = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { name, phone, email } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Customer name and mobile number are required',
            });
        }

        const trimmedPhone = phone.trim();
        const trimmedName = name.trim();
        const trimmedEmail = User.normalizeEmail(email);

        // 1. Check if user already exists with this phone
        let customer = await User.findByPhone(trimmedPhone);
        let isExisting = false;

        if (trimmedEmail) {
            const emailOwner = await User.findByEmail(trimmedEmail);
            if (emailOwner && (!customer || emailOwner.id !== customer.id)) {
                throw User.emailConflictError();
            }
        }

        // Block if phone belongs to a soft-deleted account
        if (!customer) {
            const deletedCheck = await pool.query(
                'SELECT id FROM users WHERE phone = $1 AND is_deleted = TRUE LIMIT 1',
                [trimmedPhone]
            );
            if (deletedCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This mobile number was rejected',
                });
            }
        }

        if (customer) {
            // Security: only allow assigning actual customers, not suppliers/admins/drivers
            if (customer.role !== 'customer') {
                return res.status(400).json({
                    success: false,
                    message: 'This mobile number cannot be added',
                });
            }

            isExisting = true;
            // Check if already linked to this supplier
            const checkLink = await pool.query(
                'SELECT id FROM supplier_customers WHERE supplier_id = $1 AND customer_id = $2',
                [supplierId, customer.id]
            );

            if (checkLink.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This customer is already assigned to your account',
                });
            }

            // Link existing customer to this supplier
            await pool.query(
                'INSERT INTO supplier_customers (supplier_id, customer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [supplierId, customer.id]
            );

            // Update email if provided and customer didn't have one
            if (!customer.email && trimmedEmail) {
                customer.email = await User.updateEmailIfAvailable(customer.id, trimmedEmail);
            }
        } else {
            // 2. Create new customer user with random password
            const randomPassword = Math.random().toString(36).slice(-8);
            customer = await User.create({
                name: trimmedName,
                phone: trimmedPhone,
                email: trimmedEmail,
                role: 'customer',
                password: randomPassword,
            });

            // Link to supplier
            await pool.query(
                'INSERT INTO supplier_customers (supplier_id, customer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [supplierId, customer.id]
            );
        }

        res.status(201).json({
            success: true,
            message: isExisting
                ? 'Existing customer assigned to your account successfully'
                : 'Customer created and added to your account successfully',
            data: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                created_at: customer.created_at || new Date(),
            },
        });
    } catch (error) {
        if (sendEmailConflict(res, error)) return;
        console.error('Error adding/assigning customer:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding customer to account',
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
    assignDriver,
    getCustomers,
    addCustomer,
    updateCustomer,
    removeCustomer
};
