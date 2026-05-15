export type SchemaColumn = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  references?: string;
};

export type SchemaTable = {
  name: string;
  description: string;
  relationships?: string[];
  columns: SchemaColumn[];
};
