require("dotenv").config();
const path = require("path");
const express = require("express");

const cors = require('cors');
const db = require('./config/db');
const userRoutes = require('./routes/users');
const predictionsRoutes = require('./routes/predictions');
const leaderboardRoutes = require("./routes/leaderboard");


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use('/api/users', userRoutes);

app.use('/api/predictions', predictionsRoutes);

app.use("/api/leaderboard", leaderboardRoutes);


// Testireitti tietokantaan
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json(rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});
app.get("/api/matches", async (req, res) => {
  const tournamentId = Number(req.query.tournamentId);
  if (!tournamentId) return res.status(400).json({ message: "tournamentId puuttuu" });

  try {
    const [rows] = await db.query(
      "SELECT id, tournament_id, team_home, team_away, match_date, home_score, away_score FROM matches WHERE tournament_id = ? ORDER BY match_date ASC",
      [tournamentId]
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveri käynnissä portissa ${PORT}`);
});
