import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { TruckIcon, Pencil } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/FormFields';
import { ComboBox, type ComboBoxFetchParams } from '../../../components/ui/ComboBox';
import { itemsService } from '../../../services/index';
import type { Shipment, Item, CreateShipmentDto } from '../../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const SHOE_SIZES = ['33','34','35','36','37','38','39','40','41','42','43','44','45'];

function getSizeOptions(item?: Item) {
  if (!item || item.sizeType === 'none') return null;
  const sizes = item.sizeType === 'clothing' ? CLOTHING_SIZES : SHOE_SIZES;
  return sizes.map((s) => ({ value: s, label: s }));
}

const itemsFetchFn = async ({ search, pageIndex, pageSize }: ComboBoxFetchParams) => {
  const res = await itemsService.list({ name: search || undefined, pageIndex, pageSize, isActive: true });
  return {
    data: res.data.map((i) => ({ value: String(i.id), label: i.name, ...i })),
    total: res.total,
  };
};

// ─── Types ────────────────────────────────────────────────────────────────────

type FormLine = { itemId: string; variationId: string; size: string; quantity: number };
type FormData  = { notes: string; items: FormLine[] };
const EMPTY_LINE: FormLine = { itemId: '', variationId: '', size: '', quantity: 1 };

// ─── FormLines (internal) ─────────────────────────────────────────────────────

function ShipmentFormLines({
  fields, register, control, setValue, errors, remove, append, initialItems,
}: {
  fields:        ReturnType<typeof useFieldArray>['fields'];
  register:      any;
  control:       any;
  setValue:      any;
  errors:        any;
  remove:        (idx: number) => void;
  append:        (v: FormLine) => void;
  initialItems?: (Item | undefined)[];
}) {
  const [selItems, setSelItems] = useState<(Item | undefined)[]>(initialItems ?? []);

  useEffect(() => { setSelItems(initialItems ?? []); }, [initialItems]);

  const handleSelect = (idx: number, item: Item | undefined) => {
    setSelItems((prev) => { const next = [...prev]; next[idx] = item; return next; });
    setValue(`items.${idx}.variationId`, '');
    setValue(`items.${idx}.size`, '');
  };

  const handleRemove = (idx: number) => {
    remove(idx);
    setSelItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAppend = () => {
    append({ ...EMPTY_LINE });
    setSelItems((prev) => [...prev, undefined]);
  };

  return (
    <div className="space-y-3">
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
        const lineErrors  = errors?.items?.[idx];

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
                    queryKey={`shipment-item-${idx}`}
                    value={f.value}
                    error={lineErrors?.itemId?.message}
                    initialOptions={
                      initialItems?.[idx]
                        ? [{ value: String(initialItems[idx]!.id), label: initialItems[idx]!.name }]
                        : []
                    }
                    onChange={(id, option) => {
                      f.onChange(id);
                      handleSelect(idx, option ? (option as unknown as Item) : undefined);
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
                      value={f.value}
                      clearable={false}
                      placeholder="Variação..."
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
                      options={sizeOptions}
                      value={f.value}
                      clearable={false}
                      placeholder="Tamanho..."
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
                error={lineErrors?.quantity?.message}
                {...register(`items.${idx}.quantity`, {
                  valueAsNumber: true,
                  required: 'Obrigatório',
                  min: { value: 1, message: 'Mín. 1' },
                  validate: (v: number) => (Number.isFinite(v) && v >= 1) || 'Mín. 1',
                })}
              />
            </div>

            <div className="col-span-1">
              {fields.length > 1 && (
                <button type="button" onClick={() => handleRemove(idx)}
                  className="w-9 h-[42px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" size="sm" icon={<Plus size={13} />} onClick={handleAppend}>
        Adicionar Item
      </Button>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShipmentFormModalProps {
  open:      boolean;
  onClose:   () => void;
  shipment?: Shipment | null;
  onSave:    (dto: CreateShipmentDto) => void;
  loading:   boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FORM_ID = 'shipment-form-modal';

export const ShipmentFormModal: React.FC<ShipmentFormModalProps> = ({
  open, onClose, shipment, onSave, loading,
}) => {
  const isEditing = !!shipment;

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { notes: '', items: [{ ...EMPTY_LINE }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (shipment) {
      reset({
        notes: shipment.notes ?? '',
        items: shipment.items?.length
          ? shipment.items.map((i) => ({
              itemId:      String(i.itemId),
              variationId: i.variationId ? String(i.variationId) : '',
              size:        i.size === 'none' ? '' : (i.size ?? ''),
              quantity:    i.quantity,
            }))
          : [{ ...EMPTY_LINE }],
      });
    } else {
      reset({ notes: '', items: [{ ...EMPTY_LINE }] });
    }
  }, [shipment, open]);

  const handleClose = () => {
    reset({ notes: '', items: [{ ...EMPTY_LINE }] });
    onClose();
  };

  const onSubmit = (d: FormData) => {
    onSave({
      notes: d.notes,
      items: d.items.map((i) => ({
        itemId:      Number(i.itemId),
        variationId: i.variationId ? Number(i.variationId) : undefined,
        size:        i.size || 'none',
        quantity:    i.quantity,
      })),
    });
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? `Editar Remessa #${shipment!.id}` : 'Nova Remessa'}
      subtitle={isEditing ? 'Apenas remessas abertas podem ser editadas' : 'Registre uma entrada de materiais'}
      icon={isEditing ? <Pencil size={18} /> : <TruckIcon size={18} />}
      maxWidth="xl"
      footer={<>
        <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
        <Button type="submit" form={FORM_ID} loading={loading}>
          {isEditing ? 'Salvar Alterações' : 'Criar Remessa'}
        </Button>
      </>}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Textarea
          label="Observações"
          placeholder="Notas sobre a remessa (opcional)..."
          {...register('notes')}
        />
        <ShipmentFormLines
          fields={fields}
          register={register}
          control={control}
          setValue={setValue}
          errors={errors}
          remove={remove}
          append={append}
          initialItems={isEditing ? shipment!.items?.map((i) => i.item) : undefined}
        />
      </form>
    </Modal>
  );
};
