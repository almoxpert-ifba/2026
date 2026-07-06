import { useEffect } from 'react';
import { Users, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/FormFields';
import { ComboBox } from '../../../components/ui/ComboBox';
import type { User, UpdateUserDto, CreateUserDto, StudentAid } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AIDS_OPTIONS: { value: StudentAid; label: string }[] = [
  { value: 'Auxílio Alimentação (VC)',               label: 'Auxílio Alimentação' },
  { value: 'Auxílio Transporte Municipal (VC)',      label: 'Transporte Municipal' },
  { value: 'Auxílio Transporte Intermunicipal (VC)', label: 'Transporte Intermunicipal' },
  { value: 'Auxílio Moradia (VC)',                   label: 'Moradia' },
  { value: 'Auxílio Cópia e Impressão (VC)',         label: 'Cópia e Impressão' },
  { value: 'Bolsa de Estudo (VC)',                   label: 'Bolsa de Estudo' },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:               z.string().min(2, 'Nome obrigatório'),
  email:              z.string().email('E-mail inválido'),
  password:           z.string().min(6, 'Mínimo 6 caracteres').optional(),
  userType:           z.enum(['admin', 'student']),
  registrationNumber: z.string().optional(),
  course:             z.string().optional(),
  campus:             z.string().optional(),
  educationLevel:     z.string().optional(),
  modality:           z.string().optional(),
  aids:               z.array(z.string()).optional(),
  mealTypes:          z.string().optional(),
  position:           z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name:               z.string().min(2, 'Nome obrigatório'),
  email:              z.string().email('E-mail inválido'),
  password:           z.string().min(6, 'Mínimo 6 caracteres').or(z.literal('')).optional(),
  registrationNumber: z.string().optional(),
  course:             z.string().optional(),
  position:           z.string().optional(),
  isActive:           z.enum(['true', 'false']),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type UserFormModalProps =
  | { mode: 'create'; user?: null;  onSave: (dto: CreateUserDto) => void; loading: boolean; open: boolean; onClose: () => void }
  | { mode: 'edit';   user: User;   onSave: (dto: UpdateUserDto) => void; loading: boolean; open: boolean; onClose: () => void };

// ─── Create Form ─────────────────────────────────────────────────────────────

const CREATE_FORM_ID = 'user-create-form-modal';

function CreateUserForm({ onSave }: {
  onSave: (dto: CreateUserDto) => void;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { userType: 'student', aids: [] },
  });
  const watchType = watch('userType');
  const watchAids = watch('aids') ?? [];

  const onSubmit = (d: CreateForm) => {
    const base = {
      name:     d.name,
      email:    d.email,
      password: d.userType === 'student' ? `ifba.${d.registrationNumber ?? ''}` : (d.password ?? ''),
      userType: d.userType as 'admin' | 'student',
    };
    const dto: CreateUserDto = d.userType === 'student'
      ? { ...base, registrationNumber: d.registrationNumber, course: d.course, campus: d.campus,
          educationLevel: d.educationLevel as any, modality: d.modality as any,
          aids: d.aids?.length ? d.aids as any : undefined, mealTypes: d.mealTypes }
      : { ...base, position: d.position };
    onSave(dto);
  };

  return (
    <form id={CREATE_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome Completo" placeholder="João da Silva" error={errors.name?.message} {...register('name')} />
        <Input label="E-mail" type="email" placeholder="joao@ifba.edu.br" error={errors.email?.message} {...register('email')} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Tipo de Usuário"
          options={[{ value: 'student', label: 'Estudante' }, { value: 'admin', label: 'Administrador' }]}
          error={errors.userType?.message}
          {...register('userType')}
        />
        {watchType === 'admin' ? (
          <Input label="Senha" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
        ) : (
          <div className="w-full">
            <p className="label">Senha</p>
            <div className="input bg-gray-50 text-gray-400 text-xs flex items-center select-none cursor-default">
              ifba.<span className="text-gray-500 font-mono">{watch('registrationNumber') || 'matrícula'}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Gerada automaticamente</p>
          </div>
        )}
      </div>

      {watchType === 'admin' && (
        <Input label="Cargo" placeholder="Assistente Social" {...register('position')} />
      )}

      {watchType === 'student' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dados acadêmicos</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Matrícula" placeholder="20221234" {...register('registrationNumber')} />
            <Input label="Campus" placeholder="VC" {...register('campus')} />
          </div>

          <Input label="Curso" placeholder="113 - Bacharelado em Engenharia Elétrica" {...register('course')} />

          <div className="grid sm:grid-cols-2 gap-4">
            <ComboBox
              label="Nível de Ensino" placeholder="Selecione..."
              options={[{ value: 'Graduação', label: 'Graduação' }, { value: 'Médio', label: 'Médio' }]}
              value={watch('educationLevel') ?? ''}
              onChange={(v) => setValue('educationLevel', v as string)}
            />
            <ComboBox
              label="Modalidade" placeholder="Selecione..."
              options={[
                { value: 'Bacharelado',        label: 'Bacharelado' },
                { value: 'Licenciatura',        label: 'Licenciatura' },
                { value: 'Técnico Integrado',   label: 'Técnico Integrado' },
                { value: 'Técnico Subsequente', label: 'Técnico Subsequente' },
              ]}
              value={watch('modality') ?? ''}
              onChange={(v) => setValue('modality', v as string)}
            />
          </div>

          <ComboBox
            multiple label="Auxílios Aprovados" placeholder="Selecione os auxílios..."
            options={AIDS_OPTIONS}
            value={watchAids as string[]}
            onChange={(vals) => setValue('aids', vals as string[])}
          />

          <ComboBox
            label="Tipo de Refeição (auxílio alimentação)" placeholder="Não se aplica"
            options={[
              { value: 'Almoço',               label: 'Almoço' },
              { value: 'Jantar',                label: 'Jantar' },
              { value: 'Café da manhã',         label: 'Café da manhã' },
              { value: 'Almoço, Café da manhã', label: 'Almoço e Café da manhã' },
            ]}
            value={watch('mealTypes') ?? ''}
            onChange={(v) => setValue('mealTypes', v as string)}
          />
        </div>
      )}
    </form>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

const EDIT_FORM_ID = 'user-edit-form-modal';

function EditUserForm({ user, onSave }: { user: User; onSave: (dto: UpdateUserDto) => void }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    reset({
      name:               user.name,
      email:              user.email,
      password:           '',
      registrationNumber: user.studentProfile?.registrationNumber ?? '',
      course:             user.studentProfile?.course ?? '',
      position:           user.adminProfile?.position ?? '',
      isActive:           user.isActive ? 'true' : 'false',
    });
  }, [user.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (d: EditForm) => {
    const dto: UpdateUserDto = {
      name:     d.name,
      email:    d.email,
      isActive: d.isActive === 'true',
      ...(d.password ? { password: d.password } : {}),
      ...(user.userType === 'student'
        ? { registrationNumber: d.registrationNumber, course: d.course }
        : { position: d.position }),
    };
    onSave(dto);
  };

  return (
    <form id={EDIT_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome Completo" placeholder="João da Silva" error={errors.name?.message} {...register('name')} />
        <Input label="E-mail" type="email" placeholder="joao@email.com" error={errors.email?.message} {...register('email')} />
      </div>

      {user.userType === 'admin' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nova Senha" type="password" placeholder="Deixe em branco para não alterar" error={errors.password?.message} {...register('password')} />
          <ComboBox
            label="Status" clearable={false}
            options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]}
            value={watch('isActive') ?? ''}
            onChange={(v) => setValue('isActive', v as 'true' | 'false')}
          />
        </div>
      ) : (
        <ComboBox
          label="Status" clearable={false}
          options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]}
          value={watch('isActive') ?? ''}
          onChange={(v) => setValue('isActive', v as 'true' | 'false')}
        />
      )}

      {user.userType === 'student' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Matrícula" placeholder="20221234" {...register('registrationNumber')} />
          <Input label="Curso" placeholder="Técnico em Informática" {...register('course')} />
        </div>
      ) : (
        <Input label="Cargo" placeholder="Assistente Social" {...register('position')} />
      )}
    </form>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const UserFormModal: React.FC<UserFormModalProps> = (props) => {
  const isEditing = props.mode === 'edit';
  const formId    = isEditing ? EDIT_FORM_ID : CREATE_FORM_ID;

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
      subtitle={isEditing ? 'Atualize os dados do usuário' : 'Preencha os dados do novo usuário'}
      icon={isEditing ? <Pencil size={18} /> : <Users size={18} />}
      maxWidth={isEditing ? 'lg' : 'xl'}
      footer={<>
        <Button type="button" variant="secondary" onClick={props.onClose}>Cancelar</Button>
        <Button type="submit" form={formId} loading={props.loading}>
          {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
        </Button>
      </>}
    >
      {isEditing
        ? <EditUserForm user={props.user} onSave={props.onSave as (dto: UpdateUserDto) => void} />
        : <CreateUserForm onSave={props.onSave as (dto: CreateUserDto) => void} />
      }
    </Modal>
  );
};
