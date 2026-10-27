import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase.js";

const uuidv4 = randomUUID;

export let isRemoteTablesReady = false;
export const setRemoteTablesReady = (ready) => {
  isRemoteTablesReady = !!ready;
};

// Helper to wrap a user record with Mongoose-compatible helper methods
export const wrapUser = (row) => {
  if (!row) return null;
  const user = {
    _id: row.id || row._id,
    id: row.id || row._id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    phone: row.phone || "",
    isActive: row.is_active ?? row.isActive ?? true,
    approvalStatus: row.approval_status || row.approvalStatus || "approved",
    lastLoginAt: row.last_login_at || row.lastLoginAt || null,
    customerId: row.customer_id || row.customerId || null,
    specialization: row.specialization || "",
    certifications: Array.isArray(row.certifications)
      ? row.certifications
      : (typeof row.certifications === "string" ? [row.certifications] : []),
    experienceYears: row.experience_years ?? row.experienceYears ?? 0,
    qualification: row.qualification || "",
    auditorIdCode: row.auditor_id_code || row.auditorIdCode || "",
    address: row.address || "",
    bio: row.bio || "",
    createdAt: row.created_at || row.createdAt || new Date(),
    updatedAt: row.updated_at || row.updatedAt || new Date(),
  };

  user.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  };

  user.toSafeObject = function () {
    const safe = {
      id: this.id || this._id,
      _id: this._id || this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      isActive: this.isActive,
      approvalStatus: this.approvalStatus,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
    };
    if (this.customerId) safe.customerId = this.customerId;
    if (this.specialization) safe.specialization = this.specialization;
    if (this.certifications) safe.certifications = this.certifications;
    if (this.experienceYears !== undefined) safe.experienceYears = this.experienceYears;
    if (this.qualification) safe.qualification = this.qualification;
    if (this.auditorIdCode) safe.auditorIdCode = this.auditorIdCode;
    if (this.address) safe.address = this.address;
    if (this.bio) safe.bio = this.bio;
    return safe;
  };

  user.save = async function () {
    return await dbService.updateUser(this._id, this);
  };

  return user;
};

// In-Memory store with default seed records for instant responses
const inMemoryStore = {
  users: [],
  customers: [],
  sites: [],
  checklists: [],
  audits: [],
  findings: [],
};

let hasInitializedSeeds = false;

export const seedInitialData = async () => {
  if (hasInitializedSeeds) return;
  hasInitializedSeeds = true;

  const defaultPasswordHash = await bcrypt.hash("Admin@12345", 10);
  const auditorPasswordHash = await bcrypt.hash("Auditor@123", 10);
  const reviewerPasswordHash = await bcrypt.hash("Reviewer@123", 10);
  const plannerPasswordHash = await bcrypt.hash("Planner@123", 10);
  const customerPasswordHash = await bcrypt.hash("Customer@123", 10);

  const customerId = "a1b2c3d4-0001-4000-8000-000000000001";
  const siteId = "a1b2c3d4-0002-4000-8000-000000000001";
  const auditorId = "b1b2c3d4-0003-4000-8000-000000000003";
  const checklistId = "c1b2c3d4-0001-4000-8000-000000000001";

  // Initial Customer
  inMemoryStore.customers.push({
    id: customerId,
    _id: customerId,
    company_name: "FoodChain Quality Processing Client",
    companyName: "FoodChain Quality Processing Client",
    code: "FC-QP01",
    contact_person: "Quality Assurance Desk",
    contactPerson: "Quality Assurance Desk",
    email: "client@foodchainaudithub.com",
    phone: "+1 555-0199",
    address: "100 Quality Processing Way, Industrial Zone",
    industry_category: "Food Processing & Logistics",
    industryCategory: "Food Processing & Logistics",
    is_active: true,
    isActive: true,
    created_at: new Date(),
    createdAt: new Date(),
  });

  // Initial Site
  inMemoryStore.sites.push({
    id: siteId,
    _id: siteId,
    customer_id: customerId,
    customerId: customerId,
    site_name: "Central Processing Facility",
    siteName: "Central Processing Facility",
    site_code: "CPP-01",
    siteCode: "CPP-01",
    address: "100 Quality Processing Way, Block B",
    city: "Metropolis",
    state: "State HQ",
    contact_person: "Site Operations Manager",
    contactPerson: "Site Operations Manager",
    contact_phone: "+1 555-0188",
    contactPhone: "+1 555-0188",
    is_active: true,
    isActive: true,
    created_at: new Date(),
    createdAt: new Date(),
  });

  // Initial Users
  const seedUsers = [
    {
      id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "System Administrator",
      email: "admin@foodchainaudithub.com",
      password: defaultPasswordHash,
      role: "admin",
      phone: "+1 555-0100",
      is_active: true,
    },
    {
      id: "b1b2c3d4-0002-4000-8000-000000000002",
      name: "Audit Planner",
      email: "planner@foodchainaudithub.com",
      password: plannerPasswordHash,
      role: "planner",
      phone: "+1 555-0101",
      is_active: true,
    },
    {
      id: auditorId,
      name: "Field Compliance Auditor",
      email: "auditor@foodchainaudithub.com",
      password: auditorPasswordHash,
      role: "auditor",
      phone: "+1 555-0102",
      is_active: true,
      specialization: "FSSAI, ISO 22000, HACCP",
      certifications: ["Lead Auditor ISO 22000", "FSSAI Certified Master Trainer"],
      experience_years: 6,
      qualification: "M.Sc Food Safety & Technology",
      auditor_id_code: "AUD-REG-8821",
      address: "North Zone Quality Desk",
      bio: "Certified lead compliance auditor with 6+ years experience in second-party food safety inspections.",
    },
    {
      id: "b1b2c3d4-0004-4000-8000-000000000004",
      name: "Technical Reviewer",
      email: "reviewer@foodchainaudithub.com",
      password: reviewerPasswordHash,
      role: "reviewer",
      phone: "+1 555-0103",
      is_active: true,
    },
    {
      id: "b1b2c3d4-0005-4000-8000-000000000005",
      name: "Facility Quality Customer",
      email: "customer@foodchainaudithub.com",
      password: customerPasswordHash,
      role: "customer",
      phone: "+1 555-0104",
      is_active: true,
      customer_id: customerId,
    },
  ];

  for (const u of seedUsers) {
    inMemoryStore.users.push({
      ...u,
      _id: u.id,
      isActive: u.is_active,
      customerId: u.customer_id,
      experienceYears: u.experience_years,
      auditorIdCode: u.auditor_id_code,
      created_at: new Date(),
      createdAt: new Date(),
    });
  }

  // Initial Master Checklist
  inMemoryStore.checklists.push({
    id: checklistId,
    _id: checklistId,
    name: "FSSAI Food Hygiene & Safety Master Checklist",
    standard: "FSSAI",
    description: "Standard Food Safety Audit checklist covering hygiene, temperature, storage, and pest control.",
    file_name: "fssai_master_checklist_2026.xlsx",
    fileName: "fssai_master_checklist_2026.xlsx",
    file_size: 18420,
    fileSize: 18420,
    items: [
      { question: "Are food handlers wearing clean protective gear, aprons, and hairnets?", category: "Personal Hygiene", maxScore: 10 },
      { question: "Is potability test certificate available for all processing water sources?", category: "Water Quality", maxScore: 10 },
      { question: "Are cold storage rooms maintained at or below 4°C with calibrated loggers?", category: "Temperature Control", maxScore: 10 },
      { question: "Is raw meat and poultry segregated from ready-to-eat products?", category: "Cross-Contamination", maxScore: 10 },
      { question: "Are chemical sanitizers and cleaning agents stored in labeled separate cabinets?", category: "Chemical Safety", maxScore: 10 },
      { question: "Are air curtains and insect light traps operational at all facility entrances?", category: "Pest Elimination", maxScore: 10 },
      { question: "Is FIFO (First In First Out) inventory management strictly enforced for ingredients?", category: "Storage & Stock", maxScore: 10 },
      { question: "Are food contact surfaces sanitized before and after each production shift?", category: "Sanitation & Cleaning", maxScore: 10 },
      { question: "Are daily CCP (Critical Control Point) monitoring logs signed by QA manager?", category: "Documentation & HACCP", maxScore: 10 },
      { question: "Are waste disposal bins covered, foot-operated, and emptied at required intervals?", category: "Waste Management", maxScore: 10 }
    ],
    customer_id: customerId,
    customerId,
    is_active: true,
    isActive: true,
    created_at: new Date(),
    createdAt: new Date(),
  });

  // Initial Sample Audit
  inMemoryStore.audits.push({
    id: "d1b2c3d4-0001-4000-8000-000000000001",
    _id: "d1b2c3d4-0001-4000-8000-000000000001",
    audit_ref: "FSSA-1001",
    auditRef: "FSSA-1001",
    customer_id: customerId,
    customerId: customerId,
    site_id: siteId,
    siteId: siteId,
    auditor_id: auditorId,
    auditorId: auditorId,
    checklist_id: checklistId,
    checklistId: checklistId,
    standard: "FSSAI",
    scheduled_date: new Date(),
    scheduledDate: new Date(),
    status: "SCHEDULED",
    score: null,
    answers: [],
    reviewer_comments: "",
    reviewerComments: "",
    notes: "Initial scheduled second-party hygiene audit.",
    created_at: new Date(),
    createdAt: new Date(),
  });

  };

export const dbService = {
  // ─── USER / AUTH ────────────────────────────────────────────────────────
  async findUserByEmail(email) {
    const cleanEmail = email.toLowerCase().trim();
    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (error) throw new Error(`Supabase request failed: ${error.message}`);

        if (!error && data) {
          return wrapUser(data);
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    // In-memory fallback
    const mem = inMemoryStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    return mem ? wrapUser(mem) : null;
  },

  async findUserById(id) {
    if (!id) return null;
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", strId)
          .maybeSingle();

        if (error) throw new Error(`Supabase request failed: ${error.message}`);

        if (!error && data) {
          return wrapUser(data);
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const mem = inMemoryStore.users.find((u) => u.id === strId || u._id === strId);
    return mem ? wrapUser(mem) : null;
  },

  async findUserByIdAndRole(id, role) {
    const user = await this.findUserById(id);
    if (user && user.role === role) return user;
    return null;
  },

  async createUser(userData) {
    const id = userData.id || userData._id || uuidv4();
    const hashedPassword = userData.password.startsWith("$2a$")
      ? userData.password
      : await bcrypt.hash(userData.password, 10);

    const row = {
      id,
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: userData.role,
      phone: userData.phone || "",
      is_active: userData.isActive ?? userData.is_active ?? true,
      approval_status: userData.approvalStatus || userData.approval_status || "approved",
      customer_id: userData.customerId || userData.customer_id || null,
      specialization: userData.specialization || "",
      certifications: userData.certifications || [],
      experience_years: Number(userData.experienceYears || userData.experience_years) || 0,
      qualification: userData.qualification || "",
      auditor_id_code: userData.auditorIdCode || userData.auditor_id_code || "",
      address: userData.address || "",
      bio: userData.bio || "",
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase.from("users").insert(row).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && data) {
          inMemoryStore.users.push(data);
          return wrapUser(data);
        }
        throw new Error("Supabase did not return the created user.");
      } catch (e) { throw e; }
    }

    inMemoryStore.users.push(row);
    return wrapUser(row);
  },

  async bootstrapFirstAdmin(userData) {
    if (!isRemoteTablesReady || !supabase) {
      throw new Error("Administrator bootstrap requires a ready Supabase database.");
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const { data, error } = await supabase.rpc("bootstrap_first_admin", {
      p_name: userData.name,
      p_email: userData.email.toLowerCase().trim(),
      p_password: passwordHash,
      p_phone: userData.phone || "",
    });

    if (error) {
      const bootstrapError = new Error(`Supabase administrator bootstrap failed: ${error.message}`);
      bootstrapError.code = error.code;
      throw bootstrapError;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("Supabase did not return the bootstrapped administrator.");
    }
    return wrapUser(row);
  },

  async updateUser(id, updates) {
    const strId = id.toString();
    const rowUpdates = {
      updated_at: new Date(),
    };
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.role !== undefined) rowUpdates.role = updates.role;
    if (updates.password !== undefined) rowUpdates.password = updates.password;
    if (updates.phone !== undefined) rowUpdates.phone = updates.phone;
    if (updates.specialization !== undefined) rowUpdates.specialization = updates.specialization;
    if (updates.certifications !== undefined) rowUpdates.certifications = updates.certifications;
    if (updates.experienceYears !== undefined) rowUpdates.experience_years = Number(updates.experienceYears);
    if (updates.qualification !== undefined) rowUpdates.qualification = updates.qualification;
    if (updates.auditorIdCode !== undefined) rowUpdates.auditor_id_code = updates.auditorIdCode;
    if (updates.address !== undefined) rowUpdates.address = updates.address;
    if (updates.bio !== undefined) rowUpdates.bio = updates.bio;
    if (updates.isActive !== undefined) rowUpdates.is_active = updates.isActive;
    if (updates.approvalStatus !== undefined) rowUpdates.approval_status = updates.approvalStatus;
    if (updates.lastLoginAt !== undefined) rowUpdates.last_login_at = updates.lastLoginAt;
    if (updates.customerId !== undefined) rowUpdates.customer_id = updates.customerId;

    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase
          .from("users")
          .update(rowUpdates)
          .eq("id", strId)
          .select()
          .maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && data) {
          const idx = inMemoryStore.users.findIndex((u) => u.id === strId);
          if (idx !== -1) inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...data };
          return wrapUser(data);
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const idx = inMemoryStore.users.findIndex((u) => u.id === strId || u._id === strId);
    if (idx !== -1) {
      inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...rowUpdates, ...updates };
      return wrapUser(inMemoryStore.users[idx]);
    }
    return null;
  },

  async deleteUser(id) {
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { error } = await supabase.from("users").delete().eq("id", strId);
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== strId && u._id !== strId);
        return true;
      } catch (e) { throw e; }
    }
    inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== strId && u._id !== strId);
    return true;
  },

  async getUsers(filter = {}) {
    if (isRemoteTablesReady) {
      try {
        let query = supabase.from("users").select("*");
        if (filter.role && filter.role !== "ALL") query = query.eq("role", filter.role);
        if (filter.isActive !== undefined) query = query.eq("is_active", filter.isActive);
        if (filter.approvalStatus) query = query.eq("approval_status", filter.approvalStatus);
        const { data, error } = await query;
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && Array.isArray(data)) {
          let result = data.map(wrapUser);
          if (filter.search) {
            const s = filter.search.toLowerCase();
            result = result.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
          }
          return result;
        }
      } catch (e) { throw e; }
    }

    let list = inMemoryStore.users.map(wrapUser);
    if (filter.role && filter.role !== "ALL") list = list.filter((u) => u.role === filter.role);
    if (filter.isActive !== undefined) list = list.filter((u) => u.isActive === filter.isActive);
    if (filter.approvalStatus) list = list.filter((u) => u.approvalStatus === filter.approvalStatus);
    if (filter.search) {
      const s = filter.search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return list;
  },

  // ─── CUSTOMERS ──────────────────────────────────────────────────────────
  async getCustomers(filter = {}) {
    let list = [];
    if (isRemoteTablesReady) {
      try {
        let query = supabase.from("customers").select("*");
        if (filter.isActive !== undefined) query = query.eq("is_active", filter.isActive);
        const { data, error } = await query;
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && Array.isArray(data)) {
          list = data.map((c) => ({
            ...c,
            _id: c.id,
            companyName: c.company_name,
            contactPerson: c.contact_person,
            industryCategory: c.industry_category,
            isActive: c.is_active,
            createdAt: c.created_at,
          }));
        }
      } catch (e) { throw e; }
    }

    if (!isRemoteTablesReady) {
      list = inMemoryStore.customers.map((c) => ({
        ...c,
        _id: c.id,
        companyName: c.company_name || c.companyName,
        contactPerson: c.contact_person || c.contactPerson,
        industryCategory: c.industry_category || c.industryCategory,
        isActive: c.is_active ?? c.isActive ?? true,
        createdAt: c.created_at || c.createdAt,
      }));
    }

    if (filter.search) {
      const s = filter.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(s) ||
          c.code?.toLowerCase().includes(s) ||
          c.contactPerson?.toLowerCase().includes(s)
      );
    }

    for (const c of list) {
      c.siteCount = await this.countSitesByCustomer(c.id);
    }
    return list;
  },

  async getCustomerById(id) {
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase.from("customers").select("*").eq("id", strId).maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && data) {
          return {
            ...data,
            _id: data.id,
            companyName: data.company_name,
            contactPerson: data.contact_person,
            industryCategory: data.industry_category,
            isActive: data.is_active,
          };
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const mem = inMemoryStore.customers.find((c) => c.id === strId || c._id === strId);
    if (mem) {
      return {
        ...mem,
        _id: mem.id,
        companyName: mem.company_name || mem.companyName,
        contactPerson: mem.contact_person || mem.contactPerson,
        industryCategory: mem.industry_category || mem.industryCategory,
        isActive: mem.is_active ?? mem.isActive ?? true,
      };
    }
    return null;
  },

  async createCustomer(data) {
    const id = uuidv4();
    const row = {
      id,
      company_name: data.companyName,
      code: data.code.toUpperCase().trim(),
      contact_person: data.contactPerson,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || "",
      address: data.address || "",
      industry_category: data.industryCategory || "Food Processing & Logistics",
      is_active: data.isActive ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isRemoteTablesReady) {
      try {
        const { data: created, error } = await supabase.from("customers").insert(row).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && created) {
          inMemoryStore.customers.push(created);
          return { ...created, _id: created.id, companyName: created.company_name, contactPerson: created.contact_person };
        }
        throw new Error("Supabase did not return the created customer.");
      } catch (e) { throw e; }
    }

    inMemoryStore.customers.push(row);
    return { ...row, _id: row.id, companyName: row.company_name, contactPerson: row.contact_person };
  },

  async updateCustomer(id, data) {
    const strId = id.toString();
    const rowUpdates = {
      updated_at: new Date(),
    };
    if (data.companyName) rowUpdates.company_name = data.companyName;
    if (data.contactPerson) rowUpdates.contact_person = data.contactPerson;
    if (data.email) rowUpdates.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) rowUpdates.phone = data.phone;
    if (data.address !== undefined) rowUpdates.address = data.address;
    if (data.industryCategory) rowUpdates.industry_category = data.industryCategory;
    if (data.isActive !== undefined) rowUpdates.is_active = data.isActive;

    if (isRemoteTablesReady) {
      try {
        const { data: updated, error } = await supabase
          .from("customers")
          .update(rowUpdates)
          .eq("id", strId)
          .select()
          .maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && updated) {
          return { ...updated, _id: updated.id, companyName: updated.company_name, contactPerson: updated.contact_person };
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const idx = inMemoryStore.customers.findIndex((c) => c.id === strId || c._id === strId);
    if (idx !== -1) {
      inMemoryStore.customers[idx] = { ...inMemoryStore.customers[idx], ...rowUpdates, ...data };
      const c = inMemoryStore.customers[idx];
      return { ...c, _id: c.id, companyName: c.company_name || c.companyName, contactPerson: c.contact_person || c.contactPerson };
    }
    return null;
  },

  // ─── SITES ──────────────────────────────────────────────────────────────
  async countSitesByCustomer(customerId) {
    const strId = customerId.toString();
    if (isRemoteTablesReady) {
      try {
        const { count, error } = await supabase
          .from("sites")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", strId);
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && count !== null) return count;
      } catch (e) { throw e; }
    }
    return inMemoryStore.sites.filter((s) => s.customer_id === strId || s.customerId === strId).length;
  },

  async getSites(customerId) {
    const strId = customerId ? customerId.toString() : null;
    if (isRemoteTablesReady) {
      try {
        let query = supabase.from("sites").select("*");
        if (strId) query = query.eq("customer_id", strId);
        const { data, error } = await query;
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && Array.isArray(data)) {
          return data.map((s) => ({
            ...s,
            _id: s.id,
            siteName: s.site_name,
            siteCode: s.site_code,
            contactPerson: s.contact_person,
            contactPhone: s.contact_phone,
            customerId: s.customer_id,
          }));
        }
      } catch (e) { throw e; }
    }

    let list = inMemoryStore.sites;
    if (strId) list = list.filter((s) => s.customer_id === strId || s.customerId === strId);
    return list.map((s) => ({
      ...s,
      _id: s.id,
      siteName: s.site_name || s.siteName,
      siteCode: s.site_code || s.siteCode,
      contactPerson: s.contact_person || s.contactPerson,
      contactPhone: s.contact_phone || s.contactPhone,
      customerId: s.customer_id || s.customerId,
    }));
  },

  async createSite(data) {
    const id = uuidv4();
    const row = {
      id,
      customer_id: data.customerId || data.customer_id,
      site_name: data.siteName,
      site_code: data.siteCode.toUpperCase().trim(),
      address: data.address,
      city: data.city || "",
      state: data.state || "",
      contact_person: data.contactPerson || "",
      contact_phone: data.contactPhone || "",
      is_active: data.isActive ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isRemoteTablesReady) {
      try {
        const { data: created, error } = await supabase.from("sites").insert(row).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && created) {
          inMemoryStore.sites.push(created);
          return { ...created, _id: created.id, siteName: created.site_name, siteCode: created.site_code };
        }
        throw new Error("Supabase did not return the created site.");
      } catch (e) { throw e; }
    }

    inMemoryStore.sites.push(row);
    return { ...row, _id: row.id, siteName: row.site_name, siteCode: row.site_code };
  },

  // ─── CHECKLISTS ─────────────────────────────────────────────────────────
  async getChecklists(filter = {}) {
    let list = [];
    if (isRemoteTablesReady) {
      try {
        let query = supabase.from("checklists").select("*, customer:customers(id, company_name, code)");
        if (filter.customerId) query = query.eq("customer_id", filter.customerId);
        const { data, error } = await query;
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && Array.isArray(data)) {
          list = data.map((chk) => ({
            ...chk,
            _id: chk.id,
            fileName: chk.file_name,
            fileSize: chk.file_size,
            isActive: chk.is_active,
            createdAt: chk.created_at,
            uploadedBy: chk.uploaded_by,
            customerId: chk.customer ? {
              _id: chk.customer.id,
              id: chk.customer.id,
              companyName: chk.customer.company_name,
              code: chk.customer.code,
            } : chk.customer_id,
          }));
        }
      } catch (e) { throw e; }
    }

    if (!isRemoteTablesReady) {
      list = inMemoryStore.checklists.map((chk) => ({
        ...chk,
        _id: chk.id,
        fileName: chk.file_name || chk.fileName,
        fileSize: chk.file_size || chk.fileSize,
        isActive: chk.is_active ?? chk.isActive ?? true,
        createdAt: chk.created_at || chk.createdAt,
        uploadedBy: chk.uploaded_by || chk.uploadedBy,
        customerId: chk.customer_id || chk.customerId,
      }));
      if (filter.customerId) {
        list = list.filter((c) => c.customer_id === filter.customerId || c.customerId === filter.customerId);
      }
    }

    return list;
  },

  async getChecklistById(id) {
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase
          .from("checklists")
          .select("*, customer:customers(id, company_name, code)")
          .eq("id", strId)
          .maybeSingle();

        if (error) throw new Error(`Supabase request failed: ${error.message}`);

        if (!error && data) {
          return {
            ...data,
            _id: data.id,
            fileName: data.file_name,
            fileSize: data.file_size,
            uploadedBy: data.uploaded_by,
            customerId: data.customer ? {
              _id: data.customer.id,
              id: data.customer.id,
              companyName: data.customer.company_name,
              code: data.customer.code,
            } : data.customer_id,
          };
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const mem = inMemoryStore.checklists.find((c) => c.id === strId || c._id === strId);
    return mem ? {
      ...mem,
      _id: mem.id,
      fileName: mem.file_name || mem.fileName,
      fileSize: mem.file_size || mem.fileSize,
      uploadedBy: mem.uploaded_by || mem.uploadedBy,
      customerId: mem.customer_id || mem.customerId,
    } : null;
  },

  async createChecklist(data) {
    const id = uuidv4();
    const row = {
      id,
      name: data.name,
      standard: data.standard || "FSSAI",
      description: data.description || "",
      items: data.items || [],
      customer_id: data.customerId || null,
      uploaded_by: data.uploadedBy || null,
      file_name: data.fileName || "",
      file_size: data.fileSize || 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isRemoteTablesReady) {
      try {
        const { data: created, error } = await supabase.from("checklists").insert(row).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && created) {
          inMemoryStore.checklists.push(created);
          return {
            ...created,
            _id: created.id,
            fileName: created.file_name,
            fileSize: created.file_size,
            uploadedBy: created.uploaded_by,
            customerId: created.customer_id,
          };
        }
        throw new Error("Supabase did not return the created checklist.");
      } catch (e) { throw e; }
    }

    inMemoryStore.checklists.push(row);
    return {
      ...row,
      _id: row.id,
      fileName: row.file_name,
      fileSize: row.file_size,
      uploadedBy: row.uploaded_by,
      customerId: row.customer_id,
    };
  },

  async deleteChecklist(id) {
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { error } = await supabase.from("checklists").delete().eq("id", strId);
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        inMemoryStore.checklists = inMemoryStore.checklists.filter((c) => c.id !== strId && c._id !== strId);
        return true;
      } catch (e) { throw e; }
    }
    inMemoryStore.checklists = inMemoryStore.checklists.filter((c) => c.id !== strId && c._id !== strId);
    return true;
  },

  // ─── AUDITS ─────────────────────────────────────────────────────────────
  async getAudits(filter = {}) {
    let list = [];
    if (isRemoteTablesReady) {
      try {
        let query = supabase
          .from("audits")
          .select(`
            *,
            customer:customers(id, company_name, code, contact_person, email),
            site:sites(id, site_name, site_code, address, city, state),
            checklist:checklists(id, name, standard, description, items),
            auditor:users!audits_auditor_id_fkey(id, name, email, phone, specialization, certifications, experience_years, qualification, auditor_id_code),
            reviewer:users!audits_reviewer_id_fkey(id, name, email, phone)
          `)
          .order("scheduled_date", { ascending: false });

        if (filter.customerId) query = query.eq("customer_id", filter.customerId);
        if (filter.auditorId) query = query.or(`auditor_id.eq.${filter.auditorId},auditor_id.is.null`);

        const { data, error } = await query;
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && Array.isArray(data)) {
          list = data.map((a) => this._formatAudit(a));
        }
      } catch (e) { throw e; }
    }

    if (!isRemoteTablesReady) {
      list = inMemoryStore.audits.map((a) => this._formatPopulatedMemoryAudit(a));
      if (filter.customerId) {
        list = list.filter((a) => a.customer_id === filter.customerId || a.customerId?._id === filter.customerId);
      }
      if (filter.auditorId) {
        list = list.filter((a) => !a.auditorId || a.auditorId._id === filter.auditorId || a.auditor_id === filter.auditorId);
      }
    }

    return list;
  },

  async getAuditById(id) {
    const strId = id.toString();
    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase
          .from("audits")
          .select(`
            *,
            customer:customers(id, company_name, code, contact_person, email),
            site:sites(id, site_name, site_code, address, city, state),
            checklist:checklists(id, name, standard, description, items),
            auditor:users!audits_auditor_id_fkey(id, name, email, phone, specialization, certifications, experience_years, qualification, auditor_id_code),
            reviewer:users!audits_reviewer_id_fkey(id, name, email, phone)
          `)
          .eq("id", strId)
          .maybeSingle();

        if (error) throw new Error(`Supabase request failed: ${error.message}`);

        if (!error && data) {
          return this._formatAudit(data);
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const mem = inMemoryStore.audits.find((a) => a.id === strId || a._id === strId);
    return mem ? this._formatPopulatedMemoryAudit(mem) : null;
  },

  async createAudit(data) {
    const id = uuidv4();
    const row = {
      id,
      audit_ref: data.auditRef,
      customer_id: data.customerId || null,
      site_id: data.siteId || null,
      auditor_id: data.auditorId || null,
      standard: data.standard || "FSSAI",
      scheduled_date: data.scheduledDate || new Date(),
      status: data.status || "SCHEDULED",
      checklist_id: data.checklistId || null,
      answers: data.answers || [],
      notes: data.notes || "",
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isRemoteTablesReady) {
      try {
        const { data: created, error } = await supabase.from("audits").insert(row).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && created) {
          inMemoryStore.audits.push(created);
          return await this.getAuditById(created.id);
        }
        throw new Error("Supabase did not return the created audit.");
      } catch (e) { throw e; }
    }

    inMemoryStore.audits.push(row);
    return this._formatPopulatedMemoryAudit(row);
  },

  async updateAudit(id, updates) {
    const strId = id.toString();
    const rowUpdates = {
      updated_at: new Date(),
    };
    if (updates.customerId !== undefined) rowUpdates.customer_id = updates.customerId;
    if (updates.siteId !== undefined) rowUpdates.site_id = updates.siteId;
    if (updates.auditorId !== undefined) rowUpdates.auditor_id = updates.auditorId;
    if (updates.reviewerId !== undefined) rowUpdates.reviewer_id = updates.reviewerId;
    if (updates.standard !== undefined) rowUpdates.standard = updates.standard;
    if (updates.scheduledDate !== undefined) rowUpdates.scheduled_date = updates.scheduledDate;
    if (updates.completedDate !== undefined) rowUpdates.completed_date = updates.completedDate;
    if (updates.status !== undefined) rowUpdates.status = updates.status;
    if (updates.score !== undefined) rowUpdates.score = updates.score;
    if (updates.checklistId !== undefined) rowUpdates.checklist_id = updates.checklistId;
    if (updates.answers !== undefined) rowUpdates.answers = updates.answers;
    if (updates.reviewerComments !== undefined) rowUpdates.reviewer_comments = updates.reviewerComments;
    if (updates.notes !== undefined) rowUpdates.notes = updates.notes;

    if (isRemoteTablesReady) {
      try {
        const { data, error } = await supabase.from("audits").update(rowUpdates).eq("id", strId).select().maybeSingle();
        if (error) throw new Error(`Supabase request failed: ${error.message}`);
        if (!error && data) {
          return await this.getAuditById(strId);
        }
      } catch (e) { throw e; }
    }

    if (isRemoteTablesReady) return null;
    const idx = inMemoryStore.audits.findIndex((a) => a.id === strId || a._id === strId);
    if (idx !== -1) {
      inMemoryStore.audits[idx] = { ...inMemoryStore.audits[idx], ...rowUpdates, ...updates };
      return this._formatPopulatedMemoryAudit(inMemoryStore.audits[idx]);
    }
    return null;
  },

  _formatAudit(a) {
    return {
      ...a,
      _id: a.id,
      auditRef: a.audit_ref,
      customerId: a.customer ? {
        _id: a.customer.id,
        id: a.customer.id,
        companyName: a.customer.company_name,
        code: a.customer.code,
        contactPerson: a.customer.contact_person,
        email: a.customer.email,
      } : a.customer_id,
      siteId: a.site ? {
        _id: a.site.id,
        id: a.site.id,
        siteName: a.site.site_name,
        siteCode: a.site.site_code,
        address: a.site.address,
        city: a.site.city,
        state: a.site.state,
      } : a.site_id,
      checklistId: a.checklist ? {
        _id: a.checklist.id,
        id: a.checklist.id,
        name: a.checklist.name,
        standard: a.checklist.standard,
        description: a.checklist.description,
        items: a.checklist.items,
      } : a.checklist_id,
      auditorId: a.auditor ? {
        _id: a.auditor.id,
        id: a.auditor.id,
        name: a.auditor.name,
        email: a.auditor.email,
        phone: a.auditor.phone,
        specialization: a.auditor.specialization,
        certifications: a.auditor.certifications,
        experienceYears: a.auditor.experience_years,
        qualification: a.auditor.qualification,
        auditorIdCode: a.auditor.auditor_id_code,
      } : a.auditor_id,
      reviewerId: a.reviewer ? {
        _id: a.reviewer.id,
        id: a.reviewer.id,
        name: a.reviewer.name,
        email: a.reviewer.email,
        phone: a.reviewer.phone,
      } : a.reviewer_id,
      scheduledDate: a.scheduled_date,
      completedDate: a.completed_date,
      reviewerComments: a.reviewer_comments,
    };
  },

  _formatPopulatedMemoryAudit(a) {
    const cust = inMemoryStore.customers.find((c) => c.id === (a.customer_id || a.customerId));
    const site = inMemoryStore.sites.find((s) => s.id === (a.site_id || a.siteId));
    const chk = inMemoryStore.checklists.find((c) => c.id === (a.checklist_id || a.checklistId));
    const auditor = inMemoryStore.users.find((u) => u.id === (a.auditor_id || a.auditorId));
    const reviewer = inMemoryStore.users.find((u) => u.id === (a.reviewer_id || a.reviewerId));

    return {
      ...a,
      _id: a.id || a._id,
      auditRef: a.audit_ref || a.auditRef,
      customerId: cust ? {
        _id: cust.id,
        id: cust.id,
        companyName: cust.company_name || cust.companyName,
        code: cust.code,
        contactPerson: cust.contact_person || cust.contactPerson,
        email: cust.email,
      } : a.customer_id || a.customerId,
      siteId: site ? {
        _id: site.id,
        id: site.id,
        siteName: site.site_name || site.siteName,
        siteCode: site.site_code || site.siteCode,
        address: site.address,
        city: site.city,
        state: site.state,
      } : a.site_id || a.siteId,
      checklistId: chk ? {
        _id: chk.id,
        id: chk.id,
        name: chk.name,
        standard: chk.standard,
        description: chk.description,
        items: chk.items,
      } : a.checklist_id || a.checklistId,
      auditorId: auditor ? {
        _id: auditor.id,
        id: auditor.id,
        name: auditor.name,
        email: auditor.email,
        phone: auditor.phone,
        specialization: auditor.specialization,
        certifications: auditor.certifications,
        experienceYears: auditor.experience_years || auditor.experienceYears,
        qualification: auditor.qualification,
        auditorIdCode: auditor.auditor_id_code || auditor.auditorIdCode,
      } : a.auditor_id || a.auditorId,
      reviewerId: reviewer ? {
        _id: reviewer.id,
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        phone: reviewer.phone,
      } : a.reviewer_id || a.reviewerId,
      scheduledDate: a.scheduled_date || a.scheduledDate,
      completedDate: a.completed_date || a.completedDate,
      reviewerComments: a.reviewer_comments || a.reviewerComments || "",
    };
  },
};

export default dbService;
