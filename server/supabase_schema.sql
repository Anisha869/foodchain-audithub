-- ====================================================================
-- FoodChain AuditHub — Supabase PostgreSQL Database Schema
-- Project: food-auditing (jepynvbhehqidehusjbr)
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    industry_category TEXT DEFAULT 'Food Processing & Logistics',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sites / Facilities Table
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    site_code TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'auditor',
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    last_login_at TIMESTAMPTZ,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    specialization TEXT,
    certifications JSONB DEFAULT '[]'::jsonb,
    experience_years INTEGER DEFAULT 0,
    qualification TEXT,
    auditor_id_code TEXT,
    address TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_approval_status_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_approval_status_check
            CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
END;
$$;

-- 5. Checklists Table
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    standard TEXT DEFAULT 'FSSAI',
    description TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    file_name TEXT,
    file_size INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Audits Table
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_ref TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    auditor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    standard TEXT DEFAULT 'FSSAI',
    scheduled_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_date TIMESTAMPTZ,
    status TEXT DEFAULT 'SCHEDULED',
    score NUMERIC,
    checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL,
    answers JSONB DEFAULT '[]'::jsonb,
    reviewer_comments TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Findings Table
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE,
    category TEXT DEFAULT 'General',
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    corrective_action TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(code);
CREATE INDEX IF NOT EXISTS idx_sites_customer ON public.sites(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_checklists_customer ON public.checklists(customer_id);
CREATE INDEX IF NOT EXISTS idx_audits_customer ON public.audits(customer_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditor ON public.audits(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_scheduled_date ON public.audits(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON public.findings(audit_id);

-- 9. Keep RLS enabled. The API must use a server-side service-role key.
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Remove the old blanket policies; service-role requests bypass RLS.
DROP POLICY IF EXISTS "Service role access customers" ON public.customers;
DROP POLICY IF EXISTS "Service role access sites" ON public.sites;
DROP POLICY IF EXISTS "Service role access users" ON public.users;
DROP POLICY IF EXISTS "Service role access checklists" ON public.checklists;
DROP POLICY IF EXISTS "Service role access audits" ON public.audits;
DROP POLICY IF EXISTS "Service role access findings" ON public.findings;

-- The API validates ADMIN_BOOTSTRAP_TOKEN before invoking this one-time RPC.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
    p_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_phone TEXT DEFAULT ''
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('foodchain_audithub_first_admin'));

    IF EXISTS (SELECT 1 FROM public.users WHERE role = 'admin') THEN
        RAISE EXCEPTION 'An administrator has already been bootstrapped'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    INSERT INTO public.users (name, email, password, role, phone, is_active)
    VALUES (
        trim(p_name),
        lower(trim(p_email)),
        p_password,
        'admin',
        coalesce(p_phone, ''),
        true
    )
    RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT) TO service_role;
