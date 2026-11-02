'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Mail, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid work email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [submitted, setSubmitted] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMsg(null);
    const { error } = await requestPasswordReset(data.email);
    // Security best-practice: always show success to prevent account enumeration
    if (error && error.message.includes('not configured')) {
      setErrorMsg(error.message);
    } else {
      setSubmitted(true);
    }
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
          Reset your password
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Enter your email and we&apos;ll send instructions to recover access.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Check your inbox</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                If an account exists with that email address, you will receive a secure password
                reset link shortly.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Account Email Address <span className="text-rose-500">*</span>
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

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isSubmitting}
              >
                <span>Send Reset Link</span>
                <Send className="h-4 w-4 ml-1.5" />
              </Button>

              <div className="text-center pt-3 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

