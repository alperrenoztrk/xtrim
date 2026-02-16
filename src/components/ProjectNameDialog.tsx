import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProjectNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title?: string;
  placeholder?: string;
}

export const ProjectNameDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Project Name',
  placeholder = 'Enter project name...',
}: ProjectNameDialogProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }
    if (trimmedName.length > 50) {
      setError('Project name can be at most 50 characters');
      return;
    }
    onConfirm(trimmedName);
    setName('');
    setError('');
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-[90%] max-w-sm bg-background rounded-2xl p-6 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={placeholder}
                  className={error ? 'border-destructive' : ''}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1 bg-gradient-to-r from-primary to-accent"
                  onClick={handleSubmit}
                >
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectNameDialog;
