-- Run once on the pre-auth database before seeding its designated owner.
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email TEXT NOT NULL CONSTRAINT users_email_unique UNIQUE,
 password_hash TEXT NOT NULL
);
