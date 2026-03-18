// ============================================================
// server.js — M.Poriums Testing API
// ============================================================
// A custom JSON Server setup that adds:
//   - /api/auth/login  — simple email/password login
//   - /api/auth/register — create a new test user
//   - CORS headers so your React app can call it
//   - All standard REST endpoints for every resource
//
// This is NOT production-ready — passwords are stored in plain
// text and there is no real JWT signing. It is purely for
// testing data flow between your front-end and back-end team.
//
// Start it with:  npm run dev
// ============================================================

const jsonServer = require("json-server");
const server     = jsonServer.create();
const router     = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// ── CORS — allow your React app to call this API ────────────
// Update ALLOWED_ORIGIN when you deploy to Vercel
const ALLOWED_ORIGINS = [
  "http://localhost:5175",   // Vite local dev
  "http://localhost:3000",   // alternative local port
  "https://mporiums-updated.vercel.app", // your deployed front-end

];

server.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

server.use(jsonServer.bodyParser);
server.use(middlewares);

// ── AUTH: LOGIN ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user }
//
// Note: token is a simple base64 string for testing only.
// Replace with real JWT signing in production.
server.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db    = router.db; // lowdb instance
  const users = db.get("users").value();
  const user  = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Simple test token — NOT secure, for testing only
  const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString("base64");

  // Return user without password
  const { password: _pw, ...safeUser } = user;
  return res.status(200).json({ token, user: safeUser });
});

// ── AUTH: REGISTER ──────────────────────────────────────────
// POST /api/auth/register
// Body: { email, password, displayName, sellerType? }
// Returns: { token, user }
server.post("/api/auth/register", (req, res) => {
  const { email, password, displayName, sellerType = "standard" } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ message: "Email, password and display name are required" });
  }

  const db    = router.db;
  const users = db.get("users").value();

  // Check if email already exists
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const newUser = {
    id:          `u${Date.now()}`,
    email:       email.toLowerCase(),
    password,    // plain text — testing only
    displayName,
    sellerName:  displayName,
    avatar:      initials,
    sellerType,
    verified:    false,
    city:        "",
    state:       "",
    memberSince: new Date().getFullYear().toString(),
    createdAt:   new Date().toISOString(),
  };

  db.get("users").push(newUser).write();

  const token = Buffer.from(JSON.stringify({ userId: newUser.id, email: newUser.email })).toString("base64");
  const { password: _pw, ...safeUser } = newUser;
  return res.status(201).json({ token, user: safeUser });
});

// ── AUTH: GET CURRENT USER ──────────────────────────────────
// GET /api/auth/me
// Header: Authorization: Bearer <token>
server.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  try {
    const token   = authHeader.replace("Bearer ", "");
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    const db      = router.db;
    const user    = db.get("users").find({ id: decoded.userId }).value();
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _pw, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});

// ── Mount all JSON Server routes under /api ─────────────────
// This gives you:
//   GET    /api/products
//   GET    /api/products/1
//   POST   /api/products
//   PUT    /api/products/1
//   PATCH  /api/products/1
//   DELETE /api/products/1
//   ...same for users, cart, orders, wishlist, reviews
server.use("/api", router);

// ── Start server ────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("\n🎸 M.Poriums Testing API is running!\n");
  console.log(`   Local:  http://localhost:${PORT}/api`);
  console.log("\n   Available endpoints:");
  console.log("   GET  /api/products");
  console.log("   POST /api/auth/login");
  console.log("   POST /api/auth/register");
  console.log("   GET  /api/auth/me");
  console.log("   GET  /api/orders");
  console.log("   GET  /api/reviews");
  console.log("   GET  /api/wishlist");
  console.log("   GET  /api/cart");
  console.log("\n   Full REST available on all resources.\n");
});
