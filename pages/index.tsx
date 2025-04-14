import type { NextPage } from 'next'
import Head from 'next/head'
import CodeHeatmap from '../code-heatmap'

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>コードヒートマップ</title>
        <meta name="description" content="コードベースのヒートマップ可視化" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <CodeHeatmap />
      </main>
    </div>
  )
}

export default Home 