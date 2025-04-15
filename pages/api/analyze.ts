import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Repository path is required' });
  }

  try {
    // リポジトリの存在確認
    const gitStatus = await execAsync(`git -C "${path}" rev-parse --is-inside-work-tree`);
    if (gitStatus.stderr) {
      throw new Error('Not a git repository');
    }

    // リポジトリ情報の取得
    const repoName = path.split('/').pop() || 'unknown';
    
    // リポジトリの作成または取得
    let repository = await prisma.repository.findUnique({
      where: { path },
    });

    if (!repository) {
      repository = await prisma.repository.create({
        data: {
          path,
          name: repoName,
        },
      });
    }

    // ファイル情報の取得
    const { stdout: files } = await execAsync(`git -C "${path}" ls-files`);
    const fileList = files.split('\n').filter(Boolean);

    for (const file of fileList) {
      try {
        // ファイルのメトリクスを取得
        const [{ stdout: loc }, { stdout: changes }, { stdout: authors }] = await Promise.all([
          execAsync(`wc -l < "${path}/${file}"`),
          execAsync(`git -C "${path}" log --oneline "${file}" | wc -l`),
          execAsync(`git -C "${path}" log --format="%ae" "${file}" | sort -u | wc -l`),
        ]);

        // ファイル情報の更新または作成
        await prisma.file.upsert({
          where: {
            path_repositoryId: {
              path: file,
              repositoryId: repository.id,
            },
          },
          update: {
            loc: parseInt(loc.trim()),
            changes: parseInt(changes.trim()),
            authors: parseInt(authors.trim()),
          },
          create: {
            path: file,
            name: file.split('/').pop() || file,
            loc: parseInt(loc.trim()),
            changes: parseInt(changes.trim()),
            authors: parseInt(authors.trim()),
            repositoryId: repository.id,
          },
        });
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    return res.status(200).json({ message: 'Analysis completed successfully' });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ message: 'Analysis failed', error: error.message });
  }
} 