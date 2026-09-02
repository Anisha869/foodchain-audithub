import Customer from "../models/Customer.js";
import Site from "../models/Site.js";

// @route   GET /api/customers
// @access  Private (Admin, Auditor, Reviewer)
export const getCustomers = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    
    // Attach site counts
    const customersWithSites = await Promise.all(
      customers.map(async (cust) => {
        const siteCount = await Site.countDocuments({ customerId: cust._id });
        return {
          ...cust.toObject(),
          siteCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithSites.length,
      customers: customersWithSites,
    });
  } catch (error) {
    console.error("Get customers error:", error.message);
    res.status(500).json({ message: "Server error while fetching customers" });
  }
};

// @route   GET /api/customers/:id
// @access  Private (Admin, Auditor, Reviewer, Customer)
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const sites = await Site.find({ customerId: customer._id });

    res.status(200).json({
      success: true,
      customer,
      sites,
    });
  } catch (error) {
    console.error("Get customer by id error:", error.message);
    res.status(500).json({ message: "Server error while fetching customer details" });
  }
};

// @route   POST /api/customers
// @access  Private (Admin)
export const createCustomer = async (req, res) => {
  try {
    const { companyName, code, contactPerson, email, phone, address, industryCategory } = req.body;

    if (!companyName || !code || !contactPerson || !email) {
      return res.status(400).json({ message: "Company name, code, contact person, and email are required" });
    }

    const existing = await Customer.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Customer code already exists" });
    }

    const customer = await Customer.create({
      companyName,
      code: code.toUpperCase().trim(),
      contactPerson,
      email: email.toLowerCase().trim(),
      phone,
      address,
      industryCategory: industryCategory || "Food Processing & Logistics",
      isActive: true,
    });

    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error.message);
    res.status(500).json({ message: "Server error while creating customer" });
  }
};

// @route   PUT /api/customers/:id
// @access  Private (Admin)
export const updateCustomer = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, address, industryCategory, isActive } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (companyName) customer.companyName = companyName;
    if (contactPerson) customer.contactPerson = contactPerson;
    if (email) customer.email = email.toLowerCase().trim();
    if (phone !== undefined) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    if (industryCategory) customer.industryCategory = industryCategory;
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error.message);
    res.status(500).json({ message: "Server error while updating customer" });
  }
};

// @route   GET /api/customers/:id/sites
// @access  Private
export const getCustomerSites = async (req, res) => {
  try {
    const sites = await Site.find({ customerId: req.params.id });
    res.status(200).json({ success: true, sites });
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer sites" });
  }
};

// @route   POST /api/customers/:id/sites
// @access  Private (Admin)
export const createCustomerSite = async (req, res) => {
  try {
    const { siteName, siteCode, address, city, state, contactPerson, contactPhone } = req.body;

    if (!siteName || !siteCode || !address) {
      return res.status(400).json({ message: "Site name, code, and address are required" });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const site = await Site.create({
      customerId: customer._id,
      siteName,
      siteCode: siteCode.toUpperCase().trim(),
      address,
      city,
      state,
      contactPerson,
      contactPhone,
      isActive: true,
    });

    res.status(201).json({
      message: "Facility site created successfully",
      site,
    });
  } catch (error) {
    console.error("Create site error:", error.message);
    res.status(500).json({ message: "Server error while creating facility site" });
  }
};
