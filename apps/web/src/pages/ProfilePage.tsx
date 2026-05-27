import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Shield, GraduationCap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';

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

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const { user, setMustChangePassword } = useAuthStore();
  const { addToast } = useToast();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      setMustChangePassword(false);
      reset();
      addToast({ type: 'success', title: 'Senha alterada com sucesso!' });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast({ type: 'error', title: msg || 'Senha atual incorreta ou erro ao alterar.' });
    }
  };

  const isAdmin = user?.userType === 'admin';
  const profile = user?.studentProfile;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600"
        >
          <User size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-sm text-gray-400">Suas informações e configurações de conta</p>
        </div>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? <Shield size={10} /> : <GraduationCap size={10} />}
              {isAdmin ? 'Administrador' : 'Estudante'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow label="Nome completo" value={user?.name} />
          <InfoRow label="E-mail" value={user?.email} />

          {isAdmin && (
            <InfoRow label="Cargo" value={(user as any)?.adminProfile?.position} />
          )}

          {!isAdmin && profile && (
            <>
              <InfoRow label="Matrícula" value={profile.registrationNumber} />
              <InfoRow label="Campus" value={profile.campus} />
              <InfoRow label="Curso" value={profile.course} />
              <InfoRow label="Nível de ensino" value={profile.educationLevel} />
              <InfoRow label="Modalidade" value={profile.modality} />
              {profile.baremScore != null && (
                <InfoRow label="Pontuação Barema" value={String(profile.baremScore)} />
              )}
              {profile.aids && profile.aids.length > 0 && (
                <div className="py-3 border-b border-gray-100 sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Bolsas / Auxílios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.aids.map((aid) => (
                      <span key={aid} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {aid.replace(' (VC)', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.mealTypes && (
                <InfoRow label="Tipos de Refeição" value={profile.mealTypes} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Alterar senha</h2>
        </div>

        <div className="mb-5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700 space-y-0.5">
          <p className="font-medium">A nova senha deve ter:</p>
          <ul className="list-disc list-inside text-blue-600 text-xs space-y-0.5 mt-1">
            <li>No mínimo 8 caracteres</li>
            <li>Letras maiúsculas e minúsculas</li>
            <li>Pelo menos um caractere especial (!@#$%...)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          <div className="relative">
            <Input
              label="Senha atual"
              type={showCurrent ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Nova senha"
              type={showNew ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirmar nova senha"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <Button type="submit" loading={isSubmitting}>
            Alterar senha
          </Button>
        </form>
      </div>
    </div>
  );
};
