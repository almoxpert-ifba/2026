import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Plus, Trash2, Lock, Info } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormFields';
import { Button } from '../../components/ui/Button';
import type { Item, CreateItemDto, SizeType } from '../../types';

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const SHOE_SIZES = ['33','34','35','36','37','38','39','40','41','42','43','44','45'];

const schema = z.object({
  name:          z.string().min(2, 'Nome obrigatório'),
  type:          z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unidade obrigatória'),
  hasVariations: z.boolean(),
  sizeType:      z.enum(['none', 'clothing', 'shoes']),
  variations:    z.array(z.object({ description: z.string().min(1, 'Descrição obrigatória') })).optional(),
});
type FormData = z.infer<typeof schema>;

interface ItemModalProps {
  open:                boolean;
  onClose:             () => void;
  onSave:              (data: CreateItemDto) => Promise<void>;
  onToggleVariation?:  (variationId: number) => void;
  onDeleteVariation?:  (variationId: number) => Promise<void>;
  onAddVariation?:     (description: string) => Promise<void>;
  item?:               Item | null;
  loading?:            boolean;
}

const unitOptions = [
  { value: 'unit',    label: 'Unidade' },
  { value: 'box',     label: 'Caixa' },
  { value: 'package', label: 'Pacote' },
  { value: 'ream',    label: 'Resma' },
  { value: 'kit',     label: 'Kit' },
  { value: 'pair',    label: 'Par' },
  { value: 'sheet',   label: 'Folha' },
];

const sizeTypeOptions = [
  { value: 'none',     label: 'Sem tamanho' },
  { value: 'clothing', label: 'Vestuário (PP/P/M/G/GG/GGG)' },
  { value: 'shoes',    label: 'Calçado (33-45)' },
];

export const ItemModal: React.FC<ItemModalProps> = ({
  open, onClose, onSave, onToggleVariation, onDeleteVariation, onAddVariation, item, loading,
}) => {
  const isEditing = !!item;
  const [newVariationDesc, setNewVariationDesc] = useState('');
  const [addingVariation, setAddingVariation]   = useState(false);

  const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hasVariations: false, sizeType: 'none', variations: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variations' });
  const hasVariations = watch('hasVariations');
  const sizeType      = watch('sizeType');

  useEffect(() => {
    if (open) {
      setNewVariationDesc('');
      if (item) {
        reset({
          name:          item.name,
          type:          item.type ?? '',
          unitOfMeasure: item.unitOfMeasure,
          hasVariations: item.hasVariations,
          sizeType:      (item.sizeType as SizeType) ?? 'none',
          variations:    [],
        });
      } else {
        reset({ name: '', type: '', unitOfMeasure: '', hasVariations: false, sizeType: 'none', variations: [] });
      }
    }
  }, [open, item, reset]);

  const handleSave = (formData: FormData) =>
    onSave({
      name:          formData.name,
      type:          formData.type,
      unitOfMeasure: formData.unitOfMeasure,
      hasVariations: formData.hasVariations,
      sizeType:      formData.sizeType as SizeType,
      variations:    !isEditing && formData.hasVariations
        ? (formData.variations ?? []).map((v) => v.description)
        : undefined,
    });

  const handleAddVariation = async () => {
    const desc = newVariationDesc.trim();
    if (!desc || !onAddVariation) return;
    setAddingVariation(true);
    try {
      await onAddVariation(desc);
      setNewVariationDesc('');
    } finally {
      setAddingVariation(false);
    }
  };

  const sizePreview =
    sizeType === 'clothing' ? CLOTHING_SIZES.join(', ') :
    sizeType === 'shoes'    ? `${SHOE_SIZES[0]}–${SHOE_SIZES[SHOE_SIZES.length - 1]}` :
    null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Item' : 'Novo Item'}
      subtitle={isEditing ? `Editando: ${item?.name}` : 'Preencha os dados do novo item'}
      icon={<Package size={18} />}
      maxWidth="lg"
      footer={<>
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="item-modal-form" loading={loading}>{isEditing ? 'Salvar Alterações' : 'Criar Item'}</Button>
      </>}
    >
      <form id="item-modal-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Nome do Item"
            placeholder="Ex: Caderno"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Tipo / Categoria"
            placeholder="Ex: Material Escolar"
            error={errors.type?.message}
            {...register('type')}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Controller
            name="unitOfMeasure"
            control={control}
            render={({ field }) => (
              <Select
                label="Unidade de Medida"
                options={unitOptions}
                placeholder="Selecione..."
                error={errors.unitOfMeasure?.message}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <div>
            <Controller
              name="sizeType"
              control={control}
              render={({ field }) => (
                <Select
                  label="Tipo de Tamanho"
                  options={sizeTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isEditing}
                  className={isEditing ? 'opacity-60 cursor-not-allowed' : undefined}
                />
              )}
            />
            {isEditing && (
              <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                <Lock size={12} className="mt-0.5 flex-shrink-0" />
                <span>O tipo de tamanho compõe a chave de estoque (item, variação, tamanho) e não pode mudar após a criação — alterá-lo invalidaria o estoque já registrado.</span>
              </p>
            )}
          </div>
        </div>

        {sizePreview && (
          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            Tamanhos disponíveis: <span className="font-semibold">{sizePreview}</span>
          </p>
        )}

        <div className="flex flex-col justify-end pb-0.5">
          <label className="label">Possui Variações?</label>
          <Controller
            name="hasVariations"
            control={control}
            render={({ field }) => (
              <div className={`flex items-center gap-3 ${isEditing ? 'opacity-60' : ''}`}>
                <label className={`flex items-center gap-2 ${isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    checked={!field.value}
                    onChange={() => field.onChange(false)}
                    disabled={isEditing}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Não</span>
                </label>
                <label className={`flex items-center gap-2 ${isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    checked={field.value}
                    onChange={() => field.onChange(true)}
                    disabled={isEditing}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Sim</span>
                </label>
              </div>
            )}
          />
          {isEditing && (
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
              <Lock size={12} className="mt-0.5 flex-shrink-0" />
              <span>Se o item usa variações é definido na criação e não pode mudar depois — alterar criaria saldos de estoque órfãos.</span>
            </p>
          )}
          {!isEditing && (
            <p className="mt-1 flex items-start gap-1 text-xs text-amber-600">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>O tipo de tamanho e o uso de variações são definidos agora e <span className="font-semibold">não poderão ser alterados</span> após a criação.</span>
            </p>
          )}
        </div>

        {/* ── Variações: modo EDIÇÃO ── */}
        {isEditing && hasVariations && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Variações</p>

            {/* Lista de variações existentes */}
            {(item?.variations?.length ?? 0) === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Nenhuma variação cadastrada.</p>
            )}
            <div className="space-y-1.5">
              {item?.variations?.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className={`text-sm font-medium flex-1 ${v.isActive ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                    {v.description}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle switch */}
                    {onToggleVariation && (
                      <>
                        <span className={`text-xs ${v.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {v.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                        <button
                          type="button"
                          title={v.isActive ? 'Desativar variação' : 'Ativar variação'}
                          onClick={() => onToggleVariation(v.id)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            v.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                            v.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </>
                    )}
                    {/* Excluir variação (só se nunca entrou em estoque — validado no backend) */}
                    {onDeleteVariation && (
                      <button
                        type="button"
                        title="Excluir variação (somente se nunca entrou em estoque)"
                        onClick={() => onDeleteVariation(v.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500Bg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar nova variação inline */}
            {onAddVariation && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Input
                  placeholder="Nova variação — Ex: 100 folhas"
                  value={newVariationDesc}
                  onChange={(e) => setNewVariationDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariation(); } }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={13} />}
                  loading={addingVariation}
                  onClick={handleAddVariation}
                >
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Item sem variações (edição): explica por que não pode adicionar ── */}
        {isEditing && !hasVariations && (
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <span>
              Este item foi criado <span className="font-semibold">sem variações</span>, então não é possível adicioná-las aqui — isso mudaria a chave de estoque e deixaria o estoque atual órfão. Para usar variações, cadastre um novo item marcando <span className="font-semibold">“Possui Variações: Sim”</span>.
            </span>
          </div>
        )}

        {/* ── Variações: modo CRIAÇÃO ── */}
        {!isEditing && hasVariations && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Variações</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => append({ description: '' })}
              >
                Adicionar
              </Button>
            </div>
            {fields.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Nenhuma variação adicionada.</p>
            )}
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-start gap-2">
                <Input
                  placeholder={`Variação ${idx + 1} — Ex: 100 folhas`}
                  error={errors.variations?.[idx]?.description?.message}
                  {...register(`variations.${idx}.description`)}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="mt-0.5 w-9 h-[42px] rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500Bg transition-colors flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

      </form>
    </Modal>
  );
};
