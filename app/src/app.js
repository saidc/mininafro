const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const appRoutes = require("./routes/app.routes");

const app = express();

app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

//app.use(helmet());
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  })
);
app.use(morgan("combined"));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

app.use("/public", express.static(path.join(process.cwd(), "public")));

app.use(authRoutes);
app.use(appRoutes);

module.exports = app;
