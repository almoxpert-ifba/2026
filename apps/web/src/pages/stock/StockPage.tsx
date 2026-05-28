import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Layers, AlertTriangle, Settings2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { FilterBar, type FilterFieldDef } from '../../components/ui/FilterBar';
import { stockService } from '../../services/stockService';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import type { StockEntry } from '../../types';
import { StockMinModal } from './modals/StockMinModal';

interface StockFilters { itemName: string; }
const defaultStockFilters: StockFilters = { itemName: '' };
const stockFilterFields: FilterFieldDef[] = [
  { key: 'itemName', label: 'Item', type: 'text', placeholder: 'Buscar por item...' },
];

const unitLabel: Record<string, string> = {
  unit: 'un.', box: 'cx.', package: 'pct.', ream: 'rsm.', kit: 'kit', pair: 'par', sheet: 'flh.',
};

type OutletCtx = { onMenuClick: () => void };

export const StockPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const { user } = useAuthStore();
  const isAdmin = user?.userType === 'admin';
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage]             = useState(1);
  const [lowOnly, setLowOnly]       = useState(false);
  const [filters, setFilters]       = useState<StockFilters>(defaultStockFilters);
  const [editEntry, setEditEntry]   = useState<StockEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock', page, lowOnly, filters],
    queryFn: () => {
      const params = { pageIndex: page - 1, pageSize: 15, itemName: filters.itemName || undefined };
      return lowOnly ? stockService.listLow(params) : stockService.list(params);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entry, minimum }: { entry: StockEntry; minimum: number }) =>
      stockService.updateMinimum(entry.itemId, entry.variationId, entry.size, minimum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Estoque mínimo atualizado!');
      setEditEntry(null);
    },
    onError: () => toast.error('Erro ao atualizar estoque.'),
  });

  const isLow = (e: StockEntry) => e.availableQuantity <= e.minimumQuantity;

  const columns = [
    {
      key: 'item', header: 'Item',
      render: (e: StockEntry) => (
        <div>
          <p className="font-medium text-gray-800">{e.item?.name}</p>
          <p className="text-xs text-gray-400">
            {e.item?.hasVariations && e.variation?.description ? e.variation.description : 'Sem variação'}
          </p>
        </div>
      ),
    },
    {
      key: 'size', header: 'Tamanho',
      render: (e: StockEntry) => (
        <span className="text-sm text-gray-600">
          {e.size === 'none' ? <span className="text-gray-300">—</span> : e.size}
        </span>
      ),
    },
    {
      key: 'availableQuantity', header: 'Disponível',
      render: (e: StockEntry) => (
        <span className={`font-semibold font-mono text-sm ${isLow(e) ? 'text-red-500' : 'text-gray-800'}`}>
          {e.availableQuantity}{' '}
          <span className="font-normal text-xs text-gray-400">
            {unitLabel[e.item?.unitOfMeasure] ?? e.item?.unitOfMeasure}
          </span>
        </span>
      ),
    },
    {
      key: 'minimumQuantity', header: 'Mínimo',
      render: (e: StockEntry) => (
        <span className="text-sm text-gray-500 font-mono">{e.minimumQuantity}</span>
      ),
    },
    {
      key: 'status', header: 'Situação',
      render: (e: StockEntry) => isLow(e)
        ? <Badge className="bg-red-500Bg text-red-500" dot><AlertTriangle size={11} />Estoque Baixo</Badge>
        : <Badge className="bg-emerald-500Bg text-emerald-500" dot>Normal</Badge>,
    },
    ...(isAdmin ? [{
      key: 'actions', header: '',
      render: (e: StockEntry) => (
        <button
          onClick={() => setEditEntry(e)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-auto"
        >
          <Settings2 size={14} />
        </button>
      ),
    }] : []),
  ];

  return (
    <div>
      <Header
        title="Estoque"
        subtitle="Visão geral das quantidades disponíveis"
        onMenuClick={onMenuClick}
      />

      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => { setLowOnly(false); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${!lowOnly ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Todos
            </button>
            <button
              onClick={() => { setLowOnly(true); setPage(1); }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${lowOnly ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <AlertTriangle size={12} /> Estoque Baixo
            </button>
          </div>

          <FilterBar
            filters={filters}
            defaults={defaultStockFilters}
            fields={stockFilterFields}
            onChange={(f) => { setFilters(f); setPage(1); }}
          />

          <Table
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(e) => e.id}
            loading={isLoading}
            emptyMessage="Nenhum registro de estoque encontrado."
            emptyIcon={<Layers size={32} />}
          />

          <Pagination
            page={page}
            total={data?.total ?? 0}
            limit={15}
            onPageChange={setPage}
          />
        </div>
      </div>

      <StockMinModal
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSave={(entry, minimum) => updateMutation.mutate({ entry, minimum })}
        loading={updateMutation.isPending}
      />
    </div>
  );
};
