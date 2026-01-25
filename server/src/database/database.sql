CREATE TABLE IF NOT EXISTS messages_snake (
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    user_send INT NOT NULL,
    user_receive INT NOT NULL,
    response_to INT NULL,
    message TEXT NOT NULL,
    type ENUM('text', 'image', 'video', 'audio', 'file') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users_snake (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    code VARCHAR(20) NULL
);

-- Insert default characters if they don't exist
INSERT IGNORE INTO users_snake (id, name, color, code) VALUES 
(1, 'Original', '#22c55e', NULL),
(2, 'Celeste', '#06b6d4', '2707'),
(3, 'Jeremy', '#eab308', '2707'),
(4, 'Void Purple', '#a855f7', '2707');