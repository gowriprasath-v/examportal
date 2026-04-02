-- PostgreSQL Schema for Secure Examination Data Management Portal on Vercel

-- 1. Custom Types (Postgres Enums)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Admin', 'Faculty', 'Student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exam_status AS ENUM ('draft', 'published', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS student_exam_status CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    role VARCHAR(50),
    ip VARCHAR(45),
    event_type VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Exams Table
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) DEFAULT NULL,
  description TEXT,
  duration INT NOT NULL, -- in minutes
  scheduled_at TIMESTAMP DEFAULT NULL,
  instructions TEXT DEFAULT NULL,
  created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status exam_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Questions Table
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option1 VARCHAR(255) NOT NULL,
  option2 VARCHAR(255) NOT NULL,
  option3 VARCHAR(255) NOT NULL,
  option4 VARCHAR(255) NOT NULL,
  correct_option SMALLINT NOT NULL -- 1, 2, 3, or 4
);

-- 7. Results Table
CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Student Exam Status Table
CREATE TABLE student_exam_status (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'STARTED',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_id)
);
