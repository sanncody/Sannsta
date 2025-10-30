// const crypto = require("node:crypto");
// const path = require("node:path");
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;