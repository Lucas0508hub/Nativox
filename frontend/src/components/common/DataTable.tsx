import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  sortConfig?: SortConfig;
  onSort?: (field: string) => void;
  actions?: (item: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  sortConfig,
  onSort,
  actions,
  className = '',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <EmptyState
            title="No data"
            description={emptyMessage}
          />
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-sm font-medium text-gray-500 ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${column.className || ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.title}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
