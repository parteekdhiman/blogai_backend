"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const env_config_1 = require("./env.config");
cloudinary_1.v2.config({
    cloud_name: env_config_1.config.cloudinary.cloudName || undefined,
    api_key: env_config_1.config.cloudinary.apiKey || undefined,
    api_secret: env_config_1.config.cloudinary.apiSecret || undefined,
});
exports.default = cloudinary_1.v2;
