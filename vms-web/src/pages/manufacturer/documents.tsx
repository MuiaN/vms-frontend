import { useState } from 'react';
import { useListDocuments, useUploadDocument, getListDocumentsQueryKey, useListDistributors } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  'Supplier Licence',
  'Certification',
  'NDA',
  'Contract',
  'Purchase Order',
  'Manifest',
  'Homologation Certificate',
  'Technical Specification',
  'Compliance Report',
  'Other',
];

const uploadSchema = z.object({
  fileName: z.string().min(1, 'Required'),
  fileType: z.string().min(1, 'Required'),
  distributorId: z.string().optional(),
});

type UploadForm = z.infer<typeof uploadSchema>;

export default function ManufacturerDocuments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: documents, isLoading } = useListDocuments();
  const { data: distributors } = useListDistributors();
  const uploadDoc = useUploadDocument();

  const form = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { fileName: '', fileType: 'Certification', distributorId: 'none' },
  });

  const onSubmit = (data: UploadForm) => {
    const payload = {
      fileName: data.fileName,
      fileType: data.fileType,
      distributorId: data.distributorId === 'none' ? null : parseInt(data.distributorId || ''),
    };

    uploadDoc.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        form.reset({ fileName: '', fileType: 'Certification', distributorId: 'none' });
        toast({ title: "Document Uploaded", description: "The file has been saved to the secure vault." });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground font-mono mt-1">SECURE_FILE_STORAGE</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 bg-card border-border h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Upload className="w-5 h-5 mr-2 text-primary" />
                Upload File
              </CardTitle>
              <CardDescription>Upload supplier licences, certifications, NDAs, contracts, and more.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="fileName" render={({ field }) => (
                    <FormItem><FormLabel>File Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Q3_Manifest_Europe" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fileType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="distributorId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Distributor (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select distributor" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Shared / Internal</SelectItem>
                          {distributors?.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={uploadDoc.isPending}>
                    {uploadDoc.isPending ? 'UPLOADING...' : 'UPLOAD TO VAULT'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Vault Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground font-mono">LOADING_INDEX...</div>
              ) : documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id} className="border-border">
                        <TableCell className="font-medium">{doc.fileName}</TableCell>
                        <TableCell><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{doc.fileType}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{new Date(doc.uploadDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: "Simulated Download", description: `Downloading ${doc.fileName}` })}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground font-mono">VAULT_EMPTY</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
