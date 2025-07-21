import { Pool, PoolConfig } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    };

    // In production, you might want to use SSL
    if (process.env.NODE_ENV === 'production') {
      config.ssl = {
        rejectUnauthorized: false
      };
    }

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      this.pool.on('connect', () => {
        console.log('New database connection established');
      });

      this.pool.on('remove', () => {
        console.log('Database connection removed');
      });
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute a query with optional parameters
   */
  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log('Slow query detected:', { text, duration, rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      console.error('Database query error:', {
        text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  public async runMigrations(): Promise<void> {
    console.log('Running database migrations...');
    
    // Try different possible migration directory paths
    const possiblePaths = [
      path.join(__dirname, 'migrations'),
      path.join(__dirname, 'database', 'migrations'),
      path.join(process.cwd(), 'apps/blog-be/src/database/migrations'),
      path.join(process.cwd(), 'src/database/migrations'),
      path.join(process.cwd(), 'database/migrations')
    ];
    
    let migrationsDir = '';
    let migrationFiles: string[] = [];
    
    for (const dir of possiblePaths) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort();
          if (files.length > 0) {
            migrationsDir = dir;
            migrationFiles = files;
            console.log(`Found migrations in: ${migrationsDir}`);
            break;
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    if (!migrationsDir || migrationFiles.length === 0) {
      console.log('No migration files found. Skipping migrations.');
      return;
    }

    // Create migrations table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of migrationFiles) {
      // Check if migration has already been run
      const result = await this.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);
        
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf-8'
        );

        await this.transaction(async (client) => {
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
        });

        console.log(`✓ Migration completed: ${file}`);
      } else {
        console.log(`⏭ Migration already applied: ${file}`);
      }
    }

    console.log('All migrations completed!');
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = Database.getInstance();