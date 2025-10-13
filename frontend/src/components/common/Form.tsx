import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
}

export interface FormProps {
  title?: string;
  fields: FormField[];
  values: Record<string, any>;
  errors: Record<string, string>;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => void;
  onChange: (name: string, value: any) => void;
  className?: string;
}

export function Form({
  title,
  fields,
  values,
  errors,
  loading = false,
  submitLabel = 'Submit',
  onSubmit,
  onChange,
  className = '',
}: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: values[field.name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onChange(field.name, e.target.value);
      },
      placeholder: field.placeholder,
      required: field.required,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        errors[field.name] ? 'border-red-500' : 'border-gray-300'
      }`,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={field.rows || 3}
          />
        );
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            min={field.min}
            max={field.max}
          />
        );
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
          />
        );
    }
  };

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
              )}
            </div>
          ))}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading && <LoadingSpinner className="mr-2" />}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
