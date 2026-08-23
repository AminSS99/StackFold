import { NextResponse } from 'next/server';
import path from 'node:path';
import { scanRepository } from '@stackfold/scanner';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let targetPath = body.rootPath;

    if (body.fixture) {
      if (body.fixture === 'sample-ecommerce-app') {
        // Resolve fixture path relative to cwd
        targetPath = path.resolve(process.cwd(), '../../fixtures/sample-ecommerce-app');
        if (!targetPath || !path.isAbsolute(targetPath)) {
          targetPath = path.resolve(process.cwd(), 'fixtures/sample-ecommerce-app');
        }
      } else if (body.fixture === 'stackfold-self') {
        targetPath = path.resolve(process.cwd(), '../../');
      }
    }

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Either rootPath or fixture must be provided' },
        { status: 400 }
      );
    }

    const result = await scanRepository({
      rootPath: targetPath,
      projectName: body.projectName || path.basename(targetPath),
    });

    return NextResponse.json({
      success: true,
      graph: result.graph,
      durationMs: result.durationMs,
      scannedFilesCount: result.scannedFilesCount,
      diagnostics: result.diagnostics,
    });
  } catch (error: any) {
    console.error('Scan failed:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal scanner error',
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
