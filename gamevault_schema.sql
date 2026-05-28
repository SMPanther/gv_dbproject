-- ============================================================
--  GameVault DB Systems Project
--  Database: gamevault
--  Author:   Umer (L1F24BSCS0601)
--  DBMS:     MySQL 8.x  |  Tool: MySQL Workbench
-- ============================================================

DROP DATABASE IF EXISTS gamevault;
CREATE DATABASE gamevault
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gamevault;

-- ============================================================
-- TABLE 1: USERS
-- ============================================================
CREATE TABLE users (
    user_id       INT            NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)    NOT NULL,
    email         VARCHAR(100)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    role          ENUM('buyer','seller','admin') NOT NULL DEFAULT 'buyer',
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users        PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email  UNIQUE      (email),
    CONSTRAINT uq_users_uname  UNIQUE      (username)
);

-- ============================================================
-- TABLE 2: GAMES
-- ============================================================
CREATE TABLE games (
    game_id      INT            NOT NULL AUTO_INCREMENT,
    title        VARCHAR(150)   NOT NULL,
    genre        VARCHAR(50)    NOT NULL,
    price        DECIMAL(8,2)   NOT NULL CHECK (price >= 0),
    platform     VARCHAR(50)    NOT NULL,
    developer    VARCHAR(100)   NOT NULL,
    release_date DATE,
    CONSTRAINT pk_games       PRIMARY KEY (game_id),
    CONSTRAINT uq_games_title UNIQUE      (title, platform)
);

-- ============================================================
-- TABLE 3: USER_GAMES  (many-to-many: Users <-> Games)
-- ============================================================
CREATE TABLE user_games (
    ug_id       INT       NOT NULL AUTO_INCREMENT,
    user_id     INT       NOT NULL,
    game_id     INT       NOT NULL,
    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status      ENUM('active','wishlist','traded') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_user_games          PRIMARY KEY (ug_id),
    CONSTRAINT uq_user_games          UNIQUE      (user_id, game_id),
    CONSTRAINT fk_ug_user             FOREIGN KEY (user_id)
        REFERENCES users(user_id)     ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_ug_game             FOREIGN KEY (game_id)
        REFERENCES games(game_id)     ON DELETE CASCADE  ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 4: MARKETPLACE_LISTINGS
-- ============================================================
CREATE TABLE marketplace_listings (
    listing_id     INT           NOT NULL AUTO_INCREMENT,
    seller_id      INT           NOT NULL,
    game_id        INT           NOT NULL,
    ask_price      DECIMAL(8,2)  NOT NULL CHECK (ask_price > 0),
    listing_status ENUM('active','sold','cancelled') NOT NULL DEFAULT 'active',
    listed_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_listings      PRIMARY KEY (listing_id),
    CONSTRAINT fk_lst_seller    FOREIGN KEY (seller_id)
        REFERENCES users(user_id)   ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_lst_game      FOREIGN KEY (game_id)
        REFERENCES games(game_id)   ON DELETE CASCADE  ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 5: OFFERS
-- ============================================================
CREATE TABLE offers (
    offer_id     INT           NOT NULL AUTO_INCREMENT,
    listing_id   INT           NOT NULL,
    buyer_id     INT           NOT NULL,
    offer_price  DECIMAL(8,2)  NOT NULL CHECK (offer_price > 0),
    offer_status ENUM('pending','accepted','rejected','countered') NOT NULL DEFAULT 'pending',
    offered_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_offers        PRIMARY KEY (offer_id),
    CONSTRAINT fk_off_listing   FOREIGN KEY (listing_id)
        REFERENCES marketplace_listings(listing_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_off_buyer     FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)   ON DELETE CASCADE  ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 6: REVIEWS
-- ============================================================
CREATE TABLE reviews (
    review_id  INT       NOT NULL AUTO_INCREMENT,
    user_id    INT       NOT NULL,
    game_id    INT       NOT NULL,
    rating     TINYINT   NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_reviews        PRIMARY KEY (review_id),
    CONSTRAINT uq_one_review     UNIQUE      (user_id, game_id),
    CONSTRAINT fk_rev_user       FOREIGN KEY (user_id)
        REFERENCES users(user_id)   ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_rev_game       FOREIGN KEY (game_id)
        REFERENCES games(game_id)   ON DELETE CASCADE  ON UPDATE CASCADE
);

-- ============================================================
-- INDEXES  (speed up common JOINs and filters)
-- ============================================================
CREATE INDEX idx_ug_game         ON user_games(game_id);
CREATE INDEX idx_lst_seller      ON marketplace_listings(seller_id);
CREATE INDEX idx_lst_game        ON marketplace_listings(game_id);
CREATE INDEX idx_lst_status      ON marketplace_listings(listing_status);
CREATE INDEX idx_off_listing     ON offers(listing_id);
CREATE INDEX idx_off_buyer       ON offers(buyer_id);
CREATE INDEX idx_rev_game        ON reviews(game_id);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Users
INSERT INTO users (username, email, password_hash, role) VALUES
('umer01',    'umer@example.com',    SHA2('pass1234',256), 'seller'),
('ali_gamer', 'ali@example.com',     SHA2('ali5678',256),  'buyer'),
('sara_dev',  'sara@example.com',    SHA2('sara9999',256), 'buyer'),
('admin_gv',  'admin@gamevault.com', SHA2('admin000',256), 'admin');

-- Games
INSERT INTO games (title, genre, price, platform, developer, release_date) VALUES
('Kena: Bridge of Spirits',  'Action-Adventure', 39.99, 'PC',   'Ember Lab',       '2021-09-21'),
('Elden Ring',               'RPG',              59.99, 'PC',   'FromSoftware',    '2022-02-25'),
('FIFA 24',                  'Sports',           69.99, 'PC',   'EA Sports',       '2023-09-29'),
('Tekken 8',                 'Fighting',         59.99, 'PC',   'Bandai Namco',    '2024-01-26'),
('Hollow Knight',            'Metroidvania',     14.99, 'PC',   'Team Cherry',     '2017-02-24'),
('Red Dead Redemption 2',    'Open World',       59.99, 'PC',   'Rockstar Games',  '2019-11-05');

-- User game collections
INSERT INTO user_games (user_id, game_id, status) VALUES
(1, 1, 'active'),
(1, 2, 'active'),
(2, 3, 'active'),
(2, 4, 'active'),
(3, 5, 'active'),
(3, 6, 'wishlist');

-- Marketplace listings
INSERT INTO marketplace_listings (seller_id, game_id, ask_price, listing_status) VALUES
(1, 1, 29.99, 'active'),
(1, 2, 45.00, 'active'),
(2, 3, 55.00, 'active');

-- Offers
INSERT INTO offers (listing_id, buyer_id, offer_price, offer_status) VALUES
(1, 2, 25.00, 'pending'),
(1, 3, 27.50, 'pending'),
(2, 3, 40.00, 'accepted');

-- Reviews
INSERT INTO reviews (user_id, game_id, rating, comment) VALUES
(1, 2, 5, 'Masterpiece. Challenging but rewarding.'),
(2, 3, 4, 'Solid FIFA year, good gameplay improvements.'),
(3, 5, 5, 'One of the best indie games ever made.'),
(1, 1, 5, 'Beautiful game with amazing animation.'),
(2, 4, 4, 'Great fighting game, huge roster.');

-- ============================================================
-- QUERIES  (demonstrate JOINs, subqueries, aggregates)
-- ============================================================

-- Q1: All games owned by a specific user (JOIN)
SELECT u.username, g.title, g.genre, g.platform, ug.acquired_at
FROM users u
JOIN user_games ug ON u.user_id = ug.user_id
JOIN games g       ON ug.game_id = g.game_id
WHERE u.username = 'umer01';

-- Q2: Average rating per game with review count (GROUP BY + HAVING)
SELECT g.title, g.genre,
       ROUND(AVG(r.rating), 2) AS avg_rating,
       COUNT(r.review_id)      AS total_reviews
FROM games g
JOIN reviews r ON g.game_id = r.game_id
GROUP BY g.game_id, g.title, g.genre
HAVING COUNT(r.review_id) >= 1
ORDER BY avg_rating DESC;

-- Q3: Active marketplace listings with seller name and highest offer (subquery)
SELECT ml.listing_id,
       u.username         AS seller,
       g.title            AS game,
       ml.ask_price,
       (SELECT MAX(o.offer_price)
        FROM offers o
        WHERE o.listing_id = ml.listing_id) AS best_offer
FROM marketplace_listings ml
JOIN users u ON ml.seller_id = u.user_id
JOIN games g ON ml.game_id   = g.game_id
WHERE ml.listing_status = 'active'
ORDER BY ml.listed_at DESC;

-- Q4: Games on wishlist that are also listed in marketplace (subquery in WHERE)
SELECT DISTINCT g.title, g.platform, g.price
FROM games g
WHERE g.game_id IN (
    SELECT ug.game_id FROM user_games ug WHERE ug.status = 'wishlist'
)
AND g.game_id IN (
    SELECT ml.game_id FROM marketplace_listings ml WHERE ml.listing_status = 'active'
);

-- Q5: Top sellers by number of active listings (aggregate + JOIN)
SELECT u.username,
       COUNT(ml.listing_id) AS active_listings,
       SUM(ml.ask_price)    AS total_ask_value
FROM users u
JOIN marketplace_listings ml ON u.user_id = ml.seller_id
WHERE ml.listing_status = 'active'
GROUP BY u.user_id, u.username
ORDER BY active_listings DESC;

-- Q6: Users who own games from more than one genre (GROUP BY + HAVING + subquery)
SELECT u.username, COUNT(DISTINCT g.genre) AS genre_count
FROM users u
JOIN user_games ug ON u.user_id = ug.user_id
JOIN games g       ON ug.game_id = g.game_id
GROUP BY u.user_id, u.username
HAVING COUNT(DISTINCT g.genre) > 1;
