import { api } from './api';
import type { Item, ItemVariation, CreateItemDto, UpdateItemDto, PaginatedResponse } from '../types';

interface ItemsListParams {
  pageIndex?: number;
  pageSize?: number;
  name?: string;
  search?: string;  // alias for name
  type?: string;
  isActive?: boolean;
}

export const itemsService = {
  async list(params?: ItemsListParams): Promise<PaginatedResponse<Item>> {
    const { data } = await api.get<PaginatedResponse<Item>>('/items', {
      params: {
        pageIndex: params?.pageIndex ?? 0,
        pageSize:  params?.pageSize ?? 10,
        name:      params?.name ?? params?.search ?? undefined,
        type:      params?.type ?? undefined,
        isActive:  params?.isActive,
      },
    });
    return data;
  },

  async get(id: number): Promise<Item> {
    const { data } = await api.get<Item>(`/items/${id}`);
    return data;
  },

  async create(dto: CreateItemDto): Promise<Item> {
    const { data } = await api.post<Item>('/items', dto);
    return data;
  },

  async update(id: number, dto: UpdateItemDto): Promise<Item> {
    const { data } = await api.patch<Item>(`/items/${id}`, dto);
    return data;
  },

  async toggleItem(id: number): Promise<Item> {
    const { data } = await api.patch<Item>(`/items/${id}/toggle`);
    return data;
  },

  async toggleVariation(itemId: number, variationId: number): Promise<ItemVariation> {
    const { data } = await api.patch<ItemVariation>(`/items/${itemId}/variations/${variationId}/toggle`);
    return data;
  },

  async addVariation(itemId: number, description: string): Promise<ItemVariation> {
    const { data } = await api.post<ItemVariation>(`/items/${itemId}/variations`, { description });
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  async removeVariation(itemId: number, variationId: number): Promise<void> {
    await api.delete(`/items/${itemId}/variations/${variationId}`);
  },
};
