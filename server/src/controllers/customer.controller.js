import dbService from "../services/dbService.js";

// @route   GET /api/customers
// @access  Private (Admin, Auditor, Reviewer)
export const getCustomers = async (req, res) => {
  try {
    if (req.user.role === "customer") {
      const customer = req.user.customerId ? await dbService.getCustomerById(req.user.customerId) : null;
      if (customer) {
        customer.siteCount = await dbService.countSitesByCustomer(customer._id || customer.id);
      }
      return res.status(200).json({
        success: true,
        count: customer ? 1 : 0,
        customers: customer ? [customer] : [],
      });
    }

    const { search, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }
    if (search) {
      filter.search = search;
    }

    const customersWithSites = await dbService.getCustomers(filter);

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
    const customer = await dbService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    if (req.user.role === "customer" && customer._id.toString() !== req.user.customerId?.toString()) {
      return res.status(403).json({ message: "Not authorized to access this customer" });
    }

    const sites = await dbService.getSites(customer._id || customer.id);

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

    const existingList = await dbService.getCustomers();
    const existing = existingList.find((c) => c.code?.toUpperCase() === code.toUpperCase().trim());
    if (existing) {
      return res.status(409).json({ message: "Customer code already exists" });
    }

    const customer = await dbService.createCustomer({
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
    const customer = await dbService.updateCustomer(req.params.id, req.body);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

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
    if (req.user.role === "customer" && req.user.customerId?.toString() !== req.params.id) {
      return res.status(403).json({ message: "Not authorized to access these facility sites" });
    }
    const sites = await dbService.getSites(req.params.id);
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

    const customer = await dbService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const site = await dbService.createSite({
      customerId: customer._id || customer.id,
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
