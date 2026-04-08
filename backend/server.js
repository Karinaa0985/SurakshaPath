const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// ================================
// MySQL DATABASE CONNECT
// ================================
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "bhumi@2006",
  database: "surakshapath"
});

connection.connect(err => {
  if (err) console.log("DB Connection Error:", err);
  else console.log("DB Connected");
});

// ================================
// GET DRIVERS
// ================================
app.get("/drivers", (req, res) => {
  connection.query("SELECT * FROM drivers", (err, results) => {
    if (err) res.status(500).json(err);
    else res.json(results);
  });
});

// ================================
// ADD DRIVER
// ================================
app.post("/drivers", (req, res) => {
  const { name, phone, rating } = req.body;

  connection.query(
    "INSERT INTO drivers (name, phone, rating) VALUES (?, ?, ?)",
    [name, phone, rating],
    (err, results) => {
      if (err) res.status(500).json(err);
      else res.json({ id: results.insertId, name, phone, rating });
    }
  );
});

// ================================
// UPDATE ONLY RATING
// ================================
app.put("/drivers/:id", (req, res) => {
  const { rating } = req.body;

  connection.query(
    "UPDATE drivers SET rating=? WHERE id=?",
    [rating, req.params.id],
    (err, results) => {
      if (err) res.status(500).json(err);
      else res.json({ message: "Rating updated" });
    }
  );
});

// ================================
// ADD COMMENT
// ================================
app.post("/comments", (req, res) => {
  const { driver_id, text } = req.body;

  connection.query(
    "INSERT INTO comments (driver_id, text) VALUES (?, ?)",
    [driver_id, text],
    (err, result) => {
      if (err) res.status(500).json(err);
      else res.json({ message: "Comment added" });
    }
  );
});

// ================================
// GET COMMENTS BY DRIVER
// ================================
app.get("/comments/:driverId", (req, res) => {
  connection.query(
    "SELECT * FROM comments WHERE driver_id=?",
    [req.params.driverId],
    (err, results) => {
      if (err) res.status(500).json(err);
      else res.json(results);
    }
  );
});

// ================================
// ❌ DELETE COMMENT (NEW 🔥)
// ================================
app.delete("/comments/:id", (req, res) => {
  connection.query(
    "DELETE FROM comments WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) res.status(500).json(err);
      else res.json({ message: "Comment deleted" });
    }
  );
});

// ================================
// START SERVER
// ================================
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));