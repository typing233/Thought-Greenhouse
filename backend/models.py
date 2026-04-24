import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
import networkx as nx
from config import Config


class KnowledgeGraph:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or Config.DATABASE_PATH
        self._init_database()
        self.graph = nx.DiGraph()
        self._load_graph()
    
    def _init_database(self):
        import os
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                title TEXT,
                tags TEXT,
                node_type TEXT DEFAULT 'seed',
                status TEXT DEFAULT 'growing',
                growth_stage REAL DEFAULT 0.0,
                x REAL DEFAULT 0.0,
                y REAL DEFAULT 0.0,
                z REAL DEFAULT 0.0,
                color TEXT DEFAULT '#4CAF50',
                size REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS edges (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                relation TEXT NOT NULL,
                strength REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source) REFERENCES nodes (id),
                FOREIGN KEY (target) REFERENCES nodes (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                node_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (node_id) REFERENCES nodes (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hybrids (
                id TEXT PRIMARY KEY,
                parent_a TEXT NOT NULL,
                parent_b TEXT NOT NULL,
                child TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_a) REFERENCES nodes (id),
                FOREIGN KEY (parent_b) REFERENCES nodes (id),
                FOREIGN KEY (child) REFERENCES nodes (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_graph(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM nodes')
        for row in cursor.fetchall():
            node_data = {
                'id': row[0],
                'content': row[1],
                'title': row[2],
                'tags': json.loads(row[3]) if row[3] else [],
                'node_type': row[4],
                'status': row[5],
                'growth_stage': row[6],
                'x': row[7],
                'y': row[8],
                'z': row[9],
                'color': row[10],
                'size': row[11],
                'created_at': row[12],
                'updated_at': row[13],
                'metadata': json.loads(row[14]) if row[14] else {}
            }
            self.graph.add_node(row[0], **node_data)
        
        cursor.execute('SELECT source, target, relation, strength FROM edges')
        for row in cursor.fetchall():
            self.graph.add_edge(
                row[0], row[1],
                relation=row[2],
                strength=row[3]
            )
        
        conn.close()
    
    def add_node(self, node_data: Dict[str, Any]) -> str:
        import uuid
        node_id = node_data.get('id') or str(uuid.uuid4())
        
        full_node_data = {
            'id': node_id,
            'content': node_data.get('content', ''),
            'title': node_data.get('title'),
            'tags': node_data.get('tags', []),
            'node_type': node_data.get('node_type', 'seed'),
            'status': node_data.get('status', 'growing'),
            'growth_stage': node_data.get('growth_stage', 0.0),
            'x': node_data.get('x', 0.0),
            'y': node_data.get('y', 0.0),
            'z': node_data.get('z', 0.0),
            'color': node_data.get('color', '#4CAF50'),
            'size': node_data.get('size', 1.0),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'metadata': node_data.get('metadata', {})
        }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO nodes (
                id, content, title, tags, node_type, status,
                growth_stage, x, y, z, color, size, created_at, updated_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            full_node_data['id'],
            full_node_data['content'],
            full_node_data['title'],
            json.dumps(full_node_data['tags']) if full_node_data.get('tags') else None,
            full_node_data['node_type'],
            full_node_data['status'],
            full_node_data['growth_stage'],
            full_node_data['x'],
            full_node_data['y'],
            full_node_data['z'],
            full_node_data['color'],
            full_node_data['size'],
            full_node_data['created_at'],
            full_node_data['updated_at'],
            json.dumps(full_node_data['metadata']) if full_node_data.get('metadata') else None
        ))
        
        self.graph.add_node(node_id, **full_node_data)
        
        self._add_history(conn, node_id, 'created', {'content': node_data.get('content', '')})
        
        conn.commit()
        conn.close()
        
        return node_id
    
    def update_node(self, node_id: str, updates: Dict[str, Any]) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        set_clause = []
        values = []
        for key, value in updates.items():
            if key in ['tags', 'metadata']:
                set_clause.append(f'{key} = ?')
                values.append(json.dumps(value) if value else None)
            elif key in ['x', 'y', 'z', 'growth_stage', 'size']:
                set_clause.append(f'{key} = ?')
                values.append(float(value))
            else:
                set_clause.append(f'{key} = ?')
                values.append(value)
        
        set_clause.append('updated_at = ?')
        values.append(datetime.now().isoformat())
        
        if set_clause:
            query = f"UPDATE nodes SET {', '.join(set_clause)} WHERE id = ?"
            values.append(node_id)
            cursor.execute(query, values)
            
            if cursor.rowcount > 0 and node_id in self.graph.nodes:
                self.graph.nodes[node_id].update(updates)
                self._add_history(conn, node_id, 'updated', updates)
                conn.commit()
                conn.close()
                return True
        
        conn.close()
        return False
    
    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        if node_id in self.graph.nodes:
            return self.graph.nodes[node_id].copy()
        return None
    
    def delete_node(self, node_id: str) -> bool:
        if node_id not in self.graph.nodes:
            return False
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM edges WHERE source = ? OR target = ?', (node_id, node_id))
        cursor.execute('DELETE FROM nodes WHERE id = ?', (node_id,))
        
        self.graph.remove_node(node_id)
        
        conn.commit()
        conn.close()
        return True
    
    def add_edge(self, source: str, target: str, relation: str, strength: float = 1.0) -> str:
        import uuid
        edge_id = str(uuid.uuid4())
        
        if source not in self.graph.nodes or target not in self.graph.nodes:
            raise ValueError(f"Nodes {source} or {target} do not exist")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO edges (id, source, target, relation, strength, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (edge_id, source, target, relation, strength, datetime.now().isoformat()))
        
        self.graph.add_edge(source, target, relation=relation, strength=strength)
        
        conn.commit()
        conn.close()
        
        return edge_id
    
    def get_related_nodes(self, node_id: str, depth: int = 1) -> List[Dict[str, Any]]:
        if node_id not in self.graph.nodes:
            return []
        
        related = []
        for neighbor in self.graph.neighbors(node_id):
            related.append(self.get_node(neighbor))
        
        return related
    
    def get_all_nodes(self) -> List[Dict[str, Any]]:
        nodes = []
        for node_id in self.graph.nodes:
            nodes.append(self.get_node(node_id))
        return nodes
    
    def get_all_edges(self) -> List[Dict[str, Any]]:
        edges = []
        for source, target, data in self.graph.edges(data=True):
            edges.append({
                'source': source,
                'target': target,
                'relation': data.get('relation', ''),
                'strength': data.get('strength', 1.0)
            })
        return edges
    
    def _add_history(self, conn, node_id: str, action: str, details: Dict):
        import uuid
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO history (id, node_id, action, details, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()),
            node_id,
            action,
            json.dumps(details),
            datetime.now().isoformat()
        ))
    
    def get_node_history(self, node_id: str) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, node_id, action, details, timestamp
            FROM history
            WHERE node_id = ?
            ORDER BY timestamp DESC
        ''', (node_id,))
        
        history = []
        for row in cursor.fetchall():
            history.append({
                'id': row[0],
                'node_id': row[1],
                'action': row[2],
                'details': json.loads(row[3]) if row[3] else {},
                'timestamp': row[4]
            })
        
        conn.close()
        return history
    
    def record_hybrid(self, parent_a: str, parent_b: str, child: str) -> str:
        import uuid
        hybrid_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO hybrids (id, parent_a, parent_b, child, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (hybrid_id, parent_a, parent_b, child, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return hybrid_id
    
    def get_hybrids(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT h.id, h.parent_a, h.parent_b, h.child, h.created_at,
                   n1.content as parent_a_content,
                   n2.content as parent_b_content,
                   n3.content as child_content
            FROM hybrids h
            JOIN nodes n1 ON h.parent_a = n1.id
            JOIN nodes n2 ON h.parent_b = n2.id
            JOIN nodes n3 ON h.child = n3.id
            ORDER BY h.created_at DESC
        ''')
        
        hybrids = []
        for row in cursor.fetchall():
            hybrids.append({
                'id': row[0],
                'parent_a': row[1],
                'parent_b': row[2],
                'child': row[3],
                'created_at': row[4],
                'parent_a_content': row[5],
                'parent_b_content': row[6],
                'child_content': row[7]
            })
        
        conn.close()
        return hybrids
