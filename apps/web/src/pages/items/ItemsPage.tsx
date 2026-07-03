import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { FilterBar, type FilterFieldDef } from '../../components/ui/FilterBar';
import { ItemModal } from '../../components/modals/ItemModal';
import { itemsService } from '../../services/itemsService';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import type { Item } from '../../types';

const unitLabel: Record<string, string> = {
  unit: 'Unidade', box: 'Caixa', package: 'Pacote',
  ream: 'Resma', kit: 'Kit', pair: 'Par', sheet: 'Folha',
};

const sizeTypeLabel: Record<string, string> = {
  none: '', clothing: 'Vestuário', shoes: 'Calçado',
};

/** Extrai a mensagem de erro enviada pelo backend (string ou array de validações). */
const backendMsg = (err: any, fallback: string): string => {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' ');
  return typeof m === 'string' && m.length ? m : fallback;
};

type OutletCtx = { onMenuClick: () => void };

interface ItemFilters { name: string; type: string; isActive: string; }
const defaultItemFilters: ItemFilters = { name: '', type: '', isActive: '' };

const itemFilterFields: FilterFieldDef[] = [
  { key: 'name',     label: 'Nome',   type: 'text',   placeholder: 'Buscar por nome...' },
  { key: 'type',     label: 'Tipo',   type: 'text',   placeholder: 'Filtrar por tipo...' },
  { key: 'isActive', label: 'Status', type: 'select', placeholder: 'Todos os status', options: [{ value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' }] },
];

export const ItemsPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const { user } = useAuthStore();
  const isAdmin = user?.userType === 'admin';
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage]             = useState(1);
  const [filters, setFilters]       = useState<ItemFilters>(defaultItemFilters);
  const [modalOpen, setModal]       = useState(false);
  const [editItem, setEditItem]     = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const isActiveFilter =
    filters.isActive === 'true'  ? true  :
    filters.isActive === 'false' ? false :
    undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, filters],
    queryFn: () => itemsService.list({
      pageIndex: page - 1,
      pageSize: 10,
      name:     filters.name || undefined,
      type:     filters.type || undefined,
      isActive: isActiveFilter,
    }),
  });

  const createMutation = useMutation({
    mutationFn: itemsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item criado!'); setModal(false); },
    onError: (err: any) => toast.error(backendMsg(err, 'Erro ao criar item.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof itemsService.update>[1] }) =>
      itemsService.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item atualizado!'); setModal(false); setEditItem(null); },
    onError: (err: any) => toast.error(backendMsg(err, 'Erro ao atualizar item.')),
  });

  const toggleItemMutation = useMutation({
    mutationFn: (id: number) => itemsService.toggleItem(id),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success(item.isActive ? 'Item ativado.' : 'Item desativado.');
    },
    onError: () => toast.error('Erro ao alterar status.'),
  });

  const toggleVariationMutation = useMutation({
    mutationFn: ({ itemId, variationId }: { itemId: number; variationId: number }) =>
      itemsService.toggleVariation(itemId, variationId),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success(v.isActive ? 'Variação ativada.' : 'Variação desativada.');
    },
    onError: () => toast.error('Erro ao alterar variação.'),
  });

  const addVariationMutation = useMutation({
    mutationFn: ({ itemId, description }: { itemId: number; description: string }) =>
      itemsService.addVariation(itemId, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success('Variação adicionada.');
    },
    onError: (err: any) => toast.error(backendMsg(err, 'Erro ao adicionar variação.')),
  });

  const removeVariationMutation = useMutation({
    mutationFn: ({ itemId, variationId }: { itemId: number; variationId: number }) =>
      itemsService.removeVariation(itemId, variationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success('Variação excluída.');
    },
    onError: (err: any) => toast.error(backendMsg(err, 'Erro ao excluir variação.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => itemsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item removido.'); setDeleteItem(null); },
    onError: (err: any) => toast.error(backendMsg(err, 'Erro ao remover item.')),
  });

  const handleSave = async (formData: Parameters<typeof itemsService.create>[0]) => {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, dto: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setModal(true);
  };

  // Sempre busca o item atualizado da lista para refletir toggle de variações
  const editItemLive = editItem
    ? (data?.data.find((i) => i.id === editItem.id) ?? editItem)
    : null;

  const columns = [
    {
      key: 'name', header: 'Item',
      render: (item: Item) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.isActive ? 'bg-blue-50' : 'bg-gray-100'}`}>
            <Package size={14} className={item.isActive ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className={`font-medium ${item.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{item.name}</p>
            <div className="flex items-center gap-2">
              {item.type && <p className="text-xs text-gray-400">{item.type}</p>}
              {item.sizeType && item.sizeType !== 'none' && (
                <span className="text-xs text-blue-500 font-medium">{sizeTypeLabel[item.sizeType]}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'unitOfMeasure', header: 'Unidade',
      render: (item: Item) => (
        <span className="text-gray-600">{unitLabel[item.unitOfMeasure] ?? item.unitOfMeasure}</span>
      ),
    },
    {
      key: 'variations', header: 'Variações',
      render: (item: Item) => (
        <div className="flex flex-wrap gap-1">
          {item.hasVariations
            ? item.variations?.map((v) => (
                <span
                  key={v.id}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    v.isActive
                      ? 'bg-gray-100 text-gray-700 border-gray-200'
                      : 'bg-gray-50 text-gray-400 border-gray-100 line-through'
                  }`}
                >
                  {v.description}
                </span>
              ))
            : <span className="text-gray-400 text-xs">Sem variações</span>
          }
        </div>
      ),
    },
    {
      key: 'isActive', header: 'Status',
      render: (item: Item) => (
        <div className="flex items-center gap-2">
          {item.isActive
            ? <Badge className="bg-emerald-500Bg text-emerald-500" dot>Ativo</Badge>
            : <Badge className="bg-red-500Bg text-red-500" dot>Inativo</Badge>
          }
          {isAdmin && (
            <button
              title={item.isActive ? 'Desativar item' : 'Ativar item'}
              onClick={() => toggleItemMutation.mutate(item.id)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                item.isActive ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                item.isActive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          )}
        </div>
      ),
    },
    ...(isAdmin ? [{
      key: 'actions', header: '',
      render: (item: Item) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => openEdit(item)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteItem(item)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500Bg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <Header
        title="Itens"
        subtitle="Gerencie o catálogo de materiais"
        onMenuClick={onMenuClick}
        actions={isAdmin ? (
          <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setModal(true); }}>
            Novo Item
          </Button>
        ) : undefined}
      />

      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="card">
          <FilterBar
            filters={filters}
            defaults={defaultItemFilters}
            fields={itemFilterFields}
            onChange={(f) => { setFilters(f); setPage(1); }}
          />

          <Table
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyMessage="Nenhum item encontrado."
            emptyIcon={<Package size={32} />}
          />

          <Pagination
            page={page}
            total={data?.total ?? 0}
            limit={10}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ItemModal
        open={modalOpen}
        onClose={() => { setModal(false); setEditItem(null); }}
        onSave={handleSave}
        item={editItemLive}
        loading={createMutation.isPending || updateMutation.isPending}
        onToggleVariation={
          isAdmin && editItem
            ? (variationId) => toggleVariationMutation.mutate({ itemId: editItem.id, variationId })
            : undefined
        }
        onAddVariation={
          isAdmin && editItem
            ? (description) => addVariationMutation.mutateAsync({ itemId: editItem.id, description }).then(() => {})
            : undefined
        }
        onDeleteVariation={
          isAdmin && editItem
            ? (variationId) => removeVariationMutation.mutateAsync({ itemId: editItem.id, variationId }).then(() => {})
            : undefined
        }
      />

      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Remover Item"
        description={`Tem certeza que deseja remover "${deleteItem?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
