'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  deadline: z.string().min(1, 'Required'),
  budget: z.coerce.number().positive().optional(),
  currency: z.string().default('USD'),
  visibility: z.enum(['PUBLIC', 'INVITED']).default('PUBLIC'),
});

type RFQForm = z.infer<typeof schema>;

export default function NewRFQPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<RFQForm>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'PUBLIC', currency: 'USD' },
  });

  const mutation = useMutation({
    mutationFn: (data: RFQForm) => api.post('/rfqs', data),
    onSuccess: (res) => {
      toast({ title: 'RFQ created' });
      router.push(`/org/${slug}/rfqs/${res.data.data.id}`);
    },
    onError: (e: unknown) =>
      toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Create RFQ</h1>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="space-y-1">
          <Label>Title</Label>
          <Input {...register('title')} placeholder="Office supplies Q3 2025" />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <textarea
            {...register('description')}
            rows={5}
            placeholder="Detailed description of what you need…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Deadline</Label>
            <Input type="date" {...register('deadline')} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Budget (optional)</Label>
            <div className="flex gap-2">
              <select
                {...register('currency')}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>NGN</option>
              </select>
              <Input type="number" placeholder="0.00" {...register('budget')} />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Visibility</Label>
          <select
            {...register('visibility')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="PUBLIC">Public — visible to all verified suppliers</option>
            <option value="INVITED">Invited — only suppliers you invite</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create RFQ'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
