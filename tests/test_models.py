import pytest
import tempfile
import os
import json
from backend.models import KnowledgeGraph


@pytest.fixture
def temp_db():
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_path = temp_file.name
    temp_file.close()
    yield temp_path
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def kg(temp_db):
    return KnowledgeGraph(db_path=temp_db)


class TestKnowledgeGraphBasics:
    def test_add_node(self, kg):
        node_data = {
            'content': '测试想法',
            'title': '测试标题',
            'tags': ['测试', '想法'],
            'x': 1.0,
            'y': 2.0,
            'z': 3.0
        }
        
        node_id = kg.add_node(node_data)
        assert node_id is not None
        
        node = kg.get_node(node_id)
        assert node is not None
        assert node['content'] == '测试想法'
        assert node['title'] == '测试标题'
        assert node['tags'] == ['测试', '想法']
        assert node['x'] == 1.0
        assert node['y'] == 2.0
        assert node['z'] == 3.0
    
    def test_get_all_nodes(self, kg):
        kg.add_node({'content': '想法1'})
        kg.add_node({'content': '想法2'})
        
        nodes = kg.get_all_nodes()
        assert len(nodes) == 2
    
    def test_update_node(self, kg):
        node_id = kg.add_node({'content': '原始内容', 'title': '原始标题'})
        
        updated = kg.update_node(node_id, {
            'content': '更新后的内容',
            'title': '更新后的标题',
            'status': 'wilting'
        })
        
        assert updated is True
        
        node = kg.get_node(node_id)
        assert node['content'] == '更新后的内容'
        assert node['title'] == '更新后的标题'
        assert node['status'] == 'wilting'
    
    def test_delete_node(self, kg):
        node_id = kg.add_node({'content': '要删除的想法'})
        
        assert kg.get_node(node_id) is not None
        
        deleted = kg.delete_node(node_id)
        assert deleted is True
        assert kg.get_node(node_id) is None
    
    def test_get_nonexistent_node(self, kg):
        node = kg.get_node('nonexistent-id')
        assert node is None
    
    def test_update_nonexistent_node(self, kg):
        updated = kg.update_node('nonexistent-id', {'content': 'test'})
        assert updated is False
    
    def test_delete_nonexistent_node(self, kg):
        deleted = kg.delete_node('nonexistent-id')
        assert deleted is False


class TestKnowledgeGraphEdges:
    def test_add_edge(self, kg):
        id1 = kg.add_node({'content': '节点1'})
        id2 = kg.add_node({'content': '节点2'})
        
        edge_id = kg.add_edge(id1, id2, 'related', 0.8)
        assert edge_id is not None
        
        edges = kg.get_all_edges()
        assert len(edges) == 1
        assert edges[0]['source'] == id1
        assert edges[0]['target'] == id2
        assert edges[0]['relation'] == 'related'
        assert edges[0]['strength'] == 0.8
    
    def test_add_edge_nonexistent_nodes(self, kg):
        with pytest.raises(ValueError):
            kg.add_edge('nonexistent1', 'nonexistent2', 'related')
    
    def test_get_related_nodes(self, kg):
        id1 = kg.add_node({'content': '节点1'})
        id2 = kg.add_node({'content': '节点2'})
        id3 = kg.add_node({'content': '节点3'})
        
        kg.add_edge(id1, id2, 'related')
        kg.add_edge(id1, id3, 'related')
        
        related = kg.get_related_nodes(id1)
        assert len(related) == 2


class TestKnowledgeGraphHistory:
    def test_node_history(self, kg):
        node_id = kg.add_node({'content': '测试想法'})
        
        history = kg.get_node_history(node_id)
        assert len(history) == 1
        assert history[0]['action'] == 'created'
    
    def test_update_adds_history(self, kg):
        node_id = kg.add_node({'content': '原始内容'})
        
        kg.update_node(node_id, {'content': '更新内容'})
        
        history = kg.get_node_history(node_id)
        assert len(history) == 2
        actions = [h['action'] for h in history]
        assert 'updated' in actions


class TestKnowledgeGraphHybrids:
    def test_record_hybrid(self, kg):
        id1 = kg.add_node({'content': '父节点A'})
        id2 = kg.add_node({'content': '父节点B'})
        id3 = kg.add_node({'content': '子节点'})
        
        hybrid_id = kg.record_hybrid(id1, id2, id3)
        assert hybrid_id is not None
        
        hybrids = kg.get_hybrids()
        assert len(hybrids) == 1
        assert hybrids[0]['parent_a'] == id1
        assert hybrids[0]['parent_b'] == id2
        assert hybrids[0]['child'] == id3


class TestKnowledgeGraphPersistence:
    def test_persistence_between_instances(self, temp_db):
        kg1 = KnowledgeGraph(db_path=temp_db)
        node_id = kg1.add_node({
            'content': '持久化测试',
            'title': '持久化标题',
            'tags': ['持久化']
        })
        
        kg2 = KnowledgeGraph(db_path=temp_db)
        node = kg2.get_node(node_id)
        
        assert node is not None
        assert node['content'] == '持久化测试'
        assert node['title'] == '持久化标题'
        assert node['tags'] == ['持久化']
    
    def test_edge_persistence(self, temp_db):
        kg1 = KnowledgeGraph(db_path=temp_db)
        id1 = kg1.add_node({'content': '节点1'})
        id2 = kg1.add_node({'content': '节点2'})
        kg1.add_edge(id1, id2, 'parent', 1.0)
        
        kg2 = KnowledgeGraph(db_path=temp_db)
        edges = kg2.get_all_edges()
        
        assert len(edges) == 1
        assert edges[0]['relation'] == 'parent'


class TestNodeTypes:
    def test_seed_node_defaults(self, kg):
        node_id = kg.add_node({'content': '种子想法'})
        node = kg.get_node(node_id)
        
        assert node['node_type'] == 'seed'
        assert node['status'] == 'growing'
        assert node['color'] == '#4CAF50'
        assert node['size'] == 1.0
    
    def test_hybrid_node(self, kg):
        node_id = kg.add_node({
            'content': '杂交想法',
            'node_type': 'hybrid',
            'color': '#9C27B0',
            'size': 1.5
        })
        
        node = kg.get_node(node_id)
        assert node['node_type'] == 'hybrid'
        assert node['color'] == '#9C27B0'
        assert node['size'] == 1.5
    
    def test_wilting_node(self, kg):
        node_id = kg.add_node({
            'content': '枯萎的想法',
            'status': 'wilting'
        })
        
        node = kg.get_node(node_id)
        assert node['status'] == 'wilting'


class TestGrowthStage:
    def test_growth_stage(self, kg):
        node_id = kg.add_node({
            'content': '高潜力想法',
            'growth_stage': 0.8
        })
        
        node = kg.get_node(node_id)
        assert node['growth_stage'] == 0.8
    
    def test_default_growth_stage(self, kg):
        node_id = kg.add_node({'content': '默认想法'})
        node = kg.get_node(node_id)
        assert node['growth_stage'] == 0.0
