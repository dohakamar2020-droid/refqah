export type GridStudent = {
  id: string;
  displayName: string;
};

export type GridHadith = {
  id: string;
  order: number;
  title: string;
  published: boolean;
};

/** studentId -> hadithId[] (approved recitations) */
export type RecitationMap = Record<string, string[]>;

export type GridData = {
  students: GridStudent[];
  hadiths: GridHadith[];
  recited: RecitationMap;
};

export function cellKey(studentId: string, hadithId: string) {
  return `${studentId}::${hadithId}`;
}
