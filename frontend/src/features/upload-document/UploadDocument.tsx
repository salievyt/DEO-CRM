"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { documentsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Upload, File, X } from "lucide-react";

interface UploadDocumentProps {
  projectId?: string;
  clientId?: string;
  onSuccess?: () => void;
}

export function UploadDocument({ projectId, clientId, onSuccess }: UploadDocumentProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => documentsApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
      setFiles([]);
      onSuccess?.();
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/zip": [".zip"],
    },
    maxFiles: 5,
  });

  const handleUpload = () => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });
    if (projectId) formData.append("project", projectId);
    if (clientId) formData.append("client", clientId);
    mutation.mutate(formData);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-surface-300 hover:border-surface-400 dark:border-surface-600"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-surface-400" />
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
          {isDragActive
            ? "Перетащите файлы сюда..."
            : "Перетащите файлы или нажмите для выбора"}
        </p>
        <p className="mt-1 text-xs text-surface-400">
          PDF, DOCX, XLSX, JPG, PNG, ZIP до 10MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-700"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-surface-400" />
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  {file.name}
                </span>
                <span className="text-xs text-surface-400">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-surface-400 hover:text-danger-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={handleUpload} loading={mutation.isPending}>
              <Upload className="h-4 w-4" />
              Загрузить ({files.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
