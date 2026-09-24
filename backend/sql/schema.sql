-- Users table (Phase 1: Authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Project Types (Phase 2: Project Upload)
CREATE TABLE IF NOT EXISTS project_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO project_types (code, name, description) VALUES
  ('PASANG_BARU', 'Pasang Baru', 'New installation project'),
  ('GANGGUAN', 'Gangguan', 'Fault/troubleshooting project'),
  ('MUTASI', 'Mutasi', 'Migration project'),
  ('RELOKASI', 'Relokasi', 'Relocation project'),
  ('PERLUASAN_COVERAGE', 'Perluasan Coverage', 'Coverage expansion project'),
  ('RELOKASI_BACKBONE', 'Relokasi Backbone', 'Backbone relocation project'),
  ('ADD_ON', 'Add On', 'Additional service project'),
  ('PREVENTIVE_MAINTENANCE', 'Preventive Maintenance', 'Preventive maintenance project')
ON CONFLICT (code) DO NOTHING;

-- Projects table (Phase 2: Project Upload)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(100) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  project_type VARCHAR(50) REFERENCES project_types(code),
  customer VARCHAR(255),
  province VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  boq_proposed_length DECIMAL,
  kmz_selected_length DECIMAL,
  length_difference DECIMAL,
  length_difference_percentage DECIMAL,
  total_project_value DECIMAL,
  validation_status VARCHAR(20) DEFAULT 'PENDING',
  review_status VARCHAR(20) DEFAULT 'PENDING_REVIEW',
  created_by INTEGER REFERENCES users(id),
  current_khs_version_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_review_status ON projects(review_status);
CREATE INDEX IF NOT EXISTS idx_projects_validation_status ON projects(validation_status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Project Files (Phase 2: Project Upload)
CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  file_type VARCHAR(10) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) UNIQUE NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_stored_filename ON project_files(stored_filename);

-- Project Reviews (Phase 7: Admin Review)
CREATE TABLE IF NOT EXISTS project_reviews (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(20) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_reviews_project_id ON project_reviews(project_id);

-- Audit Logs (Phase 12: Audit & Notification)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Notifications (Phase 12: Audit & Notification)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- KHS Master (Phase 11.1: KHS Master Dashboard)
CREATE TABLE IF NOT EXISTS khs_items (
  id SERIAL PRIMARY KEY,
  item_category VARCHAR(20) NOT NULL,
  product_no VARCHAR(100) UNIQUE NOT NULL,
  product_desc TEXT,
  item_price DECIMAL NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_khs_items_product_no ON khs_items(product_no);
CREATE INDEX IF NOT EXISTS idx_khs_items_category ON khs_items(item_category);
CREATE INDEX IF NOT EXISTS idx_khs_items_active ON khs_items(is_active);

-- Project BoQ Items (untuk ProjectDetail: daftar item BoQ + perbandingan KHS)
CREATE TABLE IF NOT EXISTS project_boq_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  product_no VARCHAR(100) NOT NULL,
  product_desc TEXT,
  quantity DECIMAL,
  unit VARCHAR(50),
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boq_items_project_id ON project_boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_product_no ON project_boq_items(product_no);

-- Seed admin user (password: Admin123!)
INSERT INTO users (username, full_name, email, password_hash, role, must_change_password, is_active)
VALUES (
  'admin',
  'Administrator',
  'admin@portalprojectfo.local',
  '$2b$10$wMGPftGaErjpGKhAFAjkrO3oY1UZCPzpoPGR0ab3SMBNPxgVqGJR.',
  'ADMIN',
  FALSE,
  TRUE
) ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  must_change_password = EXCLUDED.must_change_password,
  is_active = EXCLUDED.is_active;
