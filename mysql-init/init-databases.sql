CREATE DATABASE IF NOT EXISTS cinepholia_db;
CREATE DATABASE IF NOT EXISTS cinepholia_test_db;

GRANT ALL PRIVILEGES ON cinepholia_db.* TO 'cinepholia_admin'@'%';
GRANT ALL PRIVILEGES ON cinepholia_test_db.* TO 'cinepholia_admin'@'%';

FLUSH PRIVILEGES;
