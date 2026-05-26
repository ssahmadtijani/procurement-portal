'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(1, 'Min 1'),
  unit: z.string().min(1, 'Required'),
  specifications: z.string().optional(),
});

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  bidDeadline: z.string().min(1, 'Required'),
  requiredDeliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type FormValues = z.infer<typeof schema>;

export default function CreateRFQPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ description: '', quantity: 1, unit: 'pcs', specifications: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const create = useMutation({
    mutationFn: (data: FormValues) => api.post('/rfqs', data).then((r) => r.data.data),
    onSuccess: (rfq) => {
      toast({ title: 'RFQ created!' });
      router.push(`/dashboard/corporate/rfqs/${rfq.id}`);
    },
    onError: () => toast({ title: 'Failed to create RFQ', variant: 'destructive' }),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Create RFQ</h1>

      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>RFQ Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="Office supplies procurement" />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                {...register('description')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe your procurement requirements…"
              />
              {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bid Deadline</Label>
                <Input type="datetime-local" {...register('bidDeadline')} />
                {errors.bidDeadline && <p className="text-destructive text-xs">{errors.bidDeadline.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Required Delivery Date</Label>
                <Input type="date" {...register('requiredDeliveryDate')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Delivery Address</Label>
              <Input {...register('deliveryAddress')} placeholder="123 Corporate HQ, City" />
            </div>

            <div className="space-y-1">
              <Label>Terms & Conditions</Label>
              <textarea
                {...register('terms')}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional terms…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit: 'pcs', specifications: '' })}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Description</Label>
                    <Input {...register(`items.${index}.description`)} placeholder="A4 Paper Reams" />
                    {errors.items?.[index]?.description && (
                      <p className="text-destructive text-xs">{errors.items[index]?.description?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Unit</Label>
                    <Input {...register(`items.${index}.unit`)} placeholder="pcs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input type="number" min={1} {...register(`items.${index}.quantity`)} />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-destructive text-xs">{errors.items[index]?.quantity?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Specifications</Label>
                    <Input {...register(`items.${index}.specifications`)} placeholder="Optional specs" />
                  </div>
                </div>
              </div>
            ))}
            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-destructive text-xs">{errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create RFQ'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
