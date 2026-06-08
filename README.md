# ⬡ GameVault — Gaming Account Management System

A full-stack gaming account management web application built as a Database Systems course project. Demonstrates relational database design, SQL querying, and integration with a modern web application.

---

## 👤 Author

**Muhammad Umer Iqbal** — L1F24BSCS0601
University of Central Punjab (UCP), Lahore · BSCS
Course: Database Systems · Instructor: Muneeb Ali Muzaffar

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Database | MySQL 8.0 |
| Backend | Node.js + Express.js |
| MySQL Driver | mysql2/promise |
| Auth | JWT + bcryptjs |
| Frontend | React 18 + React Router |
| HTTP Client | Axios |

---

## ✨ Features

- **Game Catalog** — Browse all games with live average ratings via JOIN + AVG()
- **User Collection** — Add games to library with status (active/wishlist/traded)
- **Marketplace** — List games for sale, make/accept/reject offers atomically
- **Reviews & Ratings** — Leaderboard powered by GROUP BY + AVG() query
- **Admin Dashboard** — Live database views — row counts, ratings, listings
- **Role-Based Access** — buyer, seller, admin roles
- **JWT Authentication** — Secure login with bcrypt password hashing

---

## 🗄️ Database Concepts

- **6 Tables** — users, games, user_games, marketplace_listings, offers, reviews
- **Views** — `vw_active_listings`, `vw_game_ratings`, `vw_user_collections`
- **Stored Procedures** — `GetUserLibrary`, `GetTopRatedGames`, `GetListingOffers`, `SearchGames`, `GetSellerDashboard`
- **Transactions** — Accept offer atomically (accept + reject others + mark sold)
- **JOINs** — INNER JOIN, LEFT JOIN across multiple tables
- **Aggregates** — AVG(), COUNT(), SUM(), GROUP BY, HAVING
- **Subqueries** — Correlated subquery for best offer per listing
- **Constraints** — PKs, FKs, UNIQUE, CHECK, CASCADE

---

## ⚙️ Setup

```bash
# 1. Run gamevault_schema.sql in MySQL Workbench

# 2. Backend
cd gamevault-backend
npm install
# Edit .env: DB_PASSWORD=your_password
npm start        # → http://localhost:5000

# 3. Frontend
cd gamevault-frontend
npm install
npm start        # → http://localhost:3000
```

### Login
| Role | Email | Password |
|---|---|---|
| Admin | admin@gamevault.com | plainpass |
| Seller | umer@example.com | pass1234 |

---

## 🔗 Repository
[github.com/SMPanther/gv_dbproject](https://github.com/SMPanther/gv_dbproject)
