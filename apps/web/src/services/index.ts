import { api } from './api';
import type {
  Shipment, CreateShipmentDto,
  Order, CreateOrderDto, ReviewOrderDto, OrderStatus,
  Movement, User, CreateUserDto, UpdateUserDto,
  PaginatedResponse, ListParams,
} from '../types';

// ─── Shipments ────────────────────────────────────────────────────────────────
export const shipmentsService = {
  async list(params?: ListParams & {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Shipment>> {
    const { data } = await api.get<PaginatedResponse<Shipment>>('/shipments', { params });
    return data;
  },

  async get(id: number): Promise<Shipment> {
    const { data } = await api.get<Shipment>(`/shipments/${id}`);
    return data;
  },

  async create(dto: CreateShipmentDto): Promise<Shipment> {
    const { data } = await api.post<Shipment>('/shipments', dto);
    return data;
  },

  async update(id: number, dto: CreateShipmentDto): Promise<Shipment> {
    const { data } = await api.patch<Shipment>(`/shipments/${id}`, dto);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/shipments/${id}`);
  },

  async complete(id: number): Promise<Shipment> {
    const { data } = await api.patch<Shipment>(`/shipments/${id}/complete`);
    return data;
  },

  async cancel(id: number): Promise<Shipment> {
    const { data } = await api.patch<Shipment>(`/shipments/${id}/cancel`);
    return data;
  },
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersService = {
  async list(params?: ListParams & {
    status?: OrderStatus;
    userName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Order>> {
    const { data } = await api.get<PaginatedResponse<Order>>('/orders', { params });
    return data;
  },

  async get(id: number): Promise<Order> {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },

  async create(dto: CreateOrderDto): Promise<Order> {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },

  /** Approve or reject: calls PATCH /orders/:id/review */
  async review(id: number, dto: ReviewOrderDto): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}/review`, dto);
    return data;
  },

  async deliver(id: number): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}/deliver`);
    return data;
  },
};

// ─── Movements ────────────────────────────────────────────────────────────────
export const movementsService = {
  async list(params?: ListParams & {
    itemId?: number;
    variationId?: number;
    movementType?: string;
    originType?: string;
    originId?: number;
    itemName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Movement>> {
    const { data } = await api.get<PaginatedResponse<Movement>>('/movements', { params });
    return data;
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersService = {
  async list(params?: ListParams & {
    userType?: string;
    name?: string;
    isActive?: string;
    createdFrom?: string;
    createdTo?: string;
    registrationNumber?: string;
    course?: string;
    position?: string;
  }): Promise<PaginatedResponse<User>> {
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
    return data;
  },

  async get(id: number): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async create(dto: CreateUserDto): Promise<User> {
    const { data } = await api.post<User>('/users', dto);
    return data;
  },

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, dto);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  downloadTemplate(): string {
    return `${api.defaults.baseURL}/users/import/template`;
  },

  async validateImport(file: File): Promise<import('../types').ImportValidationResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/users/import/validate', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async bulkImport(file: File): Promise<import('../types').ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/users/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
