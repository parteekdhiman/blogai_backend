"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPlainText = exports.calculateReadTime = void 0;
/**
 * Calculates estimated reading time in minutes based on word count.
 */
const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes || 1; // Minimum 1 minute
};
exports.calculateReadTime = calculateReadTime;
/**
 * Extracts plain text from HTML by removing all tags.
 */
const extractPlainText = (html) => {
    return html.replace(/<[^>]*>/g, '');
};
exports.extractPlainText = extractPlainText;
