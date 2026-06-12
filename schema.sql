-- ==========================================
-- ENTERPRISE-GRADE EXAM MICROBUS RESERVATION SYSTEM
-- SUPABASE SQL DATABASE SCHEMA & TRIGGERS
-- ==========================================

-- Enable pgcrypto extension for UUID generation and hashing if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (clean setup)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS seat_locks CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS pricing CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 1. ADMINS TABLE
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of password
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. STUDENTS TABLE
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    reservation_code VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255), -- SHA-256 hash of student password
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BUSES TABLE
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    departure_time TIME NOT NULL,
    meeting_location VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 14,
    notes TEXT,
    layout_template TEXT NOT NULL DEFAULT 'toyota_14', -- 'toyota_14', 'toyota_17', 'custom', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SEATS TABLE
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    seat_label VARCHAR(10) NOT NULL,
    seat_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (seat_type IN ('standard', 'vip', 'front', 'driver')),
    x_pos INTEGER NOT NULL, -- Grid Column
    y_pos INTEGER NOT NULL, -- Grid Row
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (bus_id, seat_label),
    UNIQUE (bus_id, x_pos, y_pos)
);

-- 5. RESERVATIONS TABLE
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
    reservation_type VARCHAR(20) NOT NULL CHECK (reservation_type IN ('going', 'return', 'round_trip')),
    price DECIMAL(10,2) NOT NULL,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_seat_idx ON reservations (bus_id, seat_id) WHERE (status = 'confirmed');

-- 6. SEAT LOCKS (Temporary Hold - 3 Minutes)
CREATE TABLE seat_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (bus_id, seat_id)
);

-- 7. PRICING TABLE (Configurable Parameters)
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_key VARCHAR(50) UNIQUE NOT NULL,
    price_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checked_in_by VARCHAR(100) NOT NULL, -- Admin username
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. SYSTEM SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'warning', 'error', 'info')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ACTIVITY LOGS
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(20) NOT NULL, -- 'student' or 'admin'
    user_identifier VARCHAR(100) NOT NULL, -- student code or admin username
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    performed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES FOR HIGH PERFORMANCE
-- ==========================================
CREATE INDEX idx_students_code ON students (reservation_code);
CREATE INDEX idx_seats_bus ON seats (bus_id);
CREATE INDEX idx_reservations_bus_seat ON reservations (bus_id, seat_id);
CREATE INDEX idx_reservations_student ON reservations (student_id);
CREATE INDEX idx_seat_locks_expiry ON seat_locks (locked_until);
CREATE INDEX idx_activity_logs_time ON activity_logs (created_at DESC);
CREATE INDEX idx_audit_logs_time ON audit_logs (created_at DESC);

-- ==========================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ==========================================

-- A. Auto-cleanup of expired seat locks
CREATE OR REPLACE FUNCTION clean_expired_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM seat_locks WHERE locked_until < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Lock a seat function (Ensures transactional integrity)
CREATE OR REPLACE FUNCTION lock_seat(
    p_student_id UUID,
    p_bus_id UUID,
    p_seat_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_already_reserved INT;
    v_already_locked INT;
BEGIN
    -- First, clean expired locks
    PERFORM clean_expired_locks();

    -- Check if seat is reserved
    SELECT count(*) INTO v_already_reserved
    FROM reservations
    WHERE bus_id = p_bus_id AND seat_id = p_seat_id AND status = 'confirmed';

    IF v_already_reserved > 0 THEN
        RETURN FALSE;
    END IF;

    -- Check if seat is locked by someone else
    SELECT count(*) INTO v_already_locked
    FROM seat_locks
    WHERE bus_id = p_bus_id AND seat_id = p_seat_id AND student_id != p_student_id;

    IF v_already_locked > 0 THEN
        RETURN FALSE;
    END IF;

    -- Insert or update lock for this student (expires in 3 minutes)
    INSERT INTO seat_locks (bus_id, seat_id, student_id, locked_until)
    VALUES (p_bus_id, p_seat_id, p_student_id, now() + INTERVAL '3 minutes')
    ON CONFLICT (bus_id, seat_id) 
    DO UPDATE SET student_id = p_student_id, locked_until = now() + INTERVAL '3 minutes';

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Unlock seat function (explicit release)
CREATE OR REPLACE FUNCTION unlock_seat(
    p_student_id UUID,
    p_bus_id UUID,
    p_seat_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM seat_locks 
    WHERE bus_id = p_bus_id AND seat_id = p_seat_id AND student_id = p_student_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Confirm Reservation function
CREATE OR REPLACE FUNCTION confirm_reservation(
    p_student_id UUID,
    p_bus_id UUID,
    p_seat_id UUID,
    p_reservation_type VARCHAR(20),
    p_price DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
    v_reservation_id UUID;
    v_lock_exists INT;
    v_seat_reserved INT;
    v_student_bus_reservation INT;
BEGIN
    -- Clean expired locks
    PERFORM clean_expired_locks();

    -- Enforce one confirmed booking per student overall
    SELECT count(*) INTO v_student_bus_reservation
    FROM reservations
    WHERE student_id = p_student_id AND status = 'confirmed';

    IF v_student_bus_reservation > 0 THEN
        RAISE EXCEPTION 'Student already has a confirmed reservation.';
    END IF;

    -- Verify seat is not already reserved
    SELECT count(*) INTO v_seat_reserved
    FROM reservations
    WHERE bus_id = p_bus_id AND seat_id = p_seat_id AND status = 'confirmed';

    IF v_seat_reserved > 0 THEN
        RAISE EXCEPTION 'Seat is already reserved.';
    END IF;

    -- Verify student holds the lock, OR seat is not locked at all
    SELECT count(*) INTO v_lock_exists
    FROM seat_locks
    WHERE bus_id = p_bus_id AND seat_id = p_seat_id AND student_id != p_student_id;

    IF v_lock_exists > 0 THEN
        RAISE EXCEPTION 'Seat is locked by another user.';
    END IF;

    -- Insert Reservation
    INSERT INTO reservations (student_id, bus_id, seat_id, reservation_type, price, status)
    VALUES (p_student_id, p_bus_id, p_seat_id, p_reservation_type, p_price, 'confirmed')
    RETURNING id INTO v_reservation_id;

    -- Create Payment Entry
    INSERT INTO payments (reservation_id, amount, status, payment_method)
    VALUES (v_reservation_id, p_price, 'completed', 'cash');

    -- Remove lock
    DELETE FROM seat_locks WHERE bus_id = p_bus_id AND seat_id = p_seat_id;

    -- Log Activity
    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES (
        'student',
        (SELECT reservation_code FROM students WHERE id = p_student_id),
        'reserve',
        'Reserved seat ' || (SELECT seat_label FROM seats WHERE id = p_seat_id) || ' on bus ' || (SELECT name FROM buses WHERE id = p_bus_id)
    );

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. Secure Admin verification and operations RPCs
-- We verify admin queries by matching username & hashed password
CREATE OR REPLACE FUNCTION verify_admin(
    p_username VARCHAR(50),
    p_password_hash VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count
    FROM admins
    WHERE username = p_username AND password_hash = p_password_hash;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURE ADMIN CRUD PROCEDURES (To bypass direct RLS write blocks)
-- 1. Create/Update Bus
CREATE OR REPLACE FUNCTION admin_save_bus(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_bus_id UUID,
    p_name VARCHAR(100),
    p_driver_name VARCHAR(100),
    p_driver_phone VARCHAR(20),
    p_departure_time TIME,
    p_meeting_location VARCHAR(255),
    p_capacity INTEGER,
    p_notes TEXT,
    p_layout_template TEXT
)
RETURNS UUID AS $$
DECLARE
    v_bus_uuid UUID;
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    IF p_bus_id IS NULL THEN
        INSERT INTO buses (name, driver_name, driver_phone, departure_time, meeting_location, capacity, notes, layout_template)
        VALUES (p_name, p_driver_name, p_driver_phone, p_departure_time, p_meeting_location, p_capacity, p_notes, p_layout_template)
        RETURNING id INTO v_bus_uuid;
        
        -- Log
        INSERT INTO activity_logs (user_type, user_identifier, action, details)
        VALUES ('admin', p_admin_user, 'create_bus', 'Created bus: ' || p_name);
    ELSE
        UPDATE buses
        SET name = p_name, driver_name = p_driver_name, driver_phone = p_driver_phone,
            departure_time = p_departure_time, meeting_location = p_meeting_location,
            capacity = p_capacity, notes = p_notes, layout_template = p_layout_template
        WHERE id = p_bus_id;
        v_bus_uuid := p_bus_id;

        -- Log
        INSERT INTO activity_logs (user_type, user_identifier, action, details)
        VALUES ('admin', p_admin_user, 'update_bus', 'Updated bus: ' || p_name);
    END IF;

    RETURN v_bus_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Delete Bus
CREATE OR REPLACE FUNCTION admin_delete_bus(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_bus_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    DELETE FROM buses WHERE id = p_bus_id;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'delete_bus', 'Deleted bus ID: ' || p_bus_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Save Seats for a Bus
CREATE OR REPLACE FUNCTION admin_save_bus_seats(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_bus_id UUID,
    p_seats_json JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    seat_elem JSONB;
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    -- Delete existing seats
    DELETE FROM seats WHERE bus_id = p_bus_id;

    -- Insert new seats
    FOR seat_elem IN SELECT * FROM jsonb_array_elements(p_seats_json)
    LOOP
        INSERT INTO seats (bus_id, seat_label, seat_type, x_pos, y_pos, is_active)
        VALUES (
            p_bus_id, 
            (seat_elem->>'seat_label')::VARCHAR(10), 
            (seat_elem->>'seat_type')::VARCHAR(20), 
            (seat_elem->>'x_pos')::INTEGER, 
            (seat_elem->>'y_pos')::INTEGER, 
            COALESCE((seat_elem->>'is_active')::BOOLEAN, TRUE)
        );
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Save/Update Student
CREATE OR REPLACE FUNCTION admin_save_student(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_student_id UUID,
    p_full_name VARCHAR(100),
    p_reservation_code VARCHAR(50),
    p_phone_number VARCHAR(20),
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_student_uuid UUID;
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    IF p_student_id IS NULL THEN
        INSERT INTO students (full_name, reservation_code, phone_number, notes)
        VALUES (p_full_name, p_reservation_code, p_phone_number, p_notes)
        RETURNING id INTO v_student_uuid;

        -- Log
        INSERT INTO activity_logs (user_type, user_identifier, action, details)
        VALUES ('admin', p_admin_user, 'create_student', 'Created student: ' || p_full_name || ' (' || p_reservation_code || ')');
    ELSE
        UPDATE students
        SET full_name = p_full_name, reservation_code = p_reservation_code,
            phone_number = p_phone_number, notes = p_notes
        WHERE id = p_student_id;
        v_student_uuid := p_student_id;

        -- Log
        INSERT INTO activity_logs (user_type, user_identifier, action, details)
        VALUES ('admin', p_admin_user, 'update_student', 'Updated student: ' || p_full_name || ' (' || p_reservation_code || ')');
    END IF;

    RETURN v_student_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Delete Student
CREATE OR REPLACE FUNCTION admin_delete_student(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_student_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    DELETE FROM students WHERE id = p_student_id;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'delete_student', 'Deleted student ID: ' || p_student_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cancel Reservation
CREATE OR REPLACE FUNCTION admin_cancel_reservation(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_reservation_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    UPDATE reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'cancel_reservation', 'Cancelled reservation ID: ' || p_reservation_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update Pricing Settings
CREATE OR REPLACE FUNCTION admin_save_pricing(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_prices_json JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_key TEXT;
    v_val DECIMAL(10,2);
    pricing_elem RECORD;
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    FOR pricing_elem IN SELECT * FROM jsonb_each_text(p_prices_json)
    LOOP
        INSERT INTO pricing (price_key, price_value)
        VALUES (pricing_elem.key, pricing_elem.value::DECIMAL(10,2))
        ON CONFLICT (price_key)
        DO UPDATE SET price_value = EXCLUDED.price_value, updated_at = now();
    END LOOP;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'update_pricing', 'Updated system pricing values.');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update Settings
CREATE OR REPLACE FUNCTION admin_save_settings(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_key VARCHAR(50),
    p_val JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    INSERT INTO settings (setting_key, setting_value)
    VALUES (p_key, p_val)
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'update_settings', 'Updated system setting: ' || p_key);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Check-in Student (QR code scanner)
CREATE OR REPLACE FUNCTION admin_checkin_student(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_reservation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_student_name VARCHAR(100);
    v_seat_label VARCHAR(10);
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    -- Make sure reservation exists
    IF NOT EXISTS (SELECT 1 FROM reservations WHERE id = p_reservation_id) THEN
        RAISE EXCEPTION 'Reservation not found.';
    END IF;

    -- Retrieve info for logs
    SELECT s.full_name, se.seat_label INTO v_student_name, v_seat_label
    FROM reservations r
    JOIN students s ON r.student_id = s.id
    JOIN seats se ON r.seat_id = se.id
    WHERE r.id = p_reservation_id;

    -- Insert attendance record (upsert)
    INSERT INTO attendance (reservation_id, checked_in_by)
    VALUES (p_reservation_id, p_admin_user)
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'check_in', 'Checked-in student: ' || v_student_name || ' (Seat ' || v_seat_label || ')');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Bulk Import Students
CREATE OR REPLACE FUNCTION admin_bulk_import_students(
    p_admin_user VARCHAR(50),
    p_admin_pass_hash VARCHAR(255),
    p_students_json JSONB
)
RETURNS INT AS $$
DECLARE
    student_elem JSONB;
    v_imported_count INT := 0;
BEGIN
    IF NOT verify_admin(p_admin_user, p_admin_pass_hash) THEN
        RAISE EXCEPTION 'Unauthorized admin credentials.';
    END IF;

    FOR student_elem IN SELECT * FROM jsonb_array_elements(p_students_json)
    LOOP
        INSERT INTO students (full_name, reservation_code, phone_number, notes)
        VALUES (
            (student_elem->>'full_name')::VARCHAR(100),
            (student_elem->>'reservation_code')::VARCHAR(50),
            (student_elem->>'phone_number')::VARCHAR(20),
            (student_elem->>'notes')::TEXT
        )
        ON CONFLICT (reservation_code) DO UPDATE 
        SET full_name = EXCLUDED.full_name, phone_number = EXCLUDED.phone_number, notes = EXCLUDED.notes;
        
        v_imported_count := v_imported_count + 1;
    END LOOP;

    INSERT INTO activity_logs (user_type, user_identifier, action, details)
    VALUES ('admin', p_admin_user, 'bulk_import', 'Imported ' || v_imported_count || ' students.');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Student self-registration with automatic 4-digit reservation code generation
CREATE OR REPLACE FUNCTION student_register(
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(20),
    p_password_hash VARCHAR(255)
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_code VARCHAR(50);
    v_exists BOOLEAN;
BEGIN
    -- Ensure phone number is unique
    SELECT EXISTS(SELECT 1 FROM students WHERE phone_number = p_phone_number) INTO v_exists;
    IF v_exists THEN
        RAISE EXCEPTION 'phone_number_already_registered';
    END IF;

    -- Generate a unique 4-digit code
    LOOP
        v_code := floor(random() * 9000 + 1000)::text;
        SELECT EXISTS(SELECT 1 FROM students WHERE reservation_code = v_code) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;

    INSERT INTO students (full_name, phone_number, password_hash, reservation_code)
    VALUES (p_full_name, p_phone_number, p_password_hash, v_code);

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Verify student login by phone number and password hash
CREATE OR REPLACE FUNCTION student_login(
    p_phone_number VARCHAR(20),
    p_password_hash VARCHAR(255)
)
RETURNS SETOF students AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM students
    WHERE phone_number = p_phone_number AND password_hash = p_password_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Select/Read operations are open to standard clients to run the app
-- Write actions are forbidden except via Database Functions (SECURITY DEFINER)
-- which verify credentials, preventing bypassing the UI limitations.

-- Admins Table Policy (Hidden)
CREATE POLICY "Admins read access" ON admins FOR SELECT TO anon USING (FALSE);

-- Students Table Policy
CREATE POLICY "Public students read access" ON students FOR SELECT TO anon USING (TRUE);

-- Buses Table Policy
CREATE POLICY "Public buses read access" ON buses FOR SELECT TO anon USING (TRUE);

-- Seats Table Policy
CREATE POLICY "Public seats read access" ON seats FOR SELECT TO anon USING (TRUE);

-- Reservations Table Policy
CREATE POLICY "Public reservations read access" ON reservations FOR SELECT TO anon USING (TRUE);

-- Seat Locks Table Policy
CREATE POLICY "Public seat locks read access" ON seat_locks FOR SELECT TO anon USING (TRUE);

-- Pricing Table Policy
CREATE POLICY "Public pricing read access" ON pricing FOR SELECT TO anon USING (TRUE);

-- Payments Table Policy
CREATE POLICY "Public payments read access" ON payments FOR SELECT TO anon USING (TRUE);

-- Attendance Table Policy
CREATE POLICY "Public attendance read access" ON attendance FOR SELECT TO anon USING (TRUE);

-- Settings Table Policy
CREATE POLICY "Public settings read access" ON settings FOR SELECT TO anon USING (TRUE);

-- Notifications Table Policy
CREATE POLICY "Public notifications read access" ON notifications FOR SELECT TO anon USING (TRUE);

-- Activity Logs Table Policy
CREATE POLICY "Public activity logs read access" ON activity_logs FOR SELECT TO anon USING (TRUE);

-- Audit Logs Table Policy
CREATE POLICY "Public audit logs read access" ON audit_logs FOR SELECT TO anon USING (TRUE);


-- ==========================================
-- AUDIT LOGS TRIGGER ENGINE
-- ==========================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_val JSONB := NULL;
    new_val JSONB := NULL;
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        old_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        new_val := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        old_val := to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_val,
        new_val
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit trigger to key tables
CREATE TRIGGER audit_students_trigger AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_buses_trigger AFTER INSERT OR UPDATE OR DELETE ON buses
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_reservations_trigger AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_pricing_trigger AFTER INSERT OR UPDATE OR DELETE ON pricing
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ==========================================
-- SEED DATA SETUP
-- ==========================================

-- 1. Insert Default Admins (Password: admin123 -> SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)
INSERT INTO admins (username, password_hash, role)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Default Pricing Configs
INSERT INTO pricing (price_key, price_value, description) VALUES
('going_price', 35.00, 'One way ticket from meeting spot to exam center'),
('return_price', 35.00, 'One way ticket from exam center back to meeting spot'),
('round_trip_price', 60.00, 'Round trip ticket (Going & Return)'),
('vip_seat_fee', 10.00, 'Additional surcharge for VIP seat selection'),
('front_seat_fee', 5.00, 'Additional surcharge for Front seat selection'),
('discount_amount', 0.00, 'Standard discount applied to bookings')
ON CONFLICT (price_key) DO UPDATE SET price_value = EXCLUDED.price_value;

-- 3. Insert Default Settings
INSERT INTO settings (setting_key, setting_value) VALUES
('exam_countdown', '{"date": "2026-06-25T09:00:00", "title_ar": "امتحانات الترم الثاني", "title_en": "Second Semester Exams"}'),
('landing_stats', '{"buses": 12, "seats": 250, "trips": 48}'),
('system_general', '{"maintenance": false, "contact_phone": "+201001234567", "contact_email": "info@exambus.com"}')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 4. Seed Some Test Students
INSERT INTO students (full_name, reservation_code, phone_number, notes) VALUES
('أحمد محمد علي', 'STUD-1001', '+201011111111', 'حجز ذهاب فقط'),
('سارة محمود أحمد', 'STUD-1002', '+201022222222', 'حجز ذهاب وعودة'),
('يوسف كريم حسن', 'STUD-1003', '+201033333333', 'VIP مقعد'),
('نور الهدى مصطفى', 'STUD-1004', '+201044444444', '')
ON CONFLICT (reservation_code) DO NOTHING;

-- 5. Seed Test Buses
INSERT INTO buses (name, driver_name, driver_phone, departure_time, meeting_location, capacity, layout_template) VALUES
('Microbus 1 (Toyota Hiace)', 'عم محمد السواق', '+201211111111', '07:30:00', 'ميدان التحرير - أمام المتحف المصري', 14, 'toyota_14'),
('VIP Bus (Air Conditioned)', 'كابتن هاني شريف', '+201222222222', '08:00:00', 'بوابة الجامعة الرئيسية', 17, 'toyota_17'),
('Girls Microbus', 'عم جابر التونسي', '+201233333333', '07:30:00', 'محطة مترو جامعة القاهرة', 14, 'toyota_14')
ON CONFLICT DO NOTHING;

-- 6. Generate Default Seats for Seeded Buses
-- Bus 1 (Microbus 1 - 14 seats layout)
DO $$
DECLARE
    v_bus_id UUID;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE name = 'Microbus 1 (Toyota Hiace)' LIMIT 1;
    IF v_bus_id IS NOT NULL THEN
        -- Driver seat (y=0, x=0)
        INSERT INTO seats (bus_id, seat_label, seat_type, x_pos, y_pos, is_active) VALUES
        (v_bus_id, 'Driver', 'driver', 0, 0, TRUE),
        -- Row 1: Seat 1 (VIP Front) (y=0, x=2)
        (v_bus_id, '1', 'front', 2, 0, TRUE),
        -- Row 2: Seat 2 (Left), Seat 3 (Right) (y=1)
        (v_bus_id, '2', 'standard', 0, 1, TRUE),
        (v_bus_id, '3', 'standard', 2, 1, TRUE),
        -- Row 3: Seat 4 (Left), Seat 5 (Right) (y=2)
        (v_bus_id, '4', 'standard', 0, 2, TRUE),
        (v_bus_id, '5', 'standard', 2, 2, TRUE),
        -- Row 4: Seat 6 (Left), Seat 7 (Right) (y=3)
        (v_bus_id, '6', 'standard', 0, 3, TRUE),
        (v_bus_id, '7', 'standard', 2, 3, TRUE),
        -- Row 5: Seat 8 (Left), Seat 9 (Right) (y=4)
        (v_bus_id, '8', 'standard', 0, 4, TRUE),
        (v_bus_id, '9', 'standard', 2, 4, TRUE),
        -- Row 6 (Rear Bench): Seats 10, 11, 12, 13, 14 (y=5, x=0 to 4)
        (v_bus_id, '10', 'standard', 0, 5, TRUE),
        (v_bus_id, '11', 'standard', 1, 5, TRUE),
        (v_bus_id, '12', 'standard', 2, 5, TRUE),
        (v_bus_id, '13', 'standard', 3, 5, TRUE),
        (v_bus_id, '14', 'standard', 4, 5, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Bus 2 (VIP Bus - 17 seats layout)
DO $$
DECLARE
    v_bus_id UUID;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE name = 'VIP Bus (Air Conditioned)' LIMIT 1;
    IF v_bus_id IS NOT NULL THEN
        -- Driver seat (y=0, x=0)
        INSERT INTO seats (bus_id, seat_label, seat_type, x_pos, y_pos, is_active) VALUES
        (v_bus_id, 'Driver', 'driver', 0, 0, TRUE),
        -- Front row: Seat 1, Seat 2 (VIP Front) (y=0, x=2, 3)
        (v_bus_id, '1', 'front', 2, 0, TRUE),
        (v_bus_id, '2', 'front', 3, 0, TRUE),
        -- Row 2: Seat 3, Seat 4, Seat 5 (y=1)
        (v_bus_id, '3', 'vip', 0, 1, TRUE),
        (v_bus_id, '4', 'vip', 1, 1, TRUE),
        (v_bus_id, '5', 'vip', 3, 1, TRUE),
        -- Row 3: Seat 6, Seat 7, Seat 8 (y=2)
        (v_bus_id, '6', 'standard', 0, 2, TRUE),
        (v_bus_id, '7', 'standard', 1, 2, TRUE),
        (v_bus_id, '8', 'standard', 3, 2, TRUE),
        -- Row 4: Seat 9, Seat 10, Seat 11 (y=3)
        (v_bus_id, '9', 'standard', 0, 3, TRUE),
        (v_bus_id, '10', 'standard', 1, 3, TRUE),
        (v_bus_id, '11', 'standard', 3, 3, TRUE),
        -- Row 5 (Rear Bench): Seats 12, 13, 14, 15, 16, 17 (y=4, x=0 to 5)
        (v_bus_id, '12', 'standard', 0, 4, TRUE),
        (v_bus_id, '13', 'standard', 1, 4, TRUE),
        (v_bus_id, '14', 'standard', 2, 4, TRUE),
        (v_bus_id, '15', 'standard', 3, 4, TRUE),
        (v_bus_id, '16', 'standard', 4, 4, TRUE),
        (v_bus_id, '17', 'standard', 5, 4, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Bus 3 (Girls Microbus - 14 seats layout)
DO $$
DECLARE
    v_bus_id UUID;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE name = 'Girls Microbus' LIMIT 1;
    IF v_bus_id IS NOT NULL THEN
        -- Driver seat (y=0, x=0)
        INSERT INTO seats (bus_id, seat_label, seat_type, x_pos, y_pos, is_active) VALUES
        (v_bus_id, 'Driver', 'driver', 0, 0, TRUE),
        -- Row 1: Seat 1 (VIP Front) (y=0, x=2)
        (v_bus_id, '1', 'front', 2, 0, TRUE),
        -- Row 2: Seat 2 (Left), Seat 3 (Right) (y=1)
        (v_bus_id, '2', 'standard', 0, 1, TRUE),
        (v_bus_id, '3', 'standard', 2, 1, TRUE),
        -- Row 3: Seat 4 (Left), Seat 5 (Right) (y=2)
        (v_bus_id, '4', 'standard', 0, 2, TRUE),
        (v_bus_id, '5', 'standard', 2, 2, TRUE),
        -- Row 4: Seat 6 (Left), Seat 7 (Right) (y=3)
        (v_bus_id, '6', 'standard', 0, 3, TRUE),
        (v_bus_id, '7', 'standard', 2, 3, TRUE),
        -- Row 5: Seat 8 (Left), Seat 9 (Right) (y=4)
        (v_bus_id, '8', 'standard', 0, 4, TRUE),
        (v_bus_id, '9', 'standard', 2, 4, TRUE),
        -- Row 6 (Rear Bench): Seats 10, 11, 12, 13, 14 (y=5, x=0 to 4)
        (v_bus_id, '10', 'standard', 0, 5, TRUE),
        (v_bus_id, '11', 'standard', 1, 5, TRUE),
        (v_bus_id, '12', 'standard', 2, 5, TRUE),
        (v_bus_id, '13', 'standard', 3, 5, TRUE),
        (v_bus_id, '14', 'standard', 4, 5, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
