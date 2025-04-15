import { useEffect, useState } from 'react';
import { PrismaClient } from '@prisma/client';
import CodeHeatmap from '../code-heatmap';

const prisma = new PrismaClient();

export default function Results() {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
                  <h2 className="text-xl font-semibold mb-4">{selectedRepo.name}</h2>
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