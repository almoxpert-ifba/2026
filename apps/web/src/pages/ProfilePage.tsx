import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Menu, Lock, Eye, EyeOff, Shield, GraduationCap, Bell, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';
import { getInitials, aidColor } from '../utils';

interface OutletCtx { onMenuClick: () => void }

const passwordRules = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[a-z]/, 'Deve ter pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'Deve ter pelo menos uma letra maiúscula')
  .regex(/[^a-zA-Z0-9]/, 'Deve ter pelo menos um caractere especial');

const schema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     passwordRules,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

const InfoRow: React.FC<{ label: string; value?: string | number | null; span?: boolean }> = ({ label, value, span }) => (
  <div className={`py-3 border-b border-gray-100 last:border-0 ${span ? 'sm:col-span-2' : ''}`}>
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const { user: authUser, setMustChangePassword } = useAuthStore();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authService.me(),
  });

  const toggleEmailsMutation = useMutation({
    mutationFn: (val: boolean) => authService.updatePreferences(val),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Preferência de e-mails atualizada.');
    },
    onError: () => {
      toast.error('Erro ao atualizar preferência.');
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      setMustChangePassword(false);
      reset();
      toast.success('Senha alterada com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg || 'Senha atual incorreta ou erro ao alterar.');
    }
  };

  const isAdmin  = (user ?? authUser)?.userType === 'admin';
  const profile  = user?.studentProfile;
  const name     = user?.name ?? authUser?.name ?? '';
  const email    = user?.email ?? authUser?.email ?? '';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-sm text-gray-400">Suas informações e configurações de conta</p>
        </div>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Avatar + nome */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {getInitials(name)}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{name}</p>
            <p className="text-sm text-gray-400">{email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? <Shield size={10} /> : <GraduationCap size={10} />}
              {isAdmin ? 'Administrador' : 'Estudante'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-3 border-b border-gray-100">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label="Nome completo" value={name} />
            <InfoRow label="E-mail" value={email} />

            {isAdmin && (
              <InfoRow label="Cargo" value={user?.adminProfile?.position} />
            )}

            {!isAdmin && (
              <>
                <InfoRow label="Matrícula"       value={profile?.registrationNumber} />
                <InfoRow label="Campus"           value={profile?.campus} />
                <InfoRow label="Curso"            value={profile?.course} />
                <InfoRow label="Nível de Ensino"  value={profile?.educationLevel} />
                <InfoRow label="Modalidade"       value={profile?.modality} />
                {profile?.mealTypes && (
                  <InfoRow label="Tipo de Refeição" value={profile.mealTypes} />
                )}
                {profile?.socialPrograms && (
                  <InfoRow label="Programas Sociais" value={profile.socialPrograms} span />
                )}

                {/* Auxílios com cor por tipo */}
                <div className="py-3 border-b border-gray-100 sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-1.5">Bolsas / Auxílios</p>
                  {profile?.aids?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.aids.map((aid) => (
                        <span key={aid} className={`text-xs px-2.5 py-1 rounded-full font-medium ${aidColor(aid)}`}>
                          {aid.replace(' (VC)', '')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-800">—</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Alterar senha</h2>
        </div>

        <div className="mb-5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
          <p className="font-medium mb-1">A nova senha deve ter:</p>
          <ul className="list-disc list-inside text-blue-600 text-xs space-y-0.5">
            <li>No mínimo 8 caracteres</li>
            <li>Letras maiúsculas e minúsculas</li>
            <li>Pelo menos um caractere especial (!@#$%...)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          <div className="relative">
            <Input label="Senha atual" type={showCurrent ? 'text' : 'password'} placeholder="••••••••"
              error={errors.currentPassword?.message} {...register('currentPassword')} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input label="Nova senha" type={showNew ? 'text' : 'password'} placeholder="••••••••"
              error={errors.newPassword?.message} {...register('newPassword')} />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input label="Confirmar nova senha" type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
              error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <Button type="submit" loading={isSubmitting}>Alterar senha</Button>
        </form>
      </div>

      {/* Data Export (LGPD art. 18) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Download size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Exportar meus dados</h2>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Portabilidade de dados (LGPD art. 18)</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Baixe um arquivo JSON com seu perfil completo e histórico de pedidos.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => authService.exportMyData()}
          >
            <Download size={14} className="mr-1.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Notificações por e-mail</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Receber e-mails do sistema</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizações sobre seus pedidos e avisos importantes.
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading || toggleEmailsMutation.isPending}
            onClick={() => toggleEmailsMutation.mutate(!(user?.receiveEmails ?? true))}
            className={[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              (user?.receiveEmails ?? true) ? 'bg-blue-600' : 'bg-gray-200',
              (isLoading || toggleEmailsMutation.isPending) ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            role="switch"
            aria-checked={user?.receiveEmails ?? true}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                (user?.receiveEmails ?? true) ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
