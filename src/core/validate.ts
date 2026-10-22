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

/**
 * Normaliza um CNPJ numérico ou alfanumérico (formato da Receita Federal em vigor
 * desde julho de 2026: 12 caracteres `A-Z0-9` + 2 dígitos verificadores numéricos).
 * Remove a máscara, converte para maiúsculas e valida os dígitos verificadores
 * pelo módulo 11 sobre o valor ASCII de cada caractere menos 48.
 */
export function normalizeCnpj(input: string): string {
  const value = typeof input === 'string' ? input.trim().replace(/[.\-/\s]/g, '').toUpperCase() : '';
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(value) || isRepeated(value) || !cnpjChecksumOk(value))
    throw new ValidationError(`CNPJ inválido: "${String(input)}"`);
  return value;
}

/** Sequências de um único caractere repetido (ex.: `00000000000000`) nunca são válidas. */
const isRepeated = (value: string): boolean => [...value].every((char) => char === value[0]);

/** Valor de um caractere do CNPJ no cálculo do DV: dígitos 0–9, letras a partir de 17 (A=17). */
const cnpjCharValue = (char: string): number => char.charCodeAt(0) - 48;

function cnpjChecksumOk(value: string): boolean {
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * cnpjCharValue(value[i]!), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(value[12]) && calc(13) === Number(value[13]);
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
