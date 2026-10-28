-- ============================================================================
-- VERA (Verification Engine for Regulatory Audits) — Shared Supabase Schema
-- Standard: FSSAI Annex 5 Second-Party Food Safety Auditing
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS & ROLES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'AUDITOR', 'EXPERT_REVIEWER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM (
        'DRAFT', 
        'REQUEST_SUBMITTED', 
        'ASSIGNED', 
        'DOCUMENT_UPLOADED', 
        'EXTRACTED', 
        'AI_VERIFIED', 
        'AUDITOR_SUBMITTED', 
        'EXPERT_REVIEW', 
        'RETURNED_TO_AUDITOR', 
        'APPROVED', 
        'RELEASED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE compliance_status AS ENUM ('C', 'PC', 'NC', 'NA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE engine_type AS ENUM ('CLASSICAL_NLP', 'DEEP_LEARNING_NLI', 'RAG', 'OKF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ORGANISATIONS & MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    license_no TEXT,
    fssai_category TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.organisation_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_in_org TEXT NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(org_id, user_id)
);

-- 4. FACILITIES
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    fssai_sub_category TEXT,
    contact_person TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CHECKLISTS & VERSIONS
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    is_official BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.checklist_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    total_points NUMERIC NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(checklist_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES public.checklist_versions(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    section TEXT NOT NULL,
    question TEXT NOT NULL,
    weight NUMERIC NOT NULL DEFAULT 2,
    asterisk_critical BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0
);

-- 6. AUDIT REQUESTS & AUDITS
CREATE TABLE IF NOT EXISTS public.audit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES public.checklists(id),
    requested_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.audit_requests(id),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    checklist_version_id UUID NOT NULL REFERENCES public.checklist_versions(id),
    status audit_status NOT NULL DEFAULT 'DRAFT',
    total_score NUMERIC DEFAULT 0,
    total_max NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    grade TEXT,
    status_label TEXT,
    asterisk_failures JSONB DEFAULT '[]'::jsonb,
    section_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDITOR ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.auditor_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES public.profiles(id),
    assigned_by UUID NOT NULL REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 8. AUDIT DOCUMENTS & EXTRACTIONS
CREATE TABLE IF NOT EXISTS public.audit_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    extracted_text TEXT,
    extracted_table JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. VERIFICATION RUNS & FINDINGS
CREATE TABLE IF NOT EXISTS public.verification_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    engine_name engine_type NOT NULL,
    session_id TEXT NOT NULL,
    sha256_provenance TEXT NOT NULL,
    latency_ms NUMERIC,
    fraud_signals JSONB DEFAULT '{}'::jsonb,
    ran_by UUID NOT NULL REFERENCES public.profiles(id),
    ran_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.verification_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES public.verification_runs(id) ON DELETE CASCADE,
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    engine_verdict compliance_status NOT NULL,
    auditor_verdict compliance_status,
    final_verdict compliance_status NOT NULL,
    confidence NUMERIC,
    evidence_text TEXT,
    rationale TEXT,
    breadcrumb_path TEXT,
    is_overridden BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    overridden_by UUID REFERENCES public.profiles(id)
);

-- 10. EXPERT REVIEW DECISIONS
CREATE TABLE IF NOT EXISTS public.expert_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- 'ACCEPT', 'OVERRIDE', 'RETURN_CORRECTION'
    item_id TEXT,
    previous_verdict TEXT,
    new_verdict TEXT,
    mandatory_justification TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. RELEASED REPORTS (Customer visible only after release)
CREATE TABLE IF NOT EXISTS public.released_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL UNIQUE REFERENCES public.audits(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    released_by UUID NOT NULL REFERENCES public.profiles(id),
    released_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    report_pdf_storage_path TEXT,
    final_score NUMERIC NOT NULL,
    final_percentage NUMERIC NOT NULL,
    final_grade TEXT NOT NULL,
    status_label TEXT NOT NULL,
    tamper_proof_hash TEXT NOT NULL,
    summary_findings JSONB NOT NULL
);

-- 12. AUDIT STATUS HISTORY & AUDIT TRAIL LOGS
CREATE TABLE IF NOT EXISTS public.audit_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    from_status audit_status,
    to_status audit_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.released_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_status_history ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organisation_memberships 
        WHERE org_id = p_org_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles
CREATE POLICY "Users can view self profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.get_auth_role() = 'ADMIN');

CREATE POLICY "Users can update self profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Checklists
CREATE POLICY "Anyone can view checklists" ON public.checklists
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view checklist versions" ON public.checklist_versions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view checklist items" ON public.checklist_items
    FOR SELECT TO authenticated USING (true);

-- Organisations & Facilities
CREATE POLICY "Members or auditors can view orgs" ON public.organisations
    FOR SELECT TO authenticated
    USING (public.is_org_member(id) OR public.get_auth_role() IN ('AUDITOR', 'EXPERT_REVIEWER', 'ADMIN'));

CREATE POLICY "Members or auditors can view facilities" ON public.facilities
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id) OR public.get_auth_role() IN ('AUDITOR', 'EXPERT_REVIEWER', 'ADMIN'));

-- Released Reports
CREATE POLICY "Org members can view released reports" ON public.released_reports
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id) OR public.get_auth_role() IN ('AUDITOR', 'EXPERT_REVIEWER', 'ADMIN'));

-- Internal Audits
CREATE POLICY "Internal audit access policy" ON public.audits
    FOR SELECT TO authenticated
    USING (
        (public.get_auth_role() = 'CUSTOMER' AND status = 'RELEASED' AND public.is_org_member(org_id))
        OR (public.get_auth_role() = 'AUDITOR' AND EXISTS (
            SELECT 1 FROM public.auditor_assignments WHERE audit_id = audits.id AND auditor_id = auth.uid() AND is_active = true
        ))
        OR (public.get_auth_role() IN ('EXPERT_REVIEWER', 'ADMIN'))
    );
