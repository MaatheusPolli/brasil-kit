import { ValidationError } from './errors.js';
import { isUF, type UF } from '../domain/uf.js';

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export function normalizeCep(input: string): string {
  const digits = typeof input === 'string' ? onlyDigits(input) : '';
  if (typeof input !== 'string' || !/^\d{5}-?\d{3}$/.test(input.trim()) || digits.length !== 8)
    throw new ValidationError(`CEP inválido: "${String(input)}" (esperado 8 dígitos)`);
  return digits;
}

export function normalizeUf(input: string): UF {
  if (!isUF(input)) throw new ValidationError(`UF inválida: "${String(input)}"`);
  return input.toUpperCase() as UF;
}

export function normalizeCnpj(input: string): string {
  const digits = typeof input === 'string' ? onlyDigits(input) : '';
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits) || !cnpjChecksumOk(digits))
    throw new ValidationError(`CNPJ inválido: "${String(input)}"`);
  return digits;
}

function cnpjChecksumOk(d: string): boolean {
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function requireText(value: string, field: string, min = 1): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) throw new ValidationError(`${field} deve ter ao menos ${min} caractere(s)`);
  return text;
}

export function requireInt(value: number | string, field: string, min: number, max: number): number {
  const n = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max)
    throw new ValidationError(`${field} inválido: "${String(value)}" (esperado inteiro entre ${min} e ${max})`);
  return n;
}
