import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head'
import CodeHeatmap from '../code-heatmap'

export default function Home() {
  const [path, setPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Analysis failed');
      }

      // 分析が完了したら結果ページにリダイレクト
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>コードヒートマップ</title>
        <meta name="description" content="コードベースのヒートマップ可視化" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Code Heatmap Analyzer
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the path to your Git repository to analyze its code metrics
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="mt-8 space-y-6">
          <div>
            <label htmlFor="path" className="block text-sm font-medium text-gray-700">
              Repository Path
            </label>
            <input
              id="path"
              name="path"
              type="text"
              required
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="/path/to/your/repository"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isAnalyzing
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 