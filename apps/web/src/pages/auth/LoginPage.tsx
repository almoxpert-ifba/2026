import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormFields';

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authService.login({ email: data.email, password: data.password });
      const user = {
        id:         res.user.id,
        name:       res.user.name,
        email:      res.user.email,
        userType:  res.user.userType as 'admin' | 'student',
        isActive:  true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAuth(res.accessToken, user, res.mustChangePassword);
      navigate(res.mustChangePassword ? '/force-change-password' : '/dashboard');
    } catch {
      setApiError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel - Large Screens */}
      <div className="hidden lg:flex w-[420px] bg-gray-900 flex-col justify-content p-10 flex-shrink-0">
        <div className="flex items-center justify-center mb-10">
          {/* Logo principal unificada e ampliada (ícone + texto do image_0.png) */}
          <img src="/iconeAlmoXpert.png" alt="AlmoxPert Logo" className="h-50 w-auto object-contain justify-center" />
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-8">
            Controle de<br />Almoxarifado<br />
            <span className="text-blue-400">Digital</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-[340px] mb-8">
            Gerencie estoque, pedidos e remessas de materiais com eficiência e precisão no sistema.
          </p>
        </div>

        <div className="space-y-3 mt-8">
          {[
            { label: 'IFBA',           desc: 'Campus Vitória da Conquista' },
            { label: 'Serviço Social', desc: 'Gestão de Materiais Escolares' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-white/60 text-xs">
                <span className="text-white/90 font-medium">{item.label}</span> — {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form & Mobile Logo */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo - Unificada e Centralizada */}
          <div className="flex lg:hidden items-center justify-center mb-2">
            <img src="/logoAlmoXpert.png" alt="AlmoxPert Mobile Logo" className="h-50 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Acesse sua conta</h1>
            <p className="text-sm text-gray-400">Bem-vindo de volta ao AlmoxPert</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="relative">
              <Input
                label="Senha"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock size={15} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {apiError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" loading={isSubmitting} size="lg">
              Entrar no sistema
            </Button>

            <div className="text-center mt-3">
              <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                Esqueceu sua senha?
              </Link>
            </div>
          </form>

          <p className="text-center text-xs text-gray-300 mt-12">
            IFBA Campus Vitória da Conquista — Serviço Social
          </p>
        </div>
      </div>
    </div>
  );
};