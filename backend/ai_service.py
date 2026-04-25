import json
import requests
from typing import Dict, List, Optional, Any
from config import Config


class AIService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.DEEPSEEK_API_KEY
        self.api_url = Config.DEEPSEEK_API_URL
    
    def _call_api(self, messages: List[Dict], temperature: float = 0.7) -> str:
        if not self.api_key:
            raise ValueError("Deepseek API key not configured")
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'deepseek-chat',
            'messages': messages,
            'temperature': temperature,
            'max_tokens': 2000
        }
        
        response = requests.post(self.api_url, headers=headers, json=payload)
        response.raise_for_status()
        
        return response.json()['choices'][0]['message']['content']
    
    def analyze_idea(self, content: str) -> Dict[str, Any]:
        system_prompt = """
你是一个知识图谱专家和跨学科思考者。分析用户输入的想法，提取关键概念、标签、相关领域，并建议可能的关联方向。

请以JSON格式返回以下信息：
{
    "title": "简短的标题",
    "tags": ["标签1", "标签2", "标签3"],
    "key_concepts": ["核心概念1", "核心概念2"],
    "domains": ["相关领域1", "相关领域2"],
    "potential_connections": [
        {"concept": "可能关联的概念", "reason": "关联原因"},
        ...
    ],
    "cross_domain_extensions": [
        {"domain": "领域名称", "extension": "跨学科扩展思路"},
        ...
    ],
    "growth_potential": 0.0到1.0之间的浮点数
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"分析以下想法：\n{content}"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.7)
            return json.loads(result)
        except Exception as e:
            return {
                "title": content[:50] + "..." if len(content) > 50 else content,
                "tags": ["idea"],
                "key_concepts": [content],
                "domains": ["general"],
                "potential_connections": [],
                "cross_domain_extensions": [],
                "growth_potential": 0.5
            }
    
    def find_relations(self, idea_a: str, idea_b: str) -> Dict[str, Any]:
        system_prompt = """
你是一个知识关联专家。分析两个想法之间的潜在关系，发现它们之间可能的连接点和交叉领域。

请以JSON格式返回以下信息：
{
    "relation_type": "关联类型（如：因果、相似、互补、对立等）",
    "strength": 0.0到1.0之间的关联强度,
    "connection_points": ["连接点1", "连接点2"],
    "common_domains": ["共同领域1", "共同领域2"],
    "bridging_concepts": ["桥接概念1", "桥接概念2"],
    "insights": "关于这两个想法关联的洞见"
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"分析以下两个想法之间的关系：\n\n想法A：{idea_a}\n\n想法B：{idea_b}"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.6)
            return json.loads(result)
        except Exception as e:
            return {
                "relation_type": "潜在关联",
                "strength": 0.3,
                "connection_points": [],
                "common_domains": [],
                "bridging_concepts": [],
                "insights": "需要进一步探索"
            }
    
    def cross_pollinate(self, idea_a: str, idea_b: str) -> Dict[str, Any]:
        system_prompt = """
你是一个创意杂交专家。将两个不同的想法进行"交叉授粉"，创造出新的、有趣的杂交概念。

请以JSON格式返回以下信息：
{
    "hybrid_title": "杂交概念的标题",
    "hybrid_description": "详细描述杂交后的新概念",
    "hybrid_rationale": "为什么这个杂交是有价值的",
    "key_elements": [
        {"from": "parent_a", "element": "来自父节点A的元素"},
        {"from": "parent_b", "element": "来自父节点B的元素"}
    ],
    "novelty_score": 0.0到1.0之间的新颖度评分,
    "potential_applications": ["潜在应用1", "潜在应用2"],
    "related_hybrids": ["可能的相关杂交方向"],
    "growth_directions": ["这个杂交概念可以进一步发展的方向"]
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"将以下两个想法进行交叉授粉，创造新的杂交概念：\n\n想法A：{idea_a}\n\n想法B：{idea_b}"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.9)
            return json.loads(result)
        except Exception as e:
            return {
                "hybrid_title": f"{idea_a[:30]}... + {idea_b[:30]}...",
                "hybrid_description": "这是两个想法的杂交组合",
                "hybrid_rationale": "组合两个想法可能产生新的洞见",
                "key_elements": [
                    {"from": "parent_a", "element": idea_a[:50]},
                    {"from": "parent_b", "element": idea_b[:50]}
                ],
                "novelty_score": 0.5,
                "potential_applications": [],
                "related_hybrids": [],
                "growth_directions": []
            }
    
    def suggest_expansions(self, existing_ideas: List[str], target_idea: str) -> Dict[str, Any]:
        existing_summary = "\n".join([f"- {idea}" for idea in existing_ideas[:10]])
        
        system_prompt = """
你是一个知识扩展顾问。基于用户现有的想法网络，为目标想法建议扩展方向和可能的新关联。

请以JSON格式返回以下信息：
{
    "suggested_extensions": [
        {"title": "扩展方向标题", "description": "详细描述", "confidence": 0.0-1.0},
        ...
    ],
    "gap_analysis": "现有知识网络中的空白",
    "interdisciplinary_bridges": [
        {"from_field": "领域A", "to_field": "领域B", "bridge": "桥接概念"}
    ],
    "emerging_patterns": ["观察到的涌现模式"],
    "recommended_next_steps": ["推荐的下一步行动"]
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"现有想法：\n{existing_summary}\n\n目标想法：{target_idea}\n\n请为目标想法建议扩展方向。"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.7)
            return json.loads(result)
        except Exception as e:
            return {
                "suggested_extensions": [],
                "gap_analysis": "需要更多数据进行分析",
                "interdisciplinary_bridges": [],
                "emerging_patterns": [],
                "recommended_next_steps": ["继续添加更多想法"]
            }
    
    def analyze_evolution(self, idea_history: List[Dict]) -> Dict[str, Any]:
        history_summary = "\n".join([
            f"- {h.get('timestamp', '')}: {h.get('action', '')} - {h.get('details', {})}"
            for h in idea_history[-20:]
        ])
        
        system_prompt = """
你是一个思想演变分析师。分析一个想法的历史演变，识别其成长模式、关键转折点和未来可能性。

请以JSON格式返回以下信息：
{
    "evolution_stages": [
        {"stage": "阶段名称", "description": "阶段描述", "key_actions": ["关键动作"]},
        ...
    ],
    "growth_pattern": "生长模式描述",
    "key_turning_points": ["关键转折点"],
    "current_vitality": 0.0到1.0之间的活力评分,
    "wilting_risk": 0.0到1.0之间的枯萎风险,
    "revival_suggestions": ["复兴建议"],
    "future_potential": "未来潜力分析"
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"想法历史：\n{history_summary}\n\n请分析这个想法的演变。"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.6)
            return json.loads(result)
        except Exception as e:
            return {
                "evolution_stages": [],
                "growth_pattern": "数据不足",
                "key_turning_points": [],
                "current_vitality": 0.5,
                "wilting_risk": 0.3,
                "revival_suggestions": [],
                "future_potential": "需要更多互动来评估"
            }
    
    def parse_intent(self, user_input: str, current_nodes: List[Dict] = None) -> Dict[str, Any]:
        nodes_summary = ""
        if current_nodes and len(current_nodes) > 0:
            nodes_summary = "当前花园中的节点：\n"
            for i, node in enumerate(current_nodes[:20]):
                nodes_summary += f"- 节点{i+1}: id={node.get('id', '')}, 标题={node.get('title', '')}, 标签={node.get('tags', [])}, 内容={node.get('content', '')[:100]}\n"
        
        system_prompt = """
你是一个3D知识花园的智能助手。解析用户的自然语言指令，识别用户想要执行的操作。

可用的操作类型：
- create_node: 创建新节点/种植种子。需要参数: content (想法内容)
- cross_pollinate: 杂交两个节点。需要参数: node_ids (两个节点的ID数组) 或 tags (标签名，用于筛选节点)
- connect_nodes: 连接两个节点建立关联。需要参数: node_ids (两个节点的ID数组)
- move_nodes: 移动节点到一起。需要参数: node_ids (要移动的节点ID数组)
- delete_node: 删除节点。需要参数: node_id (要删除的节点ID)
- focus_node: 聚焦查看某个节点。需要参数: node_id (节点ID)
- evolve_node: 分析节点演化。需要参数: node_id (节点ID)
- switch_climate: 切换气候。需要参数: climate_type (spring/summer/autumn/winter/storm/drought)
- get_suggestions: 获取扩展建议。需要参数: node_id (节点ID)
- query: 一般性查询，不需要执行操作。

请以JSON格式返回：
{
    "intent": "操作类型",
    "confidence": 0.0到1.0的置信度,
    "parameters": {
        根据操作类型提供相应参数
    },
    "extracted_entities": {
        "node_titles": ["提取到的节点标题"],
        "tags": ["提取到的标签"],
        "keywords": ["关键词"]
    },
    "response": "给用户的自然语言回复，说明理解的意图",
    "needs_confirmation": true/false, 操作是否需要用户确认
    "preview_description": "预览操作的描述"
}

示例：
用户输入: "把关于设计的种子杂交一下"
返回: {
    "intent": "cross_pollinate",
    "confidence": 0.9,
    "parameters": {"tags": ["设计"]},
    "extracted_entities": {"tags": ["设计"], "keywords": ["杂交"]},
    "response": "我理解你想要杂交关于设计的种子。让我找到相关节点...",
    "needs_confirmation": true,
    "preview_description": "将杂交所有带有'设计'标签的节点"
}

用户输入: "把这三个节点移到一起"
返回: {
    "intent": "move_nodes",
    "confidence": 0.85,
    "parameters": {},
    "extracted_entities": {"keywords": ["移动", "三个节点"]},
    "response": "你想将三个节点移动到一起。请选择要移动的节点，或者告诉我具体是哪些节点。",
    "needs_confirmation": true,
    "preview_description": "将选中的三个节点聚集到一起"
}

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{nodes_summary}\n\n用户输入：{user_input}\n\n请解析用户意图。"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.7)
            return json.loads(result)
        except Exception as e:
            return {
                "intent": "query",
                "confidence": 0.0,
                "parameters": {},
                "extracted_entities": {},
                "response": "抱歉，我不太理解你的指令。请尝试用更清晰的方式描述。",
                "needs_confirmation": False,
                "preview_description": ""
            }
    
    def generate_narrative(self, events: List[Dict], nodes: List[Dict] = None) -> Dict[str, Any]:
        events_summary = ""
        for i, event in enumerate(events):
            event_type = event.get('event_type', '')
            timestamp = event.get('timestamp', '')
            details = event.get('details', {})
            node_title = event.get('node_title', '未知节点')
            related_title = event.get('related_node_title', '')
            
            desc = f"事件{i+1} [{timestamp}]: {event_type}"
            if node_title:
                desc += f" - 节点: {node_title}"
            if related_title:
                desc += f" -> 相关节点: {related_title}"
            if details:
                desc += f" | 详情: {details}"
            events_summary += desc + "\n"
        
        system_prompt = """
你是一个故事讲述者。基于知识花园中发生的事件序列，生成一段引人入胜的叙事文本或故事脚本。

事件类型说明：
- node_created: 新节点被创建/种子被种下
- node_updated: 节点被更新
- node_deleted: 节点被删除
- hybrid_created: 杂交产生新节点
- connection_created: 两个节点建立连接
- climate_changed: 气候发生变化
- node_wilted: 节点枯萎
- node_evolved: 节点演化

请以JSON格式返回：
{
    "story_title": "故事标题",
    "narrative_text": "连贯的叙事文本，用生动的语言描述花园的演变历程",
    "story_segments": [
        {
            "segment_index": 1,
            "timestamp": "事件时间戳",
            "event_type": "事件类型",
            "title": "分段标题",
            "content": "分段内容",
            "visual_cues": {
                "highlight_nodes": ["要高亮的节点ID列表"],
                "camera_focus": {"x": 0, "y": 0, "z": 0},
                "animation": "动画类型: create/hybridize/wilt/climate_shift"
            },
            "image_description": "用于生成配图的描述"
        },
        ...
    ],
    "key_characters": [
        {"node_id": "节点ID", "role": "在故事中的角色", "description": "描述"}
    ],
    "plot_arc": {
        "exposition": "故事开端",
        "rising_action": "情节发展",
        "climax": "高潮",
        "falling_action": "回落",
        "resolution": "结局"
    },
    "themes": ["主题1", "主题2"],
    "markdown_export": "完整的Markdown格式故事，包含标题、分段、时间线"
}

叙事要求：
1. 将技术事件转化为生动的故事
2. 使用园艺/花园隐喻：种子、生长、杂交、季节变化等
3. 标注关键节点在故事中的角色
4. 提供可视化线索用于3D场景回放
5. Markdown格式应适合导出分享

只返回JSON，不要其他内容。
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"事件序列：\n{events_summary}\n\n请基于这些事件生成一个故事叙事。"}
        ]
        
        try:
            result = self._call_api(messages, temperature=0.8)
            return json.loads(result)
        except Exception as e:
            return {
                "story_title": "知识花园的演变",
                "narrative_text": "这是一个关于想法如何生长和演变的故事...",
                "story_segments": [],
                "key_characters": [],
                "plot_arc": {
                    "exposition": "花园初始状态",
                    "rising_action": "想法开始生长",
                    "climax": "关键杂交事件",
                    "falling_action": "花园持续演变",
                    "resolution": "当前状态"
                },
                "themes": ["知识生长", "创意杂交"],
                "markdown_export": "# 知识花园的演变\n\n这是一个关于想法如何生长和演变的故事。"
            }
    
    def generate_playback_commands(self, narrative: Dict, events: List[Dict]) -> List[Dict]:
        commands = []
        
        for i, event in enumerate(events):
            event_type = event.get('event_type', '')
            node_id = event.get('node_id')
            related_node_id = event.get('related_node_id')
            details = event.get('details', {})
            
            command = {
                "step_index": i,
                "event_type": event_type,
                "timestamp": event.get('timestamp'),
                "commands": [],
                "duration": 2.0,
                "description": ""
            }
            
            if event_type == 'node_created':
                command["commands"] = [
                    {"type": "create_node", "node_id": node_id, "animate": True},
                    {"type": "highlight", "node_ids": [node_id], "color": "#4CAF50"}
                ]
                command["description"] = f"新种子种下: {event.get('node_title', '新节点')}"
            
            elif event_type == 'hybrid_created':
                command["commands"] = [
                    {"type": "highlight", "node_ids": [node_id, related_node_id], "color": "#9C27B0"},
                    {"type": "animate_hybrid", "parent_a": node_id, "parent_b": related_node_id},
                    {"type": "create_node", "node_id": details.get('child_id'), "animate": True}
                ]
                command["description"] = f"杂交成功: 产生新节点"
                command["duration"] = 3.0
            
            elif event_type == 'connection_created':
                command["commands"] = [
                    {"type": "highlight", "node_ids": [node_id, related_node_id], "color": "#2196F3"},
                    {"type": "create_edge", "source": node_id, "target": related_node_id}
                ]
                command["description"] = f"建立连接: {event.get('node_title')} <-> {event.get('related_node_title')}"
            
            elif event_type == 'climate_changed':
                climate_type = details.get('climate_type', 'spring')
                command["commands"] = [
                    {"type": "climate_effect", "climate_type": climate_type}
                ]
                command["description"] = f"气候变化: {details.get('climate_name', climate_type)}"
                command["duration"] = 2.5
            
            elif event_type == 'node_wilted':
                command["commands"] = [
                    {"type": "highlight", "node_ids": [node_id], "color": "#795548"},
                    {"type": "animate_wilt", "node_id": node_id}
                ]
                command["description"] = f"节点枯萎: {event.get('node_title')}"
            
            elif event_type == 'node_deleted':
                command["commands"] = [
                    {"type": "highlight", "node_ids": [node_id], "color": "#F44336"},
                    {"type": "remove_node", "node_id": node_id}
                ]
                command["description"] = f"节点移除: {event.get('node_title', '节点')}"
            
            commands.append(command)
        
        return commands
