import os
import random
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from config import Config
from backend.models import KnowledgeGraph
from backend.ai_service import AIService


app = Flask(
    __name__,
    static_folder=Config.STATIC_FOLDER,
    template_folder=Config.TEMPLATE_FOLDER
)
app.config.from_object(Config)
CORS(app, origins=Config.CORS_ORIGINS)

kg = KnowledgeGraph()
ai_service = None


def get_ai_service(api_key: str = None):
    global ai_service
    if api_key:
        return AIService(api_key)
    if ai_service is None and Config.DEEPSEEK_API_KEY:
        ai_service = AIService()
    return ai_service


def generate_position(existing_positions=None):
    existing = existing_positions or []
    max_attempts = 100
    
    for _ in range(max_attempts):
        theta = random.uniform(0, 2 * 3.14159)
        radius = random.uniform(2, 10)
        x = radius * random.choice([-1, 1]) * random.uniform(0.5, 1.5)
        y = radius * random.choice([-1, 1]) * random.uniform(0.5, 1.5)
        z = random.uniform(-5, 5)
        
        too_close = False
        for pos in existing:
            dist = ((x - pos['x'])**2 + (y - pos['y'])**2 + (z - pos['z'])**2)**0.5
            if dist < 2.0:
                too_close = True
                break
        
        if not too_close:
            return {'x': x, 'y': y, 'z': z}
    
    return {'x': random.uniform(-10, 10), 'y': random.uniform(-10, 10), 'z': random.uniform(-5, 5)}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Thought Greenhouse API is running'})


@app.route('/api/config', methods=['GET', 'POST'])
def config():
    if request.method == 'POST':
        data = request.json
        if 'deepseek_api_key' in data:
            global ai_service
            ai_service = AIService(data['deepseek_api_key'])
            return jsonify({'status': 'ok', 'message': 'API key configured'})
        return jsonify({'status': 'error', 'message': 'Invalid configuration'}), 400
    
    return jsonify({
        'has_api_key': bool(Config.DEEPSEEK_API_KEY or ai_service)
    })


@app.route('/api/nodes', methods=['GET', 'POST'])
def nodes():
    if request.method == 'POST':
        data = request.json
        content = data.get('content', '')
        
        if not content.strip():
            return jsonify({'status': 'error', 'message': 'Content is required'}), 400
        
        api_key = data.get('api_key')
        ai = get_ai_service(api_key)
        
        analysis = None
        if ai:
            try:
                analysis = ai.analyze_idea(content)
            except Exception as e:
                pass
        
        existing_nodes = kg.get_all_nodes()
        existing_positions = [{'x': n.get('x', 0), 'y': n.get('y', 0), 'z': n.get('z', 0)} for n in existing_nodes]
        position = generate_position(existing_positions)
        
        node_data = {
            'content': content,
            'title': analysis.get('title', content[:50] + '...' if len(content) > 50 else content) if analysis else content[:50] + '...' if len(content) > 50 else content,
            'tags': analysis.get('tags', ['idea']) if analysis else ['idea'],
            'node_type': 'seed',
            'status': 'growing',
            'growth_stage': analysis.get('growth_potential', 0.3) if analysis else 0.3,
            'x': position['x'],
            'y': position['y'],
            'z': position['z'],
            'color': '#4CAF50',
            'size': 1.0,
            'metadata': {
                'analysis': analysis,
                'interactions': 0
            }
        }
        
        node_id = kg.add_node(node_data)
        node = kg.get_node(node_id)
        
        if analysis and analysis.get('potential_connections'):
            all_nodes = kg.get_all_nodes()
            for conn in analysis['potential_connections'][:3]:
                concept = conn.get('concept', '')
                for existing_node in all_nodes:
                    if existing_node['id'] != node_id:
                        existing_content = existing_node.get('content', '').lower()
                        if concept.lower() in existing_content or any(
                            tag.lower() in existing_content 
                            for tag in analysis.get('tags', [])
                        ):
                            try:
                                kg.add_edge(node_id, existing_node['id'], 'potential', 0.5)
                            except:
                                pass
                            break
        
        return jsonify({
            'status': 'ok',
            'node': node,
            'analysis': analysis
        })
    
    nodes = kg.get_all_nodes()
    return jsonify({'status': 'ok', 'nodes': nodes})


@app.route('/api/nodes/<node_id>', methods=['GET', 'PUT', 'DELETE'])
def node_detail(node_id):
    node = kg.get_node(node_id)
    if not node:
        return jsonify({'status': 'error', 'message': 'Node not found'}), 404
    
    if request.method == 'GET':
        related = kg.get_related_nodes(node_id)
        history = kg.get_node_history(node_id)
        return jsonify({
            'status': 'ok',
            'node': node,
            'related': related,
            'history': history
        })
    
    if request.method == 'PUT':
        data = request.json
        updates = {}
        
        for key in ['content', 'title', 'tags', 'status', 'growth_stage', 'x', 'y', 'z', 'color', 'size']:
            if key in data:
                updates[key] = data[key]
        
        if updates:
            kg.update_node(node_id, updates)
            return jsonify({'status': 'ok', 'node': kg.get_node(node_id)})
        
        return jsonify({'status': 'error', 'message': 'No updates provided'}), 400
    
    if request.method == 'DELETE':
        kg.delete_node(node_id)
        return jsonify({'status': 'ok', 'message': 'Node deleted'})


@app.route('/api/edges', methods=['GET', 'POST'])
def edges():
    if request.method == 'POST':
        data = request.json
        source = data.get('source')
        target = data.get('target')
        relation = data.get('relation', 'related')
        strength = data.get('strength', 1.0)
        
        if not source or not target:
            return jsonify({'status': 'error', 'message': 'Source and target are required'}), 400
        
        try:
            edge_id = kg.add_edge(source, target, relation, strength)
            return jsonify({'status': 'ok', 'edge_id': edge_id})
        except ValueError as e:
            return jsonify({'status': 'error', 'message': str(e)}), 400
    
    edges = kg.get_all_edges()
    return jsonify({'status': 'ok', 'edges': edges})


@app.route('/api/relations', methods=['POST'])
def find_relations():
    data = request.json
    node_a = data.get('node_a')
    node_b = data.get('node_b')
    api_key = data.get('api_key')
    
    if not node_a or not node_b:
        return jsonify({'status': 'error', 'message': 'Two nodes are required'}), 400
    
    node_a_data = kg.get_node(node_a)
    node_b_data = kg.get_node(node_b)
    
    if not node_a_data or not node_b_data:
        return jsonify({'status': 'error', 'message': 'One or both nodes not found'}), 404
    
    ai = get_ai_service(api_key)
    if not ai:
        return jsonify({
            'status': 'error',
            'message': 'Deepseek API key not configured. Please set it first.'
        }), 400
    
    try:
        relations = ai.find_relations(
            node_a_data.get('content', ''),
            node_b_data.get('content', '')
        )
        
        if relations.get('strength', 0) > 0.3:
            try:
                kg.add_edge(node_a, node_b, relations.get('relation_type', 'related'), relations.get('strength', 0.5))
            except:
                pass
        
        return jsonify({
            'status': 'ok',
            'relations': relations,
            'node_a': node_a_data,
            'node_b': node_b_data
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/cross-pollinate', methods=['POST'])
def cross_pollinate():
    data = request.json
    parent_a = data.get('parent_a')
    parent_b = data.get('parent_b')
    api_key = data.get('api_key')
    
    if not parent_a or not parent_b:
        return jsonify({'status': 'error', 'message': 'Two parent nodes are required'}), 400
    
    node_a = kg.get_node(parent_a)
    node_b = kg.get_node(parent_b)
    
    if not node_a or not node_b:
        return jsonify({'status': 'error', 'message': 'One or both parent nodes not found'}), 404
    
    ai = get_ai_service(api_key)
    if not ai:
        return jsonify({
            'status': 'error',
            'message': 'Deepseek API key not configured. Please set it first.'
        }), 400
    
    try:
        hybrid = ai.cross_pollinate(
            node_a.get('content', ''),
            node_b.get('content', '')
        )
        
        existing_nodes = kg.get_all_nodes()
        existing_positions = [{'x': n.get('x', 0), 'y': n.get('y', 0), 'z': n.get('z', 0)} for n in existing_nodes]
        
        mid_x = (node_a.get('x', 0) + node_b.get('x', 0)) / 2
        mid_y = (node_a.get('y', 0) + node_b.get('y', 0)) / 2
        mid_z = (node_a.get('z', 0) + node_b.get('z', 0)) / 2
        
        position = {
            'x': mid_x + 2,
            'y': mid_y + 2,
            'z': mid_z
        }
        
        child_node_data = {
            'content': hybrid.get('hybrid_description', ''),
            'title': hybrid.get('hybrid_title', 'Hybrid Idea'),
            'tags': ['hybrid'] + (node_a.get('tags', [])[:2] if node_a else []) + (node_b.get('tags', [])[:2] if node_b else []),
            'node_type': 'hybrid',
            'status': 'growing',
            'growth_stage': hybrid.get('novelty_score', 0.7),
            'x': position['x'],
            'y': position['y'],
            'z': position['z'],
            'color': '#9C27B0',
            'size': 1.5,
            'metadata': {
                'hybrid_data': hybrid,
                'parent_a': parent_a,
                'parent_b': parent_b
            }
        }
        
        child_id = kg.add_node(child_node_data)
        kg.record_hybrid(parent_a, parent_b, child_id)
        
        try:
            kg.add_edge(parent_a, child_id, 'parent', 1.0)
            kg.add_edge(parent_b, child_id, 'parent', 1.0)
        except:
            pass
        
        child_node = kg.get_node(child_id)
        
        return jsonify({
            'status': 'ok',
            'hybrid': hybrid,
            'child_node': child_node,
            'parent_a': node_a,
            'parent_b': node_b
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/hybrids', methods=['GET'])
def get_hybrids():
    hybrids = kg.get_hybrids()
    return jsonify({'status': 'ok', 'hybrids': hybrids})


@app.route('/api/evolve/<node_id>', methods=['POST'])
def evolve_node(node_id):
    node = kg.get_node(node_id)
    if not node:
        return jsonify({'status': 'error', 'message': 'Node not found'}), 404
    
    data = request.json
    api_key = data.get('api_key')
    
    ai = get_ai_service(api_key)
    if not ai:
        return jsonify({
            'status': 'error',
            'message': 'Deepseek API key not configured. Please set it first.'
        }), 400
    
    try:
        history = kg.get_node_history(node_id)
        evolution = ai.analyze_evolution(history)
        
        updates = {}
        current_vitality = evolution.get('current_vitality', 0.5)
        wilting_risk = evolution.get('wilting_risk', 0.3)
        
        if wilting_risk > 0.7:
            updates['status'] = 'wilting'
            updates['color'] = '#795548'
        elif wilting_risk > 0.5:
            updates['color'] = '#8BC34A'
        else:
            updates['status'] = 'growing'
        
        if updates:
            kg.update_node(node_id, updates)
        
        return jsonify({
            'status': 'ok',
            'evolution': evolution,
            'node': kg.get_node(node_id)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/graph', methods=['GET'])
def get_graph():
    nodes = kg.get_all_nodes()
    edges = kg.get_all_edges()
    hybrids = kg.get_hybrids()
    
    return jsonify({
        'status': 'ok',
        'graph': {
            'nodes': nodes,
            'edges': edges
        },
        'stats': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'hybrids': len(hybrids),
            'growing': len([n for n in nodes if n.get('status') == 'growing']),
            'wilting': len([n for n in nodes if n.get('status') == 'wilting'])
        }
    })


@app.route('/api/suggestions/<node_id>', methods=['POST'])
def get_suggestions(node_id):
    node = kg.get_node(node_id)
    if not node:
        return jsonify({'status': 'error', 'message': 'Node not found'}), 404
    
    data = request.json
    api_key = data.get('api_key')
    
    ai = get_ai_service(api_key)
    if not ai:
        return jsonify({
            'status': 'error',
            'message': 'Deepseek API key not configured. Please set it first.'
        }), 400
    
    try:
        all_nodes = kg.get_all_nodes()
        existing_ideas = [n.get('content', '') for n in all_nodes if n['id'] != node_id]
        
        suggestions = ai.suggest_expansions(existing_ideas, node.get('content', ''))
        
        return jsonify({
            'status': 'ok',
            'suggestions': suggestions
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


if __name__ == '__main__':
    os.makedirs(os.path.join(os.path.dirname(__file__), 'frontend', 'static'), exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'frontend', 'templates'), exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
    
    app.run(
        host='0.0.0.0',
        port=Config.PORT,
        debug=True,
        threaded=True
    )
