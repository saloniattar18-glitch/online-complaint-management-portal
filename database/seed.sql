-- ============================================================
-- ONLINE COMPLAINT MANAGEMENT PORTAL
-- PostgreSQL / Neon Initial Seed Data
-- File: database/seed.sql
-- ============================================================

BEGIN;


-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================

INSERT INTO departments
(
    name,
    description,
    status
)
VALUES

(
    'Water Supply',
    'Handles water supply, leakage and drinking water complaints.',
    'active'
),

(
    'Public Works',
    'Handles roads, potholes, public infrastructure and maintenance complaints.',
    'active'
),

(
    'Electricity',
    'Handles street lights and electricity-related public complaints.',
    'active'
),

(
    'Sanitation',
    'Handles garbage, cleanliness, drainage and sanitation complaints.',
    'active'
),

(
    'General Administration',
    'Handles complaints that do not belong to another department.',
    'active'
)

ON CONFLICT (name)
DO UPDATE SET

    description =
        EXCLUDED.description,

    status =
        EXCLUDED.status,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 2. CATEGORIES
-- ============================================================

INSERT INTO categories
(
    name,
    description,
    status
)
VALUES

(
    'Water Supply',
    'Water shortage, leakage, pipeline and drinking water complaints.',
    'active'
),

(
    'Road & Potholes',
    'Road damage, potholes and road maintenance complaints.',
    'active'
),

(
    'Street Lights & Electricity',
    'Street light and public electricity complaints.',
    'active'
),

(
    'Garbage & Sanitation',
    'Garbage collection and cleanliness complaints.',
    'active'
),

(
    'Drainage',
    'Drainage blockage, sewage and water logging complaints.',
    'active'
),

(
    'Public Property',
    'Complaints related to public property and infrastructure.',
    'active'
),

(
    'Other',
    'Complaints that do not belong to another category.',
    'active'
)

ON CONFLICT (name)
DO UPDATE SET

    description =
        EXCLUDED.description,

    status =
        EXCLUDED.status,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- PASSWORD INFORMATION
-- ============================================================
--
-- These are bcrypt password hashes.
--
-- ADMIN:
-- Email:    admin@complaintportal.com
-- Password: Admin@123
--
-- STAFF:
-- Password: Staff@123
--
-- USER:
-- Password: User@123
--
-- Change these passwords before real production deployment.
-- ============================================================


-- ============================================================
-- 3. ADMIN ACCOUNT
-- ============================================================

INSERT INTO users
(
    full_name,
    email,
    mobile,
    username,
    address,
    password_hash,
    role,
    status,
    department_id
)
VALUES
(
    'System Administrator',

    'admin@complaintportal.com',

    '9999999999',

    'admin',

    'Complaint Portal Administration',

    '$2b$12$uMQarkrIQFConhdQoqRSfuF9jg6mgGdPceauUkYSaTW400DVyvXby',

    'admin',

    'active',

    NULL
)

ON CONFLICT (email)
DO UPDATE SET

    full_name =
        EXCLUDED.full_name,

    mobile =
        EXCLUDED.mobile,

    username =
        EXCLUDED.username,

    address =
        EXCLUDED.address,

    password_hash =
        EXCLUDED.password_hash,

    role =
        'admin',

    status =
        'active',

    department_id =
        NULL,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 4. WATER DEPARTMENT STAFF
-- ============================================================

INSERT INTO users
(
    full_name,
    email,
    mobile,
    username,
    password_hash,
    role,
    status,
    department_id
)
VALUES
(
    'Water Department Staff',

    'water.staff@complaintportal.com',

    '9000000001',

    'waterstaff',

    '$2b$12$mELrjHxspFXm7mHZx8ziC.VIw5YmSfTHggSlzLz9zRsYC0rVBjFPK',

    'staff',

    'active',

    (
        SELECT department_id
        FROM departments
        WHERE name = 'Water Supply'
        LIMIT 1
    )
)

ON CONFLICT (email)
DO UPDATE SET

    full_name =
        EXCLUDED.full_name,

    mobile =
        EXCLUDED.mobile,

    username =
        EXCLUDED.username,

    password_hash =
        EXCLUDED.password_hash,

    role =
        'staff',

    status =
        'active',

    department_id =
        EXCLUDED.department_id,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 5. PUBLIC WORKS STAFF
-- ============================================================

INSERT INTO users
(
    full_name,
    email,
    mobile,
    username,
    password_hash,
    role,
    status,
    department_id
)
VALUES
(
    'Public Works Staff',

    'works.staff@complaintportal.com',

    '9000000002',

    'worksstaff',

    '$2b$12$mELrjHxspFXm7mHZx8ziC.VIw5YmSfTHggSlzLz9zRsYC0rVBjFPK',

    'staff',

    'active',

    (
        SELECT department_id
        FROM departments
        WHERE name = 'Public Works'
        LIMIT 1
    )
)

ON CONFLICT (email)
DO UPDATE SET

    full_name =
        EXCLUDED.full_name,

    mobile =
        EXCLUDED.mobile,

    username =
        EXCLUDED.username,

    password_hash =
        EXCLUDED.password_hash,

    role =
        'staff',

    status =
        'active',

    department_id =
        EXCLUDED.department_id,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 6. SANITATION STAFF
-- ============================================================

INSERT INTO users
(
    full_name,
    email,
    mobile,
    username,
    password_hash,
    role,
    status,
    department_id
)
VALUES
(
    'Sanitation Staff',

    'sanitation.staff@complaintportal.com',

    '9000000003',

    'sanitationstaff',

    '$2b$12$mELrjHxspFXm7mHZx8ziC.VIw5YmSfTHggSlzLz9zRsYC0rVBjFPK',

    'staff',

    'active',

    (
        SELECT department_id
        FROM departments
        WHERE name = 'Sanitation'
        LIMIT 1
    )
)

ON CONFLICT (email)
DO UPDATE SET

    full_name =
        EXCLUDED.full_name,

    mobile =
        EXCLUDED.mobile,

    username =
        EXCLUDED.username,

    password_hash =
        EXCLUDED.password_hash,

    role =
        'staff',

    status =
        'active',

    department_id =
        EXCLUDED.department_id,

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 7. DEMO USER
-- ============================================================

INSERT INTO users
(
    full_name,
    email,
    mobile,
    username,
    address,
    password_hash,
    role,
    status,
    department_id
)
VALUES
(
    'Demo User',

    'user@complaintportal.com',

    '9876543210',

    'demouser',

    'Karad, Maharashtra',

    '$2b$12$bWHyn2/mgp20U/IFUsFEQOZ9Tad.6VVbepLlkovlF1jTO11rxoth.',

    'user',

    'active',

    NULL
)

ON CONFLICT (email)
DO UPDATE SET

    full_name =
        EXCLUDED.full_name,

    mobile =
        EXCLUDED.mobile,

    username =
        EXCLUDED.username,

    address =
        EXCLUDED.address,

    password_hash =
        EXCLUDED.password_hash,

    role =
        'user',

    status =
        'active',

    updated_at =
        CURRENT_TIMESTAMP;


-- ============================================================
-- 8. DEMO PENDING COMPLAINT
-- ============================================================

INSERT INTO complaints
(
    complaint_code,

    user_id,

    category_id,

    department_id,

    assigned_staff_id,

    title,

    description,

    priority,

    status,

    location,

    address,

    pincode,

    due_date
)
VALUES
(
    'CMP-DEMO-001',

    (
        SELECT user_id
        FROM users
        WHERE email =
            'user@complaintportal.com'
        LIMIT 1
    ),

    (
        SELECT category_id
        FROM categories
        WHERE name =
            'Water Supply'
        LIMIT 1
    ),

    (
        SELECT department_id
        FROM departments
        WHERE name =
            'Water Supply'
        LIMIT 1
    ),

    NULL,

    'Water leakage near residential area',

    'There is continuous water leakage from the main pipeline near the residential area.',

    'high',

    'pending',

    'Main Road',

    'Main Road, Karad, Maharashtra',

    '415110',

    CURRENT_TIMESTAMP + INTERVAL '3 days'
)

ON CONFLICT (complaint_code)
DO NOTHING;


-- ============================================================
-- 9. DEMO ASSIGNED COMPLAINT
-- ============================================================

INSERT INTO complaints
(
    complaint_code,

    user_id,

    category_id,

    department_id,

    assigned_staff_id,

    title,

    description,

    priority,

    status,

    location,

    address,

    pincode,

    due_date
)
VALUES
(
    'CMP-DEMO-002',

    (
        SELECT user_id
        FROM users
        WHERE email =
            'user@complaintportal.com'
        LIMIT 1
    ),

    (
        SELECT category_id
        FROM categories
        WHERE name =
            'Road & Potholes'
        LIMIT 1
    ),

    (
        SELECT department_id
        FROM departments
        WHERE name =
            'Public Works'
        LIMIT 1
    ),

    (
        SELECT user_id
        FROM users
        WHERE email =
            'works.staff@complaintportal.com'
        LIMIT 1
    ),

    'Large pothole on public road',

    'A large pothole is causing difficulty for vehicles and should be repaired.',

    'medium',

    'assigned',

    'Market Road',

    'Market Road, Karad, Maharashtra',

    '415110',

    CURRENT_TIMESTAMP + INTERVAL '5 days'
)

ON CONFLICT (complaint_code)
DO NOTHING;


-- ============================================================
-- 10. DEMO IN-PROGRESS COMPLAINT
-- ============================================================

INSERT INTO complaints
(
    complaint_code,

    user_id,

    category_id,

    department_id,

    assigned_staff_id,

    title,

    description,

    priority,

    status,

    location,

    address,

    pincode,

    due_date
)
VALUES
(
    'CMP-DEMO-003',

    (
        SELECT user_id
        FROM users
        WHERE email =
            'user@complaintportal.com'
        LIMIT 1
    ),

    (
        SELECT category_id
        FROM categories
        WHERE name =
            'Garbage & Sanitation'
        LIMIT 1
    ),

    (
        SELECT department_id
        FROM departments
        WHERE name =
            'Sanitation'
        LIMIT 1
    ),

    (
        SELECT user_id
        FROM users
        WHERE email =
            'sanitation.staff@complaintportal.com'
        LIMIT 1
    ),

    'Garbage not collected',

    'Garbage has not been collected from the area for several days.',

    'high',

    'in_progress',

    'Residential Area',

    'Residential Area, Karad, Maharashtra',

    '415110',

    CURRENT_TIMESTAMP + INTERVAL '2 days'
)

ON CONFLICT (complaint_code)
DO NOTHING;


-- ============================================================
-- 11. INITIAL HISTORY - COMPLAINT 1
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'pending',

    'Complaint submitted by user.',

    u.user_id

FROM complaints c

JOIN users u
    ON u.email =
       'user@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-001'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'pending'

    AND h.remarks =
        'Complaint submitted by user.'
);


-- ============================================================
-- 12. INITIAL HISTORY - COMPLAINT 2 SUBMITTED
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'pending',

    'Complaint submitted by user.',

    u.user_id

FROM complaints c

JOIN users u
    ON u.email =
       'user@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-002'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'pending'

    AND h.remarks =
        'Complaint submitted by user.'
);


-- ============================================================
-- 13. COMPLAINT 2 ASSIGNED HISTORY
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'assigned',

    'Complaint assigned to Public Works staff.',

    a.user_id

FROM complaints c

JOIN users a
    ON a.email =
       'admin@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-002'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'assigned'

    AND h.remarks =
        'Complaint assigned to Public Works staff.'
);


-- ============================================================
-- 14. COMPLAINT 3 SUBMITTED HISTORY
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'pending',

    'Complaint submitted by user.',

    u.user_id

FROM complaints c

JOIN users u
    ON u.email =
       'user@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-003'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'pending'

    AND h.remarks =
        'Complaint submitted by user.'
);


-- ============================================================
-- 15. COMPLAINT 3 ASSIGNED HISTORY
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'assigned',

    'Complaint assigned to Sanitation staff.',

    a.user_id

FROM complaints c

JOIN users a
    ON a.email =
       'admin@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-003'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'assigned'

    AND h.remarks =
        'Complaint assigned to Sanitation staff.'
);


-- ============================================================
-- 16. COMPLAINT 3 IN PROGRESS HISTORY
-- ============================================================

INSERT INTO complaint_status_history
(
    complaint_id,
    status,
    remarks,
    updated_by
)

SELECT

    c.complaint_id,

    'in_progress',

    'Sanitation team has started working on the complaint.',

    s.user_id

FROM complaints c

JOIN users s
    ON s.email =
       'sanitation.staff@complaintportal.com'

WHERE
    c.complaint_code =
    'CMP-DEMO-003'

AND NOT EXISTS
(
    SELECT 1

    FROM complaint_status_history h

    WHERE
        h.complaint_id =
        c.complaint_id

    AND h.status =
        'in_progress'

    AND h.remarks =
        'Sanitation team has started working on the complaint.'
);


-- ============================================================
-- 17. DEMO FEEDBACK
-- ============================================================

INSERT INTO feedback
(
    user_id,

    complaint_id,

    rating,

    feedback_type,

    comments,

    recommend
)

SELECT

    u.user_id,

    NULL,

    5,

    'portal_experience',

    'The complaint portal is simple and easy to use.',

    'yes'

FROM users u

WHERE
    u.email =
    'user@complaintportal.com'

AND NOT EXISTS
(
    SELECT 1

    FROM feedback f

    WHERE
        f.user_id =
        u.user_id

    AND f.complaint_id IS NULL

    AND f.feedback_type =
        'portal_experience'

    AND f.comments =
        'The complaint portal is simple and easy to use.'
);


-- ============================================================
-- 18. DEMO CONTACT MESSAGE
-- ============================================================

INSERT INTO contact_messages
(
    name,

    email,

    subject,

    message,

    status
)

SELECT

    'Demo Visitor',

    'visitor@example.com',

    'Question about complaint tracking',

    'I would like to know how I can track the status of my submitted complaint.',

    'unread'

WHERE NOT EXISTS
(
    SELECT 1

    FROM contact_messages

    WHERE
        email =
        'visitor@example.com'

    AND subject =
        'Question about complaint tracking'
);


COMMIT;