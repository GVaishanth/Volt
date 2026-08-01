export type SupportedLanguage = 'C' | 'C++' | 'Python' | 'Java' | 'JavaScript' | 'Bash' | 'Text';

export interface ILanguageDetectionResult {
  language: SupportedLanguage;
  confidence: 'HIGH' | 'SUFFICIENT' | 'AMBIGUOUS';
  entryPoint: string;
  dependencies: string[];
}

export interface ISmartErrorDiagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  rawText: string;
}
