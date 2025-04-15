import { useEffect, useState } from 'react';
import { PrismaClient } from '@prisma/client';
import CodeHeatmap from '../code-heatmap';

interface Repository {
  id: string;
  name: string;
  url: string;
  // Add other repository properties as needed
}

const prisma = new PrismaClient();

export default function Results() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/repositories');
      const data = await response.json();
      setRepositories(data);
      if (data.length > 0) {
        setSelectedRepo(data[0]);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedRepo) return;
    
    setReanalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: selectedRepo.url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reanalyze repository');
      }

      // 再集計後にリポジトリリストを更新
      await fetchRepositories();
    } catch (error) {
      console.error('Error reanalyzing repository:', error);
    } finally {
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Repository Analysis Results</h1>
        
        {repositories.length === 0 ? (
          <div className="text-center text-gray-600">
            No repositories analyzed yet. Go back to the home page to analyze a repository.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Repositories</h2>
                <ul className="space-y-2">
                  {repositories.map((repo) => (
                    <li
                      key={repo.id}
                      className={`p-2 rounded cursor-pointer ${
                        selectedRepo?.id === repo.id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedRepo(repo)}
                    >
                      {repo.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="md:col-span-3">
              {selectedRepo && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{selectedRepo.name}</h2>
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className={`px-4 py-2 rounded-md text-white ${
                        reanalyzing
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {reanalyzing ? 'Reanalyzing...' : 'Reanalyze'}
                    </button>
                  </div>
                  <CodeHeatmap data={selectedRepo} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 