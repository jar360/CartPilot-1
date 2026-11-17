
import { Customer, AbandonedCart } from '../types/cartpilot';

const API_BASE_URL = 'http://localhost:4000/api';

interface ApiResponse<T> {
  success: boolean;
  count: number;
  data: T;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_BASE_URL}/customers`);

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  const result: ApiResponse<Customer[]> = await response.json();

  if (!result.success) {
    throw new Error('Customers API returned an unsuccessful response');
  }

  return result.data;
}

export async function fetchCarts(): Promise<AbandonedCart[]> {
  const response = await fetch(`${API_BASE_URL}/carts`);

  if (!response.ok) {
    throw new Error('Failed to fetch carts');
  }

  const result: ApiResponse<AbandonedCart[]> = await response.json();

  if (!result.success) {
    throw new Error('Carts API returned an unsuccessful response');
  }

  return result.data;
}
