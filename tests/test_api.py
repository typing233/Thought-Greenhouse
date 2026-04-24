import pytest
import tempfile
import os
import json
from unittest.mock import patch, MagicMock


@pytest.fixture
def app():
    import app
    app.app.config['TESTING'] = True
    app.app.config['DATABASE_PATH'] = ':memory:'
    
    with app.app.app_context():
        yield app.app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def temp_db():
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_path = temp_file.name
    temp_file.close()
    yield temp_path
    if os.path.exists(temp_path):
        os.unlink(temp_path)


class TestHealthCheck:
    def test_health_check(self, client):
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'


class TestNodeEndpoints:
    def test_create_node_with_content(self, client):
        response = client.post('/api/nodes',
            json={'content': '这是一个测试想法'},
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert 'node' in data
        assert data['node']['content'] == '这是一个测试想法'
    
    def test_create_node_without_content(self, client):
        response = client.post('/api/nodes',
            json={'content': ''},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
    
    def test_get_nodes_empty(self, client):
        response = client.get('/api/nodes')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert isinstance(data['nodes'], list)
    
    def test_get_nodes_with_data(self, client):
        client.post('/api/nodes',
            json={'content': '想法1'},
            content_type='application/json'
        )
        client.post('/api/nodes',
            json={'content': '想法2'},
            content_type='application/json'
        )
        
        response = client.get('/api/nodes')
        data = json.loads(response.data)
        assert len(data['nodes']) >= 2
    
    def test_get_node_by_id(self, client):
        create_response = client.post('/api/nodes',
            json={'content': '待获取的想法'},
            content_type='application/json'
        )
        create_data = json.loads(create_response.data)
        node_id = create_data['node']['id']
        
        response = client.get(f'/api/nodes/{node_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['node']['content'] == '待获取的想法'
    
    def test_get_nonexistent_node(self, client):
        response = client.get('/api/nodes/nonexistent-id')
        assert response.status_code == 404
    
    def test_update_node(self, client):
        create_response = client.post('/api/nodes',
            json={'content': '原始内容'},
            content_type='application/json'
        )
        create_data = json.loads(create_response.data)
        node_id = create_data['node']['id']
        
        response = client.put(f'/api/nodes/{node_id}',
            json={
                'content': '更新后的内容',
                'status': 'wilting'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['node']['content'] == '更新后的内容'
        assert data['node']['status'] == 'wilting'
    
    def test_delete_node(self, client):
        create_response = client.post('/api/nodes',
            json={'content': '待删除的想法'},
            content_type='application/json'
        )
        create_data = json.loads(create_response.data)
        node_id = create_data['node']['id']
        
        response = client.delete(f'/api/nodes/{node_id}')
        assert response.status_code == 200
        
        get_response = client.get(f'/api/nodes/{node_id}')
        assert get_response.status_code == 404


class TestEdgeEndpoints:
    def test_create_edge(self, client):
        response1 = client.post('/api/nodes',
            json={'content': '源节点'},
            content_type='application/json'
        )
        response2 = client.post('/api/nodes',
            json={'content': '目标节点'},
            content_type='application/json'
        )
        
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        
        source_id = data1['node']['id']
        target_id = data2['node']['id']
        
        response = client.post('/api/edges',
            json={
                'source': source_id,
                'target': target_id,
                'relation': 'related',
                'strength': 0.8
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
    
    def test_get_edges(self, client):
        response = client.get('/api/edges')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert isinstance(data['edges'], list)


class TestGraphEndpoint:
    def test_get_graph(self, client):
        client.post('/api/nodes',
            json={'content': '图测试节点1'},
            content_type='application/json'
        )
        client.post('/api/nodes',
            json={'content': '图测试节点2'},
            content_type='application/json'
        )
        
        response = client.get('/api/graph')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'ok'
        assert 'graph' in data
        assert 'stats' in data
        assert 'nodes' in data['graph']
        assert 'edges' in data['graph']
        assert 'total_nodes' in data['stats']


class TestConfigEndpoint:
    def test_get_config(self, client):
        response = client.get('/api/config')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'has_api_key' in data


class TestIntegrationScenarios:
    def test_create_and_update_node_flow(self, client):
        create_response = client.post('/api/nodes',
            json={'content': '初始想法'},
            content_type='application/json'
        )
        assert create_response.status_code == 200
        
        create_data = json.loads(create_response.data)
        node_id = create_data['node']['id']
        
        update_response = client.put(f'/api/nodes/{node_id}',
            json={
                'title': '更新标题',
                'tags': ['标签1', '标签2']
            },
            content_type='application/json'
        )
        assert update_response.status_code == 200
        
        get_response = client.get(f'/api/nodes/{node_id}')
        get_data = json.loads(get_response.data)
        
        assert get_data['node']['title'] == '更新标题'
        assert '标签1' in get_data['node']['tags']
    
    def test_multiple_nodes_and_relations(self, client):
        responses = []
        for i in range(3):
            resp = client.post('/api/nodes',
                json={'content': f'节点{i+1}'},
                content_type='application/json'
            )
            responses.append(resp)
        
        node_ids = [json.loads(r.data)['node']['id'] for r in responses]
        
        client.post('/api/edges',
            json={
                'source': node_ids[0],
                'target': node_ids[1],
                'relation': 'related'
            },
            content_type='application/json'
        )
        
        client.post('/api/edges',
            json={
                'source': node_ids[1],
                'target': node_ids[2],
                'relation': 'parent'
            },
            content_type='application/json'
        )
        
        graph_response = client.get('/api/graph')
        graph_data = json.loads(graph_response.data)
        
        assert graph_data['stats']['total_nodes'] >= 3
        assert graph_data['stats']['total_edges'] >= 2


class TestErrorHandling:
    def test_create_node_with_invalid_json(self, client):
        response = client.post('/api/nodes',
            data='invalid json',
            content_type='application/json'
        )
        assert response.status_code in [400, 422]
    
    def test_create_edge_with_nonexistent_nodes(self, client):
        response = client.post('/api/edges',
            json={
                'source': 'nonexistent-1',
                'target': 'nonexistent-2',
                'relation': 'related'
            },
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_update_node_with_invalid_data(self, client):
        create_response = client.post('/api/nodes',
            json={'content': '测试节点'},
            content_type='application/json'
        )
        create_data = json.loads(create_response.data)
        node_id = create_data['node']['id']
        
        response = client.put(f'/api/nodes/{node_id}',
            json={},
            content_type='application/json'
        )
        assert response.status_code == 400
