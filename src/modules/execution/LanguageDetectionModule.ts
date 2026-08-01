import { ILanguageDetectionResult, SupportedLanguage } from '@types';
import { VFSModule } from '@modules/filesystem/VFSModule';

export interface ILanguageDetectionModule {
  detect(targetPath: string, cwd: string, vfs?: VFSModule): Promise<ILanguageDetectionResult>;
}

export class LanguageDetectionModule implements ILanguageDetectionModule {
  public async detect(
    targetPath: string,
    _cwd: string,
    vfs?: VFSModule
  ): Promise<ILanguageDetectionResult> {
    const lower = targetPath.toLowerCase();

    // Check extension first for quick deterministic identification
    if (lower.endsWith('.c')) {
      return { language: 'C', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) {
      return { language: 'C++', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (lower.endsWith('.py')) {
      return { language: 'Python', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (lower.endsWith('.java')) {
      return { language: 'Java', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
      return { language: 'JavaScript', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (lower.endsWith('.sh') || lower.endsWith('.bash')) {
      return { language: 'Bash', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }

    // Step 1: Read content and ignore blank lines
    let content = '';
    if (vfs) {
      try {
        content = await vfs.readFileAsText(targetPath);
      } catch {
        // Ignore if file read fails
      }
    }

    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('# '));

    if (lines.length === 0) {
      return {
        language: 'Text',
        confidence: 'AMBIGUOUS',
        entryPoint: targetPath,
        dependencies: []
      };
    }

    // Step 2 & 3: Read first meaningful line
    const firstLine = lines[0];
    if (firstLine.includes('#include <iostream>') || firstLine.includes('std::')) {
      return { language: 'C++', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (firstLine.includes('#include <stdio.h>') || firstLine.includes('#include <stdlib.h>')) {
      return { language: 'C', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (
      firstLine.startsWith('import sys') ||
      firstLine.startsWith('import os') ||
      firstLine.startsWith('def main():')
    ) {
      return { language: 'Python', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }
    if (
      firstLine.startsWith('package ') ||
      firstLine.includes('public class ') ||
      firstLine.includes('public static void main')
    ) {
      return { language: 'Java', confidence: 'HIGH', entryPoint: targetPath, dependencies: [] };
    }

    // Step 4: Analyze up to 3 meaningful lines
    const firstThree = lines.slice(0, 3).join(' ');
    let cScore = 0;
    let cppScore = 0;
    let pyScore = 0;
    let javaScore = 0;

    if (firstThree.includes('std::cout') || firstThree.includes('cin >>')) cppScore += 3;
    if (firstThree.includes('printf(') || firstThree.includes('scanf(')) cScore += 2;
    if (firstThree.includes('print(') && !firstThree.includes(';')) pyScore += 2;
    if (firstThree.includes('def ') || firstThree.includes('if __name__ ==')) pyScore += 3;
    if (firstThree.includes('System.out.print') || firstThree.includes('class ')) javaScore += 3;

    const max = Math.max(cScore, cppScore, pyScore, javaScore);
    if (max >= 2) {
      let lang: SupportedLanguage = 'C++';
      if (max === pyScore) lang = 'Python';
      else if (max === javaScore) lang = 'Java';
      else if (max === cScore) lang = 'C';
      return { language: lang, confidence: 'SUFFICIENT', entryPoint: targetPath, dependencies: [] };
    }

    // Step 5: Ambiguous
    return { language: 'Text', confidence: 'AMBIGUOUS', entryPoint: targetPath, dependencies: [] };
  }
}
