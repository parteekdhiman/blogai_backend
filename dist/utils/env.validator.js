"use strict";
/**
 * @deprecated Use config from '../config/env.config' instead
 * This file is kept for backward compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.validateEnv = void 0;
var env_config_1 = require("../config/env.config");
Object.defineProperty(exports, "validateEnv", { enumerable: true, get: function () { return env_config_1.validateEnv; } });
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return env_config_1.config; } });
