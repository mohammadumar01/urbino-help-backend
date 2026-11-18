-- Saare naye connections IST timezone mein (cloud DB default UTC hota hai).
-- Purana local DB pehle se Asia/Calcutta par tha, isliye data mein koi farak nahi.
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Kolkata');
END $$;
-- Isi connection ke liye bhi (single-process mode mein yahi connection aage use hota hai)
SET TIME ZONE 'Asia/Kolkata';
