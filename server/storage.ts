import { searchQueries, type SearchQuery, type InsertSearchQuery } from "@shared/schema";
import { searchResults, type SearchResult, type InsertSearchResult } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";

// Modify the interface with any CRUD methods you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Search Query methods
  getSearchQuery(id: number): Promise<SearchQuery | undefined>;
  createSearchQuery(query: InsertSearchQuery): Promise<SearchQuery>;
  
  // Search Result methods
  getSearchResults(queryId: number): Promise<SearchResult[]>;
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private queries: Map<number, SearchQuery>;
  private results: Map<number, SearchResult>;
  private userCurrentId: number;
  private queryCurrentId: number;
  private resultCurrentId: number;

  constructor() {
    this.users = new Map();
    this.queries = new Map();
    this.results = new Map();
    this.userCurrentId = 1;
    this.queryCurrentId = 1;
    this.resultCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Search Query methods
  async getSearchQuery(id: number): Promise<SearchQuery | undefined> {
    return this.queries.get(id);
  }
  
  async createSearchQuery(insertQuery: InsertSearchQuery): Promise<SearchQuery> {
    const id = this.queryCurrentId++;
    const query: SearchQuery = { ...insertQuery, id };
    this.queries.set(id, query);
    return query;
  }
  
  // Search Result methods
  async getSearchResults(queryId: number): Promise<SearchResult[]> {
    return Array.from(this.results.values()).filter(
      (result) => result.queryId === queryId
    );
  }
  
  async createSearchResult(insertResult: InsertSearchResult): Promise<SearchResult> {
    const id = this.resultCurrentId++;
    const result: SearchResult = { ...insertResult, id };
    this.results.set(id, result);
    return result;
  }
}

export const storage = new MemStorage();
