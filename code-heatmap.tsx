import React, { useState, useCallback, useEffect } from 'react';
import { Treemap, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { ArrowLeft } from 'lucide-react';

// データ型の定義
interface FileNode {
  name: string;
  loc?: number;
  changes?: number;
  authors?: number;
  children?: FileNode[];
  [key: string]: any; // 動的なプロパティアクセスを許可
}

interface TreemapNode {
  name: string;
  loc: number;
  changes: number;
  authors: number;
  fill: string;
  hasChildren: boolean;
}

interface TreemapContentProps {
  root: any;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  colors: string[];
  name: string;
  hasChildren: boolean;
  fill: string;
}

export default function CodeHeatmap() {
  // データの読み込み状態を管理
  const [fullData, setFullData] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // output.jsonからデータを読み込む
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/output.json');
        if (!response.ok) {
          throw new Error('データの読み込みに失敗しました');
        }
        const data = await response.json();
        setFullData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 現在の表示データと階層パスを管理するstate
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [colorMetric, setColorMetric] = useState<'changes' | 'authors'>('changes');

  // 指標に基づいて色を決定
  const getColor = useCallback((value: number, metric: string = colorMetric) => {
    const metricToUse = metric || colorMetric;
    
    // 変更頻度に基づく色
    if (metricToUse === 'changes') {
      if (value <= 1) return '#c8e6c9'; // 低頻度 - 薄い緑
      if (value <= 2) return '#81c784'; // 中低頻度 - 緑
      if (value <= 3) return '#ffb74d'; // 中頻度 - オレンジ
      if (value <= 4) return '#ff8a65'; // 中高頻度 - 薄い赤
      return '#e57373';                 // 高頻度 - 赤
    } 
    // 作者数に基づく色
    else if (metricToUse === 'authors') {
      if (value === 1) return '#bbdefb'; // 1人 - 薄い青
      if (value <= 2) return '#90caf9'; // 2人 - 青
      if (value <= 3) return '#ffb74d'; // 3人 - オレンジ
      if (value <= 4) return '#ff8a65'; // 4人 - 薄い赤
      return '#e57373';                 // 5人以上 - 赤
    }
  }, [colorMetric]);

  // 現在のパスに基づいてデータを取得
  const getCurrentData = useCallback(() => {
    if (!fullData) return { name: 'root', children: [] };
    
    let current: FileNode = fullData;
    
    // 現在のパスに基づいて階層をたどる
    for (const segment of currentPath) {
      if (!current.children) return current;
      
      const found = current.children.find(item => item.name === segment);
      if (!found) return current;
      
      current = found;
    }
    
    return current;
  }, [currentPath, fullData]);

  // 現在のデータ
  const currentData = getCurrentData();

  // データの処理
  const prepareData = useCallback((node: FileNode): TreemapNode[] => {
    if (!node.children) {
      const metricValue = node[colorMetric] || 0;
      const fillColor = getColor(metricValue, colorMetric);
      if (!fillColor) return [];
      return [{
        name: node.name,
        loc: node.loc || 0,
        changes: node.changes || 0,
        authors: node.authors || 0,
        fill: fillColor,
        hasChildren: false
      }];
    }

    // 子要素の処理
    const children = node.children.map(child => {
      if (child.children && child.children.length > 0) {
        let totalLoc = 0;
        let totalMetricValue = 0;
        
        child.children.forEach(grandChild => {
          if (grandChild.children && grandChild.children.length > 0) {
            const allDescendants = getAllDescendants(grandChild);
            totalLoc += allDescendants.reduce((sum, d) => sum + (d.loc || 0), 0);
            totalMetricValue += allDescendants.reduce((sum, d) => sum + (d[colorMetric] || 0), 0);
          } else {
            totalLoc += grandChild.loc || 0;
            totalMetricValue += grandChild[colorMetric] || 0;
          }
        });

        const fillColor = getColor(totalMetricValue / Math.max(1, child.children.length), colorMetric);
        if (!fillColor) return null;
        return {
          name: child.name,
          loc: totalLoc,
          changes: colorMetric === 'changes' ? totalMetricValue : 0,
          authors: colorMetric === 'authors' ? totalMetricValue : 0,
          fill: fillColor,
          hasChildren: true
        };
      }
      
      const metricValue = child[colorMetric] || 0;
      const fillColor = getColor(metricValue, colorMetric);
      if (!fillColor) return null;
      return {
        name: child.name,
        loc: child.loc || 0,
        changes: colorMetric === 'changes' ? metricValue : 0,
        authors: colorMetric === 'authors' ? metricValue : 0,
        fill: fillColor,
        hasChildren: false
      };
    }).filter((node): node is TreemapNode => node !== null);

    return children;
  }, [colorMetric, getColor]);

  // すべての子孫要素を平坦な配列として取得
  const getAllDescendants = (node: FileNode): FileNode[] => {
    if (!node.children) return [node];
    
    let result: FileNode[] = [];
    const stack = [...node.children];
    
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      
      if (current.children && current.children.length > 0) {
        stack.push(...current.children);
      } else {
        result.push(current);
      }
    }
    
    return result;
  };

  // 現在のデータから表示用データを生成
  const displayData = prepareData(currentData);

  // ドリルダウン処理
  const handleDrillDown = useCallback((nodeName: string) => {
    if (!currentData.children) return;
    const node = currentData.children.find(child => child.name === nodeName);
    if (!node || !node.children) return;
    
    setCurrentPath([...currentPath, nodeName]);
  }, [currentPath, currentData]);

  // ドリルアップ処理
  const handleDrillUp = useCallback(() => {
    if (currentPath.length === 0) return;
    
    setCurrentPath(currentPath.slice(0, -1));
  }, [currentPath]);

  // 特定の階層に直接移動
  const navigateToPath = useCallback((index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  }, [currentPath]);

  // カスタムツールチップの内容
  const CustomTooltip = ({ active, payload }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded shadow-md border border-gray-200">
          <p className="font-bold">{data.name}</p>
          <p className="text-sm">コード行数: {data.loc}</p>
          <p className="text-sm">
            {colorMetric === 'changes' ? '変更回数' : '作者数'}: {data[colorMetric]}
          </p>
          {data.hasChildren && <p className="text-xs italic mt-1">クリックで詳細表示</p>}
        </div>
      );
    }
    return null;
  };

  // Treemapのカスタムコンテンツ
  const CustomizedContent = (props: TreemapContentProps) => {
    const { root, depth, x, y, width, height, index, colors, name, hasChildren, fill } = props;
    const isLeaf = !hasChildren;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fill,
            stroke: '#fff',
            strokeWidth: 2,
            cursor: hasChildren ? 'pointer' : 'default'
          }}
          onClick={() => hasChildren && handleDrillDown(name)}
        />
        {width > 50 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#333"
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-500">エラー: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">ソースコードヒートマップ</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label className="mr-2 text-sm font-medium">色指標:</label>
            <select 
              value={colorMetric}
              onChange={(e) => setColorMetric(e.target.value as 'changes' | 'authors')}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="changes">変更回数</option>
              <option value="authors">作者数</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* パンくずリスト */}
      <div className="flex items-center mb-4">
        <button 
          onClick={handleDrillUp}
          disabled={currentPath.length === 0}
          className={`flex items-center mr-2 px-2 py-1 rounded ${
            currentPath.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'
          }`}
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>戻る</span>
        </button>
        
        <div className="flex items-center text-sm">
          <span 
            className="text-blue-600 hover:underline cursor-pointer" 
            onClick={() => setCurrentPath([])}
          >
            root
          </span>
          {currentPath.map((segment, index) => (
            <React.Fragment key={index}>
              <span className="mx-1">/</span>
              <span 
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={() => navigateToPath(index)}
              >
                {segment}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <p className="mb-4 text-gray-700">
        このヒートマップはモジュールのサイズをコード行数に基づいて、色を
        {colorMetric === 'changes' ? '変更回数' : '作者数'}
        に基づいて表示しています。モジュールをクリックすると詳細表示します。
        {currentPath.length > 0 && (
          <span className="font-medium ml-1">
            現在の階層: {currentPath.join(' / ')}
          </span>
        )}
      </p>
      
      <div className="h-96 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={displayData}
            dataKey="loc"
            aspectRatio={4/3}
            stroke="#fff"
            animationDuration={300}
            content={<CustomizedContent root={null} depth={0} x={0} y={0} width={0} height={0} index={0} colors={[]} name="" hasChildren={false} fill="" />}
          >
            <Tooltip content={<CustomTooltip active={false} payload={[]} />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-2">凡例:</h3>
        {colorMetric === 'changes' ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 mr-1"></div>
              <span className="text-sm">低変更回数 (1)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 mr-1"></div>
              <span className="text-sm">中低変更回数 (2)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-300 mr-1"></div>
              <span className="text-sm">中変更回数 (3)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-300 mr-1"></div>
              <span className="text-sm">中高変更回数 (4)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 mr-1"></div>
              <span className="text-sm">高変更回数 (5+)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-200 mr-1"></div>
              <span className="text-sm">1人</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-300 mr-1"></div>
              <span className="text-sm">2人</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-300 mr-1"></div>
              <span className="text-sm">3人</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-300 mr-1"></div>
              <span className="text-sm">4人</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 mr-1"></div>
              <span className="text-sm">5人以上</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
