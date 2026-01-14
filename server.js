const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =======================
   FS MODULE + HTTP POST
======================= */
app.post("/save", (req, res) => {
  fs.appendFileSync("data.txt", JSON.stringify(req.body) + "\n");
  res.send("Data saved using fs module");
});

/* =======================
   EXPRESS DYNAMIC ROUTE
======================= */
app.get("/user/:name", (req, res) => {
  res.send(`Hello ${req.params.name}`);
});

/* =======================
   MULTER STORAGE
======================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

/* =======================
   SINGLE FILE UPLOAD
======================= */
app.post("/upload-single", upload.single("file"), (req, res) => {
  res.send("Single file uploaded");
});

/* =======================
   MULTIPLE FILE UPLOAD
======================= */
app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  res.send("Multiple files uploaded");
});

/* =======================
   PDF RESUME UPLOAD
======================= */
app.post("/upload-resume", upload.single("resume"), (req, res) => {
  if (!req.file || req.file.mimetype !== "application/pdf") {
    return res.send("Only PDF allowed");
  }
  res.send("Resume uploaded");
});

/* =======================
   JWT AUTH
======================= */
const SECRET = "mysecret";

app.post("/login", (req, res) => {
  const token = jwt.sign({ user: req.body.username }, SECRET);
  res.json({ token });
});

function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(403);
  jwt.verify(token, SECRET, (err, data) => {
    if (err) return res.sendStatus(403);
    req.user = data;
    next();
  });
}

/* =======================
   MULTER + JWT
======================= */
app.post("/secure-upload", verifyToken, upload.single("file"), (req, res) => {
  res.send("File uploaded with JWT authentication");
});

/* =======================
   EJS DYNAMIC DATA
======================= */
app.get("/", (req, res) => {
  res.render("index", { msg: "Hello from Backend" });
});

/* =======================
   MONGOOSE + EJS
======================= */
mongoose.connect("mongodb://127.0.0.1:27017/demo");

const UserSchema = new mongoose.Schema({
  name: String,
});

const User = mongoose.model("User", UserSchema);

app.get("/add-user", async (req, res) => {
  await User.create({ name: "Ritesh" });
  res.send("User added");
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.render("users", { users });
});

/* =======================
   SOCKET.IO MCQ
======================= */
io.on("connection", (socket) => {
  socket.emit("question", {
    q: "Node.js is single threaded?",
    options: ["Yes", "No"],
    answer: "Yes",
  });

  socket.on("reply", (ans) => {
    socket.emit("result", ans === "Yes" ? "Correct" : "Wrong");
  });
});

/* =======================
   SERVER
======================= */
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
