import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const repositories = await prisma.repository.findMany({
      include: {
        files: {
          orderBy: {
            path: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(repositories);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return res.status(500).json({ message: 'Error fetching repositories' });
  }
} 