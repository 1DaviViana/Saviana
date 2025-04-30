import { pgTable, text, serial, integer, boolean, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Search Queries
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  refinedQuery: text("refined_query"),
  clarificationQuestion: text("clarification_question"),
  userResponse: text("user_response"),
  timestamp: text("timestamp").notNull(),
});

export const insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  query: true,
  refinedQuery: true,
  clarificationQuestion: true,
  userResponse: true,
  timestamp: true,
});

// Search Results
export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  queryId: integer("query_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'local', 'national', 'global'
  address: text("address"),
  location: json("location").$type<{lat: number, lng: number}>(),
  website: text("website"),
  rating: text("rating"),
  reviews: text("reviews"),
  distance: text("distance"),
  price: text("price"),
  hasProduct: boolean("has_product").default(true),
  metadata: json("metadata").$type<any>(),
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  queryId: true,
  name: true,
  category: true,
  address: true,
  location: true,
  website: true,
  rating: true,
  reviews: true,
  distance: true,
  price: true,
  hasProduct: true,
  metadata: true,
});

// API Request and Response types
export const searchRequestSchema = z.object({
  query: z.string().min(1),
  userResponse: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const searchResponseSchema = z.object({
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().optional(),
  results: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string(),
      category: z.enum(['local', 'national', 'global']),
      address: z.string().optional(),
      location: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional(),
      website: z.string().optional(),
      rating: z.string().optional(),
      reviews: z.string().optional(),
      distance: z.string().optional(),
      price: z.string().optional(),
      hasProduct: z.boolean().default(true),
      metadata: z.any().optional(),
    })
  ).optional(),
  _debug: z.any().optional(), // Campo para debugging
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;

export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
