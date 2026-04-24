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
