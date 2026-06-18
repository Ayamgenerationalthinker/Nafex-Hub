import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './lib/error-handler';
import apiRouter from './routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Register API routes under /api
app.use('/api', apiRouter);

// Global error handling middleware (placed after all routes)
app.use(errorHandler);

export default app;

