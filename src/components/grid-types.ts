export type GridStudent = {
  id: string;
  displayName: string;
  /** المركز في ترتيب المعلمة (1 = الأولى) */
  rank?: number;
};

export type GridHadith = {
  id: string;
  order: number;
  title: string;
  published: boolean;
  /** لقب الحديث الذي منحته المعلمة، وصاحبته */
  awardTitle?: string | null;
  awardStudentName?: string | null;
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
