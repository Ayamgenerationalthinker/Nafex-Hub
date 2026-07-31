// Inject dummy environment variables for testing so the env validation does not crash
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = 'dummy_jwt_secret_for_testing';
process.env.PORT = '5000';
