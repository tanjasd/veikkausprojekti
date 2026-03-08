const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  console.log("AUTH header:", req.headers.authorization);
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

  const header = req.headers.authorization; // "Bearer <token>"
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Token puuttuu" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Virheellinen tai vanhentunut token" });
  }
};
