document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const visualizer = new KnowledgeGraphVisualizer(container);
    
    let currentMode = 'select';
    let currentSelectedNodeId = null;
    const modeIndicator = document.getElementById('mode-indicator');
    
    let currentClimate = null;
    let climates = [];
    let autoRotateEnabled = false;
    let autoRotateInterval = null;
    let autoRotateIndex = 0;
    
    let pendingIntent = null;
    let selectedChatNodes = [];
    
    let currentNarrative = null;
    let isPlaybackActive = false;
    
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
            evolve: '演化模式 - 点击节点分析演变',
            chat_select: '选择模式 - 点击选择节点'
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
    
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
                
                if (targetTab === 'climate') {
                    loadClimates();
                }
            });
        });
    }
    
    async function loadClimates() {
        try {
            const [climatesResult, currentResult, historyResult] = await Promise.all([
                getClimates(),
                getCurrentClimate(),
                getClimateHistory(20)
            ]);
            
            if (climatesResult.status === 'ok') {
                climates = climatesResult.climates;
                renderClimateList(climates);
            }
            
            if (currentResult.status === 'ok') {
                currentClimate = currentResult.climate;
                renderCurrentClimate(currentClimate);
                visualizer.setClimate(currentClimate.type);
                updateClimateIndicator(currentClimate);
            }
            
            if (historyResult.status === 'ok') {
                renderClimateHistory(historyResult.history);
            }
        } catch (error) {
            console.error('Failed to load climates:', error);
        }
    }
    
    function renderCurrentClimate(climate) {
        const display = document.getElementById('current-climate-display');
        const params = climate.parameters || {};
        
        display.innerHTML = `
            <div class="climate-icon-large">${climate.icon}</div>
            <div class="climate-info">
                <div class="climate-name">${climate.name}</div>
                <div class="climate-desc">${climate.description || ''}</div>
            </div>
        `;
        
        const paramsContainer = document.getElementById('climate-params');
        paramsContainer.innerHTML = `
            <div class="param-item">
                <span class="param-label">生长速率</span>
                <div class="param-bar"><div class="param-fill" style="width: ${(params.growth_rate_multiplier || 1) * 50}%"></div></div>
                <span class="param-value">${(params.growth_rate_multiplier || 1).toFixed(1)}x</span>
            </div>
            <div class="param-item">
                <span class="param-label">杂交成功率</span>
                <div class="param-bar"><div class="param-fill" style="width: ${(params.hybrid_success_rate || 0.5) * 100}%"></div></div>
                <span class="param-value">${((params.hybrid_success_rate || 0.5) * 100).toFixed(0)}%</span>
            </div>
            <div class="param-item">
                <span class="param-label">枯萎速率</span>
                <div class="param-bar"><div class="param-fill" style="width: ${(params.wilting_rate_multiplier || 1) * 50}%"></div></div>
                <span class="param-value">${(params.wilting_rate_multiplier || 1).toFixed(1)}x</span>
            </div>
            <div class="param-item">
                <span class="param-label">关联发现概率</span>
                <div class="param-bar"><div class="param-fill" style="width: ${(params.association_discovery_rate || 0.5) * 100}%"></div></div>
                <span class="param-value">${((params.association_discovery_rate || 0.5) * 100).toFixed(0)}%</span>
            </div>
        `;
    }
    
    function renderClimateList(climateList) {
        const listContainer = document.getElementById('climate-list');
        
        listContainer.innerHTML = climateList.map(climate => `
            <div class="climate-item ${currentClimate && currentClimate.id === climate.id ? 'active' : ''}" data-id="${climate.id}">
                <span class="climate-icon">${climate.icon}</span>
                <span class="climate-name">${climate.name}</span>
            </div>
        `).join('');
        
        listContainer.querySelectorAll('.climate-item').forEach(item => {
            item.addEventListener('click', () => {
                switchToClimate(item.dataset.id);
            });
        });
    }
    
    function renderClimateHistory(history) {
        const historyContainer = document.getElementById('climate-history');
        
        if (!history || history.length === 0) {
            historyContainer.innerHTML = '<p style="color: #78909c; text-align: center;">暂无历史记录</p>';
            return;
        }
        
        historyContainer.innerHTML = history.map(h => `
            <div class="history-item">
                <div class="history-action">${h.climate_icon || ''} ${h.climate_name || h.climate_type}</div>
                <div class="history-time">${new Date(h.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }
    
    async function switchToClimate(climateId) {
        if (currentClimate && currentClimate.id === climateId) return;
        
        showLoading('切换气候中...');
        try {
            const result = await switchClimate(climateId);
            if (result.status === 'ok') {
                currentClimate = result.climate;
                renderCurrentClimate(currentClimate);
                renderClimateList(climates);
                visualizer.setClimate(currentClimate.type);
                updateClimateIndicator(currentClimate);
                showMessage(`已切换到 ${currentClimate.name}`, 'success');
                
                const historyResult = await getClimateHistory(20);
                if (historyResult.status === 'ok') {
                    renderClimateHistory(historyResult.history);
                }
            }
        } catch (error) {
            showMessage('气候切换失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function updateClimateIndicator(climate) {
        const icon = document.getElementById('climate-icon');
        const text = document.getElementById('climate-text');
        if (icon) icon.textContent = climate.icon;
        if (text) text.textContent = climate.name;
    }
    
    function setupAutoRotate() {
        const toggle = document.getElementById('auto-rotate-toggle');
        const intervalSection = document.getElementById('rotate-interval-section');
        const intervalSelect = document.getElementById('rotate-interval');
        
        toggle.addEventListener('change', () => {
            autoRotateEnabled = toggle.checked;
            intervalSection.style.display = autoRotateEnabled ? 'block' : 'none';
            
            if (autoRotateEnabled) {
                startAutoRotate();
            } else {
                stopAutoRotate();
            }
        });
        
        intervalSelect.addEventListener('change', () => {
            if (autoRotateEnabled) {
                stopAutoRotate();
                startAutoRotate();
            }
        });
    }
    
    function startAutoRotate() {
        const intervalSelect = document.getElementById('rotate-interval');
        const intervalMs = parseInt(intervalSelect.value) * 1000;
        
        const seasonalClimates = climates.filter(c => 
            ['spring', 'summer', 'autumn', 'winter'].includes(c.type)
        );
        
        if (seasonalClimates.length === 0) return;
        
        autoRotateInterval = setInterval(() => {
            autoRotateIndex = (autoRotateIndex + 1) % seasonalClimates.length;
            switchToClimate(seasonalClimates[autoRotateIndex].id);
        }, intervalMs);
    }
    
    function stopAutoRotate() {
        if (autoRotateInterval) {
            clearInterval(autoRotateInterval);
            autoRotateInterval = null;
        }
    }
    
    function setupChatPanel() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        const previewConfirm = document.getElementById('preview-confirm');
        const previewCancel = document.getElementById('preview-cancel');
        
        sendBtn.addEventListener('click', sendChatMessage);
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        previewConfirm.addEventListener('click', confirmPreview);
        previewCancel.addEventListener('click', cancelPreview);
        
        visualizer.onChatSelectionUpdate = (nodeIds) => {
            selectedChatNodes = nodeIds;
            updateChatSelectionDisplay();
        };
        
        const hintChips = document.querySelectorAll('.hint-chip');
        hintChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chatInput.value = chip.textContent;
                chatInput.focus();
            });
        });
    }
    
    async function sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        addChatMessage(message, 'user');
        chatInput.value = '';
        
        showLoading('AI 正在解析意图...');
        try {
            const result = await parseChatIntent(message);
            
            if (result.status === 'ok') {
                addChatMessage(result.intent.response, 'ai');
                pendingIntent = result.intent;
                
                if (result.intent.needs_confirmation) {
                    showPreview(result.intent);
                } else {
                    executeIntent(result.intent);
                }
            } else {
                addChatMessage('抱歉，我无法理解您的指令。请尝试用其他方式表达。', 'ai');
            }
        } catch (error) {
            addChatMessage('处理您的请求时出错: ' + error.message, 'ai');
        } finally {
            hideLoading();
        }
    }
    
    function addChatMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const label = type === 'user' ? '👤 用户' : '🤖 AI';
        messageDiv.innerHTML = `<div class="message-label">${label}</div><div class="message-content">${text}</div>`;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function showPreview(intent) {
        const previewArea = document.getElementById('chat-preview');
        const previewContent = document.getElementById('preview-content');
        
        let nodeIds = [];
        if (intent.extracted_entities && intent.extracted_entities.node_ids) {
            nodeIds = intent.extracted_entities.node_ids;
        }
        
        if (intent.parameters && intent.parameters.node_ids) {
            nodeIds = intent.parameters.node_ids;
        }
        
        if (nodeIds.length > 0) {
            visualizer.setPreviewNodes(nodeIds, true);
            selectedChatNodes = nodeIds;
        }
        
        previewContent.innerHTML = `
            <p class="preview-desc">${intent.preview_description || '即将执行以下操作'}</p>
            <p style="color: #78909c; font-size: 0.85rem;">操作类型: ${intent.intent}</p>
            ${nodeIds.length > 0 ? `<p style="color: #4caf50; font-size: 0.85rem;">涉及节点数: ${nodeIds.length} 个</p>` : ''}
            <p style="color: #ffc107; font-size: 0.85rem; margin-top: 10px;">请确认是否执行此操作。您也可以在场景中点击选择/取消选择节点。</p>
        `;
        
        previewArea.style.display = 'block';
    }
    
    function updateChatSelectionDisplay() {
        const previewContent = document.getElementById('preview-content');
        const currentCount = previewContent.querySelector('.preview-desc');
        
        if (currentCount && selectedChatNodes.length > 0) {
            const countSpan = previewContent.querySelector('[style*="color: #4caf50"]');
            if (countSpan) {
                countSpan.textContent = `涉及节点数: ${selectedChatNodes.length} 个`;
            }
        }
        
        if (selectedChatNodes.length > 0) {
            visualizer.setPreviewNodes(selectedChatNodes, true);
        }
    }
    
    async function confirmPreview() {
        if (!pendingIntent) return;
        
        const previewArea = document.getElementById('chat-preview');
        previewArea.style.display = 'none';
        
        visualizer.setPreviewNodes([], false);
        
        await executeIntent(pendingIntent, selectedChatNodes);
        pendingIntent = null;
        selectedChatNodes = [];
    }
    
    function cancelPreview() {
        const previewArea = document.getElementById('chat-preview');
        previewArea.style.display = 'none';
        
        visualizer.setPreviewNodes([], false);
        pendingIntent = null;
        selectedChatNodes = [];
        
        addChatMessage('操作已取消。', 'ai');
    }
    
    async function executeIntent(intent, nodeIds = []) {
        showLoading('执行操作中...');
        try {
            const result = await executeChatIntent(intent, nodeIds);
            
            if (result && result.status === 'ok') {
                addChatMessage(result.message || '操作已完成。', 'ai');
                
                const actionType = result.action || 'query';
                
                if (actionType === 'create_node' && result.node) {
                    visualizer.addNode(result.node);
                } else if (actionType === 'cross_pollinate' && result.child_node) {
                    visualizer.animateHybridEffect(result.parent_a, result.parent_b);
                    setTimeout(() => {
                        visualizer.addNode(result.child_node);
                    }, 500);
                } else if (actionType === 'move_nodes' && result.moved_nodes) {
                    result.moved_nodes.forEach(moved => {
                        if (moved.new_position) {
                            visualizer.updateNode(moved.id, {
                                x: moved.new_position.x, 
                                y: moved.new_position.y, 
                                z: moved.new_position.z
                            });
                        }
                    });
                } else if (actionType === 'switch_climate' && result.climate) {
                    currentClimate = result.climate;
                    visualizer.setClimate(currentClimate.type);
                    updateClimateIndicator(currentClimate);
                    renderCurrentClimate(currentClimate);
                } else if (actionType === 'delete_node' && result.node_id) {
                    visualizer.removeNode(result.node_id);
                    addChatMessage(`已删除节点: ${result.node_title || result.node_id}`, 'ai');
                } else if (actionType === 'focus_node' && result.node) {
                    visualizer.focusOnNode(result.node.id);
                }
                
                setTimeout(() => loadGraph(), 100);
                showMessage('操作执行成功', 'success');
            } else {
                addChatMessage('执行失败: ' + (result?.message || '未知错误'), 'ai');
                showMessage('操作执行失败', 'error');
            }
        } catch (error) {
            addChatMessage('执行出错: ' + error.message, 'ai');
            showMessage('操作执行失败', 'error');
        } finally {
            hideLoading();
        }
    }
    
    function setupNarrativePanel() {
        const generateBtn = document.getElementById('generate-narrative');
        const playBtn = document.getElementById('playback-play');
        const pauseBtn = document.getElementById('playback-pause');
        const prevBtn = document.getElementById('playback-prev');
        const nextBtn = document.getElementById('playback-next');
        const exportMarkdownBtn = document.getElementById('export-markdown');
        const exportFramesBtn = document.getElementById('export-frames');
        const copyBtn = document.getElementById('copy-export');
        
        generateBtn.addEventListener('click', generateNarrativeHandler);
        playBtn.addEventListener('click', togglePlayback);
        pauseBtn.addEventListener('click', togglePlayback);
        exportMarkdownBtn.addEventListener('click', exportNarrativeMarkdown);
        exportFramesBtn.addEventListener('click', exportSequenceFrames);
        copyBtn.addEventListener('click', copyExportedText);
        
        visualizer.onPlaybackStart = (totalSteps) => {
            updatePlaybackControls(true, totalSteps);
        };
        
        visualizer.onPlaybackStep = (current, total, step) => {
            updatePlaybackProgress(current, total);
        };
        
        visualizer.onPlaybackStop = () => {
            updatePlaybackControls(false);
            isPlaybackActive = false;
        };
        
        visualizer.onPlaybackPause = () => {
            isPlaybackActive = false;
            document.getElementById('playback-play').style.display = 'block';
            document.getElementById('playback-pause').style.display = 'none';
        };
        
        visualizer.onPlaybackResume = () => {
            isPlaybackActive = true;
            document.getElementById('playback-play').style.display = 'none';
            document.getElementById('playback-pause').style.display = 'block';
        };
    }
    
    async function generateNarrativeHandler() {
        showLoading('正在生成叙事...');
        try {
            const result = await apiGenerateNarrative();
            
            if (result && result.status === 'ok') {
                currentNarrative = result;
                
                const storyContainer = document.getElementById('narrative-story');
                const storyTitle = document.getElementById('story-title');
                const storyContent = document.getElementById('story-content');
                
                storyTitle.textContent = result.narrative?.title || '知识花园的故事';
                storyContent.innerHTML = (result.narrative?.story || '').replace(/\n/g, '<br>');
                storyContainer.style.display = 'block';
                
                if (result.playback_commands && result.playback_commands.length > 0) {
                    document.getElementById('playback-play').disabled = false;
                    showMessage('叙事已生成，可点击播放按钮回放', 'success');
                }
            } else {
                showMessage('生成叙事失败: ' + (result?.message || '未知错误'), 'error');
            }
        } catch (error) {
            showMessage('生成叙事失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function togglePlayback() {
        if (!currentNarrative || !currentNarrative.playback_commands) {
            showMessage('请先生成叙事', 'error');
            return;
        }
        
        if (isPlaybackActive) {
            visualizer.pausePlayback();
        } else {
            if (visualizer.isPlaying) {
                visualizer.resumePlayback();
            } else {
                visualizer.startPlayback(currentNarrative.playback_commands);
            }
            isPlaybackActive = true;
        }
        
        const playBtn = document.getElementById('playback-play');
        const pauseBtn = document.getElementById('playback-pause');
        
        if (isPlaybackActive) {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
        } else {
            playBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
        }
    }
    
    function updatePlaybackControls(active, totalSteps = 0) {
        const playBtn = document.getElementById('playback-play');
        const pauseBtn = document.getElementById('playback-pause');
        const prevBtn = document.getElementById('playback-prev');
        const nextBtn = document.getElementById('playback-next');
        const stepDisplay = document.getElementById('playback-step');
        
        if (active) {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            stepDisplay.textContent = `0 / ${totalSteps}`;
        } else {
            playBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
            stepDisplay.textContent = '0 / 0';
        }
    }
    
    function updatePlaybackProgress(current, total) {
        document.getElementById('playback-step').textContent = `${current + 1} / ${total}`;
    }
    
    async function exportNarrativeMarkdown() {
        showLoading('正在导出 Markdown...');
        try {
            const result = await exportMarkdown();
            
            if (result.status === 'ok') {
                const exportResult = document.getElementById('export-result');
                const exportText = document.getElementById('export-text');
                
                exportText.value = result.markdown;
                exportResult.style.display = 'block';
                
                showMessage('Markdown 导出成功', 'success');
            } else {
                showMessage('导出失败: ' + (result.message || '未知错误'), 'error');
            }
        } catch (error) {
            showMessage('导出失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function copyExportedText() {
        const exportText = document.getElementById('export-text');
        exportText.select();
        document.execCommand('copy');
        showMessage('内容已复制到剪贴板', 'success');
    }
    
    async function exportSequenceFrames() {
        showLoading('正在导出序列帧...');
        try {
            const frames = [];
            const canvas = visualizer.renderer?.domElement;
            
            if (!canvas) {
                showMessage('无法找到渲染画布', 'error');
                return;
            }
            
            if (currentNarrative && currentNarrative.playback_commands && currentNarrative.playback_commands.length > 0) {
                const originalPlaying = isPlaybackActive;
                if (isPlaybackActive) {
                    visualizer.pausePlayback();
                }
                
                visualizer.saveSceneState();
                
                for (let i = 0; i < currentNarrative.playback_commands.length; i++) {
                    const step = currentNarrative.playback_commands[i];
                    visualizer.executePlaybackStep(step);
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    const dataUrl = canvas.toDataURL('image/png');
                    frames.push({
                        step: i + 1,
                        total: currentNarrative.playback_commands.length,
                        dataUrl: dataUrl,
                        description: step.description || `步骤 ${i + 1}`
                    });
                }
                
                visualizer.restoreSceneState();
                
                if (originalPlaying) {
                    visualizer.resumePlayback();
                }
            } else {
                const dataUrl = canvas.toDataURL('image/png');
                frames.push({
                    step: 1,
                    total: 1,
                    dataUrl: dataUrl,
                    description: '当前场景'
                });
            }
            
            const exportResult = document.getElementById('export-result');
            const exportText = document.getElementById('export-text');
            
            if (frames.length === 1) {
                exportText.value = `# 序列帧导出\n\n共 ${frames.length} 帧\n\n## 帧 1: ${frames[0].description}\n\n![帧 1](${frames[0].dataUrl})\n`;
            } else {
                let markdownContent = `# 序列帧导出\n\n共 ${frames.length} 帧\n\n`;
                frames.forEach((frame, index) => {
                    markdownContent += `## 帧 ${frame.step}: ${frame.description}\n\n![帧 ${frame.step}](${frame.dataUrl})\n\n---\n\n`;
                });
                exportText.value = markdownContent;
            }
            
            exportResult.style.display = 'block';
            
            const downloadBtn = document.getElementById('download-export');
            if (frames.length === 1) {
                downloadBtn.style.display = 'inline-block';
                downloadBtn.href = frames[0].dataUrl;
                downloadBtn.download = `frame_${Date.now()}.png`;
                downloadBtn.textContent = '下载图片';
            } else {
                downloadBtn.style.display = 'none';
            }
            
            showMessage(`成功导出 ${frames.length} 帧`, 'success');
            
        } catch (error) {
            showMessage('导出序列帧失败: ' + error.message, 'error');
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
            if (btn.dataset.mode) {
                setMode(btn.dataset.mode);
            }
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
    
    setupTabNavigation();
    setupAutoRotate();
    setupChatPanel();
    setupNarrativePanel();
    
    loadGraph();
    loadClimates();
});
