'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAppMode } from '@/context/app-mode-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();
  const { setMode } = useAppMode();
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    const { error } = await signInWithPassword(data.email, data.password);
    if (error) {
      setAuthError(error.message || 'Invalid email or password.');
    } else {
      router.push('/dashboard');
    }
  };

  const handleContinueAsDemo = () => {
    setMode('demo');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            LeadFlow <span className="text-indigo-600">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your agency workspace
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Create an agency account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {authError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Work Email <span className="text-rose-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="alex@youragency.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or explore</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full text-xs text-slate-600 hover:text-slate-900"
            onClick={handleContinueAsDemo}
          >
            Launch Interactive Demo Mode (No Login)
          </Button>
        </div>
      </div>
    </div>
  );
}

