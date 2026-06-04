from flask import Flask, request, jsonify
from flask_cors import CORS
import osmnx as ox
import networkx as nx
import math

app = Flask(__name__)
CORS(app)

locations = {
    "Gerbang Utama": (-3.760568, 102.272638),
    "Gedung Layanan Terpadu": (-3.758209, 102.272176),
    "Laboratorium Fisika": (-3.755810, 102.273885),
    "Gedung Bersama III": (-3.756111, 102.276192),
    "Gedung Bersama V": (-3.755753, 102.276481),
    "Gerbang Kedua (Akses Gang Juwita)": (-3.759452, 102.27506),
    "Gedung Serba Guna": (-3.757851, 102.276916),
    "Dekanat Teknik": (-3.758285, 102.276653),
    "Laboratorium Teknik": (-3.758558, 102.276267),
    "Gerbang Keluar": (-3.759387, 102.276240)
}

print("Loading graphs...")
drive_graph = ox.graph_from_place("Universitas Bengkulu, Indonesia", network_type="all")

remove_edges = []
for u, v, key, data in drive_graph.edges(keys=True, data=True):
    highway = data.get("highway")
    if isinstance(highway, list):
        highway = highway[0]
    
    if highway in ["footway", "path", "pedestrian", "steps", "cycleway"]:
        remove_edges.append((u, v, key))

for edge in remove_edges:
    drive_graph.remove_edge(*edge)

graphs = {
    "walk": ox.graph_from_place("Universitas Bengkulu, Indonesia", network_type="walk"),
    "drive": drive_graph
}
print("Graphs loaded successfully!")

def calculate_bearing(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    d_lng = lng2 - lng1
    y = math.sin(d_lng) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lng)
    bearing = math.atan2(y, x)
    return (math.degrees(bearing) + 360) % 360

def get_turn_instruction(b1, b2, street_name):
    diff = (b2 - b1 + 180) % 360 - 180
    street_info = f" ke {street_name}" if street_name and str(street_name) != 'nan' else ""

    if -30 <= diff <= 30:
        return f"Lurus terus{street_info}", "straight"
 
    if diff > 30:
        return f"Belok kanan{street_info}", "turn-right"
    else:
        return f"Belok kiri{street_info}", "turn-left"

@app.route('/route', methods=['POST'])
def route():
    data = request.json
    start = data['start']
    destination = data['destination']
    vehicle = data['vehicle']

    G = graphs[vehicle]
    start_lat, start_lng = locations[start]
    end_lat, end_lng = locations[destination]

    orig_node = ox.distance.nearest_nodes(G, start_lng, start_lat)
    dest_node = ox.distance.nearest_nodes(G, end_lng, end_lat)

    route_nodes = nx.astar_path(G, orig_node, dest_node, weight='length')

    path = [{"lat": G.nodes[node]['y'], "lng": G.nodes[node]['x']} for node in route_nodes]
    distance = nx.path_weight(G, route_nodes, weight='length')

    if vehicle == "walk":
        speed = 1.3  
        duration = math.ceil((distance / speed) / 60)
        burned_calories = int(round(distance * 0.05)) 
        ui_stats = {"label": "Kalori Terbakar", "value": f"{burned_calories} kcal", "icon": "fire"}
    else:
        speed = 7.0  
        duration = math.ceil((distance / speed) / 60)
        co2_saved = round(distance * 0.1, 1)  
        ui_stats = {"label": "Eco Efficiency", "value": f"{co2_saved}g CO2", "icon": "leaf"}

    if duration < 1:
        duration = 1

    dynamic_instructions = []
    dynamic_instructions.append({
        "text": f"Mulai perjalanan dari {start}",
        "type": "start",
        "distance": 0
    })

    current_bearing = None
    accumulated_dist = 0

    for i in range(len(route_nodes) - 1):
        u = route_nodes[i]
        v = route_nodes[i+1]
        
        edge_data = G.get_edge_data(u, v)
        if isinstance(edge_data, dict):
            actual_data = list(edge_data.values())[0] if 'weight' not in edge_data else edge_data
        else:
            actual_data = {}

        edge_dist = actual_data.get('length', 0)
        accumulated_dist += edge_dist
        street_name = actual_data.get('name', 'Jalan Kampus')

        node_u = G.nodes[u]
        node_v = G.nodes[v]
        next_bearing = calculate_bearing(node_u['y'], node_u['x'], node_v['y'], node_v['x'])

        if current_bearing is not None:
            if abs((next_bearing - current_bearing + 180) % 360 - 180) > 30:
                text, icon_type = get_turn_instruction(current_bearing, next_bearing, street_name)
                dynamic_instructions.append({
                    "text": f"Setelah {round(accumulated_dist)}m, {text.lower()}",
                    "type": icon_type,
                    "distance": round(accumulated_dist)
                })
                accumulated_dist = 0  

        current_bearing = next_bearing

    dynamic_instructions.append({
        "text": f"Tiba di tujuan: {destination}",
        "type": "destination",
        "distance": round(accumulated_dist)
    })

    return jsonify({
        "path": path,
        "distance": round(distance),
        "duration": duration,
        "ui_stats": ui_stats,
        "instructions": dynamic_instructions
    })

if __name__ == '__main__':
    app.run(debug=True)