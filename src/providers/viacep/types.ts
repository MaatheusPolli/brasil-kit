export interface ViaCepEndereco {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade?: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado?: string;
  regiao?: string;
  ibge: string;
  gia?: string;
  ddd: string;
  siafi?: string;
}

/** ViaCEP responde 200 com `{ erro: true }` (ou `"true"`) para CEP inexistente. */
export interface ViaCepErro {
  erro: true | 'true';
}

export type ViaCepResponse = ViaCepEndereco | ViaCepErro;
