require("dotenv").config();
const env = require("./config/env");
const app = require("./app");

app.listen(env.PORT, () => {
  console.log(`App escuchando en puerto ${env.PORT}`);
});
