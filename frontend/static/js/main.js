document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const visualizer = new KnowledgeGraphVisualizer(container);
    
    let currentMode = 'select';
    let currentSelectedNodeId = null;
    const modeIndicator = document.getElementById('mode-indicator');
    
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const message = document.getElementById('message');
    const detailsPanel = document.getElementById('details-panel');
    const panelContent = document.getElementById('panel-content');
    const panelTitle = document.getElementById('panel-title');
    const selectedSection = document.getElementById('selected-section');
    const selectedInfo = document.getElementById('selected-info');
    
    function showLoading(text = '加载中...') {
        loadingText.textContent = text;
        loading.style.display = 'flex';
    }
    
    function hideLoading() {
        loading.style.display = 'none';
    }
    
    function showMessage(text, type = 'info', duration = 3000) {
        message.textContent = text;
        message.className = 'message';
        if (type === 'success') message.classList.add('success');
        if (type === 'error') message.classList.add('error');
        message.style.display = 'block';
        
        setTimeout(() => {
            message.style.display = 'none';
        }, duration);
    }
    
    async function loadGraph() {
        try {
            const result = await getGraph();
            if (result.status === 'ok') {
                visualizer.loadGraph(result.graph);
                updateStats(result.stats);
            }
        } catch (error) {
            console.error('Failed to load graph:', error);
        }
    }
    
    function updateStats(stats) {
        document.getElementById('total-nodes').textContent = stats.total_nodes || 0;
        document.getElementById('total-edges').textContent = stats.total_edges || 0;
        document.getElementById('hybrids').textContent = stats.hybrids || 0;
        document.getElementById('growing').textContent = stats.growing || 0;
    }
    
    function setMode(mode) {
        currentMode = mode;
        visualizer.setMode(mode);
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        
        const modeLabels = {
            select: '选择模式 - 点击查看详情',
            pollinate: '授粉模式 - 点击两个节点杂交',
            connect: '连接模式 - 点击两个节点建立关联',
            evolve: '演化模式 - 点击节点分析演变'
        };
        modeIndicator.textContent = modeLabels[mode] || mode;
    }
    
    async function handleNodeSelect(nodeId) {
        currentSelectedNodeId = nodeId;
        try {
            const result = await getNode(nodeId);
            if (result.status === 'ok') {
                showNodeDetails(result.node, result.related, result.history);
                updateSelectedInfo(result.node);
                selectedSection.style.display = 'block';
                visualizer.focusOnNode(nodeId);
            }
        } catch (error) {
            showMessage('获取节点详情失败', 'error');
        }
    }
    
    function updateSelectedInfo(node) {
        const tagsHtml = (node.tags || []).map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
        
        selectedInfo.innerHTML = `
            <div class="node-title">${node.title || node.content.substring(0, 50)}</div>
            <div class="node-tags">${tagsHtml}</div>
            <div style="margin-top: 8px; font-size: 0.8rem; color: #78909c;">
                类型: ${node.node_type} | 状态: ${node.status}
            </div>
        `;
    }
    
    function showNodeDetails(node, related, history) {
        const tagsHtml = (node.tags || []).map(tag => 
            `<span class="tag-item">${tag}</span>`
        ).join('');
        
        const relatedHtml = (related || []).map(r => 
            `<div class="related-node" data-id="${r.id}">${r.title || r.content.substring(0, 30)}</div>`
        ).join('');
        
        const historyHtml = (history || []).map(h => `
            <div class="history-item">
                <div class="history-action">${h.action}</div>
                <div class="history-time">${new Date(h.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
        
        panelTitle.textContent = node.title || node.content.substring(0, 50);
        
        panelContent.innerHTML = `
            <div class="node-detail-section">
                <h4>内容</h4>
                <p>${node.content}</p>
            </div>
            
            <div class="node-detail-section">
                <h4>标签</h4>
                <div class="tags-display">${tagsHtml || '<span style="color: #78909c;">无标签</span>'}</div>
            </div>
            
            <div class="node-detail-section">
                <h4>信息</h4>
                <p>
                    <strong>类型:</strong> ${node.node_type} | 
                    <strong>状态:</strong> ${node.status} | 
                    <strong>生长阶段:</strong> ${(node.growth_stage * 100).toFixed(0)}%
                </p>
            </div>
            
            ${related && related.length > 0 ? `
            <div class="node-detail-section">
                <h4>相关节点</h4>
                <div class="related-nodes">${relatedHtml}</div>
            </div>
            ` : ''}
            
            ${history && history.length > 0 ? `
            <div class="node-detail-section">
                <h4>历史记录</h4>
                ${historyHtml}
            </div>
            ` : ''}
            
            <div class="action-buttons">
                <button class="action-btn suggest" data-id="${node.id}">💡 获取建议</button>
                <button class="action-btn evolve" data-id="${node.id}">⏳ 分析演化</button>
                <button class="action-btn delete" data-id="${node.id}">🗑️ 删除</button>
            </div>
        `;
        
        detailsPanel.style.display = 'flex';
    }
    
    function showSuggestions(suggestions) {
        const extensionsHtml = (suggestions.suggested_extensions || []).map((ext, i) => `
            <div class="history-item">
                <div class="history-action">${ext.title} (${(ext.confidence * 100).toFixed(0)}%)</div>
                <div>${ext.description}</div>
            </div>
        `).join('');
        
        const suggestionSection = document.createElement('div');
        suggestionSection.className = 'node-detail-section';
        suggestionSection.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(100, 150, 200, 0.2);';
        
        let content = `
            <h4>💡 扩展建议</h4>
            ${extensionsHtml || '<p style="color: #78909c;">暂无建议</p>'}
        `;
        
        if (suggestions.gap_analysis) {
            content += `
                <div style="margin-top: 15px;">
                    <h5 style="color: #78909c; margin-bottom: 8px;">空白分析</h5>
                    <p>${suggestions.gap_analysis}</p>
                </div>
            `;
        }
        
        suggestionSection.innerHTML = content;
        panelContent.appendChild(suggestionSection);
    }
    
    function showEvolution(evolution, node) {
        const stagesHtml = (evolution.evolution_stages || []).map(stage => `
            <div class="history-item">
                <div class="history-action">${stage.stage}</div>
                <div>${stage.description}</div>
            </div>
        `).join('');
        
        const evolutionSection = document.createElement('div');
        evolutionSection.className = 'node-detail-section';
        evolutionSection.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(100, 150, 200, 0.2);';
        
        let content = `
            <h4>⏳ 演化分析</h4>
            <div style="margin-bottom: 15px;">
                <p><strong>生长模式:</strong> ${evolution.growth_pattern}</p>
                <p><strong>活力:</strong> ${(evolution.current_vitality * 100).toFixed(0)}% | 
                   <strong>枯萎风险:</strong> ${(evolution.wilting_risk * 100).toFixed(0)}%</p>
            </div>
        `;
        
        if (stagesHtml) {
            content += `<h5 style="color: #78909c; margin-bottom: 8px;">演化阶段</h5>${stagesHtml}`;
        }
        
        if (evolution.future_potential) {
            content += `
                <div style="margin-top: 15px;">
                    <h5 style="color: #78909c; margin-bottom: 8px;">未来潜力</h5>
                    <p>${evolution.future_potential}</p>
                </div>
            `;
        }
        
        evolutionSection.innerHTML = content;
        panelContent.appendChild(evolutionSection);
    }
    
    async function handleCrossPollinate(parentA, parentB) {
        showLoading('正在进行交叉授粉...');
        try {
            const result = await crossPollinate(parentA, parentB);
            if (result.status === 'ok') {
                visualizer.addNode(result.child_node);
                showMessage(`新杂交概念诞生: ${result.hybrid.hybrid_title}`, 'success');
                loadGraph();
            }
        } catch (error) {
            showMessage('杂交失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    async function handleConnect(nodeA, nodeB) {
        showLoading('正在分析关联...');
        try {
            const result = await findRelations(nodeA, nodeB);
            if (result.status === 'ok') {
                showMessage(`关联类型: ${result.relations.relation_type} (强度: ${(result.relations.strength * 100).toFixed(0)}%)`, 'success');
                loadGraph();
            }
        } catch (error) {
            showMessage('关联分析失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    async function handleEvolve(nodeId) {
        showLoading('正在分析演化...');
        try {
            const result = await evolveNode(nodeId);
            if (result.status === 'ok') {
                showMessage(`演化分析完成 - 活力: ${(result.evolution.current_vitality * 100).toFixed(0)}%`, 'success');
                if (result.node) {
                    visualizer.updateNode(nodeId, {
                        status: result.node.status,
                        color: result.node.color
                    });
                }
            }
        } catch (error) {
            showMessage('演化分析失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    panelContent.addEventListener('click', async (e) => {
        const target = e.target;
        
        if (target.classList.contains('related-node')) {
            const nodeId = target.dataset.id;
            handleNodeSelect(nodeId);
            return;
        }
        
        if (target.classList.contains('action-btn')) {
            const nodeId = target.dataset.id;
            
            if (target.classList.contains('suggest')) {
                showLoading('正在获取扩展建议...');
                try {
                    const result = await getSuggestions(nodeId);
                    if (result.status === 'ok') {
                        showSuggestions(result.suggestions);
                    }
                } catch (error) {
                    showMessage('获取建议失败', 'error');
                } finally {
                    hideLoading();
                }
            }
            
            if (target.classList.contains('evolve')) {
                showLoading('正在分析演化...');
                try {
                    const result = await evolveNode(nodeId);
                    if (result.status === 'ok') {
                        showEvolution(result.evolution, result.node);
                        if (result.node) {
                            visualizer.updateNode(nodeId, {
                                status: result.node.status,
                                color: result.node.color
                            });
                        }
                    }
                } catch (error) {
                    showMessage('演化分析失败', 'error');
                } finally {
                    hideLoading();
                }
            }
            
            if (target.classList.contains('delete')) {
                if (confirm('确定要删除这个节点吗？')) {
                    try {
                        await deleteNode(nodeId);
                        visualizer.removeNode(nodeId);
                        detailsPanel.style.display = 'none';
                        selectedSection.style.display = 'none';
                        currentSelectedNodeId = null;
                        showMessage('节点已删除', 'success');
                        loadGraph();
                    } catch (error) {
                        showMessage('删除失败', 'error');
                    }
                }
            }
        }
    });
    
    document.getElementById('save-config').addEventListener('click', async () => {
        const apiKey = document.getElementById('api-key').value.trim();
        if (!apiKey) {
            showMessage('请输入 API Key', 'error');
            return;
        }
        
        try {
            setApiKey(apiKey);
            showMessage('API Key 已配置', 'success');
            document.getElementById('config-status').className = 'status-text success';
            document.getElementById('config-status').textContent = 'API Key 已配置';
        } catch (error) {
            showMessage('配置失败', 'error');
        }
    });
    
    document.getElementById('plant-seed').addEventListener('click', async () => {
        const content = document.getElementById('idea-content').value.trim();
        if (!content) {
            showMessage('请输入想法内容', 'error');
            return;
        }
        
        showLoading('正在种植种子...');
        try {
            const result = await createNode(content);
            if (result.status === 'ok') {
                visualizer.addNode(result.node);
                document.getElementById('idea-content').value = '';
                showMessage('种子已种植!', 'success');
                loadGraph();
            }
        } catch (error) {
            showMessage('种植失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });
    
    document.getElementById('close-panel').addEventListener('click', () => {
        detailsPanel.style.display = 'none';
    });
    
    visualizer.onNodeSelect = handleNodeSelect;
    visualizer.onCrossPollinate = handleCrossPollinate;
    visualizer.onConnect = handleConnect;
    visualizer.onEvolve = handleEvolve;
    visualizer.onClearSelection = () => {
        detailsPanel.style.display = 'none';
        selectedSection.style.display = 'none';
        currentSelectedNodeId = null;
    };
    
    loadGraph();
});
