/* Import dependencies */
import express from "express";
import bcrypt from "bcryptjs";
import DatabaseService from "./services/database.services.mjs";
import session from "express-session";
import mysql from "mysql2/promise";

/* Create express instance */
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true}));

app.use(express.static("static"));
app.set("view engine","pug");

console.log(process.env.NODE_ENV);

const db = await mysql.createConnection({
  host: process.env.DATABASE_HOST || "localhost",
  user: "user",
  password: "password",
  database: "world",
});

const db1 = await DatabaseService.connect();
const {conn} = db1;

/* Add form data middleware */
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "verysecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Integrate Pug with Express
app.set("view engine", "pug");

// Serve assets from 'static' folder
app.use(express.static("static"));

/* Landing route */
app.get("/", (req, res) => {
  res.render("index");
});

// Sample API route
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Landing route
app.get("/", (req, res) => {
  res.render("index");
});

// Gallery route
app.get("/gallery", (req, res) => {
  res.render("gallery");
});

// About route
app.get("/about", (req, res) => {
  res.render("about", { title: "Boring about page" });
});


app.get("/cities", async (req,res) => {
  try {
    const [rows, fields] = await db.execute("SELECT * FROM `city`");
    return res.render("cities",{rows, fields});
  }catch (err){
    console.error(err);
    }
  });

  app.get("/countries", async (req,res) => {
  try {
    const [rows, fields] = await db.execute("SELECT * FROM `country`");
    return res.render("countries",{rows, fields});
  }catch (err){
    console.error(err);
    }
  });
  app.get("/api/cities",async (req,res) => {
    const [rows,fields] = await db.execute("SELECT * FROM `city`");
    return res.send(rows);
  });
  app.get("/api/countries",async (req,res) => {
    const [rows,fields] = await db.execute("SELECT * FROM `country`");
    return res.send(rows);
  });
app.get("/cities/:id", async (req, res) => {
  const cityId = req.params.id;
  const city = await db.getCity(cityId);
  return res.render("city", { city });
});

/* Update a city by ID */
app.post("/cities/:id", async (req, res) => {
  const cityId = req.params.id;
  const { name } = req.body;
  const sql = `
    UPDATE city
    SET Name = '${name}'
    WHERE ID = '${cityId}';
  `;
  await conn.execute(sql);
  return res.redirect(`/cities/${cityId}`);
});

// Returns JSON array of cities
app.get("/api/cities", async (req, res) => {
  const [rows, fields] = await db.getCities();
  return res.send(rows);
});

app.get("/api/countries", async (req, res) => {
  const countries = await db.getCountries();
  res.send(countries);
});


/* Authentication */

// Register
app.get("/register", (req, res) => {
  res.render("register");
});

// Login
app.get("/login", (req, res) => {
  res.render("login");
});

// Account
app.get("/account", async (req, res) => {
  const { auth, userId } = req.session;

  if (!auth) {
    return res.redirect("/login");
  }

  const sql = `SELECT id, email FROM user WHERE user.id = ${userId}`;
  const [results, cols] = await conn.execute(sql);
  const user = results[0];

  res.render("account", { user });
});

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const sql = `INSERT INTO user (email, password) VALUES ('${email}', '${hashed}')`;
    const [result, _] = await conn.execute(sql);
    const id = result.insertId;
    req.session.auth = true;
    req.session.userId = id;
    return res.redirect("/account");
  } catch (err) {
    console.error(err);
    return res.status(400).send(err.sqlMessage);
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).send("Missing credentials");
  }

  const sql = `SELECT id, password FROM user WHERE email = '${email}'`;
  const [results, cols] = await conn.execute(sql);

  const user = results[0];

  if (!user) {
    return res.status(401).send("User does not exist");
  }

  const { id } = user;
  const hash = user?.password;
  const match = await bcrypt.compare(password, hash);

  if (!match) {
    return res.status(401).send("Invalid password");
  }

  req.session.auth = true;
  req.session.userId = id;

  return res.redirect("/account");
});


// Run server!
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});