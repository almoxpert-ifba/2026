import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShoppingCart, Plus, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { FilterBar, type FilterFieldDef } from '../../components/ui/FilterBar';
import { ordersService } from '../../services/index';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, orderStatusLabel, orderStatusColor } from '../../utils';
import type { Order, OrderStatus, ReviewOrderDto, CreateOrderDto } from '../../types';
import { OrderViewModal } from './modals/OrderViewModal';
import { OrderCreateModal } from './modals/OrderCreateModal';

type OutletCtx = { onMenuClick: () => void };

interface OrderFilters { userName: string; dateFrom: string; dateTo: string; }
const defaultOrderFilters: OrderFilters = { userName: '', dateFrom: '', dateTo: '' };
const adminFilterFields: FilterFieldDef[] = [
  { key: 'userName', label: 'Solicitante', type: 'text', placeholder: 'Buscar por nome...' },
  { key: 'dateFrom', label: 'Data inicial', type: 'date' },
  { key: 'dateTo',   label: 'Data final',   type: 'date' },
];
const studentFilterFields: FilterFieldDef[] = [
  { key: 'dateFrom', label: 'Data inicial', type: 'date' },
  { key: 'dateTo',   label: 'Data final',   type: 'date' },
];

const statusTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Todos',    value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Aprovado', value: 'approved' },
  { label: 'Entregue', value: 'delivered' },
  { label: 'Recusado', value: 'rejected' },
];

export const OrdersPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const { user } = useAuthStore();
  const isAdmin = user?.userType === 'admin';
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage]                = useState(1);
  const [status, setStatus]            = useState<OrderStatus | 'all'>('all');
  const [filters, setFilters]          = useState<OrderFilters>(defaultOrderFilters);
  const [viewOrder, setViewOrder]      = useState<Order | null>(null);
  const [createOpen, setCreateOpen]    = useState(false);
  const [deliverOrder, setDeliverOpen] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, status, filters],
    queryFn: () => ordersService.list({
      pageIndex: page - 1,
      pageSize:  10,
      status:    status === 'all' ? undefined : status,
      userName:  filters.userName || undefined,
      dateFrom:  filters.dateFrom || undefined,
      dateTo:    filters.dateTo   || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: ordersService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido criado!');
      setCreateOpen(false);
    },
    onError: () => toast.error('Erro ao criar pedido.'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ReviewOrderDto }) =>
      ordersService.review(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido revisado!');
      setViewOrder(null);
    },
    onError: () => toast.error('Erro ao revisar pedido.'),
  });

  const deliverMutation = useMutation({
    mutationFn: (id: number) => ordersService.deliver(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido marcado como entregue!');
      setViewOrder(null);
      setDeliverOpen(null);
    },
    onError: () => toast.error('Erro ao entregar pedido.'),
  });

  const columns = [
    { key: 'id', header: '#',
      render: (o: Order) => <span className="font-mono text-gray-500 text-xs">#{o.id}</span> },
    {
      key: 'user', header: 'Solicitante',
      render: (o: Order) => (
        <div>
          <p className="font-medium text-gray-800">{o.user?.name}</p>
          <p className="text-xs text-gray-400">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Itens',
      render: (o: Order) => <span className="text-sm text-gray-600">{o.items?.length ?? 0} item(ns)</span> },
    { key: 'status', header: 'Status',
      render: (o: Order) => <Badge className={orderStatusColor[o.status]} dot>{orderStatusLabel[o.status]}</Badge> },
    { key: 'actions', header: '',
      render: (o: Order) => (
        <button onClick={() => setViewOrder(o)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-auto">
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Pedidos"
        subtitle="Gerencie as solicitações de materiais"
        onMenuClick={onMenuClick}
        actions={<Button icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Novo Pedido</Button>}
      />

      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100 flex gap-1 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatus(tab.value); setPage(1); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  status === tab.value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <FilterBar
            filters={filters}
            defaults={defaultOrderFilters}
            fields={isAdmin ? adminFilterFields : studentFilterFields}
            onChange={(f) => { setFilters(f); setPage(1); }}
          />

          <Table
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(o) => o.id}
            loading={isLoading}
            emptyMessage="Nenhum pedido encontrado."
            emptyIcon={<ShoppingCart size={32} />}
          />
          <Pagination page={page} total={data?.total ?? 0} limit={10} onPageChange={setPage} />
        </div>
      </div>

      <OrderViewModal
        order={viewOrder}
        isAdmin={isAdmin}
        onClose={() => setViewOrder(null)}
        onReview={(dto) => reviewMutation.mutate({ id: viewOrder!.id, dto })}
        onDeliver={setDeliverOpen}
        reviewLoading={reviewMutation.isPending}
      />

      <OrderCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(dto: CreateOrderDto) => createMutation.mutate(dto)}
        loading={createMutation.isPending}
        isAdmin={isAdmin}
      />

      <ConfirmModal
        open={!!deliverOrder}
        onClose={() => setDeliverOpen(null)}
        onConfirm={() => deliverOrder && deliverMutation.mutate(deliverOrder.id)}
        title="Confirmar Entrega"
        description={`Confirma a entrega do Pedido #${deliverOrder?.id}? O estoque será debitado e o pedido ficará como entregue.`}
        confirmLabel="Sim, entregar"
        variant="success"
        loading={deliverMutation.isPending}
      />
    </div>
  );
};
