export interface IbgeRegiao {
  id: number;
  sigla: string;
  nome: string;
}

export interface IbgeUF {
  id: number;
  sigla: string;
  nome: string;
  regiao: IbgeRegiao;
}

export interface IbgeMunicipio {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: IbgeUF } } | null;
  'regiao-imediata'?: { 'regiao-intermediaria'?: { UF?: IbgeUF } } | null;
}
