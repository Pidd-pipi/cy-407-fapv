export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export type AnnotationIcon = 'detail' | 'material' | 'history' | 'technique';

export interface Annotation {
  id: string;
  artifactId: string;
  position: Vector3Tuple;
  title: string;
  content: string;
  iconType: AnnotationIcon;
  createdAt: string;
  updatedAt: string;
}

export type AnnotationDraft = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;
