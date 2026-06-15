import { auth } from "@clerk/nextjs";
import type { ApiError } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = `${baseUrl}/api/v1`;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Works in Server Components via Clerk
    try {
      const { getToken } = auth();
      const token = await getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch {
      // Client-side: token injected by caller
    }
    return headers;
  }

  async get<T>(path: string, token?: string): Promise<T> {
    const headers = await this.getHeaders();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
        timestamp: new Date().toISOString(),
        path,
      }));
      throw err;
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown, token?: string): Promise<T> {
    const headers = await this.getHeaders();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
        timestamp: new Date().toISOString(),
        path,
      }));
      throw err;
    }
    return res.json();
  }

  async patch<T>(path: string, body?: unknown, token?: string): Promise<T> {
    const headers = await this.getHeaders();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
        timestamp: new Date().toISOString(),
        path,
      }));
      throw err;
    }
    return res.json();
  }

  async delete<T>(path: string, token?: string): Promise<T> {
    const headers = await this.getHeaders();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
        timestamp: new Date().toISOString(),
        path,
      }));
      throw err;
    }
    return res.json();
  }

  async uploadFile<T>(path: string, formData: FormData, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Don't set Content-Type — browser sets it with boundary for multipart

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
        timestamp: new Date().toISOString(),
        path,
      }));
      throw err;
    }
    return res.json();
  }
}

export const apiClient = new ApiClient(API_BASE);
