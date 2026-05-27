import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShoppingCart, Plus, Eye, CheckCircle, XCircle, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { FilterBar, type FilterFieldDef } from '../../components/ui/FilterBar';
import { Select, Input } from '../../components/ui/FormFields';
import { ordersService } from '../../services/index';
import { itemsService } from '../../services/itemsService';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, orderStatusLabel, orderStatusColor } from '../../utils';
import type { Order, OrderStatus, Item, StudentProfile } from '../../types';

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const SHOE_SIZES = ['33','34','35','36','37','38','39','40','41','42','43','44','45'];

function getSizeOptions(item?: Item) {
  if (!item || item.sizeType === 'none') return null;
  const sizes = item.sizeType === 'clothing' ? CLOTHING_SIZES : SHOE_SIZES;
  return sizes.map((s) => ({ value: s, label: s }));
}

type OutletCtx = { onMenuClick: () => void };

function StudentInfoPanel({ profile }: { profile: StudentProfile }) {
  return (
    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Dados do Aluno</p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {profile.registrationNumber && (
          <div>
            <span className="text-gray-400">Matrícula</span>
            <p className="font-mono font-medium text-gray-700">{profile.registrationNumber}</p>
          </div>
        )}
        {profile.campus && (
          <div>
            <span className="text-gray-400">Campus</span>
            <p className="font-medium text-gray-700">{profile.campus}</p>
          </div>
        )}
        {profile.course && (
          <div className="col-span-2">
            <span className="text-gray-400">Curso</span>
            <p className="font-medium text-gray-700">{profile.course}</p>
          </div>
        )}
        {profile.educationLevel && (
          <div>
            <span className="text-gray-400">Nível</span>
            <p className="font-medium text-gray-700">{profile.educationLevel}</p>
          </div>
        )}
        {profile.modality && (
          <div>
            <span className="text-gray-400">Modalidade</span>
            <p className="font-medium text-gray-700">{profile.modality}</p>
          </div>
        )}
        {profile.baremScore != null && (
          <div>
            <span className="text-gray-400">Pontuação Barema</span>
            <p className="font-semibold text-blue-700">{profile.baremScore}</p>
          </div>
        )}
        {profile.intakeForms?.length ? (
          <div className="col-span-2">
            <span className="text-gray-400">Forma de Ingresso</span>
            <p className="font-medium text-gray-700">{profile.intakeForms.join(', ')}</p>
          </div>
        ) : null}
      </div>

      {profile.aids?.length ? (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Auxílios Aprovados</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.aids.map((aid) => (
              <span
                key={aid}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium"
              >
                {aid.replace(' (VC)', '')}
              </span>
            ))}
          </div>
          {profile.mealTypes && (
            <p className="text-xs text-gray-500 mt-1">
              Refeição: <span className="font-medium text-gray-700">{profile.mealTypes}</span>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface OrderFilters { userName: string; dateFrom: string; dateTo: string; }
const defaultOrderFilters: OrderFilters = { userName: '', dateFrom: '', dateTo: '' };
const orderFilterFields: FilterFieldDef[] = [
  { key: 'userName', label: 'Solicitante', type: 'text', placeholder: 'Buscar por solicitante...' },
  { key: 'dateFrom', label: 'A partir de', type: 'date' },
  { key: 'dateTo',   label: 'Até',         type: 'date' },
];

const statusTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Todos',    value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Aprovado', value: 'approved' },
  { label: 'Entregue', value: 'delivered' },
  { label: 'Recusado', value: 'rejected' },
];

type FormLine = { itemId: string; variationId: string; size: string; requestedQuantity: number };

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
      userName:  filters.userName  || undefined,
      dateFrom:  filters.dateFrom  || undefined,
      dateTo:    filters.dateTo    || undefined,
    }),
  });

  const { data: itemsData } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => itemsService.list({ pageSize: 200, isActive: true }),
  });

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors: formErrors },
  } = useForm<{ items: FormLine[] }>({
    defaultValues: { items: [{ itemId: '', variationId: '', size: '', requestedQuantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const createMutation = useMutation({
    mutationFn: ordersService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Pedido criado!'); setCreateOpen(false); reset(); },
    onError: () => toast.error('Erro ao criar pedido.'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof ordersService.review>[1] }) =>
      ordersService.review(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Pedido revisado!'); setViewOrder(null); },
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

  const allItems = itemsData?.data ?? [];

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
    {
      key: 'items', header: 'Itens',
      render: (o: Order) => <span className="text-sm text-gray-600">{o.items?.length ?? 0} item(ns)</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (o: Order) => (
        <Badge className={orderStatusColor[o.status]} dot>{orderStatusLabel[o.status]}</Badge>
      ),
    },
    {
      key: 'actions', header: '',
      render: (o: Order) => (
        <button
          onClick={() => setViewOrder(o)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-auto"
        >
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
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            Novo Pedido
          </Button>
        }
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
            fields={orderFilterFields}
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

      {/* View / Approve Modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Pedido #${viewOrder?.id}`}
        subtitle={`${viewOrder?.user?.name} — ${viewOrder ? formatDateTime(viewOrder.createdAt) : ''}`}
        icon={<ShoppingCart size={18} />}
        maxWidth="xl"
      >
        {viewOrder && (
          <div className="space-y-4">
            <Badge className={orderStatusColor[viewOrder.status]} dot>
              {orderStatusLabel[viewOrder.status]}
            </Badge>

            {isAdmin && viewOrder.user?.studentProfile && (
              <StudentInfoPanel profile={viewOrder.user.studentProfile} />
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header text-left">Item</th>
                    <th className="table-header text-left">Variação</th>
                    <th className="table-header text-left">Tamanho</th>
                    <th className="table-header text-right">Solicitado</th>
                    <th className="table-header text-right">Aprovado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="table-cell">{item.item?.name}</td>
                      <td className="table-cell text-gray-400">{item.variation?.description ?? '—'}</td>
                      <td className="table-cell text-gray-400">{item.size === 'none' ? '—' : item.size}</td>
                      <td className="table-cell text-right font-mono">{item.requestedQuantity}</td>
                      <td className="table-cell text-right font-mono">
                        {item.approvedQuantity ?? <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin && viewOrder.status === 'pending' && (
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <Button
                  variant="danger"
                  icon={<XCircle size={15} />}
                  loading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({
                    id: viewOrder.id,
                    dto: { status: 'rejected' },
                  })}
                >
                  Recusar
                </Button>
                <Button
                  variant="success"
                  icon={<CheckCircle size={15} />}
                  loading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({
                    id: viewOrder.id,
                    dto: {
                      status: 'approved',
                      items: viewOrder.items.map((i) => ({
                        orderItemId: i.id,
                        approvedQuantity: i.requestedQuantity,
                      })),
                    },
                  })}
                >
                  Aprovar Pedido
                </Button>
              </div>
            )}

            {isAdmin && viewOrder.status === 'approved' && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  variant="success"
                  icon={<Package size={15} />}
                  onClick={() => setDeliverOpen(viewOrder)}
                >
                  Marcar como Entregue
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); }}
        title="Novo Pedido"
        subtitle="Solicite materiais do almoxarifado"
        icon={<ShoppingCart size={18} />}
        maxWidth="lg"
      >
        <form
          onSubmit={handleSubmit((d) => {
            const items = d.items.map((i) => {
              const selItem = allItems.find((it) => String(it.id) === i.itemId);
              return {
                itemId:            Number(i.itemId),
                variationId:       selItem?.hasVariations ? Number(i.variationId) || undefined : undefined,
                size:              i.size || 'none',
                requestedQuantity: i.requestedQuantity,
              };
            });
            createMutation.mutate({ items });
          })}
          className="space-y-3"
        >
          {/* Cabeçalho */}
          <div className="grid grid-cols-12 gap-2 px-0.5">
            <p className="col-span-4 label mb-0">Item *</p>
            <p className="col-span-3 label mb-0">Variação</p>
            <p className="col-span-2 label mb-0">Tamanho</p>
            <p className="col-span-2 label mb-0">Qtd. *</p>
            <div className="col-span-1" />
          </div>

          {fields.map((field, idx) => {
            const selItemId  = watchedItems?.[idx]?.itemId;
            const selItem    = allItems.find((it) => String(it.id) === selItemId);
            const sizeOptions = getSizeOptions(selItem);
            const lineErrors  = formErrors.items?.[idx];

            return (
              <div key={field.id} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* Item */}
                  <div className="col-span-4">
                    <Controller
                      name={`items.${idx}.itemId`}
                      control={control}
                      rules={{ required: 'Selecione um item' }}
                      render={({ field: f }) => (
                        <Select
                          options={allItems.map((it) => ({ value: String(it.id), label: it.name }))}
                          placeholder="Selecione..."
                          value={f.value}
                          error={lineErrors?.itemId?.message}
                          onChange={(e) => {
                            f.onChange(e);
                            setValue(`items.${idx}.variationId`, '');
                            setValue(`items.${idx}.size`, '');
                          }}
                        />
                      )}
                    />
                  </div>

                  {/* Variação */}
                  <div className="col-span-3">
                    {selItem?.hasVariations ? (
                      <Select
                        options={[
                          { value: '', label: 'Selecione...' },
                          ...(selItem.variations?.filter((v) => v.isActive).map((v) => ({
                            value: String(v.id),
                            label: v.description,
                          })) ?? []),
                        ]}
                        error={lineErrors?.variationId?.message}
                        {...register(`items.${idx}.variationId`, {
                          validate: (val) => {
                            const item = allItems.find((it) => String(it.id) === watchedItems?.[idx]?.itemId);
                            if (item?.hasVariations && !val) return 'Selecione uma variação';
                            return true;
                          },
                        })}
                      />
                    ) : (
                      <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                        {selItem ? 'Sem variação' : '—'}
                      </div>
                    )}
                  </div>

                  {/* Tamanho */}
                  <div className="col-span-2">
                    {sizeOptions ? (
                      <Select
                        options={[{ value: '', label: 'Selecione...' }, ...sizeOptions]}
                        error={lineErrors?.size?.message}
                        {...register(`items.${idx}.size`, {
                          validate: (val) => {
                            const item = allItems.find((it) => String(it.id) === watchedItems?.[idx]?.itemId);
                            if (item && item.sizeType !== 'none' && !val) return 'Selecione';
                            return true;
                          },
                        })}
                      />
                    ) : (
                      <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                        {selItem ? 'Sem tamanho' : '—'}
                      </div>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="0"
                      error={lineErrors?.requestedQuantity?.message}
                      {...register(`items.${idx}.requestedQuantity`, {
                        valueAsNumber: true,
                        required: 'Obrigatório',
                        min: { value: 1, message: 'Mín. 1' },
                        validate: (v) => (Number.isFinite(v) && v >= 1) || 'Mín. 1',
                      })}
                    />
                  </div>

                  {/* Remover */}
                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="w-9 h-[42px] flex items-center justify-center text-red-500 hover:bg-red-500Bg rounded-xl transition-colors"
                      >×</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => append({ itemId: '', variationId: '', size: '', requestedQuantity: 1 })}
          >
            Adicionar Item
          </Button>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Enviar Pedido</Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Deliver ────────────────────────────────────────────────── */}
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
