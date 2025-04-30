# Location-Based Search Engine

An intelligent location-based search engine that provides robust geolocation capabilities with comprehensive error handling and user-friendly location discovery.

## Features

- Advanced geolocation with comprehensive error handling
- Fallback location detection mechanism using IP-based geolocation
- Interactive Google Maps integration
- Intelligent search query analysis with OpenAI
- Local and online establishment search
- Detailed diagnostic logging for geolocation processes

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Node.js, Express
- **APIs**: Google Maps/Places API, OpenAI API
- **Build Tools**: Vite, ESBuild
- **Data Storage**: In-memory storage with Drizzle ORM schema

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/location-search-engine.git
   cd location-search-engine
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Project Structure

- `/client` - Frontend React application
  - `/src` - Source code
    - `/components` - UI components
    - `/hooks` - Custom React hooks
    - `/lib` - Utility functions
    - `/pages` - Main application pages
- `/server` - Backend Express server
  - `/services` - Service layer for external APIs
  - `/routes.ts` - API route definitions
  - `/storage.ts` - Data storage interface
- `/shared` - Shared code between frontend and backend
  - `/schema.ts` - Database schema and type definitions

## License

This project is licensed under the MIT License - see the LICENSE file for details.