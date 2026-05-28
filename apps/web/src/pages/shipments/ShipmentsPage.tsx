import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TruckIcon, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { FilterBar, type FilterFieldDef } from '../../components/ui/FilterBar';
import { shipmentsService } from '../../services/index';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, shipmentStatusLabel, shipmentStatusColor } from '../../utils';
import type { Shipment, CreateShipmentDto } from '../../types';
import { ShipmentFormModal } from './modals/ShipmentFormModal';
import { ShipmentViewModal } from './modals/ShipmentViewModal';

type OutletCtx = { onMenuClick: () => void };

interface ShipmentFilters { status: string; dateFrom: string; dateTo: string; }
const defaultShipmentFilters: ShipmentFilters = { status: '', dateFrom: '', dateTo: '' };
const shipmentFilterFields: FilterFieldDef[] = [
  { key: 'status',   label: 'Status',      type: 'select', placeholder: 'Todos os status', options: [
    { value: 'open',      label: 'Aberta' },
    { value: 'completed', label: 'Concluída' },
    { value: 'cancelled', label: 'Cancelada' },
  ]},
  { key: 'dateFrom', label: 'A partir de', type: 'date' },
  { key: 'dateTo',   label: 'Até',         type: 'date' },
];

export const ShipmentsPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const qc    = useQueryClient();

  const [page, setPage]                     = useState(1);
  const [filters, setFilters]               = useState<ShipmentFilters>(defaultShipmentFilters);
  const [viewShipment, setView]             = useState<Shipment | null>(null);
  const [formShipment, setFormShipment]     = useState<Shipment | null | 'new'>('new'); // 'new' = create, Shipment = edit
  const [formOpen, setFormOpen]             = useState(false);
  const [deleteShipment, setDeleteOpen]     = useState<Shipment | null>(null);
  const [completeShipment, setCompleteOpen] = useState<Shipment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, filters],
    queryFn: () => shipmentsService.list({
      pageIndex: page - 1,
      pageSize:  10,
      status:    filters.status   || undefined,
      dateFrom:  filters.dateFrom || undefined,
      dateTo:    filters.dateTo   || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: shipmentsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Remessa criada!');
      setFormOpen(false);
    },
    onError: () => toast.error('Erro ao criar remessa.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CreateShipmentDto }) =>
      shipmentsService.update(id, dto),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Remessa atualizada!');
      setFormOpen(false);
      if (viewShipment?.id === updated.id) setView(updated);
    },
    onError: () => toast.error('Erro ao atualizar remessa.'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => shipmentsService.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Remessa concluída! Estoque atualizado.');
      setView(null);
      setCompleteOpen(null);
    },
    onError: () => toast.error('Erro ao concluir remessa.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => shipmentsService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Remessa cancelada.');
      setView(null);
    },
    onError: () => toast.error('Erro ao cancelar remessa.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shipmentsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Remessa excluída.');
      setDeleteOpen(null);
      setView(null);
    },
    onError: () => toast.error('Erro ao excluir remessa.'),
  });

  const openCreate = () => { setFormShipment(null); setFormOpen(true); };
  const openEdit   = (s: Shipment) => { setView(null); setFormShipment(s); setFormOpen(true); };

  const handleSave = (dto: CreateShipmentDto) => {
    if (formShipment && typeof formShipment === 'object') {
      updateMutation.mutate({ id: formShipment.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const columns = [
    { key: 'id', header: '#',
      render: (s: Shipment) => <span className="font-mono text-gray-500 text-xs">#{s.id}</span> },
    {
      key: 'responsible', header: 'Responsável',
      render: (s: Shipment) => (
        <div>
          <p className="font-medium text-gray-800">{s.responsible?.name}</p>
          <p className="text-xs text-gray-400">{formatDateTime(s.createdAt)}</p>
        </div>
      ),
    },
    { key: 'items_count', header: 'Itens',
      render: (s: Shipment) => <span className="text-sm text-gray-600">{s.items?.length ?? 0} item(ns)</span> },
    { key: 'status', header: 'Status',
      render: (s: Shipment) => <Badge className={shipmentStatusColor[s.status]} dot>{shipmentStatusLabel[s.status]}</Badge> },
    {
      key: 'actions', header: '',
      render: (s: Shipment) => (
        <div className="flex items-center gap-1 justify-end">
          {s.status === 'open' && (
            <>
              <button title="Editar remessa" onClick={() => openEdit(s)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil size={14} />
              </button>
              <button title="Excluir remessa" onClick={() => setDeleteOpen(s)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button title="Visualizar remessa" onClick={() => setView(s)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ];

  const isEditing  = formShipment && typeof formShipment === 'object';
  const isSaving   = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <Header
        title="Remessas"
        subtitle="Entradas de material no almoxarifado"
        onMenuClick={onMenuClick}
        actions={<Button icon={<Plus size={15} />} onClick={openCreate}>Nova Remessa</Button>}
      />

      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="card">
          <FilterBar
            filters={filters}
            defaults={defaultShipmentFilters}
            fields={shipmentFilterFields}
            onChange={(f) => { setFilters(f); setPage(1); }}
          />
          <Table columns={columns} data={data?.data ?? []} keyExtractor={(s) => s.id}
            loading={isLoading} emptyMessage="Nenhuma remessa encontrada." emptyIcon={<TruckIcon size={32} />} />
          <Pagination page={page} total={data?.total ?? 0} limit={10} onPageChange={setPage} />
        </div>
      </div>

      <ShipmentViewModal
        shipment={viewShipment}
        onClose={() => setView(null)}
        onEdit={openEdit}
        onDelete={setDeleteOpen}
        onCancel={(id) => cancelMutation.mutate(id)}
        onComplete={setCompleteOpen}
        cancelLoading={cancelMutation.isPending}
      />

      <ShipmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        shipment={isEditing ? formShipment : null}
        onSave={handleSave}
        loading={isSaving}
      />

      <ConfirmModal
        open={!!completeShipment}
        onClose={() => setCompleteOpen(null)}
        onConfirm={() => completeShipment && completeMutation.mutate(completeShipment.id)}
        title="Finalizar Remessa"
        description={`Confirma a conclusão da Remessa #${completeShipment?.id}? Os ${completeShipment?.items?.length ?? 0} item(ns) serão lançados no estoque e a remessa não poderá mais ser editada.`}
        confirmLabel="Sim, finalizar"
        variant="success"
        loading={completeMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteShipment}
        onClose={() => setDeleteOpen(null)}
        onConfirm={() => deleteShipment && deleteMutation.mutate(deleteShipment.id)}
        title="Excluir Remessa"
        description={`Tem certeza que deseja excluir permanentemente a Remessa #${deleteShipment?.id}? Esta ação não poderá ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
