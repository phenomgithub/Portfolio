const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Neon database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Setup database tables automatically using clean lowercase columns
const initDb = async () => {
  const createTableQuery = `
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            techstack TEXT[] NOT NULL,
            livelink VARCHAR(500),
            githublink VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS education (
            id SERIAL PRIMARY KEY,
            degree VARCHAR(255) NOT NULL,
            institution VARCHAR(255) NOT NULL,
            field_of_study VARCHAR(255),
            start_date VARCHAR(20),
            end_date VARCHAR(20),
            description TEXT
        );
        CREATE TABLE IF NOT EXISTS experience (
            id SERIAL PRIMARY KEY,
            role VARCHAR(255) NOT NULL,
            company VARCHAR(255) NOT NULL,
            employment_type VARCHAR(100),
            start_date VARCHAR(20),
            end_date VARCHAR(20),
            description TEXT
        );
        CREATE TABLE IF NOT EXISTS portfolio_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            cv_url TEXT NOT NULL DEFAULT ''
        );
    `;
  try {
    await pool.query(createTableQuery);
    console.log("Neon PostgreSQL database schema initialized successfully.");
  } catch (err) {
    console.error("Schema creation error:", err.message);
  }
};
initDb();

// 1. GET ALL PROJECTS
app.get("/api/projects", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE A NEW PROJECT
app.post("/api/projects", async (req, res) => {
  const { title, description, techStack, liveLink, githubLink } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO projects (title, description, techstack, livelink, githublink) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *",
      [title, description, techStack, liveLink, githubLink],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST Error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// 3. UPDATE AN EXISTING PROJECT
app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, techStack, liveLink, githubLink } = req.body;
  try {
    const result = await pool.query(
      "UPDATE projects SET title=\$1, description=\$2, techstack=\$3, livelink=\$4, githublink=\$5 WHERE id=\$6 RETURNING *",
      [title, description, techStack, liveLink, githubLink, id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT Error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE A PROJECT
app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM projects WHERE id = \$1", [id]);
    res.json({ message: "Project deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const registerRecordRoutes = (resource, table, fields) => {
  app.get(`/api/${resource}`, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(`/api/${resource}`, async (req, res) => {
    const columns = fields.map((field) => field.column);
    const values = fields.map((field) => req.body[field.key] ?? "");
    const placeholders = values.map((_, index) => `$${index + 1}`);

    try {
      const result = await pool.query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values,
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(`${resource} create error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  app.put(`/api/${resource}/:id`, async (req, res) => {
    const values = fields.map((field) => req.body[field.key] ?? "");
    const assignments = fields
      .map((field, index) => `${field.column} = $${index + 1}`)
      .join(", ");
    values.push(req.params.id);

    try {
      const result = await pool.query(
        `UPDATE ${table} SET ${assignments} WHERE id = $${values.length} RETURNING *`,
        values,
      );
      if (!result.rowCount) {
        return res.status(404).json({ error: `${resource} record not found.` });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(`${resource} update error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  app.delete(`/api/${resource}/:id`, async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE id = $1`,
        [req.params.id],
      );
      if (!result.rowCount) {
        return res.status(404).json({ error: `${resource} record not found.` });
      }
      res.json({ message: `${resource} record deleted successfully.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

registerRecordRoutes("education", "education", [
  { column: "degree", key: "degree" },
  { column: "institution", key: "institution" },
  { column: "field_of_study", key: "fieldOfStudy" },
  { column: "start_date", key: "startDate" },
  { column: "end_date", key: "endDate" },
  { column: "description", key: "description" },
]);

registerRecordRoutes("experience", "experience", [
  { column: "role", key: "role" },
  { column: "company", key: "company" },
  { column: "employment_type", key: "employmentType" },
  { column: "start_date", key: "startDate" },
  { column: "end_date", key: "endDate" },
  { column: "description", key: "description" },
]);

app.get("/api/profile", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT cv_url FROM portfolio_settings WHERE id = 1",
    );
    res.json({ cvUrl: result.rows[0]?.cv_url || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/profile", async (req, res) => {
  const cvUrl = typeof req.body.cvUrl === "string" ? req.body.cvUrl.trim() : "";
  try {
    const result = await pool.query(
      `INSERT INTO portfolio_settings (id, cv_url) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET cv_url = EXCLUDED.cv_url
       RETURNING cv_url`,
      [cvUrl],
    );
    res.json({ cvUrl: result.rows[0].cv_url });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
