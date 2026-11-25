const crypto = require('crypto');
const pool = require('../config/database');
const ServiceArea = require('../models/ServiceArea');
const ServiceAreaBin = require('../models/ServiceAreaBin');
const BinSize = require('../models/BinSize');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const SupplierAvailability = require('../models/SupplierAvailability');
const { sendPushNotifications } = require('../utils/pushNotification');
const { sendEmailConflict } = require('../utils/emailConflict');
const {
    sendUserCreatedBySupplierEmail,
    sendCustomerInvitationEmail,
    sendCustomerStatusEmail,
    generateTemporaryPassword,
} = require('../utils/emailService');

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

        const trimmedCity = String(city).trim();

        // Avoid duplicate area per supplier
        const existingArea = await ServiceArea.findBySupplierAndCity(supplierId, trimmedCity);
        if (existingArea) {
            return res.status(400).json({
                success: false,
                message: `Service area for '${existingArea.city}' already exists. Duplicated areas are not allowed.`
            });
        }

        const serviceArea = await ServiceArea.create({
            supplierId,
            country: String(country).trim(),
            city: trimmedCity,
            areaRadiusKm: parseInt(areaRadiusKm, 10),
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

        if (!name || !phone || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, email, and password are required'
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

        if (driver.email) {
            sendUserCreatedBySupplierEmail({
                to: driver.email,
                name: driver.name,
                role: 'driver',
                temporaryPassword: password,
            }).catch(error => console.error('Driver welcome email by supplier failed:', error.message));
        }

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
        const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true';
        const search = req.query.search ? req.query.search.trim() : '';

        let query = `
            SELECT u.id, u.name, u.phone, u.email, u.created_at,
                   sc.is_active,
                   sc.accepted_at,
                   (sc.invitation_token IS NOT NULL AND sc.accepted_at IS NULL) AS invitation_pending
            FROM users u
            INNER JOIN supplier_customers sc ON sc.customer_id = u.id
            WHERE sc.supplier_id = $1 AND u.is_deleted = FALSE
        `;

        const values = [supplierId];
        let paramCount = 2;

        if (!includeInactive) {
            query += ` AND sc.is_active = TRUE AND sc.accepted_at IS NOT NULL`;
        }

        if (search) {
            query += ` AND (u.name ILIKE $${paramCount} OR u.phone ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ` ORDER BY u.name ASC`;

        const result = await pool.query(query, values);
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

        // Deactivate relationship — preserves link so customer can be reactivated/reassigned
        await pool.query(
            'UPDATE supplier_customers SET is_active = FALSE WHERE supplier_id = $1 AND customer_id = $2',
            [supplierId, customerId]
        );
        res.json({ success: true, message: 'Customer deactivated from your account' });
    } catch (error) {
        console.error('Error removing customer:', error);
        res.status(500).json({ success: false, message: 'Error removing customer' });
    }
};

const toggleCustomerStatus = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const customerId = parseInt(req.params.id);

        const check = await pool.query(
            `SELECT sc.id, sc.is_active, sc.accepted_at,
                    u.name AS customer_name, u.email AS customer_email,
                    s.name AS supplier_name
             FROM supplier_customers sc
             JOIN users u ON u.id = sc.customer_id
             JOIN users s ON s.id = sc.supplier_id
             WHERE sc.supplier_id = $1 AND sc.customer_id = $2`,
            [supplierId, customerId]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found in your account' });
        }

        const { is_active: currentStatus, accepted_at, customer_name, customer_email, supplier_name } = check.rows[0];

        // Block supplier from activating if customer hasn't accepted the invitation yet
        if (!accepted_at && !currentStatus) {
            return res.status(403).json({
                success: false,
                message: 'Cannot activate this customer until they accept the invitation sent to their email.',
            });
        }

        const newStatus = !currentStatus;

        await pool.query(
            'UPDATE supplier_customers SET is_active = $1 WHERE supplier_id = $2 AND customer_id = $3',
            [newStatus, supplierId, customerId]
        );

        // Send email notification to customer (fire-and-forget)
        if (customer_email) {
            sendCustomerStatusEmail({
                to: customer_email,
                name: customer_name,
                supplierName: supplier_name,
                isActive: newStatus,
            }).catch(err => console.error('Failed to send customer status email:', err));
        }

        res.json({
            success: true,
            message: `Customer ${newStatus ? 'activated' : 'deactivated'} successfully`,
            data: { id: customerId, is_active: newStatus }
        });
    } catch (error) {
        console.error('Error toggling customer status:', error);
        res.status(500).json({ success: false, message: 'Error updating customer status' });
    }
};

const addCustomer = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const { name, phone, email } = req.body;

        const trimmedPhone = phone ? phone.trim() : '';
        const trimmedName = name ? name.trim() : '';
        const trimmedEmail = User.normalizeEmail(email);

        if (!trimmedName || !trimmedPhone || !trimmedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Customer name, mobile number, and valid email are required',
            });
        }

        // Fetch supplier name for the invitation email
        const supplierRow = await pool.query('SELECT name FROM users WHERE id = $1', [supplierId]);
        const supplierName = supplierRow.rows[0]?.name || 'Your supplier';

        const frontendUrl = process.env.FRONTEND_APP_URL || 'https://app.bindrop.ai';

        // 1. Look up by phone and email independently
        let customer = await User.findByPhone(trimmedPhone);
        let isExisting = false;

        const emailOwner = await User.findByEmail(trimmedEmail);

        if (customer && emailOwner && emailOwner.id !== customer.id) {
            // Both found but belong to different users → true conflict
            throw User.emailConflictError();
        }

        // If phone not found but email found → use the email's user
        if (!customer && emailOwner) {
            customer = emailOwner;
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
                'SELECT id, is_active, accepted_at, invitation_token FROM supplier_customers WHERE supplier_id = $1 AND customer_id = $2',
                [supplierId, customer.id]
            );

            if (checkLink.rows.length > 0) {
                const link = checkLink.rows[0];

                if (link.accepted_at !== null && link.is_active === true) {
                    return res.status(400).json({
                        success: false,
                        message: 'This customer is already assigned and active in your account',
                    });
                }

                // Resend invitation: generate new token and re-send email
                const token = crypto.randomBytes(32).toString('hex');
                const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

                await pool.query(
                    'UPDATE supplier_customers SET invitation_token = $1, is_active = FALSE, accepted_at = NULL WHERE supplier_id = $2 AND customer_id = $3',
                    [token, supplierId, customer.id]
                );

                if (customer.email) {
                    sendCustomerInvitationEmail({
                        to: customer.email,
                        name: customer.name,
                        supplierName,
                        acceptUrl,
                    }).catch(err => console.error('Customer invitation email failed:', err.message));
                }

                return res.json({
                    success: true,
                    message: 'Invitation resent to customer',
                    data: {
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email,
                        created_at: customer.created_at || new Date(),
                    },
                });
            }

            // Update email if provided and customer didn't have one
            if (!customer.email && trimmedEmail) {
                customer.email = await User.updateEmailIfAvailable(customer.id, trimmedEmail);
            }

            // Link existing customer — inactive until they accept
            const token = crypto.randomBytes(32).toString('hex');
            const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

            await pool.query(
                'INSERT INTO supplier_customers (supplier_id, customer_id, is_active, invitation_token) VALUES ($1, $2, FALSE, $3) ON CONFLICT (supplier_id, customer_id) DO UPDATE SET invitation_token=$3, is_active=FALSE, accepted_at=NULL',
                [supplierId, customer.id, token]
            );

            if (customer.email) {
                sendCustomerInvitationEmail({
                    to: customer.email,
                    name: customer.name,
                    supplierName,
                    acceptUrl,
                }).catch(err => console.error('Customer invitation email failed:', err.message));
            }
        } else {
            // 2. Create new customer user with temporary password
            const randomPassword = generateTemporaryPassword();
            customer = await User.create({
                name: trimmedName,
                phone: trimmedPhone,
                email: trimmedEmail,
                role: 'customer',
                password: randomPassword,
            });

            // Generate invitation token
            const token = crypto.randomBytes(32).toString('hex');
            const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

            // Link to supplier — inactive until they accept
            await pool.query(
                'INSERT INTO supplier_customers (supplier_id, customer_id, is_active, invitation_token) VALUES ($1, $2, FALSE, $3) ON CONFLICT DO NOTHING',
                [supplierId, customer.id, token]
            );

            if (customer.email) {
                sendUserCreatedBySupplierEmail({
                    to: customer.email,
                    name: customer.name,
                    role: 'customer',
                    temporaryPassword: randomPassword,
                    supplierName,
                    acceptUrl,
                }).catch(error => console.error('Customer welcome email failed:', error.message));
            }
        }

        res.status(201).json({
            success: true,
            message: isExisting
                ? 'Invitation sent to existing customer'
                : 'Customer created and invitation sent',
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

const acceptCustomerInvitation = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ success: false, message: 'Invalid invitation token' });
        }

        const result = await pool.query(
            `SELECT sc.id, sc.accepted_at, sc.is_active,
                    u.name AS customer_name,
                    s.name AS supplier_name
             FROM supplier_customers sc
             JOIN users u ON u.id = sc.customer_id
             JOIN users s ON s.id = sc.supplier_id
             WHERE sc.invitation_token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or already used invitation link' });
        }

        const link = result.rows[0];

        // Idempotent: already accepted (token was cleared but somehow matched — shouldn't happen,
        // but handle gracefully by checking accepted_at via the id lookup below)
        if (link.accepted_at) {
            return res.json({
                success: true,
                alreadyAccepted: true,
                supplierName: link.supplier_name,
                customerName: link.customer_name,
            });
        }

        // Accept: activate, set accepted_at, clear token (one-time use)
        await pool.query(
            `UPDATE supplier_customers
             SET is_active = TRUE, accepted_at = NOW(), invitation_token = NULL
             WHERE id = $1`,
            [link.id]
        );

        return res.json({
            success: true,
            alreadyAccepted: false,
            supplierName: link.supplier_name,
            customerName: link.customer_name,
        });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        res.status(500).json({ success: false, message: 'Error processing invitation' });
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
    removeCustomer,
    toggleCustomerStatus,
    acceptCustomerInvitation,
};
