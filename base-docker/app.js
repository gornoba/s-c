const express = require("express");
const app = express();
const PORT = 3555;

app.get("/", (req, res) => {
  const env = process.env.TEST;
  res.send(`Hello World${env ? ` ${env}` : ""}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
