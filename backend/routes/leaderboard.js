// backend/routes/leaderboard.js
const express = require("express");
const router = express.Router();

const db = require("../config/db");

// GET /api/leaderboard?tournamentId=1
router.get("/", async (req, res) => {
  const tournamentId = Number(req.query.tournamentId);
  if (!tournamentId) return res.status(400).json({ message: "tournamentId puuttuu" });

  try {
    // 1) Ottelut (tuloksineen)
    const [matches] = await db.query(
      "SELECT id, home_score, away_score FROM matches WHERE tournament_id = ?",
      [tournamentId]
    );

    // 2) Veikkaukset + käyttäjänimi
    const [preds] = await db.query(
      `SELECT p.user_id, u.name, p.match_id, p.pred_home, p.pred_away
       FROM predictions p
       JOIN users u ON u.id = p.user_id
       JOIN matches m ON m.id = p.match_id
       WHERE m.tournament_id = ?`,
      [tournamentId]
    );

    // Muistiin ottelut nopeasti id:llä
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    // Pisteet per user_id
    const scoreMap = new Map(); // user_id -> { userId, name, points }

    const sign = (h, a) => (h > a ? 1 : h < a ? -1 : 0); // 1=koti, 0=tasuri, -1=vieras

    for (const p of preds) {
      const m = matchMap.get(p.match_id);
      if (!m) continue;

      // jos tulos puuttuu, ei pisteitä
      if (m.home_score == null || m.away_score == null) continue;

      const hs = Number(m.home_score);
      const as = Number(m.away_score);

      const ph = Number(p.pred_home);
      const pa = Number(p.pred_away);

      let pts = 0;

      // B: 3p täysosuma, muuten 1p oikea merkki (1/X/2)
      if (ph === hs && pa === as) {
        pts = 3;
      } else if (sign(ph, pa) === sign(hs, as)) {
        pts = 1;
      } else {
        pts = 0;
      }

      if (!scoreMap.has(p.user_id)) {
        scoreMap.set(p.user_id, { userId: p.user_id, name: p.name, points: 0 });
      }
      scoreMap.get(p.user_id).points += pts;
    }

    const leaderboard = Array.from(scoreMap.values()).sort((a, b) => b.points - a.points);
    res.json(leaderboard);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
