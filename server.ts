import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createApiApp } from './server/app';

dotenv.config();

const app = createApiApp();
const PORT = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

// Fallback to index.html for SPA routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Project Connect server running on port ${PORT}`);
});
