import React, { useState, useCallback } from 'react';
import { Treemap, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { ArrowLeft } from 'lucide-react';

// データ型の定義
interface FileNode {
  name: string;
  loc?: number;
  changes?: number;
  bugs?: number;
  children?: FileNode[];
  [key: string]: any; // 動的なプロパティアクセスを許可
}

interface TreemapNode {
  name: string;
  loc: number;
  changes: number;
  bugs: number;
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
  // より詳細な階層データを用意
  const fullData = {
    name: 'root',
    children: [
      {
        name: 'src',
        children: [
          {
            name: 'components',
            children: [
              {
                name: 'ui',
                children: [
                  { name: 'Button.jsx', loc: 250, changes: 38, bugs: 5 },
                  { name: 'Card.jsx', loc: 180, changes: 12, bugs: 1 },
                  { name: 'Input.jsx', loc: 220, changes: 25, bugs: 3 },
                  { name: 'Modal.jsx', loc: 310, changes: 42, bugs: 7 },
                  { name: 'Table.jsx', loc: 420, changes: 18, bugs: 2 },
                ]
              },
              {
                name: 'layout',
                children: [
                  { name: 'Header.jsx', loc: 150, changes: 8, bugs: 0 },
                  { name: 'Footer.jsx', loc: 120, changes: 5, bugs: 0 },
                  { name: 'Sidebar.jsx', loc: 280, changes: 22, bugs: 4 },
                  { name: 'Layout.jsx', loc: 90, changes: 15, bugs: 1 },
                ]
              },
              {
                name: 'forms',
                children: [
                  { name: 'LoginForm.jsx', loc: 180, changes: 28, bugs: 3 },
                  { name: 'RegisterForm.jsx', loc: 220, changes: 32, bugs: 5 },
                  { name: 'ContactForm.jsx', loc: 150, changes: 10, bugs: 0 },
                ]
              }
            ]
          },
          {
            name: 'utils',
            children: [
              { name: 'api.js', loc: 320, changes: 45, bugs: 8 },
              { name: 'format.js', loc: 150, changes: 8, bugs: 0 },
              { name: 'validation.js', loc: 280, changes: 12, bugs: 2 },
              { name: 'helpers.js', loc: 220, changes: 7, bugs: 1 },
            ]
          },
          {
            name: 'pages',
            children: [
              {
                name: 'auth',
                children: [
                  { name: 'Login.jsx', loc: 120, changes: 18, bugs: 2 },
                  { name: 'Register.jsx', loc: 140, changes: 22, bugs: 3 },
                  { name: 'ForgotPassword.jsx', loc: 90, changes: 8, bugs: 0 },
                ]
              },
              {
                name: 'dashboard',
                children: [
                  { name: 'Overview.jsx', loc: 280, changes: 35, bugs: 4 },
                  { name: 'Analytics.jsx', loc: 320, changes: 40, bugs: 6 },
                  { name: 'Settings.jsx', loc: 250, changes: 28, bugs: 3 },
                ]
              },
              { name: 'Home.jsx', loc: 180, changes: 25, bugs: 2 },
              { name: 'About.jsx', loc: 90, changes: 5, bugs: 0 },
              { name: 'Contact.jsx', loc: 110, changes: 8, bugs: 1 },
            ]
          },
          {
            name: 'hooks',
            children: [
              { name: 'useAuth.js', loc: 150, changes: 32, bugs: 5 },
              { name: 'useFetch.js', loc: 180, changes: 28, bugs: 4 },
              { name: 'useForm.js', loc: 120, changes: 15, bugs: 2 },
            ]
          },
          {
            name: 'context',
            children: [
              { name: 'AuthContext.js', loc: 220, changes: 38, bugs: 6 },
              { name: 'ThemeContext.js', loc: 140, changes: 12, bugs: 1 },
              { name: 'AppContext.js', loc: 180, changes: 22, bugs: 3 },
            ]
          },
        ],
      },
      {
        name: 'tests',
        children: [
          {
            name: 'unit',
            children: [
              {
                name: 'components',
                children: [
                  { name: 'Button.test.js', loc: 120, changes: 8, bugs: 0 },
                  { name: 'Card.test.js', loc: 90, changes: 5, bugs: 0 },
                  { name: 'Input.test.js', loc: 110, changes: 7, bugs: 0 },
                ]
              },
              {
                name: 'utils',
                children: [
                  { name: 'api.test.js', loc: 150, changes: 12, bugs: 1 },
                  { name: 'format.test.js', loc: 80, changes: 4, bugs: 0 },
                  { name: 'validation.test.js', loc: 130, changes: 8, bugs: 0 },
                ]
              },
            ]
          },
          {
            name: 'integration',
            children: [
              { name: 'auth.test.js', loc: 220, changes: 18, bugs: 2 },
              { name: 'dashboard.test.js', loc: 280, changes: 22, bugs: 3 },
              { name: 'forms.test.js', loc: 190, changes: 12, bugs: 1 },
            ]
          },
        ],
      },
      {
        name: 'config',
        children: [
          { name: 'webpack.config.js', loc: 180, changes: 28, bugs: 4 },
          { name: 'jest.config.js', loc: 90, changes: 12, bugs: 1 },
          { name: 'babel.config.js', loc: 70, changes: 8, bugs: 0 },
          { name: '.eslintrc.js', loc: 120, changes: 15, bugs: 2 },
        ]
      },
      {
        name: 'docs',
        children: [
          { name: 'api.md', loc: 350, changes: 8, bugs: 0 },
          { name: 'components.md', loc: 420, changes: 12, bugs: 0 },
          { name: 'getting-started.md', loc: 280, changes: 5, bugs: 0 },
          { name: 'deployment.md', loc: 220, changes: 4, bugs: 0 },
        ]
      },
    ],
  };

  // 現在の表示データと階層パスを管理するstate
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [colorMetric, setColorMetric] = useState<'changes' | 'bugs'>('changes');

  // 指標に基づいて色を決定
  const getColor = useCallback((value: number, metric: string = colorMetric) => {
    const metricToUse = metric || colorMetric;
    
    // 変更頻度に基づく色
    if (metricToUse === 'changes') {
      if (value <= 10) return '#c8e6c9'; // 低頻度 - 薄い緑
      if (value <= 20) return '#81c784'; // 中低頻度 - 緑
      if (value <= 30) return '#ffb74d'; // 中頻度 - オレンジ
      if (value <= 40) return '#ff8a65'; // 中高頻度 - 薄い赤
      return '#e57373';                   // 高頻度 - 赤
    } 
    // バグ数に基づく色
    else if (metricToUse === 'bugs') {
      if (value === 0) return '#bbdefb'; // バグなし - 薄い青
      if (value <= 2) return '#90caf9'; // 少ないバグ - 青
      if (value <= 4) return '#ffb74d'; // 中程度 - オレンジ
      if (value <= 6) return '#ff8a65'; // 多め - 薄い赤
      return '#e57373';                 // 多数 - 赤
    }
  }, [colorMetric]);

  // 現在のパスに基づいてデータを取得
  const getCurrentData = useCallback(() => {
    let current: FileNode = fullData;
    
    // 現在のパスに基づいて階層をたどる
    for (const segment of currentPath) {
      if (!current.children) return current;
      
      const found = current.children.find(item => item.name === segment);
      if (!found) return current;
      
      current = found;
    }
    
    return current;
  }, [currentPath]);

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
        bugs: node.bugs || 0,
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
          bugs: colorMetric === 'bugs' ? totalMetricValue : 0,
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
        bugs: colorMetric === 'bugs' ? metricValue : 0,
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
            {colorMetric === 'changes' ? '変更頻度' : 'バグ数'}: {data[colorMetric]}
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

  return (
    <div className="flex flex-col bg-gray-50 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">ソースコードヒートマップ</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label className="mr-2 text-sm font-medium">色指標:</label>
            <select 
              value={colorMetric}
              onChange={(e) => setColorMetric(e.target.value as 'changes' | 'bugs')}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="changes">変更頻度</option>
              <option value="bugs">バグ数</option>
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
        {colorMetric === 'changes' ? '変更頻度' : 'バグ数'}
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
              <span className="text-sm">低変更頻度 (≤10)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 mr-1"></div>
              <span className="text-sm">中低変更頻度 (≤20)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-300 mr-1"></div>
              <span className="text-sm">中変更頻度 (≤30)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-300 mr-1"></div>
              <span className="text-sm">中高変更頻度 (≤40)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 mr-1"></div>
              <span className="text-sm">高変更頻度 (40+)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-200 mr-1"></div>
              <span className="text-sm">バグなし (0)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-300 mr-1"></div>
              <span className="text-sm">少ないバグ (1-2)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-300 mr-1"></div>
              <span className="text-sm">中程度のバグ (3-4)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-300 mr-1"></div>
              <span className="text-sm">多めのバグ (5-6)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 mr-1"></div>
              <span className="text-sm">多数のバグ (7+)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
