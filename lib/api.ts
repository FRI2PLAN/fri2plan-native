// Simple API client using fetch
const API_URL = 'https://app.fri2plan.ch';

export const api = {
  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', error };
    }
  },

  // Auth endpoints - using tRPC with proper query params format
  async login(email: string, password: string) {
    try {
      // tRPC uses query params for input
      const input = encodeURIComponent(JSON.stringify({ email, password }));
      const response = await fetch(`${API_URL}/trpc/auth.login?input=${input}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // tRPC response format: { result: { data: ... } }
      if (data.result && data.result.data) {
        return data.result.data;
      }
      
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Generic tRPC call helper
  async trpcCall(procedure: string, input?: any) {
    try {
      const response = await fetch(`${API_URL}/trpc/${procedure}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      return await response.json();
    } catch (error) {
      console.error(`tRPC call failed (${procedure}):`, error);
      throw error;
    }
  },
};
