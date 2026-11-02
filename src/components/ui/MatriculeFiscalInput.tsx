/**
 * Tunisian Matricule Fiscal Input with Live Validation.
 * Validates against official format: 7 digits + letter + / + M/P + / + TVA code + / + 3 digits.
 * Example: 1485962B/A/M/000
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';
import { Input, InputProps } from './Input.js';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface MatriculeFiscalInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const MatriculeFiscalInput: React.FC<MatriculeFiscalInputProps> = ({
  value,
  onChange,
  label = 'Matricule Fiscal Tunisien',
  helperText = 'Exemple : 1485962B/A/M/000',
  ...props
}) => {
  const clean = value.trim().toUpperCase();
  const pattern = /^[0-9]{7}[A-Z]\/[A-Z]\/[A-Z]\/[0-9]{3}$/;
  const isValid = clean.length > 0 && pattern.test(clean);
  const isPartial = clean.length > 0 && !isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
  };

  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={handleChange}
        placeholder="1234567A/M/A/000"
        helperText={helperText}
        rightIcon={
          isValid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : isPartial ? (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          ) : undefined
        }
        {...props}
      />
      {isPartial ? (
        <span className="inline-block mt-1 text-[11px] text-amber-600 dark:text-amber-400">
          Format attendu : 7 chiffres + 1 lettre + / + Catégorie + / + TVA + / + 3 chiffres (ex: 1485962B/A/M/000)
        </span>
      ) : undefined}
    </div>
  );
};

