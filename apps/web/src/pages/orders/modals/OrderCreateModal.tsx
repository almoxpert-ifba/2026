import React, { useState } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/FormFields';
import { ComboBox } from '../../../components/ui/ComboBox';
import { itemsService } from '../../../services/itemsService';
import { usersService } from '../../../services/index';
import type { Item, CreateOrderDto } from '../../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const SHOE_SIZES = ['33','34','35','36','37','38','39','40','41','42','43','44','45'];

function getSizeOptions(item?: Item) {
  if (!item || item.sizeType === 'none') return null;
  const sizes = item.sizeType === 'clothing' ? CLOTHING_SIZES : SHOE_SIZES;
  return sizes.map((s) => ({ value: s, label: s }));
}

const itemsFetchFn = async ({ search, pageIndex, pageSize }: { search: string; pageIndex: number; pageSize: number }) => {
  const res = await itemsService.list({ name: search || undefined, pageIndex, pageSize, isActive: true });
  return { data: res.data.map((i) => ({ value: String(i.id), label: i.name, ...i })), total: res.total };
};

const studentsFetchFn = async ({ search, pageIndex, pageSize }: { search: string; pageIndex: number; pageSize: number }) => {
  const res = await usersService.list({ userType: 'student', name: search || undefined, pageIndex, pageSize, isActive: 'true' });
  return {
    data: res.data.map((u) => ({
      value: String(u.id),
      label: u.name,
      description: u.studentProfile?.registrationNumber ?? u.email,
    })),
    total: res.total,
  };
};

// ─── Types ────────────────────────────────────────────────────────────────────

type FormLine = { itemId: string; variationId: string; size: string; requestedQuantity: number };

const FORM_ID = 'order-create-modal-form';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderCreateModalProps {
  open:    boolean;
  onClose: () => void;
  onSave:  (dto: CreateOrderDto) => void;
  loading: boolean;
  isAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderCreateModal: React.FC<OrderCreateModalProps> = ({
  open, onClose, onSave, loading, isAdmin,
}) => {
  const [selItems, setSelItems]   = useState<(Item | undefined)[]>([undefined]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<{ items: FormLine[] }>({
    defaultValues: { items: [{ itemId: '', variationId: '', size: '', requestedQuantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const handleClose = () => {
    reset();
    setSelItems([undefined]);
    setSelectedUserId('');
    onClose();
  };

  const onSubmit = (d: { items: FormLine[] }) => {
    const dto: CreateOrderDto = {
      items: d.items.map((i) => ({
        itemId:            Number(i.itemId),
        variationId:       i.variationId ? Number(i.variationId) : undefined,
        size:              i.size || 'none',
        requestedQuantity: i.requestedQuantity,
      })),
    };
    if (isAdmin && selectedUserId) {
      dto.userId = Number(selectedUserId);
    }
    onSave(dto);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo Pedido"
      subtitle={isAdmin ? 'Crie um pedido em nome de um aluno' : 'Solicite materiais do almoxarifado'}
      icon={<ShoppingCart size={18} />}
      maxWidth="3xl"
      footer={<>
        <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
        <Button type="submit" form={FORM_ID} loading={loading}>Enviar Pedido</Button>
      </>}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Seletor de aluno — apenas para admin */}
        {isAdmin && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-600 mb-2">Aluno recebedor *</p>
            <ComboBox
              fetchFn={studentsFetchFn}
              queryKey="order-create-student"
              value={selectedUserId}
              placeholder="Selecione o aluno..."
              onChange={(val) => setSelectedUserId(val)}
            />
            {!selectedUserId && (
              <p className="text-xs text-blue-400 mt-1">Selecione o aluno para quem o pedido será criado.</p>
            )}
          </div>
        )}

        {/* Cabeçalho das colunas */}
        <div className="grid grid-cols-12 gap-2 px-0.5">
          <p className="col-span-4 label mb-0">Item *</p>
          <p className="col-span-3 label mb-0">Variação</p>
          <p className="col-span-2 label mb-0">Tamanho</p>
          <p className="col-span-2 label mb-0">Qtd. *</p>
          <div className="col-span-1" />
        </div>

        {fields.map((field, idx) => {
          const selItem     = selItems[idx];
          const sizeOptions = getSizeOptions(selItem);
          const lineErrors  = errors.items?.[idx];

          return (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4">
                <Controller
                  name={`items.${idx}.itemId`}
                  control={control}
                  rules={{ required: 'Selecione um item' }}
                  render={({ field: f }) => (
                    <ComboBox
                      fetchFn={itemsFetchFn}
                      queryKey={`order-item-${idx}`}
                      value={f.value}
                      placeholder="Selecione..."
                      error={lineErrors?.itemId?.message}
                      onChange={(val, opt) => {
                        f.onChange(val);
                        setSelItems((prev) => { const n = [...prev]; n[idx] = opt as unknown as Item; return n; });
                        setValue(`items.${idx}.variationId`, '');
                        setValue(`items.${idx}.size`, '');
                      }}
                    />
                  )}
                />
              </div>

              <div className="col-span-3">
                {selItem?.hasVariations ? (
                  <Controller
                    name={`items.${idx}.variationId`}
                    control={control}
                    rules={{ validate: (val: string) => (!selItem?.hasVariations || !!val) || 'Selecione' }}
                    render={({ field: f }) => (
                      <ComboBox
                        options={selItem.variations?.filter((v) => v.isActive).map((v) => ({
                          value: String(v.id), label: v.description,
                        })) ?? []}
                        value={f.value} clearable={false} placeholder="Variação..."
                        error={lineErrors?.variationId?.message}
                        onChange={(val) => f.onChange(val)}
                      />
                    )}
                  />
                ) : (
                  <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                    {selItem ? 'Sem variação' : '—'}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                {sizeOptions ? (
                  <Controller
                    name={`items.${idx}.size`}
                    control={control}
                    rules={{ validate: (val: string) => (!selItem || selItem.sizeType === 'none' || !!val) || 'Selecione' }}
                    render={({ field: f }) => (
                      <ComboBox
                        options={sizeOptions} value={f.value} clearable={false} placeholder="Tamanho..."
                        error={lineErrors?.size?.message}
                        onChange={(val) => f.onChange(val)}
                      />
                    )}
                  />
                ) : (
                  <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                    {selItem ? 'Sem tam.' : '—'}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <Input
                  type="number" min={1} placeholder="0"
                  error={lineErrors?.requestedQuantity?.message}
                  {...register(`items.${idx}.requestedQuantity`, {
                    valueAsNumber: true,
                    required: 'Obrigatório',
                    min: { value: 1, message: 'Mín. 1' },
                    validate: (v) => (Number.isFinite(v) && v >= 1) || 'Mín. 1',
                  })}
                />
              </div>

              <div className="col-span-1">
                {fields.length > 1 && (
                  <button type="button"
                    onClick={() => { remove(idx); setSelItems((prev) => prev.filter((_, i) => i !== idx)); }}
                    className="w-9 h-[42px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <Button type="button" variant="secondary" size="sm" icon={<Plus size={13} />}
          onClick={() => { append({ itemId: '', variationId: '', size: '', requestedQuantity: 1 }); setSelItems((prev) => [...prev, undefined]); }}>
          Adicionar Item
        </Button>
      </form>
    </Modal>
  );
};
