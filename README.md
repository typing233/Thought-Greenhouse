# 🌱 Thought Greenhouse - 动态知识花园

一个结合AI与3D可视化的动态知识花园应用，让碎片化的想法像活体植物一样自动生长、跨界杂交并沉淀演化。

## ✨ 核心功能

### 🌰 想法播种
- 将碎片化想法转化为初始种子节点
- AI自动分析提取标签、关键概念和相关领域
- 智能生成3D空间中的生长位置

### 🌿 知识图谱生长
- 利用Deepseek大语言模型提供边缘关联
- 自动发现跨学科扩展机会
- 知识节点以植物或菌丝体形式动态"生长"

### 🐝 交叉授粉
- 拖拽不同想法节点进行杂交
- AI生成新奇的杂交概念
- 追踪杂交谱系，建立家族树

### ⏳ 时间演化
- 记录思想的时间演化过程
- 旧想法自动枯萎可视化
- 时间轴回放功能

### 🌐 3D可视化
- Three.js驱动的3D/2.5D可视化画布
- 三维空间漫游浏览
- 动态生长动画效果

## 🛠️ 技术栈

### 后端
- **Python 3.8+**
- **Flask** - Web框架
- **Flask-CORS** - 跨域支持
- **SQLite** - 数据存储
- **NetworkX** - 图数据结构
- **Deepseek API** - AI大语言模型

### 前端
- **Three.js** - 3D可视化引擎
- **OrbitControls** - 3D交互控制
- **CSS3DRenderer** - 2D标签渲染
- 原生JavaScript

## 📁 项目结构

```
Thought-Greenhouse/
├── app.py                    # Flask应用入口
├── config.py                 # 配置文件
├── requirements.txt          # Python依赖
├── .env.example              # 环境变量示例
├── README.md                 # 本文件
├── backend/
│   ├── __init__.py
│   ├── models.py             # 知识图谱数据模型
│   └── ai_service.py         # AI服务封装
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css     # 样式文件
│   │   └── js/
│   │       ├── api.js        # API封装
│   │       ├── graph.js      # 3D可视化组件
│   │       └── main.js       # 主应用逻辑
│   └── templates/
│       └── index.html        # 主页面
├── data/                     # 数据存储目录
└── tests/
    ├── __init__.py
    ├── test_models.py        # 模型单元测试
    └── test_api.py           # API接口测试
```

## 🚀 快速开始

### 1. 环境准备

确保已安装 Python 3.8 或更高版本。

```bash
python --version
```

### 2. 安装依赖

```bash
cd Thought-Greenhouse
pip install -r requirements.txt
```

### 3. 配置API Key

#### 方式一：环境变量
复制 `.env.example` 为 `.env` 并填入你的Deepseek API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
DEEPSEEK_API_KEY=your_api_key_here
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your_secret_key_here
```

#### 方式二：前端配置
启动应用后，可以在前端界面直接输入API Key进行临时配置。

### 4. 启动应用

```bash
python app.py
```

应用将在 `http://localhost:5000` 启动。

### 5. 访问应用

打开浏览器访问：
```
http://localhost:5000
```

## 🎮 使用指南

### 配置AI服务
1. 在左侧边栏的"AI配置"区域输入你的Deepseek API Key
2. 点击"保存"按钮
3. 配置成功后即可使用AI驱动的功能

### 种植想法种子
1. 在"种下想法"文本框中输入你的想法
2. 点击"🌱 种植种子"按钮
3. 想法将在3D空间中以节点形式出现

### 使用工具模式

| 模式 | 图标 | 功能 |
|------|------|------|
| 选择 | 👆 | 点击节点查看详情 |
| 授粉 | 🐝 | 点击两个节点进行杂交 |
| 连接 | 🔗 | 点击两个节点建立关联 |
| 演化 | ⏳ | 点击节点分析演变状态 |

### 节点操作
- **左键点击**：根据当前模式执行操作
- **双击节点**：查看节点详情
- **鼠标滚轮**：缩放视图
- **按住左键拖动**：旋转视角
- **按住右键拖动**：平移视图

## 🔌 API接口

### 健康检查
```
GET /api/health
```

### 节点管理
```
GET    /api/nodes           # 获取所有节点
POST   /api/nodes           # 创建新节点
GET    /api/nodes/<id>      # 获取单个节点详情
PUT    /api/nodes/<id>      # 更新节点
DELETE /api/nodes/<id>      # 删除节点
```

### 边管理
```
GET    /api/edges           # 获取所有边
POST   /api/edges           # 创建新边
```

### AI功能
```
POST   /api/relations       # 分析两个节点的关系
POST   /api/cross-pollinate # 杂交两个想法
POST   /api/evolve/<id>     # 分析节点演变
POST   /api/suggestions/<id># 获取扩展建议
```

### 配置
```
GET    /api/config          # 获取配置状态
POST   /api/config          # 更新配置
```

### 图数据
```
GET    /api/graph           # 获取完整图数据和统计
```

## 🧪 运行测试

### 运行所有测试
```bash
pytest -v
```

### 运行特定测试文件
```bash
pytest tests/test_models.py -v
pytest tests/test_api.py -v
```

### 生成覆盖率报告
```bash
pytest --cov=. --cov-report=html
```

## 🎨 节点类型

### 种子节点 (seed)
- 默认绿色 (#4CAF50)
- 球形外观
- 用户输入的原始想法

### 杂交节点 (hybrid)
- 紫色 (#9C27B0)
- 八面体外观
- 较大尺寸 (1.5倍)
- 显示父节点来源

### 状态
- **growing**: 生长中 - 完全不透明，正常发光
- **wilting**: 枯萎中 - 半透明，暗淡发光，颜色变为棕色

## 🔧 开发指南

### 添加新的AI功能
在 `backend/ai_service.py` 中添加新方法：

```python
def my_new_ai_function(self, param1, param2):
    system_prompt = """
    你的系统提示词...
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"输入: {param1}, {param2}"}
    ]
    
    result = self._call_api(messages, temperature=0.7)
    return json.loads(result)
```

### 添加新的API端点
在 `app.py` 中添加路由：

```python
@app.route('/api/my-endpoint', methods=['POST'])
def my_endpoint():
    data = request.json
    # 处理逻辑
    return jsonify({'status': 'ok', 'data': result})
```

### 自定义3D渲染
在 `frontend/static/js/graph.js` 中修改 `createNodeMesh` 方法来自定义节点外观。

## 📝 配置说明

### config.py 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| DEEPSEEK_API_URL | https://api.deepseek.com/v1/chat/completions | API端点 |
| DATABASE_PATH | data/knowledge.db | SQLite数据库路径 |
| PORT | 5000 | 服务端口 |
| CORS_ORIGINS | ['*'] | 跨域来源 |

### 环境变量

| 变量名 | 说明 |
|--------|------|
| DEEPSEEK_API_KEY | Deepseek API密钥 |
| FLASK_ENV | 运行环境 (development/production) |
| SECRET_KEY | Flask会话密钥 |

## ⚠️ 注意事项

1. **API Key安全**: 不要将包含API Key的代码提交到公开仓库
2. **端口占用**: 确保5000端口未被其他服务占用
3. **数据备份**: 定期备份 `data/knowledge.db` 文件
4. **网络连接**: AI功能需要稳定的网络连接

## 🔮 未来计划

- [ ] 支持多人实时协作
- [ ] 添加时间轴回放功能
- [ ] 支持数据导入导出
- [ ] 添加更多可视化主题
- [ ] 支持自定义AI模型
- [ ] 添加移动端支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**享受你的知识花园旅程！ 🌱🌿🌳**
