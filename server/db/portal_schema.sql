-- Portal Schema for Secure Examination Data Management Portal

-- Drop existing tables in reverse order of dependencies
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS student_exam_status;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Faculty', 'Student') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    role VARCHAR(50),
    ip VARCHAR(45),
    event_type VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) DEFAULT NULL,
  description TEXT,
  duration INT NOT NULL, -- in minutes
  scheduled_at DATETIME DEFAULT NULL,
  instructions TEXT DEFAULT NULL,
  created_by INT NOT NULL,
  status ENUM('draft', 'published', 'disabled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  question TEXT NOT NULL,
  option1 VARCHAR(255) NOT NULL,
  option2 VARCHAR(255) NOT NULL,
  option3 VARCHAR(255) NOT NULL,
  option4 VARCHAR(255) NOT NULL,
  correct_option TINYINT NOT NULL, -- 1, 2, 3, or 4
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- 5. Results Table
CREATE TABLE IF NOT EXISTS results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- 6. Student Exam Status Table (for tracking progress/completion)
CREATE TABLE IF NOT EXISTS student_exam_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'STARTED', -- e.g., 'STARTED', 'COMPLETED'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);
