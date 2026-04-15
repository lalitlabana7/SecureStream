'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, details: string) => void;
}

const REPORT_CATEGORIES = [
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '⚠️' },
  { id: 'harassment', label: 'Harassment', emoji: '🚫' },
  { id: 'spam_bot', label: 'Spam / Bot', emoji: '🤖' },
  { id: 'other', label: 'Other', emoji: '📝' },
] as const;

export function ReportDialog({ open, onOpenChange, onSubmit }: ReportDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (!selectedCategory) return;
    const category = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);
    const reason = category ? `${category.emoji} ${category.label}` : selectedCategory;
    onSubmit(reason, details.trim());
    // Reset form
    setSelectedCategory(null);
    setDetails('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedCategory(null);
      setDetails('');
    }
    onOpenChange(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Report User</AlertDialogTitle>
          <AlertDialogDescription className="text-neutral-400">
            Select a reason for reporting this user. This will end the current session.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">
            Report Reason
          </p>
          {REPORT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all duration-200',
                selectedCategory === category.id
                  ? 'bg-red-500/10 border-red-500/40 text-red-300'
                  : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600',
              )}
            >
              <span className="text-base">{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {selectedCategory && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Additional Details (optional)
            </p>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what happened..."
              className="bg-neutral-800 border-neutral-700 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 resize-none min-h-[60px]"
              maxLength={500}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => handleOpenChange(false)}
            className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!selectedCategory}
            className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
          >
            Submit Report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
