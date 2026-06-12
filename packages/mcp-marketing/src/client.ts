import axios from 'axios';

const BASE_URL = process.env.DIVE_API_URL ?? 'http://localhost:7771/api';
const API_KEY  = process.env.DIVE_MCP_API_KEY ?? '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
  const res = await apiClient.get<T>(path, { params });
  return res.data;
}

export async function post<T>(path: string, body?: Record<string, any>): Promise<T> {
  const res = await apiClient.post<T>(path, body);
  return res.data;
}
