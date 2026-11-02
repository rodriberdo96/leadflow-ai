'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Building, Lock, Mail, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAppMode } from '@/context/app-mode-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Name is too long'),
  companyName: z
    .string()
    .trim()
    .min(2, 'Agency/Company name must be at least 2 characters')
    .max(100, 'Company name is too long'),
  email: z.string().trim().email('Please enter a valid work email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { setMode } = useAppMode();
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null);
    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.companyName
    );

    if (error) {
      setAuthError(error.message || 'Registration failed. Please try again.');
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
          Create your agency workspace
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Sign in to existing workspace
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
                htmlFor="fullName"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                id="fullName"
                placeholder="Alex Morgan"
                icon={<User className="h-4 w-4" />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />
            </div>

            <div>
              <label
                htmlFor="companyName"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Agency / Company Name <span className="text-rose-500">*</span>
              </label>
              <Input
                id="companyName"
                placeholder="Apex Media Studio"
                icon={<Building className="h-4 w-4" />}
                error={errors.companyName?.message}
                {...register('companyName')}
              />
            </div>

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
                placeholder="alex@apexmedia.io"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 chars, 1 uppercase & 1 number"
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
              <span>Create Agency Account</span>
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

