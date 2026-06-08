import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Hexagon, Lock } from 'lucide-react';
import { useLogin, useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useAuthStore } from '../store/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth, token, user } = useAuthStore();

  const loginMutation = useLogin();

  const { data: me } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token && !user,
      retry: false,
    }
  });

  useEffect(() => {
    if (user) {
      setLocation(user.role === 'manufacturer' ? '/manufacturer/dashboard' : '/distributor/dashboard');
    } else if (me && token) {
      setAuth(token, me);
      setLocation(me.role === 'manufacturer' ? '/manufacturer/dashboard' : '/distributor/dashboard');
    }
  }, [user, me, token, setLocation, setAuth]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuth(res.token, res.user);
        setLocation(res.user.role === 'manufacturer' ? '/manufacturer/dashboard' : '/distributor/dashboard');
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDEiLz4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjAyIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-20"></div>
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-card border border-border p-4 rounded-xl shadow-xl mb-4">
            <Hexagon className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VMS<span className="text-primary">_CORE</span></h1>
          <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-mono">Vehicle Management System</p>
        </div>

        <Card className="border-border/50 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Lock className="w-5 h-5 mr-2 text-muted-foreground" />
              Secure Authentication
            </CardTitle>
            <CardDescription>Enter your credentials to access the command center.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="operator@domain.com" {...field} className="font-mono bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="font-mono bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {loginMutation.isError && (
                  <div className="text-destructive text-sm font-mono bg-destructive/10 p-2 rounded border border-destructive/20">
                    ERR: Authentication failed. Verify credentials.
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'VERIFYING...' : 'INITIALIZE SESSION'}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                Built by <span className="text-primary font-semibold">George Muia</span> for <span className="text-foreground">Stone Africa</span>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Test Protocols</h3>
              <div className="space-y-2 text-sm font-mono">
                <div 
                  className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => {
                    form.setValue('email', 'manufacturer@test.com');
                    form.setValue('password', 'password');
                  }}
                >
                  <span className="text-primary">manufacturer@test.com</span>
                  <span className="text-muted-foreground">password</span>
                </div>
                <div 
                  className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => {
                    form.setValue('email', 'distributor1@test.com');
                    form.setValue('password', 'password');
                  }}
                >
                  <span className="text-foreground">distributor1@test.com</span>
                  <span className="text-muted-foreground">password</span>
                </div>
                <div 
                  className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => {
                    form.setValue('email', 'distributor2@test.com');
                    form.setValue('password', 'password');
                  }}
                >
                  <span className="text-foreground">distributor2@test.com</span>
                  <span className="text-muted-foreground">password</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
