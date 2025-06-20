import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import { config } from './config.js';

export class MongoDBClient {
  private client: MongoClient;
  private _db: Db | null = null;

  constructor() {
    this.client = new MongoClient(config.mongodb.uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this._db = this.client.db(config.mongodb.dbName);
      console.log(`Connected to MongoDB: ${config.mongodb.dbName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  get db(): Db {
    if (!this._db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this._db;
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }
}

export interface UserDetails {
  _id?: ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export async function getUserDetails(userId: string): Promise<UserDetails | { error: string }> {
  try {
    const mongoClient = new MongoDBClient();
    await mongoClient.connect();
    
    const collection = mongoClient.collection<UserDetails>('users');
    const query = { _id: new ObjectId(userId) };
    const projection = { _id: 0, firstName: 1, lastName: 1, email: 1, phone: 1 };
    
    const result = await collection.findOne(query, { projection });
    
    await mongoClient.close();
    
    if (!result) {
      return { error: 'User not found' };
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return { error: String(error) };
  }
} 