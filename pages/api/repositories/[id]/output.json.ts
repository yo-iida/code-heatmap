import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

interface File {
  path: string;
  loc: number;
  changes: number;
  authors: number;
}

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const repository = await prisma.repository.findUnique({
      where: { id: id as string },
      include: {
        files: true,
      },
    });

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }

    // ファイルデータをツリー構造に変換
    const treeData = {
      name: repository.name,
      children: repository.files.map((file: File) => ({
        name: file.path,
        loc: file.loc,
        changes: file.changes,
        authors: file.authors,
      })),
    };

    return res.status(200).json(treeData);
  } catch (error) {
    console.error('Error fetching repository data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 