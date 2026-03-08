const express = require("express");
const router = express.Router();

const db = require("../config/db");
const auth = require("../middleware/auth");

// Tallenna veikkaus (insert tai update jos on jo olemassa)
// Hae omat veikkaukset yhdelle ottelulle
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  const matchId = Number(req.query.matchId);

  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ message: "matchId puuttuu tai on virheellinen" });
  }


  try {
    const [rows] = await db.query(
      `SELECT id, user_id, match_id, pred_home, pred_away, created_at
       FROM predictions
       WHERE match_id = ? AND user_id = ?
       ORDER BY created_at DESC`,
      [matchId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/", auth, async (req, res) => {
  const userId = req.user.id;
  const { predHome, predAway } = req.body;
  const matchId = Number(req.body.matchId);

  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ message: "matchId puuttuu tai on virheellinen" });
  }
  if (predHome === undefined || predAway === undefined)
    return res.status(400).json({ message: "predHome/predAway puuttuu" });

try {
  // 1) Hae ottelun alkamisaika
  const [matchRows] = await db.query(
    "SELECT match_date FROM matches WHERE id = ? LIMIT 1",
    [matchId]
  );

  if (!matchRows.length) {
    return res.status(404).json({ message: "Ottelua ei löydy" });
  }

  const matchDate = new Date(matchRows[0].match_date);

  // 2) Lukitus: veikkaus sallitaan vain ennen aloitushetkeä
  if (new Date() >= matchDate) {
    return res.status(403).json({ message: "Veikkausaika päättynyt" });
  }
// 3) Max 3 veikkausta per ottelu per käyttäjä
  const [cntRows] = await db.query(
    "SELECT COUNT(*) AS cnt FROM predictions WHERE user_id = ? AND match_id = ?",
    [userId, matchId]
  );

  if (cntRows[0].cnt >= 3) {
    return res.status(403).json({ message: "Max 3 veikkausta per ottelu" });
  }

  // 4) Tallenna veikkaus (aina uusi rivi)
  await db.query(
    `INSERT INTO predictions (user_id, match_id, pred_home, pred_away)
     VALUES (?, ?, ?, ?)`,
    [userId, matchId, predHome, predAway]
  );

  res.status(201).json({ message: "Veikkaus tallennettu" });
} catch (err) {
  console.error("DB error:", err);
  res.status(500).json({ message: "Database error" });
}

});
// Poista oma veikkaus (vain jos veikkausaika ei ole päättynyt)
router.delete("/:id", auth, async (req, res) => {
  const userId = req.user.id;
  const predId = Number(req.params.id);

  if (!Number.isInteger(predId) || predId <= 0) {
    return res.status(400).json({ message: "Virheellinen id" });
  }

  try {
    // Hae veikkaus + ottelun alkamisaika
    const [rows] = await db.query(
      `SELECT p.id, m.match_date
       FROM predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE p.id = ? AND p.user_id = ?
       LIMIT 1`,
      [predId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Veikkausta ei löydy" });
    }

    const matchDate = new Date(rows[0].match_date);
    if (new Date() >= matchDate) {
      return res.status(403).json({ message: "Veikkausta ei voi poistaa ottelun alkamisen jälkeen" });
    }

    await db.query(
      `DELETE FROM predictions WHERE id = ? AND user_id = ?`,
      [predId, userId]
    );

    res.json({ message: "Veikkaus poistettu" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
