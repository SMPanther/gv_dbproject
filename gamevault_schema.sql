-- ============================================================
--  GameVault DB Systems Project 
--  Database: gamevault
--  Author:   Umer (L1F24BSCS0601)
--  DBMS:     MySQL 8.x  |  Tool: MySQL Workbench
--  Includes: Schema, Views, Stored Procedures, Transactions,
--            Complex Queries
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
-- TABLE 2: WALLETS
-- ============================================================
CREATE TABLE wallets (
    wallet_id   INT           NOT NULL AUTO_INCREMENT,
    user_id     INT           NOT NULL,
    balance     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_wallets      PRIMARY KEY (wallet_id),
    CONSTRAINT uq_wallets_user UNIQUE      (user_id),
    CONSTRAINT fk_wallet_user  FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 3: GAMES
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
-- TABLE 6: WALLET_TRANSACTIONS
-- ============================================================
CREATE TABLE wallet_transactions (
    transaction_id     INT            NOT NULL AUTO_INCREMENT,
    wallet_id          INT            NOT NULL,
    transaction_type   ENUM('deposit','withdrawal','hold','release','sale_credit','refund') NOT NULL,
    amount             DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
    balance_after      DECIMAL(12,2)  NOT NULL,
    related_offer_id   INT            NULL,
    related_listing_id INT            NULL,
    note               VARCHAR(255),
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_wallet_transactions PRIMARY KEY (transaction_id),
    CONSTRAINT fk_wt_wallet           FOREIGN KEY (wallet_id)
        REFERENCES wallets(wallet_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_wt_offer            FOREIGN KEY (related_offer_id)
        REFERENCES offers(offer_id) ON DELETE SET NULL,
    CONSTRAINT fk_wt_listing          FOREIGN KEY (related_listing_id)
        REFERENCES marketplace_listings(listing_id) ON DELETE SET NULL
);

CREATE INDEX idx_wallet_user ON wallets(user_id);
CREATE INDEX idx_wt_wallet ON wallet_transactions(wallet_id);

-- ============================================================
-- TABLE 7: REVIEWS
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
-- INDEXES
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

INSERT INTO users (username, email, password_hash, role) VALUES
('umer01',    'umer@example.com',    'pass1234', 'seller'),
('ali_gamer', 'ali@example.com',     'ali5678',  'buyer'),
('sara_dev',  'sara@example.com',    'sara9999', 'buyer'),
('admin_gv',  'admin@gamevault.com', 'admin000', 'admin');

INSERT INTO wallets (user_id, balance) VALUES
(1, 100.00),
(2, 80.00),
(3, 60.00),
(4, 250.00);

INSERT INTO games (title, genre, price, platform, developer, release_date) VALUES
('Kena: Bridge of Spirits',  'Action-Adventure', 39.99, 'PC',   'Ember Lab',       '2021-09-21'),
('Elden Ring',               'RPG',              59.99, 'PC',   'FromSoftware',    '2022-02-25'),
('FIFA 24',                  'Sports',           69.99, 'PC',   'EA Sports',       '2023-09-29'),
('Tekken 8',                 'Fighting',         59.99, 'PC',   'Bandai Namco',    '2024-01-26'),
('Hollow Knight',            'Metroidvania',     14.99, 'PC',   'Team Cherry',     '2017-02-24'),
('Red Dead Redemption 2',    'Open World',       59.99, 'PC',   'Rockstar Games',  '2019-11-05');

INSERT INTO user_games (user_id, game_id, status) VALUES
(1, 1, 'active'), (1, 2, 'active'),
(2, 3, 'active'), (2, 4, 'active'),
(3, 5, 'active'), (3, 6, 'wishlist');

INSERT INTO marketplace_listings (seller_id, game_id, ask_price, listing_status) VALUES
(1, 1, 29.99, 'active'),
(1, 2, 45.00, 'active'),
(2, 3, 55.00, 'active');

INSERT INTO offers (listing_id, buyer_id, offer_price, offer_status) VALUES
(1, 2, 25.00, 'pending'),
(1, 3, 27.50, 'pending'),
(2, 3, 40.00, 'pending');

INSERT INTO reviews (user_id, game_id, rating, comment) VALUES
(1, 2, 5, 'Masterpiece. Challenging but rewarding.'),
(2, 3, 4, 'Solid FIFA year, good gameplay improvements.'),
(3, 5, 5, 'One of the best indie games ever made.'),
(1, 1, 5, 'Beautiful game with amazing animation.'),
(2, 4, 4, 'Great fighting game, huge roster.');


-- ============================================================
-- VIEWS
-- ============================================================

-- VIEW 1: Active marketplace listings with seller, game, best offer
CREATE VIEW vw_active_listings AS
SELECT
    ml.listing_id,
    u.username          AS seller,
    g.title             AS game_title,
    g.genre,
    g.platform,
    ml.ask_price,
    ml.listed_at,
    (SELECT MAX(o.offer_price)
     FROM offers o
     WHERE o.listing_id = ml.listing_id) AS best_offer,
    (SELECT COUNT(*)
     FROM offers o
     WHERE o.listing_id = ml.listing_id) AS total_offers
FROM marketplace_listings ml
JOIN users u ON ml.seller_id = u.user_id
JOIN games g ON ml.game_id   = g.game_id
WHERE ml.listing_status = 'active';

-- VIEW 2: Game ratings leaderboard
CREATE VIEW vw_game_ratings AS
SELECT
    g.game_id,
    g.title,
    g.genre,
    g.platform,
    g.developer,
    g.price,
    ROUND(AVG(r.rating), 2)  AS avg_rating,
    COUNT(r.review_id)        AS review_count,
    MAX(r.rating)             AS highest_rating,
    MIN(r.rating)             AS lowest_rating
FROM games g
LEFT JOIN reviews r ON g.game_id = r.game_id
GROUP BY g.game_id, g.title, g.genre, g.platform, g.developer, g.price;

-- VIEW 3: User collection summary
CREATE VIEW vw_user_collections AS
SELECT
    u.user_id,
    u.username,
    u.role,
    COUNT(ug.ug_id)                                          AS total_games,
    SUM(CASE WHEN ug.status = 'active'   THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN ug.status = 'wishlist' THEN 1 ELSE 0 END) AS wishlist_count,
    SUM(CASE WHEN ug.status = 'traded'   THEN 1 ELSE 0 END) AS traded_count,
    ROUND(SUM(g.price), 2)                                   AS total_library_value
FROM users u
LEFT JOIN user_games ug ON u.user_id = ug.user_id
LEFT JOIN games g       ON ug.game_id = g.game_id
GROUP BY u.user_id, u.username, u.role;

-- USE VIEWS:
SELECT * FROM vw_active_listings;
SELECT * FROM vw_game_ratings    ORDER BY avg_rating DESC;
SELECT * FROM vw_user_collections;


-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER $$

-- PROCEDURE 1: Get full game library for a user
CREATE PROCEDURE GetUserLibrary(IN p_user_id INT)
BEGIN
    SELECT
        g.game_id,
        g.title,
        g.genre,
        g.platform,
        g.developer,
        g.price,
        ug.status,
        ug.acquired_at
    FROM user_games ug
    JOIN games g ON ug.game_id = g.game_id
    WHERE ug.user_id = p_user_id
    ORDER BY ug.acquired_at DESC;
END$$

-- PROCEDURE 2: Get top N rated games
CREATE PROCEDURE GetTopRatedGames(IN p_limit INT)
BEGIN
    SELECT
        g.title,
        g.genre,
        g.platform,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(r.review_id)      AS review_count
    FROM games g
    JOIN reviews r ON g.game_id = r.game_id
    GROUP BY g.game_id, g.title, g.genre, g.platform
    HAVING COUNT(r.review_id) > 0
    ORDER BY avg_rating DESC
    LIMIT p_limit;
END$$

-- PROCEDURE 3: Get all offers on a listing with buyer info
CREATE PROCEDURE GetListingOffers(IN p_listing_id INT)
BEGIN
    SELECT
        o.offer_id,
        u.username      AS buyer,
        o.offer_price,
        o.offer_status,
        o.offered_at,
        ml.ask_price,
        ROUND((o.offer_price / ml.ask_price) * 100, 1) AS pct_of_ask
    FROM offers o
    JOIN users u                  ON o.buyer_id   = u.user_id
    JOIN marketplace_listings ml  ON o.listing_id = ml.listing_id
    WHERE o.listing_id = p_listing_id
    ORDER BY o.offer_price DESC;
END$$

-- PROCEDURE 4: Search games by title keyword or genre
CREATE PROCEDURE SearchGames(IN p_keyword VARCHAR(100), IN p_genre VARCHAR(50))
BEGIN
    SELECT
        g.game_id,
        g.title,
        g.genre,
        g.platform,
        g.developer,
        g.price,
        ROUND(AVG(r.rating), 2) AS avg_rating
    FROM games g
    LEFT JOIN reviews r ON g.game_id = r.game_id
    WHERE
        (p_keyword IS NULL OR g.title LIKE CONCAT('%', p_keyword, '%'))
        AND
        (p_genre IS NULL OR g.genre = p_genre)
    GROUP BY g.game_id, g.title, g.genre, g.platform, g.developer, g.price
    ORDER BY g.title;
END$$

-- PROCEDURE 5: Get full marketplace summary for a seller
CREATE PROCEDURE GetSellerDashboard(IN p_seller_id INT)
BEGIN
    -- Active listings
    SELECT 'Active Listings' AS section;
    SELECT
        ml.listing_id,
        g.title,
        ml.ask_price,
        ml.listed_at,
        (SELECT COUNT(*) FROM offers o WHERE o.listing_id = ml.listing_id) AS offer_count,
        (SELECT MAX(o.offer_price) FROM offers o WHERE o.listing_id = ml.listing_id) AS best_offer
    FROM marketplace_listings ml
    JOIN games g ON ml.game_id = g.game_id
    WHERE ml.seller_id = p_seller_id AND ml.listing_status = 'active';

    -- Sales summary
    SELECT 'Sales Summary' AS section;
    SELECT
        COUNT(*) AS total_listings,
        SUM(CASE WHEN listing_status = 'active'    THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN listing_status = 'sold'      THEN 1 ELSE 0 END) AS sold,
        SUM(CASE WHEN listing_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
    FROM marketplace_listings
    WHERE seller_id = p_seller_id;
END$$

DELIMITER ;

-- CALL STORED PROCEDURES:
CALL GetUserLibrary(1);
CALL GetTopRatedGames(3);
CALL GetListingOffers(1);
CALL SearchGames('Ring', NULL);
CALL SearchGames(NULL, 'RPG');
CALL GetSellerDashboard(1);


-- ============================================================
-- TRANSACTIONS
-- ============================================================

-- TRANSACTION 1: Accept an offer atomically
--   - Marks chosen offer as accepted
--   - Marks all other offers on same listing as rejected
--   - Marks the listing as sold
--   - Rolls back everything if any step fails

START TRANSACTION;

    -- Step 1: Accept the chosen offer (offer_id = 1)
    UPDATE offers
    SET offer_status = 'accepted'
    WHERE offer_id = 1;

    -- Step 2: Save the listing ID before updating the offers table again
    SET @listing_id = (SELECT listing_id FROM offers WHERE offer_id = 1);

    -- Step 3: Reject all other pending offers on the same listing
    UPDATE offers
    SET offer_status = 'rejected'
    WHERE listing_id = @listing_id
      AND offer_id != 1
      AND offer_status = 'pending';

    -- Step 4: Mark the listing as sold
    UPDATE marketplace_listings
    SET listing_status = 'sold'
    WHERE listing_id = @listing_id;

COMMIT;

-- Verify the transaction results
SELECT offer_id, offer_status FROM offers WHERE listing_id = 1;
SELECT listing_id, listing_status FROM marketplace_listings WHERE listing_id = 1;


-- TRANSACTION 2: Transfer game ownership after sale
--   - Mark seller's game as traded
--   - Add game to buyer's collection
--   - Rolls back if any step fails

START TRANSACTION;

    -- Step 1: Mark seller's copy as traded (seller=user 1, game=Kena)
    UPDATE user_games
    SET status = 'traded'
    WHERE user_id = 1 AND game_id = 1;

    -- Step 2: Add game to buyer's collection (buyer=user 2)
    INSERT INTO user_games (user_id, game_id, status)
    VALUES (2, 1, 'active')
    ON DUPLICATE KEY UPDATE status = 'active';

COMMIT;

-- Verify ownership transfer
SELECT u.username, g.title, ug.status
FROM user_games ug
JOIN users u ON ug.user_id = u.user_id
JOIN games g ON ug.game_id = g.game_id
WHERE g.game_id = 1;


-- ============================================================
-- COMPLEX QUERIES (10 total)
-- ============================================================

-- Q1: All games owned by a specific user (INNER JOIN x2)
SELECT u.username, g.title, g.genre, g.platform, ug.status, ug.acquired_at
FROM users u
JOIN user_games ug ON u.user_id = ug.user_id
JOIN games g       ON ug.game_id = g.game_id
WHERE u.username = 'umer01'
ORDER BY ug.acquired_at DESC;

-- Q2: Average rating per game (GROUP BY + HAVING + AVG)
SELECT g.title, g.genre,
       ROUND(AVG(r.rating), 2) AS avg_rating,
       COUNT(r.review_id)      AS total_reviews
FROM games g
JOIN reviews r ON g.game_id = r.game_id
GROUP BY g.game_id, g.title, g.genre
HAVING COUNT(r.review_id) >= 1
ORDER BY avg_rating DESC;

-- Q3: Active listings with best offer (correlated subquery)
SELECT ml.listing_id,
       u.username  AS seller,
       g.title     AS game,
       ml.ask_price,
       (SELECT MAX(o.offer_price)
        FROM offers o
        WHERE o.listing_id = ml.listing_id) AS best_offer
FROM marketplace_listings ml
JOIN users u ON ml.seller_id = u.user_id
JOIN games g ON ml.game_id   = g.game_id
WHERE ml.listing_status = 'active'
ORDER BY ml.listed_at DESC;

-- Q4: Wishlist games available in marketplace (subquery in WHERE)
SELECT DISTINCT g.title, g.platform, g.price
FROM games g
WHERE g.game_id IN (
    SELECT ug.game_id FROM user_games ug WHERE ug.status = 'wishlist'
)
AND g.game_id IN (
    SELECT ml.game_id FROM marketplace_listings ml WHERE ml.listing_status = 'active'
);

-- Q5: Top sellers by active listings (aggregate + JOIN)
SELECT u.username,
       COUNT(ml.listing_id) AS active_listings,
       SUM(ml.ask_price)    AS total_ask_value
FROM users u
JOIN marketplace_listings ml ON u.user_id = ml.seller_id
WHERE ml.listing_status = 'active'
GROUP BY u.user_id, u.username
ORDER BY active_listings DESC;

-- Q6: Users who own games from more than one genre (HAVING + COUNT DISTINCT)
SELECT u.username, COUNT(DISTINCT g.genre) AS genre_count
FROM users u
JOIN user_games ug ON u.user_id = ug.user_id
JOIN games g       ON ug.game_id = g.game_id
GROUP BY u.user_id, u.username
HAVING COUNT(DISTINCT g.genre) > 1;

-- Q7: Games in a price range (BETWEEN)
SELECT title, genre, platform, developer, price
FROM games
WHERE price BETWEEN 14.99 AND 59.99
ORDER BY price ASC;

-- Q8: Search games by partial title (LIKE)
SELECT game_id, title, genre, platform, price
FROM games
WHERE title LIKE '%Ring%'
   OR title LIKE '%Knight%'
ORDER BY title;

-- Q9: Games with zero reviews (LEFT JOIN + IS NULL)
SELECT g.title, g.genre, g.platform, g.price
FROM games g
LEFT JOIN reviews r ON g.game_id = r.game_id
WHERE r.review_id IS NULL;

-- Q10: Complete user activity report (multi-table JOIN + aggregates)
SELECT
    u.username,
    u.role,
    COUNT(DISTINCT ug.ug_id)   AS games_owned,
    COUNT(DISTINCT ml.listing_id) AS listings_created,
    COUNT(DISTINCT o.offer_id)    AS offers_made,
    COUNT(DISTINCT r.review_id)   AS reviews_written
FROM users u
LEFT JOIN user_games          ug ON u.user_id = ug.user_id
LEFT JOIN marketplace_listings ml ON u.user_id = ml.seller_id
LEFT JOIN offers               o  ON u.user_id = o.buyer_id
LEFT JOIN reviews              r  ON u.user_id = r.user_id
GROUP BY u.user_id, u.username, u.role
ORDER BY games_owned DESC;

